/**
 * sample_events.js - Sample Event Dataset
 * 
 * NOTE FOR COLLEGE PROJECT / DBMS:
 * This dataset is structured intentionally like rows from a normalized relational database:
 * - Table 'events' (id, title, category, organizer, date, time, venue, description, banner_url, total_seats, available_seats)
 * - Table 'ticket_tiers' (tier_id, event_id, name, price, available)
 * 
 * In Phase 2, this static array will be replaced by an API call fetching from MySQL!
 */

const SAMPLE_EVENTS = [
    {
        id: "EVT-101",
        title: "HackMatrix 2026: 36-Hour National Hackathon",
        category: "tech",
        categoryLabel: "Tech Fest & Hackathon",
        organizer: "Dept. of Computer Science & Engineering",
        date: "2026-11-14",
        dateFormatted: "Sat, Nov 14, 2026",
        time: "09:00 AM IST",
        venue: "Tech Innovation Hub, Main Campus",
        description: "Join over 500+ student developers, designers, and innovators building cutting-edge AI, Web3, and IoT solutions. Mentors from top tech giants, free meals, swag bags, and $10,000 in prizes!",
        banner: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 350,
        availableSeats: 42,
        featured: true,
        tiers: [
            { id: "tier_free", name: "Student Participant", price: 0, perks: "Hackathon Entry, Food & Hack Kit", available: 20 },
            { id: "tier_team", name: "Team Fast-Track (Per Member)", price: 15, perks: "Priority Mentorship, Dorm Stay & Swag", available: 22 },
            { id: "tier_vip", name: "Industry Observer / VIP", price: 50, perks: "VIP Lounge, Networking Dinner, Jury Pass", available: 10 }
        ]
    },
    {
        id: "EVT-102",
        title: "Aura 2026: Annual Cultural Fest & Rock Night",
        category: "concert",
        categoryLabel: "Concerts & Cultural",
        organizer: "Student Cultural Council",
        date: "2026-11-20",
        dateFormatted: "Fri, Nov 20, 2026",
        time: "06:30 PM IST",
        venue: "Grand Open Air Amphitheatre",
        description: "The biggest university musical extravaganza of the semester! Featuring live headline performances by indie rock bands, EDM DJ sets, dance showcases, and food carnivals.",
        banner: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 1200,
        availableSeats: 185,
        featured: true,
        tiers: [
            { id: "tier_gen", name: "General Admission", price: 20, perks: "Amphitheatre ground access, glow wristband", available: 120 },
            { id: "tier_fan", name: "Fan Pit (Front Stage)", price: 45, perks: "Front row stage pit, signed band poster", available: 45 },
            { id: "tier_vip", name: "VIP Lounge Pass", price: 80, perks: "Elevated deck seating, complimentary refreshments", available: 20 }
        ]
    },
    {
        id: "EVT-103",
        title: "Hands-on AI & Large Language Models Workshop",
        category: "workshop",
        categoryLabel: "Workshops & Seminars",
        organizer: "AI & Machine Learning Student Club",
        date: "2026-11-08",
        dateFormatted: "Sun, Nov 08, 2026",
        time: "10:00 AM IST",
        venue: "Seminar Hall B, Engineering Block",
        description: "A comprehensive 6-hour hands-on bootcamp covering prompt engineering, fine-tuning open source LLMs, and deploying Retrieval-Augmented Generation (RAG) agents with Python.",
        banner: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 120,
        availableSeats: 16,
        featured: false,
        tiers: [
            { id: "tier_student", name: "Student Workshop Pass", price: 10, perks: "Lab access, dataset bundle, certificate", available: 10 },
            { id: "tier_pro", name: "Faculty & Professional", price: 25, perks: "Workshop recording, code repo, mentor 1-on-1", available: 6 }
        ]
    },
    {
        id: "EVT-104",
        title: "Inter-Collegiate Esports Championship: Valorant & BGMI",
        category: "sports",
        categoryLabel: "Sports & Gaming",
        organizer: "Campus Gaming & Esports League",
        date: "2026-11-28",
        dateFormatted: "Sat, Nov 28, 2026",
        time: "11:00 AM IST",
        venue: "Student Activity Center (SAC Arena)",
        description: "16 top university squads battle for the collegiate trophy and $3,000 prize pool in Valorant, BGMI, and FIFA 26. Giant LED screens, live casting, and arcade zones.",
        banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 400,
        availableSeats: 94,
        featured: false,
        tiers: [
            { id: "tier_spec", name: "Spectator Pass", price: 5, perks: "Arena seating, lucky draw ticket", available: 70 },
            { id: "tier_gamer", name: "Gamer VIP Seat", price: 18, perks: "Front gaming row, energy drink, gaming merch", available: 24 }
        ]
    },
    {
        id: "EVT-105",
        title: "RoboWars & Autonomous Drone Racing League",
        category: "tech",
        categoryLabel: "Tech Fest & Hackathon",
        organizer: "Robotics & Mechatronics Society",
        date: "2026-12-05",
        dateFormatted: "Sat, Dec 05, 2026",
        time: "01:30 PM IST",
        venue: "Central Sports Complex Ground",
        description: "Witness 15kg & 30kg metal combat bots battle in an armored arena alongside high-speed FPV drone obstacle course racing. Sparks fly and gears smash!",
        banner: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 600,
        availableSeats: 112,
        featured: false,
        tiers: [
            { id: "tier_general", name: "Bleachers Entry", price: 8, perks: "Stadium seating, souvenir badge", available: 80 },
            { id: "tier_pit", name: "Pit Lane & Arena Pass", price: 22, perks: "Meet robot builders, pit pass, safety gear", available: 32 }
        ]
    },
    {
        id: "EVT-106",
        title: "TEDx Youth @ Campus: 'Ideas Sparking Tomorrow'",
        category: "college",
        categoryLabel: "College Events",
        organizer: "TEDx Youth Organizing Board",
        date: "2026-12-12",
        dateFormatted: "Sat, Dec 12, 2026",
        time: "02:00 PM IST",
        venue: "University Auditorium",
        description: "8 visionary speakers across aerospace, entrepreneurship, mental wellness, and climate tech sharing 15-minute transformative ideas. Includes official TEDx gift hamper.",
        banner: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 300,
        availableSeats: 28,
        featured: true,
        tiers: [
            { id: "tier_std", name: "Student Delegate", price: 15, perks: "Auditorium seat, TEDx kit, networking tea", available: 18 },
            { id: "tier_vip", name: "Patron Delegate", price: 35, perks: "Reserved prime seat, speaker lounge access", available: 10 }
        ]
    },
    {
        id: "EVT-107",
        title: "Annual Sports Meet: Track, Field & Football Final",
        category: "sports",
        categoryLabel: "Sports & Gaming",
        organizer: "Department of Physical Education",
        date: "2026-11-25",
        dateFormatted: "Wed, Nov 25, 2026",
        time: "08:00 AM IST",
        venue: "University Olympic Stadium",
        description: "Experience the thrilling showdown of inter-department football finals, 100m sprint championships, relay race, and high-jump competitions.",
        banner: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 800,
        availableSeats: 240,
        featured: false,
        tiers: [
            { id: "tier_free", name: "General Campus Pass", price: 0, perks: "Free entry with college ID card", available: 200 },
            { id: "tier_cheer", name: "Cheer Zone Pass", price: 5, perks: "Cheer pom-poms, face paint, priority seat", available: 40 }
        ]
    },
    {
        id: "EVT-108",
        title: "Full-Stack Web & DBMS Project Masterclass",
        category: "workshop",
        categoryLabel: "Workshops & Seminars",
        organizer: "Developer Student Club (DSC)",
        date: "2026-11-10",
        dateFormatted: "Tue, Nov 10, 2026",
        time: "04:00 PM IST",
        venue: "Computer Center - Lab 3",
        description: "Ideal for 3rd & 4th year college project builders! Master relational database modeling (ER diagrams, 3NF normalization), SQL indexing, and REST API integration.",
        banner: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
        totalSeats: 90,
        availableSeats: 12,
        featured: false,
        tiers: [
            { id: "tier_free", name: "Free Student Seat", price: 0, perks: "Lab workstation, PDF guide", available: 8 },
            { id: "tier_cert", name: "Certified Track", price: 12, perks: "Certificate, 1-on-1 project code review", available: 4 }
        ]
    }
];

// Helper to get event by ID
function getEventById(id) {
    return SAMPLE_EVENTS.find(e => e.id === id);
}

// Global & CommonJS compatibility
if (typeof window !== 'undefined') {
    window.SAMPLE_EVENTS = SAMPLE_EVENTS;
    window.getEventById = getEventById;
}
if (typeof globalThis !== 'undefined') {
    globalThis.SAMPLE_EVENTS = SAMPLE_EVENTS;
    globalThis.getEventById = getEventById;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SAMPLE_EVENTS, getEventById };
}
