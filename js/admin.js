let activeAdmin = null;

// Local states for filtering
let allPatients = [];
let allDoctors = [];
let allAppointments = [];
let allBilling = [];
let allPrescriptions = [];

// Route Guard Administrative panel
async function initAdminPortal() {
  activeAdmin = await guardRoute(['Admin']);
  if (!activeAdmin) return;
  
  await refreshAdminData();
}

async function refreshAdminData() {
  try {
    allPatients = await fetchAPI('/api/patients');
    allDoctors = await fetchAPI('/api/doctors');
    allAppointments = await fetchAPI('/api/appointments');
    allBilling = await fetchAPI('/api/billing');
    allPrescriptions = await fetchAPI('/api/prescriptions');

    renderAll();
  } catch (e) {
    showToast("Failed to refresh administrative data ledger.", "danger");
  }
}

function renderAll() {
  populateDropdowns();
  renderOverviewMetrics();
  renderOverviewAppointments();
  renderOverviewDoctors();
  renderPatientsTable();
  renderDoctorsTable();
  renderAppointmentsTable();
  renderBillingTable();
  renderPrescriptionsTable();
}

/* ==========================================
   VIEW: DASHBOARD OVERVIEW METRICS & LOGS
   ========================================== */
function renderOverviewMetrics() {
  const patientCount = allPatients.length;
  const doctorCount = allDoctors.length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const apptsToday = allAppointments.filter(a => a.date === todayStr && a.status === 'Scheduled').length;
  const pendingInvoices = allBilling.filter(b => b.status === 'Unpaid').length;

  const pEl = document.getElementById("metric-patients");
  const dEl = document.getElementById("metric-doctors");
  const aEl = document.getElementById("metric-appointments");
  const bEl = document.getElementById("metric-billing");

  if (pEl) pEl.innerText = patientCount;
  if (dEl) dEl.innerText = doctorCount;
  if (aEl) aEl.innerText = apptsToday;
  if (bEl) bEl.innerText = pendingInvoices;
}

function renderOverviewAppointments() {
  const tbody = document.getElementById("overview-appointments-table");
  if (!tbody) return;
  tbody.innerHTML = "";

  const recent = allAppointments.slice(-3).reverse();
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1rem;">No appointments scheduled today.</td></tr>`;
    return;
  }

  recent.forEach(appt => {
    const patientObj = allPatients.find(p => p.id === appt.patientId);
    const doctorObj = allDoctors.find(d => d.id === appt.doctorId);
    const patientName = patientObj ? patientObj.name : "Archived Patient";
    const doctorName = doctorObj ? doctorObj.name : "Unknown Consultant";
    const initials = patientName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

    tbody.innerHTML += `
      <tr>
        <td>
          <div class="patient-cell">
            <div class="patient-initials">${initials}</div>
            <span style="font-weight: 500;">${patientName}</span>
          </div>
        </td>
        <td>${doctorName}</td>
        <td>
          <div style="font-weight: 500;">${appt.date}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${appt.time}</div>
        </td>
        <td>
          <span class="badge ${appt.status === 'Scheduled' ? 'badge-success' : appt.status === 'Completed' ? 'badge-primary' : 'badge-danger'}">
            ${appt.status}
          </span>
        </td>
      </tr>
    `;
  });
}

function renderOverviewDoctors() {
  const container = document.getElementById("overview-doctors-list");
  if (!container) return;
  container.innerHTML = "";

  const activeDocs = allDoctors.filter(d => d.status === 'On Duty').slice(0, 3);
  if (activeDocs.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: var(--space-md);">No consultants currently on duty.</div>`;
    return;
  }

  activeDocs.forEach(doc => {
    const initials = doc.name.replace("Dr. ", "").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
    container.innerHTML += `
      <div class="quick-doctor-card">
        <div class="doctor-profile-info">
          <div class="doctor-avatar-box">${initials}</div>
          <div class="doctor-meta">
            <h4>${doc.name}</h4>
            <p>${doc.specialty}</p>
          </div>
        </div>
        <span class="badge badge-info" style="font-size: 0.65rem;">Active</span>
      </div>
    `;
  });
}

/* ==========================================
   VIEW: PATIENT LIST & REGISTRY ACTIONS
   ========================================== */
