let activeDoctor = null;

// Local arrays
let myPatients = [];
let myAppointments = [];
let myPrescriptions = [];

async function initDoctorPortal() {
  activeDoctor = await guardRoute(['Doctor']);
  if (!activeDoctor) return;

  await refreshDoctorData();
}

async function refreshDoctorData() {
  try {
    // 1. Fetch assigned patients
    myPatients = await fetchAPI('/api/patients/assigned');
    
    // 2. Fetch appointments (Server automatically filters by Doctor ID)
    myAppointments = await fetchAPI('/api/appointments');
    
    // 3. Fetch prescriptions (Filtered by Doctor ID)
    myPrescriptions = await fetchAPI('/api/prescriptions');

    renderAll();
  } catch (err) {
    showToast("Failed to sync clinical workspace databases.", "danger");
  }
}

function renderAll() {
  renderDoctorHeader();
  renderOverviewMetrics();
  renderOverviewAppointments();
  renderPatientsGrid();
  renderAppointmentsTable();
  renderPrescriptionsHistoryTable();
  renderDoctorProfileCard();
}

function renderDoctorHeader() {
  const headerAvatar = document.getElementById("doctor-header-avatar");
  const headerFullname = document.getElementById("doctor-header-fullname");
  
  if (activeDoctor) {
    const initials = activeDoctor.name.replace("Dr. ", "").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    if (headerAvatar) headerAvatar.innerText = initials;
    if (headerFullname) headerFullname.innerText = activeDoctor.name;
  }
}

/* ==========================================
   VIEW: DASHBOARD OVERVIEW
   ========================================== */
function renderOverviewMetrics() {
  const patientCount = myPatients.length;
  const apptCount = myAppointments.filter(a => a.status === 'Scheduled').length;
  const prescCount = myPrescriptions.length;

  const pEl = document.getElementById("metric-doc-patients");
  const aEl = document.getElementById("metric-doc-appointments");
  const prEl = document.getElementById("metric-doc-prescriptions");

  if (pEl) pEl.innerText = patientCount;
  if (aEl) aEl.innerText = apptCount;
  if (prEl) prEl.innerText = prescCount;
}

function renderOverviewAppointments() {
  const tbody = document.getElementById("doc-overview-appointments-table");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Show top 3 scheduled consults
  const activeAppts = myAppointments.filter(a => a.status === 'Scheduled').slice(0, 3);
  if (activeAppts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: var(--space-md);">No scheduled consultations in queue.</td></tr>`;
    return;
  }

  activeAppts.forEach(appt => {
    const patientObj = myPatients.find(p => p.id === appt.patientId);
    const patientName = patientObj ? patientObj.name : "Registered Patient";

    tbody.innerHTML += `
      <tr>
        <td><strong style="color: var(--primary-dark);">${patientName}</strong></td>
        <td>
          <div style="font-weight: 500;">${appt.date}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${appt.time}</div>
        </td>
        <td><div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${appt.reason}</div></td>
        <td><span class="badge badge-success">${appt.status}</span></td>
      </tr>
    `;
  });
}

/* ==========================================
   VIEW: MY PATIENTS GRID
   ========================================== */
