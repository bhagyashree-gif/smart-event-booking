/**
 * app.js - Main Application Logic
 * SmartEvent Campus Event & Ticket Booking Platform
 *
 * Handles:
 * - Customer Sign-In / Sign-Up & Admin Authentication
 * - Auto-filling customer details during ticket checkout
 * - Personal customer bookings view & Admin analytics dashboard
 * - Event filtering, sorting, live capacity & single-page PDF E-Ticket printing
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'))
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api';

const CUSTOMER_SESSION_KEY = 'seb_customer_session';

const getStoredSession = () => {
    try {
        return JSON.parse(localStorage.getItem(CUSTOMER_SESSION_KEY) || 'null');
    } catch (_) {
        return null;
    }
};

const getStoredBookings = () => {
    try {
        return JSON.parse(localStorage.getItem('seb_demo_bookings') || '[]');
    } catch (_) {
        return [];
    }
};

const initialEvents = (typeof window !== 'undefined' && Array.isArray(window.SAMPLE_EVENTS))
    ? [...window.SAMPLE_EVENTS]
    : (typeof SAMPLE_EVENTS !== 'undefined' ? [...SAMPLE_EVENTS] : []);

const state = {
    events: initialEvents,
    isBackendConnected: false,
    authSession: getStoredSession(), // { token, user: { userId, name, email, rollNo, phone, role } }
    pendingEventIdAfterAuth: null,
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'date',
    currentBooking: {
        event: null,
        tier: null,
        quantity: 1,
        totalAmount: 0
    },
    demoBookingsHistory: getStoredBookings()
};

// DOM Elements
const DOM = {
    eventsGrid: document.getElementById('eventsGrid'),
    eventsCount: document.getElementById('eventsCount'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    categoryPills: document.querySelectorAll('.category-pill'),

    // Navbar Auth Elements
    guestNavActions: document.getElementById('guestNavActions'),
    userNavActions: document.getElementById('userNavActions'),
    userGreetingPill: document.getElementById('userGreetingPill'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Booking Modal Elements
    bookingModal: document.getElementById('bookingModal'),
    bookingModalClose: document.getElementById('bookingModalClose'),
    bookingForm: document.getElementById('bookingForm'),
    bookingPreviewContainer: document.getElementById('bookingPreviewContainer'),
    tierOptionsContainer: document.getElementById('tierOptionsContainer'),
    qtyValue: document.getElementById('qtyValue'),
    qtyMinusBtn: document.getElementById('qtyMinusBtn'),
    qtyPlusBtn: document.getElementById('qtyPlusBtn'),
    subtotalAmount: document.getElementById('subtotalAmount'),
    serviceFeeAmount: document.getElementById('serviceFeeAmount'),
    totalAmount: document.getElementById('totalAmount'),
    submitBookingBtn: document.querySelector('#bookingForm button[type="submit"]'),

    // Confirmation Modal Elements
    confirmationModal: document.getElementById('confirmationModal'),
    confirmationModalClose: document.getElementById('confirmationModalClose'),
    ticketContainer: document.getElementById('ticketContainer'),
    printTicketBtn: document.getElementById('printTicketBtn'),
    closeConfirmBtn: document.getElementById('closeConfirmBtn'),

    // My Bookings Modal Elements
    myBookingsBtn: document.getElementById('myBookingsBtn'),
    myBookingsModal: document.getElementById('myBookingsModal'),
    myBookingsClose: document.getElementById('myBookingsClose'),
    myBookingsList: document.getElementById('myBookingsList'),
    myBookingsCountBadge: document.getElementById('myBookingsCountBadge')
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    syncAuthNavbar();
    await checkDatabaseHealth();
    renderEvents();
    updateMyBookingsBadge();

    // Auto-open booking modal if redirected from login.html?event=... -> index.html?book=...
    const params = new URLSearchParams(window.location.search);
    const bookEventId = params.get('book');
    if (bookEventId) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        window.openBookingModal(bookEventId);
    }
});

/**
 * Update Navbar based on Logged-in Customer state
 */