function renderPatientsTable(filteredList = null) {
  const tbody = document.getElementById("patients-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = filteredList || allPatients;
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <h3>No Patients Found</h3>
            <p>Modify search filters or register a new patient to populate the index.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(p => {
    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600; color: var(--primary);">${p.id}</td>
        <td><div style="font-weight: 600; color: var(--primary-dark);">${p.name}</div></td>
        <td>${p.age} / ${p.gender}</td>
        <td><span class="badge badge-info" style="font-size: 0.75rem;">${p.bloodGroup}</span></td>
        <td>${p.contact}</td>
        <td>${p.admittedDate}</td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: var(--danger);" onclick="archivePatient('${p.id}')">Archive</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function filterPatients() {
  const query = document.getElementById("patient-search-input").value.trim().toLowerCase();
  const filtered = allPatients.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.id.toLowerCase().includes(query) || 
    p.bloodGroup.toLowerCase().includes(query)
  );
  renderPatientsTable(filtered);
}

async function handleRegisterPatientSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById("pat-name").value.trim();
  const age = document.getElementById("pat-age").value;
  const gender = document.getElementById("pat-gender").value;
  const bloodGroup = document.getElementById("pat-blood").value;
  const contact = document.getElementById("pat-contact").value.trim();
  const email = document.getElementById("pat-email").value.trim();
  const admittedDate = document.getElementById("pat-admitted").value;

  try {
    await fetchAPI('/api/patients', {
      method: 'POST',
      body: JSON.stringify({ name, age, gender, bloodGroup, contact, email, admittedDate })
    });
    
    showToast(`Patient registered successfully. Default password is 'password123'`, "success");
    document.getElementById("patient-form").reset();
    closeDrawer('patient-drawer');
    await refreshAdminData();
  } catch (err) {}
}

async function archivePatient(id) {
  if (!confirm(`Are you sure you want to archive patient ${id} and delete all related clinical logs?`)) return;
  try {
    await fetchAPI(`/api/patients/${id}`, { method: 'DELETE' });
    showToast("Patient record archived.", "success");
    await refreshAdminData();
  } catch (e) {}
}

/* ==========================================
   VIEW: DOCTOR ROSTERS & ACTIONS
   ========================================== */
function renderDoctorsTable(filteredList = null) {
  const tbody = document.getElementById("doctors-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = filteredList || allDoctors;
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            <h3>No Consultants Found</h3>
            <p>Modify search query details or add a new specialist portfolio.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(d => {
    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600; color: var(--primary);">${d.id}</td>
        <td><div style="font-weight: 600; color: var(--primary-dark);">${d.name}</div></td>
        <td><span style="font-weight: 500;">${d.specialty}</span></td>
        <td><span style="font-weight: 500;">${d.qualification || "MD, DM"}</span></td>
        <td>${d.experience} Years</td>
        <td>${d.contact}</td>
        <td>
          <span class="badge ${d.status === 'On Duty' ? 'badge-success' : d.status === 'On Leave' ? 'badge-warning' : 'badge-danger'}">
            ${d.status}
          </span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-accent" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600;" onclick="triggerEditDoctor('${d.id}')">Edit</button>
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: var(--text-muted); font-weight: 600;" onclick="toggleDoctorStatus('${d.id}')">Toggle Duty</button>
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: var(--danger); font-weight: 600;" onclick="deleteDoctor('${d.id}')">Remove</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function filterDoctors() {
  const query = document.getElementById("doctor-search-input").value.trim().toLowerCase();
  const filtered = allDoctors.filter(d => 
    d.name.toLowerCase().includes(query) || 
    d.specialty.toLowerCase().includes(query) || 
    d.id.toLowerCase().includes(query)
  );
  renderDoctorsTable(filtered);
}

async function handleAddDoctorSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById("doc-name").value.trim();
  const specialty = document.getElementById("doc-specialty").value;
  const qualification = document.getElementById("doc-qualification").value.trim();
  const experience = parseInt(document.getElementById("doc-experience").value);
  const contact = document.getElementById("doc-contact").value.trim();
  const email = document.getElementById("doc-email").value.trim();
  const password = document.getElementById("doc-password").value.trim();

  try {
    await fetchAPI('/api/doctors', {
      method: 'POST',
      body: JSON.stringify({ name, specialty, qualification, experience, contact, email, password })
    });
    
    showToast(`Consultant registered successfully. Default password is '${password}'`, "success");
    document.getElementById("doctor-form").reset();
    closeDrawer('doctor-drawer');
    await refreshAdminData();
  } catch (err) {}
}

function triggerEditDoctor(id) {
  const doc = allDoctors.find(d => d.id === id);
  if (!doc) return;

  document.getElementById("edit-doc-id").value = doc.id;
  document.getElementById("edit-doc-name").value = doc.name;
  document.getElementById("edit-doc-specialty").value = doc.specialty;
  document.getElementById("edit-doc-qualification").value = doc.qualification || "MD, DM";
  document.getElementById("edit-doc-experience").value = doc.experience;
  document.getElementById("edit-doc-contact").value = doc.contact;
  document.getElementById("edit-doc-email").value = doc.email || "";

  openDrawer("doctor-edit-drawer");
}

async function handleEditDoctorSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("edit-doc-id").value;
  const name = document.getElementById("edit-doc-name").value.trim();
  const specialty = document.getElementById("edit-doc-specialty").value;
  const qualification = document.getElementById("edit-doc-qualification").value.trim();
  const experience = parseInt(document.getElementById("edit-doc-experience").value);
  const contact = document.getElementById("edit-doc-contact").value.trim();
  const email = document.getElementById("edit-doc-email").value.trim();

  try {
    await fetchAPI(`/api/doctors/${id}/edit`, {
      method: 'POST',
      body: JSON.stringify({ name, specialty, qualification, experience, contact, email })
    });

    showToast("Doctor profile updated successfully!", "success");
    closeDrawer("doctor-edit-drawer");
    await refreshAdminData();
  } catch (err) {}
}

async function toggleDoctorStatus(id) {
  try {
    const data = await fetchAPI(`/api/doctors/${id}/toggle`, { method: 'POST' });
    showToast(data.message, "success");
    await refreshAdminData();
  } catch (e) {}
}

async function deleteDoctor(id) {
  if (!confirm(`Are you sure you want to remove ${id} from registry panel?`)) return;
  try {
    await fetchAPI(`/api/doctors/${id}`, { method: 'DELETE' });
    showToast("Doctor profile deleted successfully.", "success");
    await refreshAdminData();
  } catch (e) {}
}

/* ==========================================
   VIEW: APPOINTMENTS QUEUES & CONTROLLERS
   ========================================== */
function renderAppointmentsTable() {
  const tbody = document.getElementById("appointments-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (allAppointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <h3>No Scheduled Consultations</h3>
            <p>Appointments will appear here once booked by patients or admins.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  allAppointments.forEach(appt => {
    const patientObj = allPatients.find(p => p.id === appt.patientId);
    const doctorObj = allDoctors.find(d => d.id === appt.doctorId);
    const patientName = patientObj ? patientObj.name : "Archived Patient";
    const doctorName = doctorObj ? doctorObj.name : "Removed Specialist";

    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600;">${appt.id}</td>
        <td><div style="font-weight: 600; color: var(--primary-dark);">${patientName}</div></td>
        <td>${doctorName}</td>
        <td>
          <div style="font-weight: 500;">${appt.date}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${appt.time}</div>
        </td>
        <td><div style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${appt.reason}">${appt.reason}</div></td>
        <td>
          <span class="badge ${appt.status === 'Scheduled' ? 'badge-success' : appt.status === 'Completed' ? 'badge-primary' : 'badge-danger'}">
            ${appt.status}
          </span>
        </td>
        <td>
          <div class="actions-cell">
            ${appt.status === 'Scheduled' ? 
              `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: var(--danger);" onclick="cancelAppointmentSlot('${appt.id}')">Cancel Slot</button>` : 
              `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: var(--text-light);" disabled>Completed / Cancelled</button>`
            }
          </div>
        </td>
      </tr>
    `;
  });
}

async function cancelAppointmentSlot(id) {
  if (!confirm("Are you sure you want to cancel this consultation slot?")) return;
  try {
    await fetchAPI(`/api/appointments/${id}/cancel`, { method: 'POST' });
    showToast("Appointment slot cancelled successfully.", "success");
    await refreshAdminData();
  } catch (e) {}
}

/* ==========================================
   VIEW: BILLING & DETAILED INVOICE PDFS
   ========================================== */
function renderBillingTable() {
  const tbody = document.getElementById("billing-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (allBilling.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            <h3>No Billing Records Found</h3>
            <p>Generate financial statements and invoice procedures for active patients.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  allBilling.forEach(bill => {
    const patientObj = allPatients.find(p => p.id === bill.patientId);
    const patientName = patientObj ? patientObj.name : "Archived Patient";
    const servicesSummary = bill.services.map(s => s.name).join(", ");

    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600; color: var(--primary);">${bill.id}</td>
        <td><div style="font-weight: 600; color: var(--primary-dark);">${patientName}</div></td>
        <td>${bill.date}</td>
        <td><div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${servicesSummary}">${servicesSummary}</div></td>
        <td style="font-weight: 700; color: var(--primary-dark);">₹${bill.total.toLocaleString('en-IN')}</td>
        <td>
          <span class="badge ${bill.status === 'Paid' ? 'badge-success' : 'badge-warning'}">
            ${bill.status}
          </span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="viewInvoice('${bill.id}')">View Invoice</button>
            ${bill.status === 'Unpaid' ? 
              `<button class="btn btn-accent" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="collectPayment('${bill.id}')">Collect Pay</button>` : 
              ''
            }
          </div>
        </td>
      </tr>
    `;
  });
}

function calculateInvoiceTotal() {
  let total = 0;
  const list = ['srv-consult', 'srv-icu', 'srv-lab', 'srv-pharmacy'];
  list.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) total += parseInt(el.value);
  });
  document.getElementById("inv-total-display").innerText = `₹${total.toLocaleString('en-IN')}`;
}

