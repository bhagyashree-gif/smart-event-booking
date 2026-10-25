-- ============================================================================
-- Smart Event & Ticket Booking System - Relational DBMS Schema
-- College Major Project (SQLite Version)
-- 6 Normalized Relational Tables with Foreign Key Constraints
-- ============================================================================

-- Enable Foreign Key constraint enforcement
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Table 1: USERS (Entity)
-- Stores college attendees, students, faculty, and guests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    roll_no TEXT DEFAULT 'N/A',
    phone TEXT NOT NULL,
    password_hash TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);

-- ----------------------------------------------------------------------------
-- Table 2: EVENTS (Entity)
-- Stores campus fests, workshops, tech events, concerts, and sports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('tech', 'workshop', 'concert', 'sports', 'college')),
    category_label TEXT NOT NULL,
    organizer TEXT NOT NULL,
    event_date TEXT NOT NULL,
    date_formatted TEXT NOT NULL,
    event_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_event_date ON events(event_date);

-- ----------------------------------------------------------------------------
-- Table 3: TICKET_TYPES (Weak Entity dependent on EVENTS)
-- Stores multi-tier tickets per event (e.g. Student Pass, General, VIP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_types (
    ticket_type_id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0.0 CHECK (price >= 0),
    perks TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    available INTEGER NOT NULL CHECK (available >= 0),
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types(event_id);

-- ----------------------------------------------------------------------------
-- Table 4: BOOKINGS (Header Transaction Entity)
-- Stores overall booking order linked to user and event
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    booking_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0.0,
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_booking_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_event ON bookings(event_id);

-- ----------------------------------------------------------------------------
-- Table 5: BOOKING_DETAILS (Line Items / Itemized Breakdown)
-- Stores individual ticket type selections, quantities, unit prices, and subtotals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_details (
    detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL,
    ticket_type_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL DEFAULT 0.0,
    subtotal REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(ticket_type_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_detail_booking ON booking_details(booking_id);

-- ----------------------------------------------------------------------------
-- Table 6: PAYMENTS (Payment Transaction Audit)
-- Records simulated / gateway payments linked to each booking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'ONLINE_MOCK',
    payment_status TEXT DEFAULT 'SUCCESS' CHECK (payment_status IN ('SUCCESS', 'PENDING', 'FAILED')),
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);