function syncAuthNavbar() {
    const session = state.authSession;
    if (!session || !session.user || session.user.role !== 'customer') {
        if (DOM.guestNavActions) DOM.guestNavActions.style.display = 'flex';
        if (DOM.userNavActions) DOM.userNavActions.style.display = 'none';
        return;
    }

    if (DOM.guestNavActions) DOM.guestNavActions.style.display = 'none';
    if (DOM.userNavActions) DOM.userNavActions.style.display = 'flex';

    const firstName = session.user.name.split(' ')[0];
    DOM.userGreetingPill.textContent = `👋 Hi, ${firstName}!`;
    if (DOM.myBookingsBtn) DOM.myBookingsBtn.style.display = 'inline-flex';
}

function saveAuthSession(sessionData) {
    state.authSession = sessionData;
    try {
        if (sessionData) {
            localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(sessionData));
        } else {
            localStorage.removeItem(CUSTOMER_SESSION_KEY);
        }
    } catch (_) {}
    syncAuthNavbar();
}

/**
 * Check Backend Health and load live events & user bookings
 */
async function checkDatabaseHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            if (data.database === 'connected') {
                state.isBackendConnected = true;
                await Promise.all([loadEventsFromAPI(), loadBookingsFromAPI()]);
                return;
            }
        }
        state.isBackendConnected = false;
    } catch (_) {
        state.isBackendConnected = false;
    }
}

/**
 * Load events via REST API
 */
async function loadEventsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/events`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.events) && data.events.length > 0) {
                state.events = data.events;
                renderEvents();
            }
        }
    } catch (err) {
        console.warn('Could not load events from API, using fallback data:', err);
    }
}

/**
 * Load booking history for the currently logged-in customer
 */
async function loadBookingsFromAPI() {
    if (!state.authSession || !state.authSession.user || state.authSession.user.role !== 'customer') {
        state.demoBookingsHistory = [];
        updateMyBookingsBadge();
        return;
    }

    try {
        const emailParam = encodeURIComponent(state.authSession.user.email);
        const response = await fetch(`${API_BASE_URL}/bookings?email=${emailParam}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.bookings)) {
                state.demoBookingsHistory = data.bookings.map(b => ({
                    bookingId: b.bookingId,
                    bookingDate: b.bookingDate,
                    formattedDate: b.bookingDate,
                    attendee: {
                        name: b.attendeeName,
                        email: b.attendeeEmail,
                        rollNo: b.attendeeRoll || 'N/A',
                        phone: b.attendeePhone || 'N/A'
                    },
                    event: {
                        id: b.eventId || '',
                        title: b.eventTitle,
                        venue: b.eventVenue,
                        date: b.eventDate,
                        time: b.eventTime || '',
                        organizer: b.eventOrganizer || 'Campus Event Organizer'
                    },
                    tierName: b.tierName || 'Standard Pass',
                    quantity: Number(b.quantity) || 1,
                    totalAmount: Number(b.totalAmount) || 0,
                    isLiveDatabase: true
                }));
                updateMyBookingsBadge();
            }
        }
    } catch (err) {
        console.warn('Could not load bookings from API:', err);
    }
}

/**
 * Attach UI event listeners
 */
