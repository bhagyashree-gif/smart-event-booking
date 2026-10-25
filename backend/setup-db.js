/**
 * setup-db.js - SQLite Database Setup & Migration Script
 * Smart Event & Ticket Booking System (College Major Project)
 */

const fs = require('fs');
const path = require('path');
const { db, dbPath, ensureDefaultAccounts } = require('./database/db');

function setupDatabase() {
    console.log('====================================================');
    console.log('🚀 Initializing Smart Event Booking SQLite Database');
    console.log('====================================================');
    console.log(`Database File: ${dbPath}`);
    console.log('Engine:        SQLite 3 (via better-sqlite3)');
    console.log('----------------------------------------------------');

    try {
        // 1. Run schema.sql
        const schemaPath = path.join(__dirname, 'database/schema.sql');
        console.log(`📄 Executing Schema DDL (${schemaPath})...`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql);
        console.log('✅ Created 6 Relational Tables:');
        console.log('   1. users');
        console.log('   2. events');
        console.log('   3. ticket_types');
        console.log('   4. bookings');
        console.log('   5. booking_details');
        console.log('   6. payments');

        // 2. Run seed.sql
        const seedPath = path.join(__dirname, 'database/seed.sql');
        console.log(`\n🌱 Executing Seed Data (${seedPath})...`);
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        db.exec(seedSql);
        ensureDefaultAccounts();
        console.log('✅ Sample campus events, ticket types, and default login accounts inserted!');

        // 3. Verify counts in all 6 tables
        const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
        const tierCount = db.prepare('SELECT COUNT(*) as c FROM ticket_types').get().c;
        const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
        const bookingCount = db.prepare('SELECT COUNT(*) as c FROM bookings').get().c;
        const detailCount = db.prepare('SELECT COUNT(*) as c FROM booking_details').get().c;
        const paymentCount = db.prepare('SELECT COUNT(*) as c FROM payments').get().c;

        console.log('\n====================================================');
        console.log('🎉 SQLite Database Setup Complete!');
        console.log(`📊 Events:          ${eventCount}`);
        console.log(`📊 Ticket Types:    ${tierCount}`);
        console.log(`📊 Users:           ${userCount}`);
        console.log(`📊 Bookings:        ${bookingCount}`);
        console.log(`📊 Booking Details: ${detailCount}`);
        console.log(`📊 Payments:        ${paymentCount}`);
        console.log('====================================================');
        console.log('No passwords or external server required!');
        console.log('Run the web app anytime with: npm start');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ SQLite Setup Failed:');
        console.error(err.message);
        process.exit(1);
    }
}

setupDatabase();