function resetInvoiceDrawer() {
  document.getElementById("invoice-form").reset();
  calculateInvoiceTotal();
}

async function handleCreateInvoiceSubmit(e) {
  e.preventDefault();

  const patientId = document.getElementById("inv-patient-select").value;
  const status = document.getElementById("inv-status").value;
  
  const services = [];
  const checks = [
    { id: 'srv-consult', name: 'Consultation Fee' },
    { id: 'srv-icu', name: 'ICU Ward Stay (Per Day)' },
    { id: 'srv-lab', name: 'Comprehensive Lab Screening' },
    { id: 'srv-pharmacy', name: 'Specialized Pharmacy / Meds' }
  ];

  checks.forEach(c => {
    const el = document.getElementById(c.id);
    if (el && el.checked) {
      services.push({ name: c.name, price: parseInt(el.value) });
    }
  });

  if (services.length === 0) {
    showToast("Select at least one clinical service item.", "danger");
    return;
  }

  try {
    await fetchAPI('/api/billing', {
      method: 'POST',
      body: JSON.stringify({ patientId, services, status })
    });
    
    showToast("Invoice generated successfully.", "success");
    closeDrawer('invoice-drawer');
    await refreshAdminData();
  } catch (err) {}
}

async function collectPayment(id) {
  try {
    await fetchAPI(`/api/billing/${id}/pay`, { method: 'POST' });
    showToast("Payment recorded successfully.", "success");
    await refreshAdminData();
  } catch (e) {}
}

