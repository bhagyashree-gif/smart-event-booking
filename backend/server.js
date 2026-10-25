/**
 * server.js - Express REST API & SQLite Controller
 * Smart Event & Ticket Booking System
 * 
 * Powered by SQLite & better-sqlite3
 * Features:
 * - 6 Normalized Tables (users, events, ticket_types, bookings, booking_details, payments)
 * - Customer Sign-Up / Login & Admin Authentication
 * - Admin Analytics & Ticket Booking Overview (SQL Aggregate Queries)
 * - Atomic ACID Transactions for safe seat booking
 * - Parameterized queries for SQL injection prevention
 * - Static frontend hosting
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { db, testConnection, dbPath, hashPassword } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_SECRET = process.env.AUTH_SECRET || 'smartevent-campus-secret-2026';

// Middlewares
app.use(cors());
app.use(express.json());
// Serve frontend static files
app.use(express.static(path.join(__dirname, '../')));

// ----------------------------------------------------------------------------
// Lightweight Signed Token Helpers (Zero External Dependencies)
// ----------------------------------------------------------------------------
function createAuthToken(user) {
    const payload = Buffer.from(JSON.stringify({
        userId: user.user_id || user.userId,
        email: user.email,
        role: user.role,
        exp: Date.now() + 24 * 60 * 60 * 1000
    })).toString('base64url');

    const signature = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(payload)
        .digest('base64url');

    return `${payload}.${signature}`;
}

function verifyAuthToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expectedSig = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(payload)
        .digest('base64url');

    if (signature !== expectedSig) return null;

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!decoded.exp || decoded.exp < Date.now()) return null;
        return decoded;
    } catch (_) {
        return null;
    }
}

// ----------------------------------------------------------------------------
// Health Check Endpoint
// ----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
    try {
        const isOk = testConnection();
        if (isOk) {
            res.json({
                status: 'online',
                database: 'connected',
                engine: 'SQLite 3',
                file: path.basename(dbPath),
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                status: 'online',
                database: 'error',
                engine: 'SQLite 3'
            });
        }
    } catch (err) {
        res.status(500).json({
            status: 'online',
            database: 'disconnected',
            error: err.message
        });
    }
});

// ----------------------------------------------------------------------------
// Auth 1: POST /api/auth/register (Customer Registration)
// ----------------------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
    const { name, email, rollNo, phone, password } = req.body || {};

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanRoll = typeof rollNo === 'string' && rollNo.trim() ? rollNo.trim() : 'N/A';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (cleanName.length < 2) {
        return res.status(400).json({ success: false, message: 'Please enter your full name (at least 2 characters).' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (!/^\+?[\d\s\-()]{7,15}$/.test(cleanPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        return res.status(400).json({ success: false, message: 'Please enter a valid phone number (7 to 15 digits).' });
    }

    if (rawPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    try {
        const existing = db.prepare('SELECT user_id, password_hash, role FROM users WHERE email = ?').get(cleanEmail);
        const hashed = hashPassword(rawPassword);
        let userId;

        if (existing) {
            if (existing.password_hash && existing.password_hash.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'An account with this email already exists. Please sign in instead.'
                });
            }
            userId = existing.user_id;
            db.prepare(`
                UPDATE users
                SET full_name = ?, roll_no = ?, phone = ?, password_hash = ?, role = 'customer'
                WHERE user_id = ?
            `).run(cleanName, cleanRoll, cleanPhone, hashed, userId);
        } else {
            const info = db.prepare(`
                INSERT INTO users (full_name, email, roll_no, phone, password_hash, role)
                VALUES (?, ?, ?, ?, ?, 'customer')
            `).run(cleanName, cleanEmail, cleanRoll, cleanPhone, hashed);
            userId = info.lastInsertRowid;
        }

        const userPayload = {
            userId,
            name: cleanName,
            email: cleanEmail,
            rollNo: cleanRoll,
            phone: cleanPhone,
            role: 'customer'
        };

        res.json({
            success: true,
            token: createAuthToken(userPayload),
            user: userPayload
        });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ success: false, message: 'Unable to create account right now.' });
    }
});

// ----------------------------------------------------------------------------
// Auth 2: POST /api/auth/login (Customer & Admin Sign-In)
// ----------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
    const { email, password, loginType } = req.body || {};

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanEmail || !rawPassword) {
        return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    try {
        const user = db.prepare(`
            SELECT user_id, full_name, email, roll_no, phone, password_hash, role
            FROM users
            WHERE email = ?
        `).get(cleanEmail);

        if (!user || !user.password_hash || user.password_hash !== hashPassword(rawPassword)) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (loginType === 'admin' && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'This account does not have Admin permissions.' });
        }

        if (loginType === 'customer' && user.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Please switch to the Admin Login tab to sign in as Admin.' });
        }

        const userPayload = {
            userId: user.user_id,
            name: user.full_name,
            email: user.email,
            rollNo: user.roll_no || 'N/A',
            phone: user.phone,
            role: user.role
        };

        res.json({
            success: true,
            token: createAuthToken(userPayload),
            user: userPayload
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Unable to sign in right now.' });
    }
});

// ----------------------------------------------------------------------------
// 1. GET /api/events
// Fetch all events along with their nested ticket types from SQLite
// ----------------------------------------------------------------------------
app.get('/api/events', (req, res) => {
    try {
        // Query events
        const events = db.prepare(`
            SELECT 
                event_id AS id,
                title,
                category,
                category_label AS categoryLabel,
                organizer,
                event_date AS date,
                date_formatted AS dateFormatted,
                event_time AS time,
                venue,
                description,
                banner_url AS banner,
                total_seats AS totalSeats,
                available_seats AS availableSeats,
                is_featured AS featured
            FROM events
            ORDER BY event_date ASC;
        `).all();

        // Query ticket types
        const ticketTypes = db.prepare(`
            SELECT 
                ticket_type_id AS id,
                event_id,
                name,
                price,
                perks,
                available,
                capacity
            FROM ticket_types
            ORDER BY price ASC;
        `).all();

        // Group ticket types into each event
        const eventsWithTiers = events.map(evt => {
            const tiers = ticketTypes
                .filter(t => t.event_id === evt.id)
                .map(({ event_id, ...props }) => props);

            return {
                ...evt,
                featured: Boolean(evt.featured),
                tiers
            };
        });

        res.json({
            success: true,
            count: eventsWithTiers.length,
            events: eventsWithTiers
        });
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve events from SQLite database',
            error: err.message
        });
    }
});

// ----------------------------------------------------------------------------
// 2. POST /api/bookings
// Atomic ACID Transaction to book tickets across 6 tables:
// users, events, ticket_types, bookings, booking_details, payments
// ----------------------------------------------------------------------------
const executeBookingTransaction = db.transaction((bookingData) => {
    const { attendee, eventId, tierId, quantity } = bookingData;

    // 1. Verify and lock ticket type availability
    const tier = db.prepare(`
        SELECT ticket_type_id, event_id, name, price, available 
        FROM ticket_types 
        WHERE ticket_type_id = ? AND event_id = ?
    `).get(tierId, eventId);

    if (!tier) {
        throw new Error('Selected ticket type does not exist for this event.');
    }

    if (tier.available < quantity) {
        throw new Error(`Only ${tier.available} ticket(s) remaining for '${tier.name}'.`);
    }

    // 2. Verify and lock event availability
    const event = db.prepare(`
        SELECT event_id, title, organizer, date_formatted, event_time, venue, available_seats 
        FROM events 
        WHERE event_id = ?
    `).get(eventId);

    if (!event) {
        throw new Error('Event not found.');
    }

    if (event.available_seats < quantity) {
        throw new Error(`Only ${event.available_seats} seat(s) remaining for this event.`);
    }

    // 3. Find or Create User (Table 1: users)
    const existingUser = db.prepare(`
        SELECT user_id FROM users WHERE email = ?
    `).get(attendee.email.trim().toLowerCase());

    let userId;
    if (existingUser) {
        userId = existingUser.user_id;
        db.prepare(`
            UPDATE users 
            SET full_name = ?, roll_no = ?, phone = ? 
            WHERE user_id = ?
        `).run(attendee.name.trim(), attendee.rollNo || 'N/A', attendee.phone.trim(), userId);
    } else {
        const userInsert = db.prepare(`
            INSERT INTO users (full_name, email, roll_no, phone) 
            VALUES (?, ?, ?, ?)
        `).run(attendee.name.trim(), attendee.email.trim().toLowerCase(), attendee.rollNo || 'N/A', attendee.phone.trim());
        userId = userInsert.lastInsertRowid;
    }

    // 4. Calculate Pricing
    const unitPrice = parseFloat(tier.price);
    const subtotal = unitPrice * quantity;
    const serviceFee = subtotal > 0 ? (1.50 * quantity) : 0.00;
    const totalAmount = subtotal + serviceFee;

    // 5. Generate Collision-Safe Primary Key for Booking
    let bookingId;
    const checkBookingIdStmt = db.prepare('SELECT 1 FROM bookings WHERE booking_id = ?');
    do {
        bookingId = `SEB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (checkBookingIdStmt.get(bookingId));

    // 6. Insert Order Header (Table 4: bookings)
    db.prepare(`
        INSERT INTO bookings (booking_id, user_id, event_id, total_amount, status)
        VALUES (?, ?, ?, ?, 'CONFIRMED')
    `).run(bookingId, userId, eventId, totalAmount);

    // 7. Insert Itemized Line Details (Table 5: booking_details)
    db.prepare(`
        INSERT INTO booking_details (booking_id, ticket_type_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
    `).run(bookingId, tierId, quantity, unitPrice, subtotal);

    // 8. Insert Payment Record (Table 6: payments)
    db.prepare(`
        INSERT INTO payments (booking_id, amount, payment_method, payment_status)
        VALUES (?, ?, 'CAMPUS_PASS', 'SUCCESS')
    `).run(bookingId, totalAmount);

    // 9. Decrement Inventory in ticket_types & events
    db.prepare(`
        UPDATE ticket_types 
        SET available = available - ? 
        WHERE ticket_type_id = ?
    `).run(quantity, tierId);

    db.prepare(`
        UPDATE events 
        SET available_seats = available_seats - ? 
        WHERE event_id = ?
    `).run(quantity, eventId);

    return {
        bookingId,
        bookingDate: new Date().toISOString(),
        formattedDate: new Date().toLocaleString(),
        attendee: {
            name: attendee.name,
            email: attendee.email,
            rollNo: attendee.rollNo || 'N/A',
            phone: attendee.phone
        },
        event: {
            id: eventId,
            title: event.title,
            venue: event.venue,
            date: event.date_formatted,
            time: event.event_time,
            organizer: event.organizer
        },
        tierName: tier.name,
        quantity,
        subtotal,
        serviceFee,
        totalAmount,
        isLiveDatabase: true,
        databaseEngine: 'SQLite 3'
    };
});

app.post('/api/bookings', (req, res) => {
    const { attendee, eventId, tierId, quantity } = req.body || {};

    if (!attendee || typeof attendee !== 'object' || !eventId || !tierId || quantity === undefined || quantity === null) {
        return res.status(400).json({
            success: false,
            message: 'Missing required booking information.'
        });
    }

    const cleanName = typeof attendee.name === 'string' ? attendee.name.trim() : '';
    const cleanEmail = typeof attendee.email === 'string' ? attendee.email.trim() : '';
    const cleanPhone = typeof attendee.phone === 'string' ? attendee.phone.trim() : '';
    const cleanRoll = typeof attendee.rollNo === 'string' && attendee.rollNo.trim() ? attendee.rollNo.trim() : 'N/A';

    if (cleanName.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid full name (at least 2 characters).'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid email address.'
        });
    }

    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (!/^\+?[\d\s\-()]{7,15}$/.test(cleanPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid phone number (7 to 15 digits).'
        });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ticket quantity (must be a whole number between 1 and 10).'
        });
    }

    try {
        const booking = executeBookingTransaction({
            attendee: {
                name: cleanName,
                email: cleanEmail,
                rollNo: cleanRoll,
                phone: cleanPhone
            },
            eventId: String(eventId).trim(),
            tierId: String(tierId).trim(),
            quantity: qty
        });

        console.log(`🎟️ Booking Confirmed: ${booking.bookingId} | User: ${cleanEmail} | Event: ${booking.event.title}`);

        res.json({
            success: true,
            booking
        });
    } catch (err) {
        console.error('Booking Transaction Error:', err.message);
        res.status(400).json({
            success: false,
            message: err.message || 'Transaction failed.'
        });
    }
});

// ----------------------------------------------------------------------------
// 3. GET /api/bookings
// Fetch booking history (supports ?email= filter for logged-in customer)
// ----------------------------------------------------------------------------
app.get('/api/bookings', (req, res) => {
    try {
        const emailFilter = typeof req.query.email === 'string' && req.query.email.trim()
            ? req.query.email.trim().toLowerCase()
            : null;

        const baseSql = `
            SELECT 
                b.booking_id AS bookingId,
                b.total_amount AS totalAmount,
                b.booking_date AS bookingDate,
                b.status,
                u.full_name AS attendeeName,
                u.email AS attendeeEmail,
                u.roll_no AS attendeeRoll,
                u.phone AS attendeePhone,
                e.event_id AS eventId,
                e.title AS eventTitle,
                e.venue AS eventVenue,
                e.date_formatted AS eventDate,
                e.event_time AS eventTime,
                e.organizer AS eventOrganizer,
                bd.quantity,
                tt.name AS tierName,
                p.payment_status AS paymentStatus,
                p.payment_method AS paymentMethod
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN events e ON b.event_id = e.event_id
            LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
            LEFT JOIN ticket_types tt ON bd.ticket_type_id = tt.ticket_type_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
        `;

        const bookings = emailFilter
            ? db.prepare(`${baseSql} WHERE LOWER(u.email) = ? ORDER BY b.booking_date DESC;`).all(emailFilter)
            : db.prepare(`${baseSql} ORDER BY b.booking_date DESC;`).all();

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve bookings',
            error: err.message
        });
    }
});

// ----------------------------------------------------------------------------
// 4. GET /api/admin/stats
// Admin Dashboard Analytics (SQL COUNT, SUM, GROUP BY across all 6 tables)
// ----------------------------------------------------------------------------
app.get('/api/admin/stats', (req, res) => {
    const authUser = verifyAuthToken(req.headers.authorization);
    if (!authUser || authUser.role !== 'admin') {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required.'
        });
    }

    try {
        const totalBookings = db.prepare(`SELECT COUNT(*) AS c FROM bookings WHERE status = 'CONFIRMED'`).get().c;
        const totalTicketsBooked = db.prepare(`
            SELECT COALESCE(SUM(bd.quantity), 0) AS c
            FROM booking_details bd
            JOIN bookings b ON b.booking_id = bd.booking_id
            WHERE b.status = 'CONFIRMED'
        `).get().c;
        const totalRevenue = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) AS total
            FROM bookings
            WHERE status = 'CONFIRMED'
        `).get().total;
        const seatTotals = db.prepare(`
            SELECT COALESCE(SUM(total_seats), 0) AS capacity, COALESCE(SUM(available_seats), 0) AS remaining
            FROM events
        `).get();
        const totalCustomers = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'customer'`).get().c;

        const eventBreakdown = db.prepare(`
            SELECT
                e.event_id AS eventId,
                e.title,
                e.category_label AS categoryLabel,
                e.date_formatted AS dateFormatted,
                e.total_seats AS totalSeats,
                e.available_seats AS availableSeats,
                COALESCE((
                    SELECT SUM(bd.quantity)
                    FROM bookings b
                    JOIN booking_details bd ON b.booking_id = bd.booking_id
                    WHERE b.event_id = e.event_id AND b.status = 'CONFIRMED'
                ), 0) AS ticketsBooked,
                COALESCE((
                    SELECT COUNT(*)
                    FROM bookings b
                    WHERE b.event_id = e.event_id AND b.status = 'CONFIRMED'
                ), 0) AS bookingCount,
                COALESCE((
                    SELECT SUM(b.total_amount)
                    FROM bookings b
                    WHERE b.event_id = e.event_id AND b.status = 'CONFIRMED'
                ), 0) AS revenue
            FROM events e
            ORDER BY ticketsBooked DESC, e.event_date ASC;
        `).all();

        const recentBookings = db.prepare(`
            SELECT
                b.booking_id AS bookingId,
                b.total_amount AS totalAmount,
                b.booking_date AS bookingDate,
                b.status,
                u.full_name AS attendeeName,
                u.email AS attendeeEmail,
                u.roll_no AS attendeeRoll,
                u.phone AS attendeePhone,
                e.title AS eventTitle,
                tt.name AS tierName,
                bd.quantity,
                p.payment_status AS paymentStatus
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN events e ON b.event_id = e.event_id
            LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
            LEFT JOIN ticket_types tt ON bd.ticket_type_id = tt.ticket_type_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            ORDER BY b.booking_date DESC;
        `).all();

        res.json({
            success: true,
            summary: {
                totalBookings,
                totalTicketsBooked,
                totalRevenue,
                totalCapacity: seatTotals.capacity,
                totalSeatsRemaining: seatTotals.remaining,
                totalCustomers
            },
            eventBreakdown,
            recentBookings
        });
    } catch (err) {
        console.error('Admin stats error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to load admin analytics.' });
    }
});

// ----------------------------------------------------------------------------
// Start Server
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`⚡ SmartEvent Server running on port ${PORT}`);
    console.log(`🌐 Local URL:      http://localhost:${PORT}`);
    console.log(`🗄️ Database File:  ${dbPath}`);
    console.log(`🔑 Admin Login:    admin@smartevent.edu / admin123`);
    console.log(`🎓 Demo Customer:  student@college.edu  / student123`);
    console.log('====================================================');
    testConnection();
});
