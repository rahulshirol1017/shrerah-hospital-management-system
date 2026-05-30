/* ==========================================
   SHARED ENTERPRISE FRONTEND UTILITIES
   ========================================== */

async function fetchAPI(url, options = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json' };
  options.headers = { ...defaultHeaders, ...options.headers };

  try {
    const res = await fetch(url, options);
    
    // Auto session invalidation router
    if (res.status === 401 && !url.includes('/api/auth/me')) {
      showToast("Session expired. Redirecting to login...", "danger");
      setTimeout(() => {
        window.location.href = '/pages/auth.html';
      }, 1500);
      return null;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Clinical transaction failed.");
    }
    return data;
  } catch (err) {
    showToast(err.message, "danger");
    console.error(`API Error [${url}]:`, err);
    throw err;
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === 'danger' ? 'danger' : 'success'}`;

  const successIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`;
  const errorIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`;

  toast.innerHTML = `
    ${type === 'danger' ? errorIcon : successIcon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Live ticking workspace clock
function initLiveClock() {
  const liveClock = document.getElementById("date-string");
  if (!liveClock) return;

  function updateClock() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    let timeString = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let dateString = today.toLocaleDateString('en-US', options);
    liveClock.innerText = `${dateString} | ${timeString}`;
  }
  
  updateClock();
  setInterval(updateClock, 1000);
}

// Access Control & Route Guarding
async function guardRoute(allowedRoles) {
  try {
    const data = await fetchAPI('/api/auth/me');
    if (!data || !data.user) {
      window.location.href = '/pages/auth.html';
      return null;
    }
    
    if (!allowedRoles.includes(data.user.role)) {
      showToast("Access Denied. Redirecting to appropriate workspace...", "danger");
      setTimeout(() => {
        window.location.href = `/pages/${data.user.role.toLowerCase()}.html`;
      }, 1500);
      return null;
    }
    
    return data.user;
  } catch (e) {
    window.location.href = '/pages/auth.html';
    return null;
  }
}

async function handleLogOut() {
  try {
    await fetchAPI('/api/auth/logout', { method: 'POST' });
    showToast("Logged out successfully.", "success");
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  } catch (e) {
    showToast("Sign out failed.", "danger");
  }
}

// Document load hook
document.addEventListener("DOMContentLoaded", () => {
  initLiveClock();
  
  const toggleBtn = document.getElementById("toggle-sidebar-btn");
  const sidebar = document.getElementById("sidebar-nav");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }
});