function initEventListeners() {
    // Search, Sort & Category filters
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderEvents();
    });

    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderEvents();
    });

    DOM.categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            DOM.categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.selectedCategory = pill.dataset.category;
            renderEvents();
        });
    });

    // Logout
    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener('click', () => {
            saveAuthSession(null);
            state.demoBookingsHistory = [];
            updateMyBookingsBadge();
            if (DOM.myBookingsModal) DOM.myBookingsModal.classList.remove('active');
        });
    }

    // Live Cross-Tab Session Sync (updates immediately when user signs in/out on login.html tab)
    window.addEventListener('storage', async (e) => {
        if (e.key === CUSTOMER_SESSION_KEY) {
            state.authSession = getStoredSession();
            syncAuthNavbar();
            await loadBookingsFromAPI();

            if (state.authSession && state.authSession.user && state.pendingEventIdAfterAuth) {
                const pendingId = state.pendingEventIdAfterAuth;
                state.pendingEventIdAfterAuth = null;
                window.openBookingModal(pendingId);
            }
        }
    });

    // Quantity & Booking Form
    DOM.qtyMinusBtn.addEventListener('click', () => updateQuantity(-1));
    DOM.qtyPlusBtn.addEventListener('click', () => updateQuantity(1));
    DOM.bookingForm.addEventListener('submit', handleBookingSubmit);

    // Modal Close Triggers
    DOM.bookingModalClose.addEventListener('click', closeBookingModal);
    DOM.confirmationModalClose.addEventListener('click', closeConfirmationModal);
    DOM.closeConfirmBtn.addEventListener('click', closeConfirmationModal);

    // Close on background overlay click
    [DOM.bookingModal, DOM.confirmationModal, DOM.myBookingsModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Print ticket
    DOM.printTicketBtn.addEventListener('click', () => {
        window.print();
    });

    // My Bookings Modal toggles
    if (DOM.myBookingsBtn && DOM.myBookingsModal) {
        DOM.myBookingsBtn.addEventListener('click', openMyBookingsModal);
        DOM.myBookingsClose.addEventListener('click', () => DOM.myBookingsModal.classList.remove('active'));
    }
}

/**
 * Filter, Sort, and Render Event Cards
 */
