const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || MONGODB_URI.includes('<username>')) {
  console.warn("\n==================================================================");
  console.warn(" WARNING: MongoDB connection string not configured in .env file!");
  console.warn(" Please update MONGODB_URI in the '.env' file with your MongoDB Atlas credentials.");
  console.warn("==================================================================\n");
}

// Schemas & Models Definition

// 1. User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Admin', 'Doctor', 'Patient'] },
  name: { type: String, required: true }
});

// 2. Patient Schema
const patientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  dob: { type: String, required: true },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
  bloodGroup: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  admittedDate: { type: String, required: true },
  profileInfo: { type: String, default: "No bio details added yet." }
});

// 3. Doctor Schema
const doctorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  qualification: { type: String, required: true },
  experience: { type: Number, required: true },
  contact: { type: String, required: true },
  status: { type: String, required: true, default: "On Duty", enum: ['On Duty', 'On Leave', 'Deactivated'] },
  fee: { type: Number, required: true },
  email: { type: String, required: true, unique: true, lowercase: true }
});

// 4. Appointment Schema
const appointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, required: true, default: "Scheduled", enum: ['Scheduled', 'Completed', 'Cancelled'] },
  diagnosis: {
    symptoms: { type: String },
    details: { type: String },
    observations: { type: String },
    notes: { type: String }
  }
});

// 5. Billing Schema
const billingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  date: { type: String, required: true },
  services: [{
    name: { type: String, required: true },
    price: { type: Number, required: true }
  }],
  total: { type: Number, required: true },
  status: { type: String, required: true, default: "Unpaid", enum: ['Paid', 'Unpaid'] }
});

// 6. Prescription Schema
const prescriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  appointmentId: { type: String, required: true },
  date: { type: String, required: true },
  diagnosis: { type: String, required: true },
  medicines: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true }
  }],
  notes: { type: String }
});