function renderPatientsGrid() {
  const container = document.getElementById("assigned-patients-container");
  if (!container) return;
  container.innerHTML = "";

  if (myPatients.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: span 3; text-align: center; width: 100%;">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        <h3>No Assigned Patients</h3>
        <p>Your roster will automatically update when patients schedule consultations with you.</p>
      </div>
    `;
    return;
  }

  myPatients.forEach(p => {
    const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    container.innerHTML += `
      <div class="assigned-patient-card fade-in">
        <div class="assigned-pat-header">
          <div class="assigned-pat-avatar">${initials}</div>
          <div class="assigned-pat-meta">
            <h4>${p.name}</h4>
            <p>ID: ${p.id}</p>
          </div>
        </div>

        <div class="assigned-pat-body">
          <div>
            <span>Gender / Age</span>
            <p>${p.gender} / ${p.age}</p>
          </div>
          <div>
            <span>Blood Group</span>
            <p>${p.bloodGroup}</p>
          </div>
        </div>

        <div style="margin-top: var(--space-md); border-top: 1px solid var(--border-color); padding-top: var(--space-sm); display: flex; justify-content: flex-end;">
          <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-color: var(--primary); color: var(--primary);" onclick="switchSidebarTab('doctor-appts')">
            Manage Appointments
          </button>
        </div>
      </div>
    `;
  });
}

/* ==========================================
   VIEW: APPOINTMENTS QUEUE TABLE
   ========================================== */
function renderAppointmentsTable() {
  const tbody = document.getElementById("doctor-appointments-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (myAppointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <h3>No Appointments Listed</h3>
            <p>Your calendar currently has no scheduled consultation slots.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  myAppointments.forEach(appt => {
    const patientObj = myPatients.find(p => p.id === appt.patientId);
    const patientName = patientObj ? patientObj.name : "Registered Patient";

    let diagnoseBtn = "";
    let prescribeBtn = "";

    if (appt.status === 'Scheduled') {
      const hasDiagnosis = !!appt.diagnosis;
      diagnoseBtn = `<button class="btn btn-accent" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; font-weight: 600;" onclick="triggerDiagnose('${appt.id}')">${hasDiagnosis ? 'Edit Diagnosis' : 'Add Diagnosis'}</button>`;
      prescribeBtn = `<button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; font-weight: 600;" ${hasDiagnosis ? '' : 'disabled style="opacity: 0.65; cursor: not-allowed; pointer-events: none;"'} onclick="triggerPrescribe('${appt.id}')">Prescribe</button>`;
    } else if (appt.status === 'Completed') {
      diagnoseBtn = `<span style="color: var(--success); font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 4px;">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
        Diagnosed
      </span>`;
      prescribeBtn = `<span style="color: var(--primary); font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 4px;">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
        Prescribed
      </span>`;
    } else {
      diagnoseBtn = `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`;
      prescribeBtn = `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`;
    }

    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600;">${appt.id}</td>
        <td><div style="font-weight: 600; color: var(--primary-dark);">${patientName}</div></td>
        <td>${appt.date}</td>
        <td>${appt.time}</td>
        <td><div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${appt.reason}">${appt.reason}</div></td>
        <td>${diagnoseBtn}</td>
        <td>${prescribeBtn}</td>
        <td>
          <span class="badge ${appt.status === 'Scheduled' ? 'badge-success' : appt.status === 'Completed' ? 'badge-primary' : 'badge-danger'}">
            ${appt.status}
          </span>
        </td>
      </tr>
    `;
  });
}

/* ==========================================
   DIAGNOSE DRAWER LOGIC
   ========================================== */
function triggerDiagnose(apptId) {
  const appt = myAppointments.find(a => a.id === apptId);
  if (!appt) return;

  const patientObj = myPatients.find(p => p.id === appt.patientId);
  const patientName = patientObj ? patientObj.name : "Registered Patient";

  document.getElementById("diagnose-appt-id").value = apptId;
  document.getElementById("diagnose-patient-display").innerText = `${patientName} (${appt.patientId})`;

  // Pre-fill if diagnosis already exists
  if (appt.diagnosis) {
    document.getElementById("diag-symptoms").value = appt.diagnosis.symptoms || "";
    document.getElementById("diag-details").value = appt.diagnosis.details || "";
    document.getElementById("diag-observations").value = appt.diagnosis.observations || "";
    document.getElementById("diag-notes").value = appt.diagnosis.notes || "";
  } else {
    document.getElementById("diagnose-form").reset();
  }

  openDrawer("diagnose-drawer");
}

async function handleDiagnoseSubmit(e) {
  e.preventDefault();
  const apptId = document.getElementById("diagnose-appt-id").value;
  const symptoms = document.getElementById("diag-symptoms").value.trim();
  const details = document.getElementById("diag-details").value.trim();
  const observations = document.getElementById("diag-observations").value.trim();
  const notes = document.getElementById("diag-notes").value.trim();

  try {
    await fetchAPI(`/api/appointments/${apptId}/diagnose`, {
      method: 'POST',
      body: JSON.stringify({ symptoms, details, observations, notes })
    });

    showToast("Diagnosis saved successfully!", "success");
    closeDrawer("diagnose-drawer");
    await refreshDoctorData();
  } catch (err) {
    // API shows error automatically
  }
}

/* ==========================================
   PRESCRIBE DRAWER LOGIC
   ========================================== */
function triggerPrescribe(apptId) {
  const appt = myAppointments.find(a => a.id === apptId);
  if (!appt) return;

  if (!appt.diagnosis) {
    showToast("Please enter diagnostic details first before prescribing medicines.", "danger");
    return;
  }

  const patientObj = myPatients.find(p => p.id === appt.patientId);
  const patientName = patientObj ? patientObj.name : "Registered Patient";

  document.getElementById("prescribe-appt-id").value = apptId;
  document.getElementById("prescribe-patient-display").innerText = `${patientName} (${appt.patientId})`;
  document.getElementById("prescribe-diagnosis-display").innerText = `Diagnosis: ${appt.diagnosis.details}`;

  // Reset medicine entries
  document.getElementById("medicine-entries-wrap").innerHTML = "";
  addMedicineFormRow(); // Add one default empty row

  // Set advice / notes from diagnosis as default starting clinical notes
  document.getElementById("presc-notes").value = appt.diagnosis.notes || "";

  openDrawer("prescribe-drawer");
}

function addMedicineFormRow(name = "", dosage = "", frequency = "", duration = "") {
  const container = document.getElementById("medicine-entries-wrap");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "medicine-entry-row";
  row.innerHTML = `
    <input type="text" class="med-name" placeholder="Medicine Name (e.g. Paracetamol)" value="${name}" required>
    <input type="text" class="med-dosage" placeholder="Dosage (e.g. 1 Tablet)" value="${dosage}" required>
    <input type="text" class="med-freq" placeholder="Frequency (e.g. 3 Times Daily)" value="${frequency}" required>
    <input type="text" class="med-dur" placeholder="Duration (e.g. 5 Days)" value="${duration}" required>
    <button type="button" class="remove-med-btn" onclick="this.parentElement.remove()" title="Remove Medicine">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </button>
  `;
  container.appendChild(row);
}

async function handlePrescribeSubmit(e) {
  e.preventDefault();
  const apptId = document.getElementById("prescribe-appt-id").value;
  const notes = document.getElementById("presc-notes").value.trim();

  // Gather medicines from dynamic entry rows
  const medRows = document.querySelectorAll(".medicine-entry-row");
  const medicines = [];

  medRows.forEach(row => {
    const name = row.querySelector(".med-name").value.trim();
    const dosage = row.querySelector(".med-dosage").value.trim();
    const frequency = row.querySelector(".med-freq").value.trim();
    const duration = row.querySelector(".med-dur").value.trim();

    if (name && dosage && frequency && duration) {
      medicines.push({ name, dosage, frequency, duration });
    }
  });

  if (medicines.length === 0) {
    showToast("Please add at least one medicine item.", "danger");
    return;
  }

  try {
    await fetchAPI(`/api/appointments/${apptId}/prescribe`, {
      method: 'POST',
      body: JSON.stringify({ medicines, notes })
    });

    showToast("Prescription generated successfully!", "success");
    closeDrawer("prescribe-drawer");
    await refreshDoctorData();
    
    // Switch to history log
    switchSidebarTab('presc-history');
  } catch (err) {
    // API shows error automatically
  }
}

/* ==========================================
   VIEW: PRESCRIPTION HISTORY
   ========================================== */
function renderPrescriptionsHistoryTable() {
  const tbody = document.getElementById("doctor-presc-history-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (myPrescriptions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <h3>No Prescriptions History</h3>
            <p>You have not issued any prescriptions to patients yet.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  myPrescriptions.forEach(p => {
    const patientObj = myPatients.find(pat => pat.id === p.patientId);
    const patientName = patientObj ? patientObj.name : "Registered Patient";

    const medSummary = p.medicines.map(m => `<strong>${m.name}</strong> (${m.dosage} | ${m.frequency} | ${m.duration})`).join('<br>');

    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600; color: var(--primary);">${p.id}</td>
        <td><div style="font-weight: 600; color: var(--primary-dark);">${patientName}</div></td>
        <td>${p.date}</td>
        <td><span style="font-weight: 500;">${p.diagnosis}</span></td>
        <td style="font-size: 0.8rem; line-height: 1.6;">${medSummary}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">${p.notes || "--"}</td>
      </tr>
    `;
  });
}

