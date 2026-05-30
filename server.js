const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');
const { User, Patient, Doctor, Appointment, Billing, Prescription } = db;

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'auracare-secret-key-1029';

// Setup Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Session manager
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2 Hours Session expiry
    secure: false
  }
}));

// Route protectors
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized. Please authenticate." });
}

function hasRole(roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Access Denied. Forbidden role workspace." });
    }
    next();
  };
}

/* ==========================================
   REST ENDPOINTS: AUTHENTICATION
   ========================================== */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter email and password." });
    }

    const emailLower = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailLower });
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email ID or password." });
    }

    // Security Check: If Doctor is deactivated, reject login
    if (user.role === 'Doctor') {
      const doc = await Doctor.findOne({ id: user.id });
      if (doc && doc.status === 'Deactivated') {
        return res.status(403).json({ error: "Account Deactivated. Please contact the administrator." });
      }
    }

    // Set Session
    req.session.user = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email
    };

    res.json({ success: true, role: user.role, user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: "Internal server authentication error." });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout session." });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: "Logged out successfully." });
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// Patient registration sign up (Zero role manual selectors)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, gender, dob, height, weight, bloodGroup, contact, email, password } = req.body;
    
    if (!name || !gender || !dob || !height || !weight || !bloodGroup || !contact || !email || !password) {
      return res.status(400).json({ error: "All registration parameters are mandatory." });
    }

    const emailLower = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({ error: "Invalid email ID format." });
    }

    const contactRegex = /^[0-9]{10}$/;
    if (!contactRegex.test(contact)) {
      return res.status(400).json({ error: "Valid 10-digit mobile number required." });
    }

    const duplicate = await User.findOne({ email: emailLower });
    if (duplicate) {
      return res.status(400).json({ error: "This email address is already registered." });
    }
    
    // Calculate Age
    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    // Autogenerate Patient ID
    const lastPatient = await Patient.findOne().sort({ id: -1 });
    let nextNum = 1005;
    if (lastPatient) {
      const lastNum = parseInt(lastPatient.id.replace('PAT-', ''));
      nextNum = lastNum + 1;
    }
    const patientId = `PAT-${nextNum}`;

    const newPatient = new Patient({
      id: patientId,
      name,
      age,
      gender,
      dob,
      height: parseInt(height),
      weight: parseInt(weight),
      bloodGroup,
      contact,
      email: emailLower,
      admittedDate: new Date().toISOString().split('T')[0],
      profileInfo: "No bio details added yet."
    });

    const newUserCredentials = new User({
      id: patientId,
      email: emailLower,
      password,
      role: "Patient",
      name
    });

    await newPatient.save();
    await newUserCredentials.save();

    // Auto-login session setting
    req.session.user = {
      id: patientId,
      name,
      role: "Patient",
      email: emailLower
    };

    res.status(201).json({ success: true, role: "Patient", user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: "Registration transaction failed." });
  }
});

/* ==========================================
   REST ENDPOINTS: PATIENT CONTROLS
   ========================================== */
app.get('/api/patients', isAuthenticated, async (req, res) => {
  try {
    // Guard: Patients can only view themselves
    if (req.session.user.role === 'Patient') {
      const filtered = await Patient.find({ id: req.session.user.id });
      return res.json(filtered);
    }

    const list = await Patient.find({});
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed to read patient directory." });
  }
});

// Patient edits their profile
app.post('/api/patients/:id/profile', isAuthenticated, hasRole(['Patient']), async (req, res) => {
  try {
    const { id } = req.params;
    if (id !== req.session.user.id) {
      return res.status(403).json({ error: "Access Denied: Patient identity mismatch." });
    }

    const { name, contact, height, weight, email, profileInfo } = req.body;
    if (!name || !contact || !height || !weight || !email) {
      return res.status(400).json({ error: "Missing required profile details." });
    }

    const emailLower = email.trim().toLowerCase();
    const contactRegex = /^[0-9]{10}$/;
    if (!contactRegex.test(contact)) {
      return res.status(400).json({ error: "Valid 10-digit contact number required." });
    }

    // Email check duplication (excluding current user)
    const duplicate = await User.findOne({ email: emailLower, id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ error: "This email ID is already in use." });
    }

    const pat = await Patient.findOneAndUpdate(
      { id },
      { name, contact, height: parseInt(height), weight: parseInt(weight), email: emailLower, profileInfo },
      { new: true }
    );

    if (!pat) {
      return res.status(404).json({ error: "Patient profile not found." });
    }

    // Update credential registry mapping
    await User.findOneAndUpdate({ id }, { name, email: emailLower });

    // Update current active session
    req.session.user.name = name;
    req.session.user.email = emailLower;

    res.json({ success: true, message: "Profile credentials updated successfully.", user: req.session.user });
  } catch (e) {
    res.status(500).json({ error: "Failed to update profile details." });
  }
});

