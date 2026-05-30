let activePatient = null;

// Local arrays
let allDoctors = [];
let myAppointments = [];
let myPrescriptions = [];

async function initPatientPortal() {
  activePatient = await guardRoute(['Patient']);
  if (!activePatient) return;

  await refreshPatientData();
}

async function refreshPatientData() {
  try {
    // 1. Fetch available doctors
    allDoctors = await fetchAPI('/api/doctors');
    
    // 2. Fetch appointments (Filtered by Patient ID by the backend)
    myAppointments = await fetchAPI('/api/appointments');
    
    // 3. Fetch prescriptions issued to this patient
    myPrescriptions = await fetchAPI('/api/prescriptions');

    renderAll();
  } catch (err) {
    showToast("Failed to fetch patient care workspace data.", "danger");
  }
}

function renderAll() {
  renderPatientHeader();
  renderPatientProfile();
  renderDoctorsGrid();
  populateBookingOptions();
  renderAppointmentHistory();
  renderPrescriptionsList();
}

function renderPatientHeader() {
  const headerAvatar = document.getElementById("pat-header-avatar");
  const headerFullname = document.getElementById("pat-header-fullname");
  
  if (activePatient) {
    const initials = activePatient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    if (headerAvatar) headerAvatar.innerText = initials;
    if (headerFullname) headerFullname.innerText = activePatient.name;
  }
}

/* ==========================================
   VIEW: MY PATIENT PROFILE
   ========================================== */
function renderPatientProfile() {
  const profName = document.getElementById("pat-prof-name");
  const profId = document.getElementById("pat-prof-id");
  const profAvatar = document.getElementById("pat-prof-avatar");
  const profGender = document.getElementById("pat-prof-gender");
  const profDob = document.getElementById("pat-prof-dob");
  const profBlood = document.getElementById("pat-prof-blood");
  const profHeight = document.getElementById("pat-prof-height");
  const profWeight = document.getElementById("pat-prof-weight");
  const profContact = document.getElementById("pat-prof-contact");
  const profEmail = document.getElementById("pat-prof-email");
  const profAdmitted = document.getElementById("pat-prof-admitted");
  const profDesc = document.getElementById("pat-prof-desc");

  // Query my complete details from patients directory
  fetchAPI('/api/patients')
    .then(list => {
      const details = list.find(p => p.id === activePatient.id);
      if (details) {
        // Sync activePatient state name and email
        activePatient.name = details.name;
        activePatient.email = details.email;
        renderPatientHeader();

        const initials = details.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
        if (profAvatar) profAvatar.innerText = initials;
        if (profName) profName.innerText = details.name;
        if (profId) profId.innerText = details.id;
        if (profGender) profGender.innerText = details.gender;

        const dobOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const dobDate = new Date(details.dob).toLocaleDateString('en-US', dobOptions);
        if (profDob) profDob.innerText = dobDate;

        if (profBlood) profBlood.innerText = details.bloodGroup;
        if (profHeight) profHeight.innerText = `${details.height} cm`;
        if (profWeight) profWeight.innerText = `${details.weight} kg`;
        if (profContact) profContact.innerText = `+91 ${details.contact}`;
        if (profEmail) profEmail.innerText = details.email;
        if (profAdmitted) profAdmitted.innerText = details.admittedDate || "Not Specified";
        if (profDesc) profDesc.innerText = details.profileInfo || "No bio details added yet.";
      }
    });
}

/* ==========================================
   VIEW: EDIT PROFILE DRAWER
   ========================================== */
function openPatientEditDrawer() {
  if (!activePatient) return;

  fetchAPI('/api/patients')
    .then(list => {
      const details = list.find(p => p.id === activePatient.id);
      if (details) {
        document.getElementById("edit-pat-id-static").innerText = details.id;
        document.getElementById("edit-pat-admitted-static").innerText = details.admittedDate || "Not Specified";
        
        document.getElementById("edit-pat-name").value = details.name;
        document.getElementById("edit-pat-height").value = details.height;
        document.getElementById("edit-pat-weight").value = details.weight;
        document.getElementById("edit-pat-contact").value = details.contact;
        document.getElementById("edit-pat-email").value = details.email;
        document.getElementById("edit-pat-desc").value = details.profileInfo || "";

        openDrawer("patient-edit-drawer");
      }
    });
}