/* ==========================================
   VIEW: DOCTOR PROFILE CARD
   ========================================== */
function renderDoctorProfileCard() {
  const profName = document.getElementById("doc-prof-name");
  const profSpec = document.getElementById("doc-prof-specialty");
  const profAvatar = document.getElementById("doc-prof-avatar");
  const profQualification = document.getElementById("doc-prof-qualification");
  const profExp = document.getElementById("doc-prof-experience");
  const profFee = document.getElementById("doc-prof-fee");
  const profStatus = document.getElementById("doc-prof-status");
  const profEmail = document.getElementById("doc-prof-email");
  const profContact = document.getElementById("doc-prof-contact");

  if (!activeDoctor) return;

  fetchAPI('/api/doctors')
    .then(list => {
      const details = list.find(d => d.id === activeDoctor.id);
      if (details) {
        const initials = details.name.replace("Dr. ", "").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
        if (profAvatar) profAvatar.innerText = initials;
        if (profName) profName.innerText = details.name;
        if (profSpec) profSpec.innerText = `${details.specialty} Specialist`;
        if (profQualification) profQualification.innerText = details.qualification || "MD, DM";
        if (profExp) profExp.innerText = `${details.experience} Years`;
        if (profFee) profFee.innerText = `₹${details.fee || 1200}`;
        if (profStatus) profStatus.innerText = details.status;
        if (profEmail) profEmail.innerText = details.email;
        if (profContact) profContact.innerText = details.contact;
      }
    });
}

