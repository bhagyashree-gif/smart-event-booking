/**
 * login.js - Dedicated Customer Sign-In & Sign-Up Tab Controller
 * Uses 'seb_customer_session' so Customer and Admin tabs remain completely independent.
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'))
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api';

const CUSTOMER_SESSION_KEY = 'seb_customer_session';

const urlParams = new URLSearchParams(window.location.search);
const pendingEventId = urlParams.get('event');

const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('customerLoginForm');
const registerForm = document.getElementById('customerRegisterForm');
const guestView = document.getElementById('customerGuestView');
const signedInView = document.getElementById('customerSignedInView');
const signedInName = document.getElementById('signedInName');
const signedInMeta = document.getElementById('signedInMeta');
const continueBtn = document.getElementById('continueToEventsBtn');
const signOutBtn = document.getElementById('customerSignOutBtn');
const fillDemoBtn = document.getElementById('fillDemoStudentBtn');
const portalAlert = document.getElementById('portalAlert');
const eventRedirectPrompt = document.getElementById('eventRedirectPrompt');

function getCustomerSession() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOMER_SESSION_KEY) || 'null');
    } catch (_) {
        return null;
    }
}

function saveCustomerSession(session) {
    try {
        if (session) {
            localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
        } else {
            localStorage.removeItem(CUSTOMER_SESSION_KEY);
        }
    } catch (_) {}
}

function showAlert(message, type = 'error') {
    portalAlert.textContent = message;
    portalAlert.className = `portal-alert ${type}`;
}

function clearAlert() {
    portalAlert.textContent = '';
    portalAlert.className = 'portal-alert';
}

function switchTab(tabName) {
    clearAlert();
    authTabs.forEach(t => t.classList.toggle('active', t.dataset.authTab === tabName));
    loginForm.style.display = tabName === 'login' ? 'block' : 'none';
    registerForm.style.display = tabName === 'register' ? 'block' : 'none';
}

function renderSessionState() {
    const session = getCustomerSession();
    if (session && session.user && session.user.role === 'customer') {
        guestView.style.display = 'none';
        eventRedirectPrompt.style.display = 'none';
        signedInView.style.display = 'block';
        signedInName.textContent = `Hi, ${session.user.name}!`;
        signedInMeta.textContent = `${session.user.email} • Roll No: ${session.user.rollNo || 'N/A'}`;
        if (pendingEventId) {
            continueBtn.href = `index.html?book=${encodeURIComponent(pendingEventId)}`;
            continueBtn.innerHTML = 'Continue to Book Your Selected Event &rarr;';
        } else {
            continueBtn.href = 'index.html';
            continueBtn.innerHTML = 'Explore Events &amp; Book Passes &rarr;';
        }
    } else {
        guestView.style.display = 'block';
        signedInView.style.display = 'none';
        if (pendingEventId) {
            eventRedirectPrompt.textContent = `🎟️ Sign in or create an account to continue booking event ${pendingEventId}!`;
            eventRedirectPrompt.style.display = 'block';
        }
    }
}

authTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.authTab));
});

fillDemoBtn.addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'student@college.edu';
    document.getElementById('loginPassword').value = 'student123';
    clearAlert();
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, loginType: 'customer' })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showAlert(data.message || 'Sign in failed. Please check your credentials.', 'error');
            return;
        }

        saveCustomerSession({ token: data.token, user: data.user });
        loginForm.reset();
        showAlert('Signed in! Your open Events tab has also been synced automatically.', 'success');
        renderSessionState();
    } catch (_) {
        showAlert('Could not connect to server. Please make sure "npm start" is running.', 'error');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const name = document.getElementById('regName').value.trim();
    const rollNo = document.getElementById('regRoll').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, rollNo, email, phone, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showAlert(data.message || 'Could not create account.', 'error');
            return;
        }

        saveCustomerSession({ token: data.token, user: data.user });
        registerForm.reset();
        showAlert('Account created! Your open Events tab has been synced automatically.', 'success');
        renderSessionState();
    } catch (_) {
        showAlert('Could not connect to server. Please make sure "npm start" is running.', 'error');
    }
});

signOutBtn.addEventListener('click', () => {
    saveCustomerSession(null);
    clearAlert();
    renderSessionState();
});

window.addEventListener('storage', (e) => {
    if (e.key === CUSTOMER_SESSION_KEY) {
        renderSessionState();
    }
});

renderSessionState();