async function handlePatientEditSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById("edit-pat-name").value.trim();
  const height = parseInt(document.getElementById("edit-pat-height").value);
  const weight = parseInt(document.getElementById("edit-pat-weight").value);
  const contact = document.getElementById("edit-pat-contact").value.trim();
  const email = document.getElementById("edit-pat-email").value.trim();
  const profileInfo = document.getElementById("edit-pat-desc").value.trim();

  try {
    const data = await fetchAPI(`/api/patients/${activePatient.id}/profile`, {
      method: 'POST',
      body: JSON.stringify({ name, contact, height, weight, email, profileInfo })
    });

    if (data && data.success) {
      showToast("Profile credentials updated successfully!", "success");
      closeDrawer("patient-edit-drawer");
      await refreshPatientData();
    }
  } catch (err) {
    // API shows error automatically
  }
}

/* ==========================================
   VIEW: AVAILABLE DOCTORS GRID (READ-ONLY)
   ========================================== */
function renderDoctorsGrid() {
  const container = document.getElementById("pat-view-doctors-container");
  if (!container) return;
  container.innerHTML = "";

  if (allDoctors.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: span 3;">No doctors on panel currently.</div>`;
    return;
  }

  allDoctors.forEach(doc => {
    // Exclude deactivated doctors from patient scheduling grid
    if (doc.status === 'Deactivated') return;

    const initials = doc.name.replace("Dr. ", "").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    
    container.innerHTML += `
      <div class="patient-doc-card fade-in">
        <div class="pat-doc-header">
          <div class="pat-doc-avatar">${initials}</div>
          <div class="pat-doc-meta">
            <h4>${doc.name}</h4>
            <p>${doc.specialty}</p>
          </div>
        </div>

        <div class="pat-doc-body">
          <div>
            <span>Specialty Area</span>
            <p>${doc.specialty}</p>
          </div>
          <div>
            <span>Consultation Fee</span>
            <p>₹${doc.fee || 1200}</p>
          </div>
        </div>

        <div class="pat-doc-footer">
          <span class="badge ${doc.status === 'On Duty' ? 'badge-success' : 'badge-warning'}">
            ${doc.status}
          </span>
          ${doc.status === 'On Duty' ? 
            `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-color: var(--primary); color: var(--primary);" onclick="triggerBookSlotForDoctor('${doc.id}')">Book Session</button>` : 
            `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; opacity: 0.5; cursor: not-allowed;" disabled>On Leave</button>`
          }
        </div>
      </div>
    `;
  });
}

function triggerBookSlotForDoctor(docId) {
  switchSidebarTab('pat-book');
  const select = document.getElementById("pat-book-docselect");
  if (select) select.value = docId;
}

/* ==========================================
   VIEW: APPOINTMENT BOOKING & EXCLUSIVE LEDGER
   ========================================== */
function populateBookingOptions() {
  const docSelect = document.getElementById("pat-book-docselect");
  const selfNameInput = document.getElementById("pat-book-selfname");

  if (selfNameInput && activePatient) {
    selfNameInput.value = activePatient.name;
  }

  if (docSelect) {
    docSelect.innerHTML = `<option value="" disabled selected>Select active doctor</option>`;
    // Exclude deactivated doctors from selection
    allDoctors.filter(d => d.status === 'On Duty').forEach(doc => {
      docSelect.innerHTML += `<option value="${doc.id}">${doc.name} (${doc.specialty})</option>`;
    });
  }
}

async function handlePatientBookSubmit(e) {
  e.preventDefault();

  const doctorId = document.getElementById("pat-book-docselect").value;
  const date = document.getElementById("pat-book-date").value;
  const time = document.getElementById("pat-book-time").value;
  const reason = document.getElementById("pat-book-reason").value.trim();

  try {
    await fetchAPI('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({ patientId: activePatient.id, doctorId, date, time, reason })
    });

    showToast("Appointment slot scheduled successfully!", "success");
    document.getElementById("pat-appointment-form").reset();
    await refreshPatientData();
    switchSidebarTab('pat-history');
  } catch (err) {}
}

function renderAppointmentHistory() {
  const tbody = document.getElementById("pat-history-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (myAppointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <h3>No Appointments History</h3>
            <p>You have not booked any diagnostic consultation sessions yet.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  myAppointments.forEach(appt => {
    const doctorObj = allDoctors.find(d => d.id === appt.doctorId);
    const doctorName = doctorObj ? doctorObj.name : "Removed Specialist";

    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600;">${appt.id}</td>
        <td style="font-weight: 600; color: var(--primary-dark);">${doctorName}</td>
        <td>${appt.date}</td>
        <td>${appt.time}</td>
        <td><div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${appt.reason}">${appt.reason}</div></td>
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
   VIEW: MY PRESCRIPTIONS LOGS (READ-ONLY)
   ========================================== */
function renderPrescriptionsList() {
  const container = document.getElementById("patient-prescriptions-container");
  if (!container) return;
  container.innerHTML = "";

  if (myPrescriptions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <h3>No Prescriptions Issued</h3>
        <p>No medical prescriptions have been issued to your account yet.</p>
      </div>
    `;
    return;
  }

  myPrescriptions.forEach(p => {
    const doctorObj = allDoctors.find(d => d.id === p.doctorId);
    const doctorName = doctorObj ? doctorObj.name : "Consultant Specialist";
    const doctorSpec = doctorObj ? doctorObj.specialty : "Medical Panel";

    // Itemized table body
    const tableRows = p.medicines.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.dosage}</td>
        <td>${m.frequency}</td>
        <td>${m.duration}</td>
      </tr>
    `).join("");

    container.innerHTML += `
      <div class="prescription-patient-card fade-in" style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-xl); margin-bottom: var(--space-lg); box-shadow: var(--shadow-sm);">
        <div class="presc-card-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-sm); margin-bottom: var(--space-md);">
          <h4 style="color: var(--primary); font-size: 1.1rem; font-weight: 700;">Prescription Ref: ${p.id}</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Date Issued: <strong>${p.date}</strong></p>
        </div>

        <div class="presc-card-grid" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: var(--space-xl);">
          <!-- Diagnostics & Doctor metadata -->
          <div class="presc-card-meta">
            <div class="presc-meta-item" style="margin-bottom: var(--space-md);">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-light); font-weight: 600; display: block;">Prescribed Doctor</span>
              <p style="font-weight: 600; color: var(--primary-dark);">${doctorName} (${doctorSpec})</p>
            </div>
            <div class="presc-meta-item" style="margin-bottom: var(--space-md);">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-light); font-weight: 600; display: block;">Diagnosis / Findings</span>
              <p style="color: var(--accent); font-weight: 700; font-size: 1rem;">${p.diagnosis}</p>
            </div>
            <div class="presc-meta-item" style="border-top: 1px solid var(--border-color); padding-top: var(--space-sm); margin-top: var(--space-sm);">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-light); font-weight: 600; display: block;">Doctor's Advice / Notes</span>
              <p style="font-size: 0.85rem; font-style: italic; color: var(--text-muted); line-height: 1.5;">${p.notes || "Keep regular followup rest."}</p>
            </div>
          </div>

          <!-- Itemized Drugs Table -->
          <div>
            <table class="presc-medicines-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background-color: #fafbfc; border-bottom: 1px solid var(--border-color);">
                  <th style="text-align: left; padding: var(--space-sm); font-weight: 700; color: var(--text-muted);">Medicine Name</th>
                  <th style="text-align: left; padding: var(--space-sm); font-weight: 700; color: var(--text-muted);">Dosage</th>
                  <th style="text-align: left; padding: var(--space-sm); font-weight: 700; color: var(--text-muted);">Frequency</th>
                  <th style="text-align: left; padding: var(--space-sm); font-weight: 700; color: var(--text-muted);">Duration</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
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
      case 'pat-profile': headerTitle.innerText = "My Patient Profile"; break;
      case 'pat-doctors': headerTitle.innerText = "Our Clinical Panel Consultants"; break;
      case 'pat-book': headerTitle.innerText = "Schedule Consultation Slot"; break;
      case 'pat-history': headerTitle.innerText = "My Consultation History"; break;
      case 'pat-prescriptions': headerTitle.innerText = "My Issued Prescriptions"; break;
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
                 btn.innerText.trim().toLowerCase() === viewId.toLowerCase());
  if (sidebarBtn) switchView(viewId, sidebarBtn);
}

// Initialize Portal
initPatientPortal();