/* ==========================================
   DRAWER UTILITY DECLARATIONS
   ========================================== */
function openDrawer(drawerId) {
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById(drawerId);
  if (overlay) overlay.style.display = "block";
  if (drawer) {
    drawer.classList.add("active");
  }
}

function closeDrawer(drawerId) {
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById(drawerId);
  if (drawer) drawer.classList.remove("active");
  
  const activeDrawers = document.querySelectorAll(".modal-drawer.active");
  if (overlay && activeDrawers.length === 0) {
    overlay.style.display = "none";
  }
}

function closeAllDrawers() {
  document.querySelectorAll(".modal-drawer").forEach(d => d.classList.remove("active"));
  const overlay = document.getElementById("drawer-overlay");
  if (overlay) overlay.style.display = "none";
}

/* ==========================================
   SIDEBAR WORKSPACE SWITCHER
   ========================================== */
function switchView(viewId, clickedBtn) {
  const sections = document.querySelectorAll(".view-section");
  sections.forEach(sec => sec.classList.remove("active"));
  
  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) targetSec.classList.add("active");

  const buttons = document.querySelectorAll(".sidebar-link");
  buttons.forEach(btn => btn.classList.remove("active"));
  if (clickedBtn) clickedBtn.classList.add("active");

  const headerTitle = document.getElementById("current-view-title");
  if (headerTitle) {
    switch (viewId) {
      case 'dashboard': headerTitle.innerText = "Doctor Dashboard Overview"; break;
      case 'doctor-patients': headerTitle.innerText = "My Patient Roster"; break;
      case 'doctor-appts': headerTitle.innerText = "Assigned Appointments Queue"; break;
      case 'presc-history': headerTitle.innerText = "My Prescribed Histories"; break;
      case 'doctor-profile': headerTitle.innerText = "My Specialist Profile"; break;
    }
  }

  const sidebar = document.getElementById("sidebar-nav");
  if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.remove("active");
  }
}

function switchSidebarTab(viewId) {
  const sidebarBtn = Array.from(document.querySelectorAll('.sidebar-link'))
    .find(btn => btn.querySelector('span').innerText.trim().toLowerCase() === viewId.toLowerCase() ||
                 btn.innerText.trim().toLowerCase() === viewId.toLowerCase() ||
                 (viewId === 'doctor-appts' && btn.querySelector('span').innerText.trim().toLowerCase() === 'appointments'));
  if (sidebarBtn) switchView(viewId, sidebarBtn);
}

// Initialize on startup
initDoctorPortal();