app.post('/api/patients', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { name, age, gender, bloodGroup, contact, email, admittedDate } = req.body;
    if (!name || !age || !gender || !bloodGroup || !contact || !email || !admittedDate) {
      return res.status(400).json({ error: "Missing required register fields." });
    }

    const emailLower = email.trim().toLowerCase();
    const duplicate = await User.findOne({ email: emailLower });
    if (duplicate) {
      return res.status(400).json({ error: "Email address already registered." });
    }

    const lastPatient = await Patient.findOne().sort({ id: -1 });
    let nextNum = 1005;
    if (lastPatient) {
      const lastNum = parseInt(lastPatient.id.replace('PAT-', ''));
      nextNum = lastNum + 1;
    }
    const patientId = `PAT-${nextNum}`;

    const newPatient = new Patient({
      id: patientId,
      name,
      age: parseInt(age),
      gender,
      dob: "1990-01-01",
      height: 170,
      weight: 70,
      bloodGroup,
      contact,
      email: emailLower,
      admittedDate,
      profileInfo: "No bio details added yet."
    });

    const newUser = new User({
      id: patientId,
      email: emailLower,
      password: "password123",
      role: "Patient",
      name
    });

    await newPatient.save();
    await newUser.save();

    res.status(201).json(newPatient);
  } catch (e) {
    res.status(500).json({ error: "Failed to save patient portfolio." });
  }
});

app.delete('/api/patients/:id', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await Patient.deleteOne({ id });
    await User.deleteOne({ id });
    await Appointment.deleteMany({ patientId: id });
    await Billing.deleteMany({ patientId: id });
    await Prescription.deleteMany({ patientId: id });

    res.json({ success: true, message: `Archived records for patient ${id}.` });
  } catch (e) {
    res.status(500).json({ error: "Failed to archive patient records." });
  }
});

// GET Assigned Patients (Doctor Portal)
app.get('/api/patients/assigned', isAuthenticated, hasRole(['Doctor']), async (req, res) => {
  try {
    const doctorId = req.session.user.id;
    const appts = await Appointment.find({ doctorId });
    
    const patientIds = [...new Set(appts.map(a => a.patientId))];
    const assignedPatients = await Patient.find({ id: { $in: patientIds } });
    
    res.json(assignedPatients);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch doctor's patient roster." });
  }
});

/* ==========================================
   REST ENDPOINTS: DOCTOR PORTFOLIOS
   ========================================== */
app.get('/api/doctors', isAuthenticated, async (req, res) => {
  try {
    const list = await Doctor.find({});
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch doctors registry." });
  }
});

// Admin creates new doctor credentials
app.post('/api/doctors', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { name, specialty, qualification, experience, contact, email, password } = req.body;
    if (!name || !specialty || !qualification || !experience || !contact || !email || !password) {
      return res.status(400).json({ error: "All clinical consultant registration fields are mandatory." });
    }

    const emailLower = email.trim().toLowerCase();
    const duplicate = await User.findOne({ email: emailLower });
    if (duplicate) {
      return res.status(400).json({ error: "Email address already registered in AuraCare database." });
    }

    const lastDoc = await Doctor.findOne().sort({ id: -1 });
    let nextNum = 2005;
    if (lastDoc) {
      const lastNum = parseInt(lastDoc.id.replace('DOC-', ''));
      nextNum = lastNum + 1;
    }
    const doctorId = `DOC-${nextNum}`;

    const newDoctor = new Doctor({
      id: doctorId,
      name,
      specialty,
      qualification,
      experience: parseInt(experience),
      contact,
      status: "On Duty",
      fee: specialty === 'Cardiology' ? 1500 : specialty === 'Neurology' ? 1800 : 1200,
      email: emailLower
    });

    const newUser = new User({
      id: doctorId,
      email: emailLower,
      password: password.trim(),
      role: "Doctor",
      name
    });

    await newDoctor.save();
    await newUser.save();

    res.status(201).json(newDoctor);
  } catch (e) {
    res.status(500).json({ error: "Failed to register new medical consultant." });
  }
});

// Admin edits doctor information
app.post('/api/doctors/:id/edit', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialty, qualification, experience, contact, email } = req.body;
    
    if (!name || !specialty || !qualification || !experience || !contact || !email) {
      return res.status(400).json({ error: "All doctor edit fields are mandatory." });
    }

    const emailLower = email.trim().toLowerCase();
    
    // Email check duplication (excluding current doctor)
    const duplicate = await User.findOne({ email: emailLower, id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ error: "This email address is already in use." });
    }

    const fee = specialty === 'Cardiology' ? 1500 : specialty === 'Neurology' ? 1800 : 1200;
    const doc = await Doctor.findOneAndUpdate(
      { id },
      { name, specialty, qualification, experience: parseInt(experience), contact, email: emailLower, fee },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ error: "Doctor profile not found." });
    }

    // Update users credentials mapping
    await User.findOneAndUpdate({ id }, { name, email: emailLower });

    res.json({ success: true, message: "Doctor profile updated successfully." });
  } catch (e) {
    res.status(500).json({ error: "Failed to edit doctor profile." });
  }
});

