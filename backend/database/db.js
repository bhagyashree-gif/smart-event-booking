/**
 * db.js - SQLite Database Connection Module
 * Smart Event & Ticket Booking System (DBMS Focus)
 * 
 * Uses better-sqlite3: fast, synchronous, zero-configuration local relational database.
 * Foreign keys and WAL mode are automatically enabled.
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Local database file path
const defaultDbPath = path.join(__dirname, 'events.db');
const dbPath = process.env.DB_PATH ? path.resolve(process.cwd(), process.env.DB_PATH) : defaultDbPath;

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite database
const db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable Foreign Key Enforcement & WAL mode for high concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

/**
 * Deterministic salted SHA-256 password hash helper
 */
function hashPassword(plainText) {
    return crypto
        .createHash('sha256')
        .update(`smartevent_salt_v1:${String(plainText)}`)
        .digest('hex');
}

/**
 * Ensure Admin and Demo Customer accounts exist without overwriting existing bookings
 */
function ensureDefaultAccounts() {
    const columns = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    if (!columns.includes('password_hash')) {
        db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''");
    }
    if (!columns.includes('role')) {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
    }

    const upsertAccount = db.prepare(`
        INSERT INTO users (full_name, email, roll_no, phone, password_hash, role)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
            password_hash = CASE WHEN users.password_hash = '' OR users.password_hash IS NULL THEN excluded.password_hash ELSE users.password_hash END,
            role = excluded.role
    `);

    upsertAccount.run(
        'Campus Admin',
        'admin@smartevent.edu',
        'ADMIN-01',
        '9000000001',
        hashPassword('admin123'),
        'admin'
    );

    upsertAccount.run(
        'Aarav Sharma',
        'student@college.edu',
        'CSE-2026-104',
        '9876543210',
        hashPassword('student123'),
        'customer'
    );
}

/**
 * Initialize schema if tables do not exist
 */
function initializeDatabase() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schemaSql);
        }

        // Check if events table has data; if not, auto-seed
        const countRow = db.prepare('SELECT COUNT(*) as count FROM events').get();
        if (countRow.count === 0) {
            const seedPath = path.join(__dirname, 'seed.sql');
            if (fs.existsSync(seedPath)) {
                const seedSql = fs.readFileSync(seedPath, 'utf8');
                db.exec(seedSql);
                console.log('🌱 SQLite database auto-seeded with sample campus events & ticket types.');
            }
        }

        ensureDefaultAccounts();
    } catch (err) {
        console.error('Database initialization warning:', err.message);
    }
}

// Initialize on module load
initializeDatabase();

/**
 * Test Database Connection
 */
function testConnection() {
    try {
        const row = db.prepare('SELECT 1 as test').get();
        return row && row.test === 1;
    } catch (err) {
        console.error('SQLite connection check failed:', err.message);
        return false;
    }
}

module.exports = {
    db,
    dbPath,
    hashPassword,
    ensureDefaultAccounts,
    testConnection,
    initializeDatabase
};