const User = mongoose.model('User', userSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Billing = mongoose.model('Billing', billingSchema);
const Prescription = mongoose.model('Prescription', prescriptionSchema);

// Defaults for Seeding
const DEFAULT_USERS = [
  { id: "ADMIN-88", email: "admin@mediflow.com", password: "admin123", role: "Admin", name: "Rahul Shirol" },
  { id: "DOC-2001", email: "sarah@mediflow.com", password: "doctor123", role: "Doctor", name: "Dr. Sarah Alston" },
  { id: "DOC-2002", email: "vikram@mediflow.com", password: "doctor123", role: "Doctor", name: "Dr. Vikram K. Malhotra" },
  { id: "DOC-2003", email: "david@mediflow.com", password: "doctor123", role: "Doctor", name: "Dr. David E. Thorne" },
  { id: "DOC-2004", email: "anita@mediflow.com", password: "doctor123", role: "Doctor", name: "Dr. Anita H. Desai" },
  { id: "PAT-1001", email: "ronald@example.com", password: "password123", role: "Patient", name: "Ronald M. Henderson" },
  { id: "PAT-1002", email: "patient@example.com", password: "password123", role: "Patient", name: "Eleanor S. Vance" },
  { id: "PAT-1003", email: "aarav@example.com", password: "password123", role: "Patient", name: "Aarav N. Patel" },
  { id: "PAT-1004", email: "miriam@example.com", password: "password123", role: "Patient", name: "Miriam E. Sterling" }
];

const DEFAULT_PATIENTS = [
  { id: "PAT-1001", name: "Ronald M. Henderson", age: 42, gender: "Male", dob: "1984-03-12", height: 182, weight: 80, bloodGroup: "O+", contact: "9448823112", email: "ronald@example.com", admittedDate: "2026-05-24" },
  { id: "PAT-1002", name: "Eleanor S. Vance", age: 29, gender: "Female", dob: "1997-08-25", height: 164, weight: 56, bloodGroup: "AB-", contact: "9845067118", email: "patient@example.com", admittedDate: "2026-05-28" },
  { id: "PAT-1003", name: "Aarav N. Patel", age: 61, gender: "Male", dob: "1965-11-05", height: 170, weight: 78, bloodGroup: "B+", contact: "9900244321", email: "aarav@example.com", admittedDate: "2026-05-15" },
  { id: "PAT-1004", name: "Miriam E. Sterling", age: 53, gender: "Female", dob: "1973-05-18", height: 158, weight: 62, bloodGroup: "A+", contact: "9886011998", email: "miriam@example.com", admittedDate: "2026-05-29" }
];

const DEFAULT_DOCTORS = [
  { id: "DOC-2001", name: "Dr. Sarah Alston", specialty: "Cardiology", qualification: "MD, DM", experience: 16, contact: "+91 99888 77771", status: "On Duty", fee: 1500, email: "sarah@mediflow.com" },
  { id: "DOC-2002", name: "Dr. Vikram K. Malhotra", specialty: "Neurology", qualification: "MD, DNB", experience: 18, contact: "+91 99888 77772", status: "On Duty", fee: 1800, email: "vikram@mediflow.com" },
  { id: "DOC-2003", name: "Dr. David E. Thorne", specialty: "Orthopedics", qualification: "MS, MCh", experience: 12, contact: "+91 99888 77773", status: "On Leave", fee: 1200, email: "david@mediflow.com" },
  { id: "DOC-2004", name: "Dr. Anita H. Desai", specialty: "Pediatrics", qualification: "MD, DCH", experience: 9, contact: "+91 99888 77774", status: "On Duty", fee: 1000, email: "anita@mediflow.com" }
];

const DEFAULT_APPOINTMENTS = [
  { id: "APT-3001", patientId: "PAT-1001", doctorId: "DOC-2001", date: "2026-05-31", time: "10:30", reason: "Regular Heart Valve Assessment", status: "Scheduled" },
  { id: "APT-3002", patientId: "PAT-1002", doctorId: "DOC-2004", date: "2026-05-31", time: "11:45", reason: "Pediatric Wellness Routine", status: "Scheduled" },
  { id: "APT-3003", patientId: "PAT-1003", doctorId: "DOC-2002", date: "2026-06-01", time: "09:15", reason: "Post-op Cranial Nerve Followup", status: "Scheduled" }
];

const DEFAULT_BILLING = [
  { id: "INV-4001", patientId: "PAT-1001", date: "2026-05-30", services: [{ name: "Consultation Fee", price: 1200 }, { name: "Comprehensive Lab Screening", price: 3500 }], total: 4700, status: "Paid" },
  { id: "INV-4002", patientId: "PAT-1003", date: "2026-05-30", services: [{ name: "Consultation Fee", price: 1200 }, { name: "ICU Ward Stay (Per Day)", price: 8500 }, { name: "Specialized Pharmacy / Meds", price: 2200 }], total: 11900, status: "Unpaid" }
];

const DEFAULT_PRESCRIPTIONS = [
  {
    id: "PRSC-5001",
    patientId: "PAT-1002",
    doctorId: "DOC-2001",
    appointmentId: "APT-3002",
    date: "2026-05-31",
    diagnosis: "General Fatigue & Vitamin Deficiency",
    medicines: [
      { name: "Vitamin D3 60K", dosage: "1 Capsule", frequency: "Once Weekly", duration: "8 Weeks" },
      { name: "Zincovit Multi-vit", dosage: "1 Tablet", frequency: "Once Daily", duration: "30 Days" }
    ],
    notes: "Get adequate sunlight and rest."
  }
];

async function seedDatabaseIfEmpty() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Database is empty. Seeding default clinical assets...");
      await User.insertMany(DEFAULT_USERS);
      await Patient.insertMany(DEFAULT_PATIENTS);
      await Doctor.insertMany(DEFAULT_DOCTORS);
      await Appointment.insertMany(DEFAULT_APPOINTMENTS);
      await Billing.insertMany(DEFAULT_BILLING);
      await Prescription.insertMany(DEFAULT_PRESCRIPTIONS);
      console.log("Database seeded successfully!");
    } else {
      console.log("Database already contains data. Skipping seeding.");
    }
  } catch (err) {
    console.error("Database seeding failed:", err);
  }
}

async function init() {
  if (!MONGODB_URI || MONGODB_URI.includes('<username>')) return;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Atlas connected successfully!");
    await seedDatabaseIfEmpty();
  } catch (err) {
    console.error("MongoDB Atlas connection failed:", err);
  }
}

module.exports = {
  init,
  User,
  Patient,
  Doctor,
  Appointment,
  Billing,
  Prescription
};