app.delete('/api/doctors/:id', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await Doctor.deleteOne({ id });
    await User.deleteOne({ id });
    await Appointment.updateMany({ doctorId: id }, { status: "Cancelled" });

    res.json({ success: true, message: `Removed consultant ${id}.` });
  } catch (e) {
    res.status(500).json({ error: "Failed to remove consultant registry." });
  }
});

// Admin deactivates/toggles doctor account
app.post('/api/doctors/:id/toggle', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Doctor.findOne({ id });
    if (!doc) {
      return res.status(404).json({ error: "Doctor profile not found." });
    }

    let showToastMessage = "";
    if (doc.status === 'Deactivated') {
      doc.status = 'On Duty'; // Reactivate
      showToastMessage = `Doctor portfolio reactivated successfully.`;
    } else {
      doc.status = 'Deactivated'; // Deactivate
      showToastMessage = `Doctor account deactivated. Access restricted.`;
    }
    
    await doc.save();

    res.json({ success: true, status: doc.status, message: showToastMessage });
  } catch (e) {
    res.status(500).json({ error: "Failed to update consultant roster status." });
  }
});

/* ==========================================
   REST ENDPOINTS: APPOINTMENTS LEDGER
   ========================================== */
app.get('/api/appointments', isAuthenticated, async (req, res) => {
  try {
    const { role, id } = req.session.user;
    let list = [];
    
    if (role === 'Admin') {
      list = await Appointment.find({});
    } else if (role === 'Doctor') {
      list = await Appointment.find({ doctorId: id });
    } else if (role === 'Patient') {
      list = await Appointment.find({ patientId: id });
    }
    
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch clinical appointments ledger." });
  }
});

app.post('/api/appointments', isAuthenticated, hasRole(['Admin', 'Patient']), async (req, res) => {
  try {
    const { patientId, doctorId, date, time, reason } = req.body;
    if (!patientId || !doctorId || !date || !time || !reason) {
      return res.status(400).json({ error: "Missing core appointment schedule details." });
    }

    if (req.session.user.role === 'Patient' && req.session.user.id !== patientId) {
      return res.status(403).json({ error: "Access Denied: Appointment scheduling identity mismatch." });
    }

    const lastAppt = await Appointment.findOne().sort({ id: -1 });
    let nextNum = 3004;
    if (lastAppt) {
      const lastNum = parseInt(lastAppt.id.replace('APT-', ''));
      nextNum = lastNum + 1;
    }
    const apptId = `APT-${nextNum}`;

    const newAppt = new Appointment({
      id: apptId,
      patientId,
      doctorId,
      date,
      time,
      reason,
      status: "Scheduled",
      diagnosis: null // default null
    });

    await newAppt.save();

    res.status(201).json(newAppt);
  } catch (e) {
    res.status(500).json({ error: "Failed to record consultation slot schedule." });
  }
});

app.post('/api/appointments/:id/cancel', isAuthenticated, hasRole(['Admin', 'Doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findOneAndUpdate(
      { id },
      { status: "Cancelled" },
      { new: true }
    );
    if (!appt) {
      return res.status(404).json({ error: "Appointment entry not found." });
    }

    res.json({ success: true, status: "Cancelled", message: "Consultation schedule slot cancelled." });
  } catch (e) {
    res.status(500).json({ error: "Failed to update appointment entry." });
  }
});

// Doctor enters diagnosis details linked directly to appointment
app.post('/api/appointments/:id/diagnose', isAuthenticated, hasRole(['Doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { symptoms, details, observations, notes } = req.body;
    if (!symptoms || !details) {
      return res.status(400).json({ error: "Symptoms and Diagnosis details are required fields." });
    }

    const appt = await Appointment.findOne({ id });
    if (!appt) {
      return res.status(404).json({ error: "Appointment entry not found." });
    }

    if (appt.doctorId !== req.session.user.id) {
      return res.status(403).json({ error: "Access Denied: Appointment not assigned to this doctor." });
    }

    appt.diagnosis = {
      symptoms,
      details,
      observations: observations || "",
      notes: notes || ""
    };

    await appt.save();
    
    res.json({ success: true, message: "Clinical Diagnosis saved inside appointment record.", appointment: appt });
  } catch (e) {
    res.status(500).json({ error: "Failed to record diagnosis." });
  }
});