function viewInvoice(id) {
  const bill = allBilling.find(b => b.id === id);
  if (!bill) return;

  const patient = allPatients.find(p => p.id === bill.patientId);
  const patientName = patient ? patient.name : "Archived Patient";
  const patientMeta = patient ? `${patient.age} / ${patient.gender}` : "--";
  const patientBlood = patient ? patient.bloodGroup : "--";
  const patientContact = patient ? patient.contact : "--";

  document.getElementById("modal-invoice-number").innerText = `#${bill.id}`;
  document.getElementById("modal-invoice-date").innerText = bill.date;
  
  document.getElementById("modal-patient-name").innerText = patientName;
  document.getElementById("modal-patient-meta").innerText = patientMeta;
  document.getElementById("modal-patient-blood").innerText = patientBlood;
  document.getElementById("modal-patient-contact").innerText = patientContact;

  const badgeContainer = document.getElementById("modal-invoice-status-badge");
  badgeContainer.innerHTML = `<span class="badge ${bill.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${bill.status}</span>`;

  const itemsTbody = document.getElementById("modal-invoice-items");
  itemsTbody.innerHTML = "";
  
  bill.services.forEach(srv => {
    itemsTbody.innerHTML += `
      <tr>
        <td>${srv.name}</td>
        <td class="text-right" style="font-weight: 500;">₹${srv.price.toLocaleString('en-IN')}</td>
      </tr>
    `;
  });

  document.getElementById("modal-invoice-subtotal").innerText = `₹${bill.total.toLocaleString('en-IN')}`;
  document.getElementById("modal-invoice-total").innerText = `₹${bill.total.toLocaleString('en-IN')}`;

  openStandardModal("invoice-modal");
}

