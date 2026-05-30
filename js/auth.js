function toggleAuthForm(tab) {
  const tabSignin = document.getElementById("btn-tab-signin");
  const tabSignup = document.getElementById("btn-tab-signup");
  const cardSignin = document.getElementById("auth-signin-card");
  const cardSignup = document.getElementById("auth-signup-card");

  const errs = document.querySelectorAll(".auth-field-error");
  errs.forEach(e => e.classList.remove("visible"));

  if (tab === 'signin') {
    tabSignin.classList.add("active");
    tabSignup.classList.remove("active");
    cardSignin.classList.add("active");
    cardSignup.classList.remove("active");
  } else {
    tabSignup.classList.add("active");
    tabSignin.classList.remove("active");
    cardSignup.classList.add("active");
    cardSignin.classList.remove("active");
  }
}

// 1. Sign In Controller (Determined dynamically by backend)
async function handleSignInSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const data = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data && data.success) {
      showToast("Access Authorized. Preparing workspace...", "success");
      setTimeout(() => {
        window.location.href = `/pages/${data.role.toLowerCase()}.html`;
      }, 1000);
    }
  } catch (err) {
    showToast(err.message || "Invalid credentials.", "danger");
  }
}

// 2. Patient registration sign up (with strict frontend validations)
async function handleSignUpSubmit(e) {
  e.preventDefault();

  const errorLabels = document.querySelectorAll(".auth-field-error");
  errorLabels.forEach(el => el.classList.remove("visible"));

  const name = document.getElementById("reg-name").value.trim();
  const gender = document.getElementById("reg-gender").value;
  const dob = document.getElementById("reg-dob").value;
  const height = parseInt(document.getElementById("reg-height").value);
  const weight = parseInt(document.getElementById("reg-weight").value);
  const bloodGroup = document.getElementById("reg-blood").value;
  const contact = document.getElementById("reg-contact").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;

  let isValid = true;

  // Personal fields validation
  if (!name) {
    showErrorLabel("err-reg-name");
    isValid = false;
  }
  if (!gender) {
    showErrorLabel("err-reg-gender");
    isValid = false;
  }
  if (!dob) {
    showErrorLabel("err-reg-dob");
    isValid = false;
  }
  if (isNaN(height) || height <= 30) {
    showErrorLabel("err-reg-height");
    isValid = false;
  }
  if (isNaN(weight) || weight <= 2) {
    showErrorLabel("err-reg-weight");
    isValid = false;
  }
  if (!bloodGroup) {
    showErrorLabel("err-reg-blood");
    isValid = false;
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showErrorLabel("err-reg-email");
    isValid = false;
  }

  // Mobile number validation (10 digits)
  const contactRegex = /^[0-9]{10}$/;
  if (!contact || !contactRegex.test(contact)) {
    showErrorLabel("err-reg-contact");
    isValid = false;
  }

  // Password confirmation validation
  if (!password || password.length < 6) {
    showErrorLabel("err-reg-password");
    isValid = false;
  }
  if (password !== confirm) {
    showErrorLabel("err-reg-confirm");
    isValid = false;
  }

  if (!isValid) {
    showToast("Please correct field validation errors to sign up.", "danger");
    return;
  }

  try {
    const data = await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name, gender, dob, height, weight, bloodGroup, contact, email, password
      })
    });

    if (data && data.success) {
      showToast("Registration completed! Syncing care workspace...", "success");
      setTimeout(() => {
        window.location.href = '/pages/patient.html';
      }, 1000);
    }
  } catch (err) {
    showToast(err.message || "Registration failed.", "danger");
  }
}

function showErrorLabel(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("visible");
}