// Doctor creates prescription linked directly inside the appointment record
app.post('/api/appointments/:id/prescribe', isAuthenticated, hasRole(['Doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { medicines, notes } = req.body;

    if (!medicines || !medicines.length) {
      return res.status(400).json({ error: "Please provide at least one medicine item." });
    }

    const appt = await Appointment.findOne({ id });
    if (!appt) {
      return res.status(404).json({ error: "Appointment entry not found." });
    }

    if (appt.doctorId !== req.session.user.id) {
      return res.status(403).json({ error: "Access Denied: Appointment not assigned to this doctor." });
    }

    if (!appt.diagnosis) {
      return res.status(400).json({ error: "Please enter diagnostic details first before prescribing medicines." });
    }

    const lastPresc = await Prescription.findOne().sort({ id: -1 });
    let nextNum = 5002;
    if (lastPresc) {
      const lastNum = parseInt(lastPresc.id.replace('PRSC-', ''));
      nextNum = lastNum + 1;
    }
    const prscId = `PRSC-${nextNum}`;

    const newPrescription = new Prescription({
      id: prscId,
      patientId: appt.patientId,
      doctorId: req.session.user.id,
      appointmentId: id,
      date: new Date().toISOString().split('T')[0],
      diagnosis: appt.diagnosis.details,
      medicines,
      notes: notes || appt.diagnosis.notes || ""
    });

    await newPrescription.save();

    appt.status = "Completed"; // complete appointment slot
    await appt.save();

    res.status(201).json({ success: true, message: "Prescription generated and appointment marked completed.", prescription: newPrescription });
  } catch (e) {
    res.status(500).json({ error: "Failed to generate prescription." });
  }
});

/* ==========================================
   REST ENDPOINTS: BILLING RECORDS
   ========================================== */
app.get('/api/billing', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const list = await Billing.find({});
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch invoices directory." });
  }
});

app.post('/api/billing', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { patientId, services, status } = req.body;
    if (!patientId || !services || !services.length || !status) {
      return res.status(400).json({ error: "All billing details must be filled." });
    }

    const lastBill = await Billing.findOne().sort({ id: -1 });
    let nextNum = 4003;
    if (lastBill) {
      const lastNum = parseInt(lastBill.id.replace('INV-', ''));
      nextNum = lastNum + 1;
    }
    const invId = `INV-${nextNum}`;
    const total = services.reduce((sum, s) => sum + s.price, 0);

    const newInvoice = new Billing({
      id: invId,
      patientId,
      date: new Date().toISOString().split('T')[0],
      services,
      total,
      status
    });

    await newInvoice.save();

    res.status(201).json(newInvoice);
  } catch (e) {
    res.status(500).json({ error: "Failed to log invoice statements." });
  }
});

app.post('/api/billing/:id/pay', isAuthenticated, hasRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Billing.findOneAndUpdate(
      { id },
      { status: "Paid" },
      { new: true }
    );
    if (!bill) {
      return res.status(404).json({ error: "Billing invoice profile not found." });
    }

    res.json({ success: true, status: "Paid", message: "Collected invoice payment successfully." });
  } catch (e) {
    res.status(500).json({ error: "Failed to register invoice transaction." });
  }
});

/* ==========================================
   REST ENDPOINTS: PRESCRIPTIONS MODULE
   ========================================== */
app.get('/api/prescriptions', isAuthenticated, async (req, res) => {
  try {
    const { role, id } = req.session.user;
    let list = [];

    if (role === 'Admin') {
      list = await Prescription.find({});
    } else if (role === 'Doctor') {
      list = await Prescription.find({ doctorId: id });
    } else if (role === 'Patient') {
      list = await Prescription.find({ patientId: id });
    }
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed to read prescriptions records." });
  }
});

/* ==========================================
   STATIC FILES AND WORKSPACE REDIRECT ROUTING
   ========================================== */
app.use(express.static(__dirname));

app.get('/pages/admin.html', isAuthenticated, hasRole(['Admin']), (req, res, next) => {
  next();
});

app.get('/pages/doctor.html', isAuthenticated, hasRole(['Doctor']), (req, res, next) => {
  next();
});

app.get('/pages/patient.html', isAuthenticated, hasRole(['Patient']), (req, res, next) => {
  next();
});

// General redirects back to Authentication page if accessed unauthorized
app.use((err, req, res, next) => {
  if (err && err.status === 401) {
    return res.redirect('/pages/auth.html');
  }
  next();
});

// Start Express Server
app.listen(PORT, async () => {
  await db.init();
  console.log(`==========================================`);
  console.log(` AuraCare HMS server is running on:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`==========================================`);
});