function printInvoice() {
  const printContent = document.getElementById("invoice-print-area").innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Invoice - MediFlow</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .badge-success { background-color: #ecfdf5; color: #10b981; }
          .badge-warning { background-color: #fffbeb; color: #f59e0b; }
          .invoice-ribbon { float: right; }
          .invoice-header-block { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 40px; }
          .invoice-logo-meta h3 { color: #0f4c81; font-size: 24px; margin: 0 0 5px 0; }
          .invoice-logo-meta p { font-size: 13px; color: #64748b; margin: 3px 0; }
          .invoice-number-block { text-align: right; }
          .invoice-number-block h4 { font-size: 20px; color: #0f172a; margin: 0 0 5px 0; }
          .invoice-number-block p { font-size: 12px; color: #64748b; margin: 0; }
          .invoice-parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .invoice-party { width: 45%; }
          .invoice-party h5 { font-size: 12px; color: #94a3b8; text-transform: uppercase; margin: 0 0 10px 0; }
          .invoice-party p { font-size: 14px; line-height: 1.6; margin: 4px 0; }
          .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .invoice-table th { background-color: #f8fafc; padding: 10px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: left; }
          .invoice-table td { padding: 12px 10px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .invoice-summary-block { display: flex; justify-content: flex-end; }
          .invoice-summary-table { width: 280px; }
          .invoice-summary-table td { padding: 6px 0; font-size: 14px; }
          .invoice-summary-table td.lbl { color: #64748b; }
          .invoice-summary-table td.val { text-align: right; font-weight: bold; }
          .grand-total td { border-top: 2px solid #0f4c81; padding-top: 15px; font-size: 18px; color: #0f4c81; }
          .invoice-footer-block { margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/* ==========================================
   VIEW: PRESCRIPTIONS MONITORING
   ========================================== */
function renderPrescriptionsTable(filteredList = null) {
  const tbody = document.getElementById("prescriptions-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = filteredList || allPrescriptions;
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <h3>No Prescriptions Logged</h3>
            <p>Clinical specialists have not issued any patient treatment recipes.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(p => {
    const patientObj = allPatients.find(pat => pat.id === p.patientId);
    const doctorObj = allDoctors.find(d => d.id === p.doctorId);
    const patientName = patientObj ? patientObj.name : "Archived Patient";
    const doctorName = doctorObj ? doctorObj.name : "Unknown Consultant";

    const medSummary = p.medicines.map(m => `<strong>${m.name}</strong> (${m.dosage} | ${m.frequency} | ${m.duration})`).join('<br>');

    tbody.innerHTML += `
      <tr class="fade-in">
        <td style="font-family: monospace; font-weight: 600; color: var(--primary);">${p.id}</td>
        <td><div style="font-weight: 600; color: var(--primary-dark);">${patientName}</div></td>
        <td>${doctorName}</td>
        <td>${p.date}</td>
        <td><span style="font-weight: 500;">${p.diagnosis}</span></td>
        <td style="font-size: 0.8rem; line-height: 1.6;">${medSummary}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">${p.notes || "--"}</td>
      </tr>
    `;
  });
}

function filterPrescriptions() {
  const query = document.getElementById("presc-search-input").value.trim().toLowerCase();
  
  const filtered = allPrescriptions.filter(p => {
    const patientObj = allPatients.find(pat => pat.id === p.patientId);
    const doctorObj = allDoctors.find(d => d.id === p.doctorId);
    const patientName = patientObj ? patientObj.name.toLowerCase() : "";
    const doctorName = doctorObj ? doctorObj.name.toLowerCase() : "";
    
    return p.id.toLowerCase().includes(query) || 
           p.diagnosis.toLowerCase().includes(query) || 
           patientName.includes(query) || 
           doctorName.includes(query);
  });

  renderPrescriptionsTable(filtered);
}

/* ==========================================
   NAVIGATION VIEW CONTROLLER
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
      case 'dashboard': headerTitle.innerText = "Dashboard Overview"; break;
      case 'patients': headerTitle.innerText = "Patient Database"; break;
      case 'doctors': headerTitle.innerText = "Clinical Doctors Database"; break;
      case 'appointments': headerTitle.innerText = "Consultation Appointments ledger"; break;
      case 'billing': headerTitle.innerText = "Invoices & Billing records"; break;
      case 'prescriptions': headerTitle.innerText = "Prescription Monitoring Portal"; break;
    }
  }

  const sidebar = document.getElementById("sidebar-nav");
  if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.remove("active");
  }
}

function switchSidebarTab(viewId) {
  const sidebarBtn = Array.from(document.querySelectorAll('.sidebar-link'))
    .find(btn => btn.querySelector('span').innerText.trim().toLowerCase() === viewId.toLowerCase());
  if (sidebarBtn) switchView(viewId, sidebarBtn);
}

function openDrawer(drawerId) {
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById(drawerId);
  if (overlay) overlay.style.display = "block";
  if (drawer) {
    setTimeout(() => {
      drawer.classList.add("active");
    }, 10);
  }

  if (drawerId === 'patient-drawer') {
    document.getElementById("pat-admitted").valueAsDate = new Date();
  } else if (drawerId === 'invoice-drawer') {
    resetInvoiceDrawer();
  }
}

function closeDrawer(drawerId) {
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById(drawerId);
  if (drawer) drawer.classList.remove("active");
  setTimeout(() => {
    const activeDrawers = document.querySelectorAll(".modal-drawer.active");
    if (activeDrawers.length === 0 && overlay) overlay.style.display = "none";
  }, 300);
}

function closeAllDrawers() {
  document.querySelectorAll(".modal-drawer").forEach(d => d.classList.remove("active"));
  document.querySelectorAll(".modal-standard").forEach(m => m.classList.remove("active"));
  setTimeout(() => {
    const overlay = document.getElementById("drawer-overlay");
    if (overlay) overlay.style.display = "none";
  }, 300);
}

function openStandardModal(modalId) {
  const overlay = document.getElementById("drawer-overlay");
  const modal = document.getElementById(modalId);
  if (overlay) overlay.style.display = "block";
  if (modal) {
    setTimeout(() => {
      modal.classList.add("active");
    }, 10);
  }
}

function closeStandardModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
  setTimeout(() => {
    const overlay = document.getElementById("drawer-overlay");
    if (overlay) overlay.style.display = "none";
  }, 300);
}

function populateDropdowns() {
  const patSelect = document.getElementById("appt-patient-select");
  const docSelect = document.getElementById("appt-doctor-select");
  const invPatSelect = document.getElementById("inv-patient-select");

  if (patSelect) {
    patSelect.innerHTML = `<option value="" disabled selected>Choose registered patient</option>`;
    allPatients.forEach(p => {
      patSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.id})</option>`;
    });
  }

  if (docSelect) {
    docSelect.innerHTML = `<option value="" disabled selected>Choose clinical doctor</option>`;
    // Exclude deactivated doctors from admin booking selects as well
    allDoctors.filter(d => d.status === 'On Duty').forEach(d => {
      docSelect.innerHTML += `<option value="${d.id}">${d.name} (${d.specialty})</option>`;
    });
  }

  if (invPatSelect) {
    invPatSelect.innerHTML = `<option value="" disabled selected>Select billed patient</option>`;
    allPatients.forEach(p => {
      invPatSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.id})</option>`;
    });
  }
}

// Initialise Portal
initAdminPortal();