function renderEvents() {
    let filtered = state.events.filter(event => {
        const matchCategory = state.selectedCategory === 'all' || event.category === state.selectedCategory;
        const matchSearch = !state.searchQuery ||
            event.title.toLowerCase().includes(state.searchQuery) ||
            event.venue.toLowerCase().includes(state.searchQuery) ||
            event.organizer.toLowerCase().includes(state.searchQuery);

        return matchCategory && matchSearch;
    });

    filtered.sort((a, b) => {
        if (state.sortBy === 'date') {
            return new Date(a.date) - new Date(b.date);
        } else if (state.sortBy === 'price-low') {
            return Math.min(...a.tiers.map(t => t.price)) - Math.min(...b.tiers.map(t => t.price));
        } else if (state.sortBy === 'price-high') {
            return Math.min(...b.tiers.map(t => t.price)) - Math.min(...a.tiers.map(t => t.price));
        } else if (state.sortBy === 'popularity') {
            return (b.totalSeats - b.availableSeats) - (a.totalSeats - a.availableSeats);
        }
        return 0;
    });

    DOM.eventsCount.textContent = `${filtered.length} experience${filtered.length === 1 ? '' : 's'} waiting for you`;

    if (filtered.length === 0) {
        DOM.eventsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎈</div>
                <h3>No matching events right now</h3>
                <p>Try another keyword or explore all campus categories!</p>
                <button class="btn btn-secondary btn-sm" onclick="resetFilters()">Show All Events</button>
            </div>
        `;
        return;
    }

    DOM.eventsGrid.innerHTML = filtered.map(event => {
        const minPrice = Math.min(...event.tiers.map(t => t.price));
        const priceLabel = minPrice === 0 ? '🎉 Free Entry' : `From $${minPrice}`;
        const seatsPercent = Math.round((event.availableSeats / event.totalSeats) * 100);
        const isSoldOut = event.availableSeats <= 0;

        let barClass = '';
        let seatsHighlightClass = '';
        if (seatsPercent <= 15) {
            barClass = 'danger';
            seatsHighlightClass = 'low';
        } else if (seatsPercent <= 35) {
            barClass = 'warning';
        }

        return `
            <article class="event-card">
                <div class="event-card-banner">
                    <img src="${event.banner}" alt="${event.title}" loading="lazy">
                    <span class="event-category-badge badge-${event.category}">${event.categoryLabel}</span>
                    <span class="event-price-tag">${priceLabel}</span>
                </div>
                
                <div class="event-card-body">
                    <span class="event-organizer">${event.organizer}</span>
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-desc">${event.description}</p>
                    
                    <div class="event-meta-list">
                        <div class="event-meta-item">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span>${event.dateFormatted} &bull; ${event.time}</span>
                        </div>
                        <div class="event-meta-item">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <span>${event.venue}</span>
                        </div>
                    </div>

                    <div class="event-seats-tracker">
                        <div class="seats-tracker-label">
                            <span>Spot Tracker</span>
                            <span class="seats-highlight ${seatsHighlightClass}">${event.availableSeats} of ${event.totalSeats} spots open</span>
                        </div>
                        <div class="seats-bar-track">
                            <div class="seats-bar-fill ${barClass}" style="width: ${seatsPercent}%"></div>
                        </div>
                    </div>

                    <div class="event-card-footer">
                        ${isSoldOut ? `
                            <button class="btn btn-secondary btn-block" disabled>Sold Out</button>
                        ` : `
                            <button class="btn btn-primary btn-block" onclick="openBookingModal('${event.id}')">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                                </svg>
                                <span>Grab Your Pass</span>
                            </button>
                        `}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

/**
 * Open Booking Modal (prompts Customer Sign-In first if not signed in)
 */
window.openBookingModal = function(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event || event.availableSeats <= 0) return;

    // Require Customer Login (opens dedicated Customer Login tab if not signed in)
    if (state.isBackendConnected && (!state.authSession || !state.authSession.user || state.authSession.user.role !== 'customer')) {
        state.pendingEventIdAfterAuth = eventId;
        window.open(`login.html?event=${encodeURIComponent(eventId)}`, '_blank', 'noopener');
        return;
    }

    state.currentBooking.event = event;
    state.currentBooking.tier = event.tiers.find(t => t.available > 0) || event.tiers[0];
    state.currentBooking.quantity = 1;

    DOM.bookingPreviewContainer.innerHTML = `
        <div class="booking-event-preview">
            <img src="${event.banner}" alt="${event.title}" class="booking-preview-img">
            <div class="booking-preview-info">
                <h4>${event.title}</h4>
                <div class="booking-preview-meta">
                    <span>📅 ${event.dateFormatted} &bull; ${event.time}</span>
                    <span>📍 ${event.venue}</span>
                </div>
            </div>
        </div>
    `;

    // Auto-fill customer details from logged-in session
    if (state.authSession && state.authSession.user) {
        const u = state.authSession.user;
        document.getElementById('attendeeName').value = u.name || '';
        document.getElementById('attendeeEmail').value = u.email || '';
        document.getElementById('attendeeRoll').value = u.rollNo && u.rollNo !== 'N/A' ? u.rollNo : '';
        document.getElementById('attendeePhone').value = u.phone || '';
    }

    renderTierOptions();
    DOM.qtyValue.textContent = '1';
    updatePriceCalculation();
    DOM.bookingModal.classList.add('active');
};

/**
 * Render Ticket Category Tier Options
 */
function renderTierOptions() {
    const { event, tier: selectedTier } = state.currentBooking;
    
    DOM.tierOptionsContainer.innerHTML = event.tiers.map(t => {
        const isSoldOut = t.available <= 0;
        const isSelected = !isSoldOut && selectedTier && selectedTier.id === t.id;
        const priceDisplay = t.price === 0 ? 'Free' : `$${t.price}`;
        
        return `
            <div class="tier-card-option ${isSelected ? 'selected' : ''} ${isSoldOut ? 'sold-out' : ''}" onclick="selectTier('${t.id}')">
                <div class="tier-card-info">
                    <div class="tier-title-row">
                        <span class="tier-name">${t.name}</span>
                        <span class="tier-badge ${isSoldOut ? 'sold-out-badge' : ''}">${isSoldOut ? 'Sold Out' : `${t.available} left`}</span>
                    </div>
                    <span class="tier-perks">${t.perks}</span>
                </div>
                <div class="tier-price">${priceDisplay}</div>
            </div>
        `;
    }).join('');
}

/**
 * Handle Tier Selection
 */
window.selectTier = function(tierId) {
    const tier = state.currentBooking.event.tiers.find(t => t.id === tierId);
    if (!tier || tier.available <= 0) return;
    
    state.currentBooking.tier = tier;
    
    if (state.currentBooking.quantity > tier.available) {
        state.currentBooking.quantity = Math.max(1, tier.available);
        DOM.qtyValue.textContent = state.currentBooking.quantity;
    }

    renderTierOptions();
    updatePriceCalculation();
};

/**
 * Increment / Decrement Ticket Quantity
 */
function updateQuantity(delta) {
    const maxAvailable = state.currentBooking.tier ? state.currentBooking.tier.available : 10;
    if (maxAvailable <= 0) return;
    const maxPerOrder = Math.min(10, maxAvailable);

    let newQty = state.currentBooking.quantity + delta;
    if (newQty < 1) newQty = 1;
    if (newQty > maxPerOrder) {
        alert(`You can book a maximum of ${maxPerOrder} pass${maxPerOrder === 1 ? '' : 'es'} for this tier.`);
        newQty = maxPerOrder;
    }

    state.currentBooking.quantity = newQty;
    DOM.qtyValue.textContent = newQty;
    updatePriceCalculation();
}

/**
 * Calculate Subtotal, Fees, and Total Amount
 */
function updatePriceCalculation() {
    const { tier, quantity } = state.currentBooking;
    if (!tier) return;

    const subtotal = tier.price * quantity;
    const serviceFee = subtotal > 0 ? (1.50 * quantity) : 0;
    const total = subtotal + serviceFee;

    state.currentBooking.totalAmount = total;

    DOM.subtotalAmount.textContent = subtotal === 0 ? 'Free' : `$${subtotal.toFixed(2)}`;
    DOM.serviceFeeAmount.textContent = serviceFee === 0 ? '$0.00' : `$${serviceFee.toFixed(2)}`;
    DOM.totalAmount.textContent = total === 0 ? 'Free' : `$${total.toFixed(2)}`;
}

/**
 * Close Booking Modal
 */
function closeBookingModal() {
    DOM.bookingModal.classList.remove('active');
    DOM.bookingForm.reset();
}

/**
 * Handle Booking Form Submission
 */
async function handleBookingSubmit(e) {
    e.preventDefault();

    const { event, tier, quantity, totalAmount } = state.currentBooking;
    if (!event || !tier) return;

    if (tier.available < quantity || event.availableSeats < quantity) {
        alert(`Only ${Math.min(tier.available, event.availableSeats)} pass(es) remaining for this selection.`);
        return;
    }

    const attendeeName = document.getElementById('attendeeName').value.trim();
    const attendeeEmail = document.getElementById('attendeeEmail').value.trim();
    const attendeeRoll = document.getElementById('attendeeRoll').value.trim() || 'N/A';
    const attendeePhone = document.getElementById('attendeePhone').value.trim();

    if (!attendeeName || !attendeeEmail || !attendeePhone) {
        alert('Please fill out all required fields.');
        return;
    }

    if (attendeeName.length < 2) {
        alert('Please enter a valid full name (at least 2 characters).');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(attendeeEmail)) {
        alert('Please enter a valid email address.');
        return;
    }

    const phoneDigits = attendeePhone.replace(/\D/g, '');
    if (!/^\+?[\d\s\-()]{7,15}$/.test(attendeePhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        alert('Please enter a valid phone number (7 to 15 digits).');
        return;
    }

    const attendee = {
        name: attendeeName,
        email: attendeeEmail,
        rollNo: attendeeRoll,
        phone: attendeePhone
    };

    const submitBtn = DOM.submitBookingBtn || e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Confirm Booking &amp; Get Pass &rarr;';

    if (state.isBackendConnected) {
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Locking In Your Spot... ⏳';
            }

            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendee,
                    eventId: event.id,
                    tierId: tier.id,
                    quantity
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                alert(`Booking Failed: ${result.message || 'Unable to complete booking.'}`);
                await loadEventsFromAPI();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
                return;
            }

            const bookingRecord = result.booking;
            bookingRecord.isLiveDatabase = true;

            try {
                localStorage.setItem('seb_last_booking_ping', String(Date.now()));
            } catch (_) {}

            await Promise.all([loadEventsFromAPI(), loadBookingsFromAPI()]);
            closeBookingModal();
            openConfirmationModal(bookingRecord);
            return;
        } catch (apiErr) {
            console.warn('API error during booking:', apiErr);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    }

    // Offline fallback
    const bookingRef = `SEB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookingRecord = {
        bookingId: bookingRef,
        bookingDate: new Date().toISOString(),
        formattedDate: new Date().toLocaleString(),
        attendee,
        event: {
            id: event.id,
            title: event.title,
            venue: event.venue,
            date: event.dateFormatted,
            time: event.time,
            organizer: event.organizer
        },
        tierName: tier.name,
        quantity,
        totalAmount,
        isLiveDatabase: false
    };

    event.availableSeats = Math.max(0, event.availableSeats - quantity);
    tier.available = Math.max(0, tier.available - quantity);
    state.demoBookingsHistory.unshift(bookingRecord);
    updateMyBookingsBadge();
    renderEvents();
    closeBookingModal();
    openConfirmationModal(bookingRecord);
}

/**
 * Render and Open Confirmation Screen / E-Ticket
 */
function openConfirmationModal(record) {
    const priceDisplay = record.totalAmount === 0 ? 'Free Pass' : `$${record.totalAmount.toFixed(2)}`;

    DOM.ticketContainer.innerHTML = `
        <div class="ticket-wrapper">
            <div class="ticket-header-strip">
                <div>
                    <strong>SMART EVENT PASS</strong>
                    <div style="font-size: 0.75rem; opacity: 0.92;">Official Campus Event E-Ticket</div>
                </div>
                <span class="ticket-status-badge">Confirmed</span>
            </div>

            <div class="ticket-body">
                <h3 class="ticket-title">${record.event.title}</h3>
                <div class="ticket-organizer">Organized by ${record.event.organizer}</div>

                <div class="ticket-details-grid">
                    <div class="ticket-detail-item">
                        <span class="ticket-label">Attendee Name</span>
                        <span class="ticket-val">${record.attendee.name}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <span class="ticket-label">Student / Roll No</span>
                        <span class="ticket-val">${record.attendee.rollNo}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <span class="ticket-label">Date & Time</span>
                        <span class="ticket-val">${record.event.date}${record.event.time ? ` (${record.event.time})` : ''}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <span class="ticket-label">Venue</span>
                        <span class="ticket-val">${record.event.venue}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <span class="ticket-label">Ticket Tier</span>
                        <span class="ticket-val">${record.tierName} (${record.quantity} Ticket${record.quantity > 1 ? 's' : ''})</span>
                    </div>
                    <div class="ticket-detail-item">
                        <span class="ticket-label">Total Amount</span>
                        <span class="ticket-val" style="color: #059669;">${priceDisplay}</span>
                    </div>
                </div>

                <div class="ticket-perforation"></div>

                <div class="ticket-barcode-section">
                    <div class="ticket-qr-mock">
                        <svg viewBox="0 0 100 100" fill="#111827">
                            <rect x="0" y="0" width="30" height="30"/>
                            <rect x="5" y="5" width="20" height="20" fill="#fff"/>
                            <rect x="9" y="9" width="12" height="12"/>
                            
                            <rect x="70" y="0" width="30" height="30"/>
                            <rect x="75" y="5" width="20" height="20" fill="#fff"/>
                            <rect x="79" y="9" width="12" height="12"/>

                            <rect x="0" y="70" width="30" height="30"/>
                            <rect x="5" y="75" width="20" height="20" fill="#fff"/>
                            <rect x="9" y="79" width="12" height="12"/>

                            <rect x="40" y="10" width="15" height="15"/>
                            <rect x="40" y="40" width="20" height="20"/>
                            <rect x="70" y="50" width="20" height="15"/>
                            <rect x="15" y="45" width="15" height="15"/>
                            <rect x="45" y="75" width="25" height="15"/>
                            <rect x="80" y="80" width="15" height="15"/>
                        </svg>
                    </div>
                    <div class="ticket-ref-box">
                        <div class="ticket-label">Booking Reference</div>
                        <div class="ticket-booking-ref">${record.bookingId}</div>
                        <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">Verified Campus E-Ticket</div>
                    </div>
                </div>

                <div class="ticket-notice-card">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="flex-shrink: 0;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div>
                        <strong>Pass Ready for Entry:</strong> Carry this QR pass (or printed single-page PDF) along with your college ID card at the venue entrance!
                    </div>
                </div>
            </div>
        </div>
    `;

    DOM.confirmationModal.classList.add('active');
}

function closeConfirmationModal() {
    DOM.confirmationModal.classList.remove('active');
}

/**
 * Open Customer's Personal My Bookings Modal
 */
async function openMyBookingsModal() {
    if (state.isBackendConnected) {
        await loadBookingsFromAPI();
    }

    const list = state.demoBookingsHistory;

    if (list.length === 0) {
        DOM.myBookingsList.innerHTML = `
            <div class="empty-state" style="padding: 40px 14px;">
                <div class="empty-state-icon">🎟️</div>
                <h3>No Passes Yet!</h3>
                <p>Pick an event from the homepage and book your first campus pass!</p>
            </div>
        `;
    } else {
        DOM.myBookingsList.innerHTML = list.map(b => `
            <div class="tier-card-option" style="margin-bottom: 12px; cursor: default;">
                <div class="tier-card-info">
                    <div class="tier-title-row">
                        <span class="tier-name">${b.event.title}</span>
                    </div>
                    <span class="tier-perks">📍 ${b.event.venue} &bull; ${b.event.date}</span>
                    <span class="tier-perks">👤 ${b.attendee.name} (${b.quantity}x ${b.tierName})</span>
                    <span style="font-size: 0.74rem; color: var(--accent-primary); font-family: monospace; font-weight: 700; margin-top: 4px;">Ref: ${b.bookingId}</span>
                </div>
                <div style="text-align: right;">
                    <div class="tier-price" style="font-size: 1rem; color: #059669;">
                        ${b.totalAmount === 0 ? 'Free' : `$${b.totalAmount.toFixed(2)}`}
                    </div>
                    <button class="btn btn-outline btn-sm" style="margin-top: 8px;" onclick="viewPastTicket('${b.bookingId}')">
                        View Pass
                    </button>
                </div>
            </div>
        `).join('');
    }

    DOM.myBookingsModal.classList.add('active');
}

window.viewPastTicket = function(bookingId) {
    const record = state.demoBookingsHistory.find(b => b.bookingId === bookingId);
    if (!record) return;
    DOM.myBookingsModal.classList.remove('active');
    openConfirmationModal(record);
};

function updateMyBookingsBadge() {
    if (DOM.myBookingsCountBadge) {
        DOM.myBookingsCountBadge.textContent = state.demoBookingsHistory.length;
    }
}

window.resetFilters = function() {
    state.selectedCategory = 'all';
    state.searchQuery = '';
    DOM.searchInput.value = '';
    DOM.categoryPills.forEach(p => {
        p.classList.toggle('active', p.dataset.category === 'all');
    });
    renderEvents();
};
