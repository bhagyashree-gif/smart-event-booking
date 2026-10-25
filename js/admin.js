/**
 * admin.js - Dedicated Admin Login & Live Bookings Dashboard Tab Controller
 * Uses 'seb_admin_session' so Admin and Customer sessions can run in separate tabs simultaneously.
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'))
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api';

const ADMIN_SESSION_KEY = 'seb_admin_session';

const adminLoginSection = document.getElementById('adminLoginSection');
const adminDashboardSection = document.getElementById('adminDashboardSection');
const adminLoginForm = document.getElementById('adminLoginForm');
const fillDemoAdminBtn = document.getElementById('fillDemoAdminBtn');
const adminAlert = document.getElementById('adminAlert');
const adminUserPill = document.getElementById('adminUserPill');
const refreshAdminBtn = document.getElementById('refreshAdminBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const lastUpdatedBadge = document.getElementById('lastUpdatedBadge');
const adminKpiGrid = document.getElementById('adminKpiGrid');
const adminEventsTableBody = document.getElementById('adminEventsTableBody');
const adminBookingsTableBody = document.getElementById('adminBookingsTableBody');

function getAdminSession() {
    try {
        return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || 'null');
    } catch (_) {
        return null;
    }
}

function saveAdminSession(session) {
    try {
        if (session) {
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        } else {
            localStorage.removeItem(ADMIN_SESSION_KEY);
        }
    } catch (_) {}
}

function showAdminAlert(msg, type = 'error') {
    adminAlert.textContent = msg;
    adminAlert.className = `portal-alert ${type}`;
}

function clearAdminAlert() {
    adminAlert.textContent = '';
    adminAlert.className = 'portal-alert';
}

async function loadDashboardStats() {
    const session = getAdminSession();
    if (!session || !session.token || !session.user || session.user.role !== 'admin') {
        showLoginView();
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { Authorization: `Bearer ${session.token}` }
        });

        if (res.status === 401) {
            saveAdminSession(null);
            showLoginView('Your Admin session expired. Please sign in again.');
            return;
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
            showLoginView(data.message || 'Could not load Admin Dashboard.');
            return;
        }

        const { summary, eventBreakdown, recentBookings } = data;

        adminKpiGrid.innerHTML = `
            <div class="admin-kpi-card">
                <div class="admin-kpi-label">🎟️ Tickets Booked</div>
                <div class="admin-kpi-value">${summary.totalTicketsBooked}</div>
            </div>
            <div class="admin-kpi-card">
                <div class="admin-kpi-label">🧾 Confirmed Orders</div>
                <div class="admin-kpi-value">${summary.totalBookings}</div>
            </div>
            <div class="admin-kpi-card">
                <div class="admin-kpi-label">💰 Total Revenue</div>
                <div class="admin-kpi-value">$${Number(summary.totalRevenue).toFixed(2)}</div>
            </div>
            <div class="admin-kpi-card">
                <div class="admin-kpi-label">🪑 Seats Remaining</div>
                <div class="admin-kpi-value">${summary.totalSeatsRemaining}</div>
            </div>
        `;

        adminEventsTableBody.innerHTML = eventBreakdown.map(ev => `
            <tr>
                <td>
                    <strong>${ev.title}</strong>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">${ev.categoryLabel}</div>
                </td>
                <td style="white-space: nowrap;">${ev.dateFormatted}</td>
                <td><span class="booked-pill">${ev.ticketsBooked} booked</span></td>
                <td>${ev.availableSeats} / ${ev.totalSeats}</td>
                <td><strong>$${Number(ev.revenue).toFixed(2)}</strong></td>
            </tr>
        `).join('');

        if (recentBookings.length === 0) {
            adminBookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 28px; color: var(--text-muted);">
                        No tickets have been booked yet.
                    </td>
                </tr>
            `;
        } else {
            adminBookingsTableBody.innerHTML = recentBookings.map(b => `
                <tr>
                    <td style="font-family: monospace; font-weight: 700; color: var(--accent-primary);">${b.bookingId}</td>
                    <td>
                        <strong>${b.attendeeName}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">${b.attendeeEmail} &bull; ${b.attendeeRoll || 'N/A'}</div>
                    </td>
                    <td>
                        <strong>${b.eventTitle}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">${b.tierName || 'Pass'}</div>
                    </td>
                    <td><strong>${b.quantity}</strong></td>
                    <td><strong>${Number(b.totalAmount) === 0 ? 'Free' : `$${Number(b.totalAmount).toFixed(2)}`}</strong></td>
                    <td><span class="status-success-pill">${b.paymentStatus || b.status}</span></td>
                </tr>
            `).join('');
        }

        adminLoginSection.style.display = 'none';
        adminDashboardSection.style.display = 'block';
        adminUserPill.textContent = `🛡️ ${session.user.name}`;
        adminUserPill.style.display = 'inline-flex';
        refreshAdminBtn.style.display = 'inline-flex';
        adminLogoutBtn.style.display = 'inline-flex';
        lastUpdatedBadge.textContent = `🟢 Updated ${new Date().toLocaleTimeString()}`;
    } catch (_) {
        showAdminAlert('Could not connect to server. Please make sure "npm start" is running.', 'error');
    }
}

function showLoginView(message = '') {
    adminDashboardSection.style.display = 'none';
    adminLoginSection.style.display = 'flex';
    adminUserPill.style.display = 'none';
    refreshAdminBtn.style.display = 'none';
    adminLogoutBtn.style.display = 'none';
    if (message) {
        showAdminAlert(message, 'error');
    } else {
        clearAdminAlert();
    }
}

fillDemoAdminBtn.addEventListener('click', () => {
    document.getElementById('adminEmail').value = 'admin@smartevent.edu';
    document.getElementById('adminPassword').value = 'admin123';
    clearAdminAlert();
});

adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAdminAlert();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, loginType: 'admin' })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showAdminAlert(data.message || 'Admin login failed.', 'error');
            return;
        }

        saveAdminSession({ token: data.token, user: data.user });
        adminLoginForm.reset();
        await loadDashboardStats();
    } catch (_) {
        showAdminAlert('Could not connect to server. Please make sure "npm start" is running.', 'error');
    }
});

refreshAdminBtn.addEventListener('click', loadDashboardStats);

adminLogoutBtn.addEventListener('click', () => {
    saveAdminSession(null);
    showLoginView();
});

// Auto-refresh Admin Dashboard live whenever a customer books a pass in another tab!
window.addEventListener('storage', (e) => {
    if (e.key === 'seb_last_booking_ping' && getAdminSession()) {
        loadDashboardStats();
    } else if (e.key === ADMIN_SESSION_KEY) {
        loadDashboardStats();
    }
});

// Boot initial view
if (getAdminSession()) {
    loadDashboardStats();
} else {
    showLoginView();
}
