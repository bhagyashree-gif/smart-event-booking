-- ============================================================================
-- Smart Event & Ticket Booking System - Seed Data (SQLite Version)
-- Populates campus events and ticket types
-- ============================================================================

-- Clear existing data (respecting foreign key relationships)
DELETE FROM payments;
DELETE FROM booking_details;
DELETE FROM bookings;
DELETE FROM ticket_types;
DELETE FROM events;
DELETE FROM users;

-- ----------------------------------------------------------------------------
-- 1. Insert Campus Events
-- ----------------------------------------------------------------------------
INSERT INTO events (event_id, title, category, category_label, organizer, event_date, date_formatted, event_time, venue, description, banner_url, total_seats, available_seats, is_featured)
VALUES
('EVT-101', 'HackMatrix 2026: 36-Hour National Hackathon', 'tech', 'Tech Fest & Hackathon', 'Dept. of Computer Science & Engineering', '2026-11-14', 'Sat, Nov 14, 2026', '09:00 AM IST', 'Tech Innovation Hub, Main Campus', 'Join over 500+ student developers, designers, and innovators building cutting-edge AI, Web3, and IoT solutions. Mentors from top tech giants, free meals, swag bags, and $10,000 in prizes!', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80', 350, 42, 1),

('EVT-102', 'Aura 2026: Annual Cultural Fest & Rock Night', 'concert', 'Concerts & Cultural', 'Student Cultural Council', '2026-11-20', 'Fri, Nov 20, 2026', '06:30 PM IST', 'Grand Open Air Amphitheatre', 'The biggest university musical extravaganza of the semester! Featuring live headline performances by indie rock bands, EDM DJ sets, dance showcases, and food carnivals.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80', 1200, 185, 1),

('EVT-103', 'Hands-on AI & Large Language Models Workshop', 'workshop', 'Workshops & Seminars', 'AI & Machine Learning Student Club', '2026-11-08', 'Sun, Nov 08, 2026', '10:00 AM IST', 'Seminar Hall B, Engineering Block', 'A comprehensive 6-hour hands-on bootcamp covering prompt engineering, fine-tuning open source LLMs, and deploying Retrieval-Augmented Generation (RAG) agents with Python.', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80', 120, 16, 0),

('EVT-104', 'Inter-Collegiate Esports Championship: Valorant & BGMI', 'sports', 'Sports & Gaming', 'Campus Gaming & Esports League', '2026-11-28', 'Sat, Nov 28, 2026', '11:00 AM IST', 'Student Activity Center (SAC Arena)', '16 top university squads battle for the collegiate trophy and $3,000 prize pool in Valorant, BGMI, and FIFA 26. Giant LED screens, live casting, and arcade zones.', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80', 400, 94, 0),

('EVT-105', 'RoboWars & Autonomous Drone Racing League', 'tech', 'Tech Fest & Hackathon', 'Robotics & Mechatronics Society', '2026-12-05', 'Sat, Dec 05, 2026', '01:30 PM IST', 'Central Sports Complex Ground', 'Witness 15kg & 30kg metal combat bots battle in an armored arena alongside high-speed FPV drone obstacle course racing. Sparks fly and gears smash!', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80', 600, 112, 0),

('EVT-106', 'TEDx Youth @ Campus: ''Ideas Sparking Tomorrow''', 'college', 'College Events', 'TEDx Youth Organizing Board', '2026-12-12', 'Sat, Dec 12, 2026', '02:00 PM IST', 'University Auditorium', '8 visionary speakers across aerospace, entrepreneurship, mental wellness, and climate tech sharing 15-minute transformative ideas. Includes official TEDx gift hamper.', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80', 300, 28, 1),

('EVT-107', 'Annual Sports Meet: Track, Field & Football Final', 'sports', 'Sports & Gaming', 'Department of Physical Education', '2026-11-25', 'Wed, Nov 25, 2026', '08:00 AM IST', 'University Olympic Stadium', 'Experience the thrilling showdown of inter-department football finals, 100m sprint championships, relay race, and high-jump competitions.', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80', 800, 240, 0),

('EVT-108', 'Full-Stack Web & DBMS Project Masterclass', 'workshop', 'Workshops & Seminars', 'Developer Student Club (DSC)', '2026-11-10', 'Tue, Nov 10, 2026', '04:00 PM IST', 'Computer Center - Lab 3', 'Ideal for 3rd & 4th year college project builders! Master relational database modeling (ER diagrams, 3NF normalization), SQL indexing, and REST API integration.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80', 90, 12, 0);

-- ----------------------------------------------------------------------------
-- 2. Insert Ticket Types for Each Event
-- ----------------------------------------------------------------------------
INSERT INTO ticket_types (ticket_type_id, event_id, name, price, perks, capacity, available)
VALUES
-- HackMatrix 2026
('EVT-101_tier_free', 'EVT-101', 'Student Participant', 0.0, 'Hackathon Entry, Food & Hack Kit', 150, 20),
('EVT-101_tier_team', 'EVT-101', 'Team Fast-Track (Per Member)', 15.0, 'Priority Mentorship, Dorm Stay & Swag', 150, 22),
('EVT-101_tier_vip', 'EVT-101', 'Industry Observer / VIP', 50.0, 'VIP Lounge, Networking Dinner, Jury Pass', 50, 10),

-- Aura 2026 Rock Night
('EVT-102_tier_gen', 'EVT-102', 'General Admission', 20.0, 'Amphitheatre ground access, glow wristband', 800, 120),
('EVT-102_tier_fan', 'EVT-102', 'Fan Pit (Front Stage)', 45.0, 'Front row stage pit, signed band poster', 300, 45),
('EVT-102_tier_vip', 'EVT-102', 'VIP Lounge Pass', 80.0, 'Elevated deck seating, complimentary refreshments', 100, 20),

-- AI Workshop
('EVT-103_tier_student', 'EVT-103', 'Student Workshop Pass', 10.0, 'Lab access, dataset bundle, certificate', 80, 10),
('EVT-103_tier_pro', 'EVT-103', 'Faculty & Professional', 25.0, 'Workshop recording, code repo, mentor 1-on-1', 40, 6),

-- Esports
('EVT-104_tier_spec', 'EVT-104', 'Spectator Pass', 5.0, 'Arena seating, lucky draw ticket', 300, 70),
('EVT-104_tier_gamer', 'EVT-104', 'Gamer VIP Seat', 18.0, 'Front gaming row, energy drink, gaming merch', 100, 24),

-- RoboWars
('EVT-105_tier_general', 'EVT-105', 'Bleachers Entry', 8.0, 'Stadium seating, souvenir badge', 400, 80),
('EVT-105_tier_pit', 'EVT-105', 'Pit Lane & Arena Pass', 22.0, 'Meet robot builders, pit pass, safety gear', 200, 32),

-- TEDx
('EVT-106_tier_std', 'EVT-106', 'Student Delegate', 15.0, 'Auditorium seat, TEDx kit, networking tea', 200, 18),
('EVT-106_tier_vip', 'EVT-106', 'Patron Delegate', 35.0, 'Reserved prime seat, speaker lounge access', 100, 10),

-- Sports Meet
('EVT-107_tier_free', 'EVT-107', 'General Campus Pass', 0.0, 'Free entry with college ID card', 600, 200),
('EVT-107_tier_cheer', 'EVT-107', 'Cheer Zone Pass', 5.0, 'Cheer pom-poms, face paint, priority seat', 200, 40),

-- DBMS Masterclass
('EVT-108_tier_free', 'EVT-108', 'Free Student Seat', 0.0, 'Lab workstation, PDF guide', 60, 8),
('EVT-108_tier_cert', 'EVT-108', 'Certified Track', 12.0, 'Certificate, 1-on-1 project code review', 30, 4);
