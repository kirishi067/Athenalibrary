// db.js - SQLite Database initialization, schema management, and realistic seed data
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'library.db');
const db = new DatabaseSync(DB_PATH);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#4f46e5',
      icon TEXT DEFAULT 'bi-bookmark',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      biography TEXT,
      nationality TEXT,
      birth_year INTEGER,
      death_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      publisher TEXT,
      publish_year INTEGER,
      edition TEXT,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      shelf_location TEXT,
      description TEXT,
      cover_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      member_type TEXT DEFAULT 'Student',
      borrow_limit INTEGER DEFAULT 3,
      status TEXT DEFAULT 'Active',
      joined_date DATE DEFAULT (DATE('now')),
      expiry_date DATE DEFAULT (DATE('now', '+1 year')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Member',
      member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS borrowings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      issued_by_user_id INTEGER REFERENCES users(id),
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      return_date DATE,
      renewal_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Borrowed',
      fine_amount REAL DEFAULT 0.00,
      fine_paid REAL DEFAULT 0.00,
      fine_status TEXT DEFAULT 'None',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      reservation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Pending',
      notification_sent INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS fine_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrowing_id INTEGER NOT NULL REFERENCES borrowings(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      amount_paid REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT DEFAULT 'Cash',
      receipt_no TEXT UNIQUE NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Initialize default settings if empty
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (countSettings === 0) {
    seedDatabase();
  }
}

function logActivity(userName, action, details) {
  try {
    db.prepare('INSERT INTO activity_logs (user_name, action, details) VALUES (?, ?, ?)').run(userName, action, details);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

function seedDatabase() {
  console.log('Seeding library database with initial data...');

  // Reset all tables safely
  db.exec(`
    DELETE FROM activity_logs;
    DELETE FROM notifications;
    DELETE FROM fine_payments;
    DELETE FROM reservations;
    DELETE FROM borrowings;
    DELETE FROM users;
    DELETE FROM members;
    DELETE FROM books;
    DELETE FROM authors;
    DELETE FROM categories;
    DELETE FROM settings;
  `);

  // Settings
  const insertSetting = db.prepare('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)');
  insertSetting.run('fine_per_day', '1.00', 'Fine amount per day overdue in currency');
  insertSetting.run('loan_period_days', '14', 'Standard loan duration in days');
  insertSetting.run('max_renewals', '2', 'Maximum renewals permitted per loan');
  insertSetting.run('currency_symbol', '$', 'Currency symbol for fines and transactions');
  insertSetting.run('library_name', 'Metropolitan Central Library', 'Name of the Library Institution');
  insertSetting.run('library_email', 'contact@librarycentral.org', 'Contact Email');

  // Categories
  const insertCategory = db.prepare('INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)');
  const cat1 = insertCategory.run('Computer Science', 'Programming, Algorithms, AI, Systems and Web Development', '#2563eb', 'cpu').lastInsertRowid;
  const cat2 = insertCategory.run('Classic Literature', 'Timeless literary masterpieces and historic fiction', '#7c3aed', 'book-open').lastInsertRowid;
  const cat3 = insertCategory.run('Science & Physics', 'Astrophysics, Quantum Mechanics, Natural Sciences', '#059669', 'atom').lastInsertRowid;
  const cat4 = insertCategory.run('History & Philosophy', 'World History, civilizations, thought, ethics', '#d97706', 'globe').lastInsertRowid;
  const cat5 = insertCategory.run('Fiction & Mystery', 'Modern thrillers, detective fiction, contemporary novels', '#dc2626', 'compass').lastInsertRowid;
  const cat6 = insertCategory.run('Business & Economics', 'Economics, startup leadership, finance, management', '#0891b2', 'trending-up').lastInsertRowid;

  // Authors
  const insertAuthor = db.prepare('INSERT INTO authors (name, biography, nationality, birth_year, death_year) VALUES (?, ?, ?, ?, ?)');
  const auth1 = insertAuthor.run('Donald E. Knuth', 'Renowned computer scientist, mathematician, and author of The Art of Computer Programming.', 'American', 1938, null).lastInsertRowid;
  const auth2 = insertAuthor.run('Robert C. Martin', 'Known colloquially as Uncle Bob, software engineer and author of clean code principles.', 'American', 1952, null).lastInsertRowid;
  const auth3 = insertAuthor.run('George Orwell', 'English novelist, essayist, journalist, and critic noted for lucid prose and sharp social criticism.', 'British', 1903, 1950).lastInsertRowid;
  const auth4 = insertAuthor.run('Richard P. Feynman', 'Theoretical physicist known for quantum electrodynamics and playful scientific lectures.', 'American', 1918, 1988).lastInsertRowid;
  const auth5 = insertAuthor.run('Yuval Noah Harari', 'Historian, philosopher, and bestselling author of Sapiens: A Brief History of Humankind.', 'Israeli', 1976, null).lastInsertRowid;
  const auth6 = insertAuthor.run('Arthur Conan Doyle', 'British writer and physician who created the legendary detective Sherlock Holmes.', 'British', 1859, 1930).lastInsertRowid;
  const auth7 = insertAuthor.run('Martin Fowler', 'Software engineer, author, and international speaker on software architecture and refactoring.', 'British', 1963, null).lastInsertRowid;

  // Books
  const insertBook = db.prepare(`
    INSERT INTO books (isbn, title, author_id, category_id, publisher, publish_year, edition, total_copies, available_copies, shelf_location, description, cover_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const b1 = insertBook.run(
    '978-0132350884',
    'Clean Code: A Handbook of Agile Software Craftsmanship',
    auth2,
    cat1,
    'Prentice Hall',
    2008,
    '1st Edition',
    5,
    3,
    'Shelf CS-102',
    'Even bad code can function. But if code is not clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code.',
    'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b2 = insertBook.run(
    '978-0201616224',
    'The Pragmatic Programmer: Your Journey To Mastery',
    auth7,
    cat1,
    'Addison-Wesley Professional',
    2019,
    '20th Anniversary Edition',
    4,
    2,
    'Shelf CS-105',
    'Written as a series of self-contained sections and filled with entertaining anecdotes, thoughtful examples, and interesting analogies, this book illustrates best practices and major pitfalls.',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b3 = insertBook.run(
    '978-0451524935',
    '1984',
    auth3,
    cat2,
    'Signet Classic',
    1949,
    'Reprint Edition',
    6,
    5,
    'Shelf LIT-301',
    'The classic dystopian novel exploring totalitarianism, mass surveillance, and repressive regimentation of persons and behaviours within society.',
    'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b4 = insertBook.run(
    '978-0393355949',
    'Surely You\'re Joking, Mr. Feynman!',
    auth4,
    cat3,
    'W. W. Norton & Company',
    1985,
    'Expanded Edition',
    3,
    3,
    'Shelf SCI-204',
    'Adventures of a curious character. Nobel Prize winner Richard Feynman recounts his scandalous, outrageous, and deeply humorous experiences in theoretical physics and life.',
    'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b5 = insertBook.run(
    '978-0062316097',
    'Sapiens: A Brief History of Humankind',
    auth5,
    cat4,
    'Harper',
    2014,
    '1st Harper Edition',
    5,
    4,
    'Shelf HIST-101',
    'One hundred thousand years ago, at least six different species of humans inhabited Earth. Yet today there is only one: homo sapiens. How did our species succeed in the battle for dominance?',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b6 = insertBook.run(
    '978-1503222687',
    'The Adventures of Sherlock Holmes',
    auth6,
    cat5,
    'CreateSpace',
    1892,
    'Collector Edition',
    4,
    2,
    'Shelf MYS-402',
    'A collection of twelve short stories by Arthur Conan Doyle, featuring his fictional detective Sherlock Holmes and Dr. John H. Watson.',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b7 = insertBook.run(
    '978-0201896831',
    'The Art of Computer Programming: Volume 1',
    auth1,
    cat1,
    'Addison-Wesley',
    1997,
    '3rd Edition',
    2,
    1,
    'Shelf CS-REF-01',
    'Fundamental algorithms and comprehensive mathematical foundations of modern computing by Turing award laureate Donald Knuth.',
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b8 = insertBook.run(
    '978-0201485677',
    'Refactoring: Improving the Design of Existing Code',
    auth7,
    cat1,
    'Addison-Wesley Professional',
    2018,
    '2nd Edition',
    3,
    3,
    'Shelf CS-108',
    'Refactoring is a controlled technique for improving the design of an existing code base. Its essence is applying a series of small behavior-preserving transformations.',
    'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  const b9 = insertBook.run(
    '978-0451526342',
    'Animal Farm',
    auth3,
    cat2,
    'Signet Classic',
    1945,
    'Classic Edition',
    5,
    5,
    'Shelf LIT-302',
    'A biting satirical allegorical novella reflecting events leading up to the Russian Revolution and Stalinist era.',
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80'
  ).lastInsertRowid;

  // Members
  const insertMember = db.prepare(`
    INSERT INTO members (member_code, name, email, phone, address, member_type, borrow_limit, status, joined_date, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const m1 = insertMember.run('LIB-1001', 'Emily Watson', 'emily.watson@university.edu', '+1 (555) 234-5678', '452 Elm Street, Oxford', 'Student', 4, 'Active', '2025-09-10', '2027-09-10').lastInsertRowid;
  const m2 = insertMember.run('LIB-1002', 'Dr. Alexander Vance', 'alex.vance@mit.edu', '+1 (555) 987-6543', '12 Research Blvd, Cambridge', 'Faculty', 8, 'Active', '2024-01-15', '2028-01-15').lastInsertRowid;
  const m3 = insertMember.run('LIB-1003', 'Sarah Jenkins', 'sarah.j@gmail.com', '+1 (555) 345-6789', '78 Oak Lane, London', 'General', 3, 'Active', '2025-11-20', '2026-11-20').lastInsertRowid;
  const m4 = insertMember.run('LIB-1004', 'David Kim', 'dkim_developer@outlook.com', '+1 (555) 678-1234', '101 Cyber Park, Seattle', 'Student', 4, 'Active', '2026-02-01', '2027-02-01').lastInsertRowid;
  const m5 = insertMember.run('LIB-1005', 'Rachel Green', 'rachel.g@nyu.edu', '+1 (555) 432-8765', '90 Bedford St, New York', 'Student', 3, 'Suspended', '2025-05-12', '2026-05-12').lastInsertRowid;

  // Users (Admin, Librarian, Member accounts)
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, email, role, member_id, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const uAdmin = insertUser.run('admin', 'admin123', 'Victoria Sterling (Admin)', 'admin@librarycentral.org', 'Admin', null, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80').lastInsertRowid;
  const uLib = insertUser.run('librarian', 'lib123', 'Marcus Thorne (Librarian)', 'marcus.librarian@librarycentral.org', 'Librarian', null, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80').lastInsertRowid;
  const uMem1 = insertUser.run('emily', 'student123', 'Emily Watson', 'emily.watson@university.edu', 'Member', m1, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80').lastInsertRowid;
  const uMem2 = insertUser.run('alex', 'faculty123', 'Dr. Alexander Vance', 'alex.vance@mit.edu', 'Member', m2, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80').lastInsertRowid;

  // Circulation / Borrowings (Active, Returned, and Overdue)
  const insertBorrowing = db.prepare(`
    INSERT INTO borrowings (book_id, member_id, issued_by_user_id, issue_date, due_date, return_date, renewal_count, status, fine_amount, fine_paid, fine_status, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Today's reference date in logic
  const now = new Date();
  const formatYMD = (d) => d.toISOString().split('T')[0];
  
  const today = new Date();
  const dMinus20 = new Date(today); dMinus20.setDate(today.getDate() - 20);
  const dMinus6 = new Date(today); dMinus6.setDate(today.getDate() - 6);
  const dMinus2 = new Date(today); dMinus2.setDate(today.getDate() - 2);
  const dPlus7 = new Date(today); dPlus7.setDate(today.getDate() + 7);
  const dPlus12 = new Date(today); dPlus12.setDate(today.getDate() + 12);

  // Overdue loan (Issued 20 days ago, due 6 days ago -> 6 days overdue)
  const bor1 = insertBorrowing.run(
    b1, // Clean Code
    m1, // Emily
    uLib,
    formatYMD(dMinus20),
    formatYMD(dMinus6),
    null,
    0,
    'Overdue',
    6.00,
    0.00,
    'Unpaid',
    'Loan overdue by 6 days'
  ).lastInsertRowid;

  // Active current loan (Issued 5 days ago, due in 9 days)
  const bor2 = insertBorrowing.run(
    b2, // Pragmatic Programmer
    m1, // Emily
    uLib,
    formatYMD(new Date(today.getTime() - 5*24*3600*1000)),
    formatYMD(dPlus7),
    null,
    1,
    'Borrowed',
    0.00,
    0.00,
    'None',
    'Renewed once via portal'
  ).lastInsertRowid;

  // Active current loan for Dr. Alexander Vance
  const bor3 = insertBorrowing.run(
    b7, // Knuth Volume 1
    m2, // Alexander
    uLib,
    formatYMD(new Date(today.getTime() - 2*24*3600*1000)),
    formatYMD(dPlus12),
    null,
    0,
    'Borrowed',
    0.00,
    0.00,
    'None',
    'Faculty research loan'
  ).lastInsertRowid;

  // Another active loan for David Kim
  const bor4 = insertBorrowing.run(
    b6, // Sherlock Holmes
    m4, // David Kim
    uLib,
    formatYMD(new Date(today.getTime() - 7*24*3600*1000)),
    formatYMD(dPlus7),
    null,
    0,
    'Borrowed',
    0.00,
    0.00,
    'None',
    'Standard issue'
  ).lastInsertRowid;

  // Returned loan with paid fine
  const bor5 = insertBorrowing.run(
    b3, // 1984
    m3, // Sarah
    uLib,
    formatYMD(new Date(today.getTime() - 35*24*3600*1000)),
    formatYMD(new Date(today.getTime() - 21*24*3600*1000)),
    formatYMD(new Date(today.getTime() - 18*24*3600*1000)),
    0,
    'Returned',
    3.00,
    3.00,
    'Paid',
    'Returned 3 days late, paid at desk'
  ).lastInsertRowid;

  // Fine Payment record for bor5
  db.prepare(`
    INSERT INTO fine_payments (borrowing_id, member_id, amount_paid, payment_date, payment_method, receipt_no, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(bor5, m3, 3.00, formatYMD(new Date(today.getTime() - 18*24*3600*1000)), 'Cash', 'RCP-2026-0042', 'Late return fine settled in full');

  // Book Reservations
  const insertReservation = db.prepare(`
    INSERT INTO reservations (book_id, member_id, reservation_date, status, notification_sent, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertReservation.run(b7, m4, formatYMD(dMinus2), 'Pending', 0, 'Interested in Knuth algorithms research');
  insertReservation.run(b1, m3, formatYMD(dMinus6), 'Ready', 1, 'Copy ready on hold shelf for 48 hours');

  // Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, member_id, type, title, message, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(uMem1, m1, 'Overdue', 'Action Required: Book Overdue', 'Your loan of "Clean Code" was due on ' + formatYMD(dMinus6) + '. Current overdue fine: $6.00.', 0);
  insertNotification.run(uMem1, m1, 'DueWarning', 'Reminder: Due Date Approaching', '"The Pragmatic Programmer" is due on ' + formatYMD(dPlus7) + '. Renew online if needed.', 0);
  insertNotification.run(uAdmin, null, 'System', 'Weekly Overdue Summary', '1 loan is currently overdue with $6.00 accumulated in outstanding fines.', 1);
  insertNotification.run(uLib, null, 'ReservationReady', 'Reservation Ready for Pickup', 'Hold ready for member Sarah Jenkins for book "Clean Code".', 0);

  // Initial Activity Logs
  logActivity('System', 'System Initialization', 'Database seeded with default catalog, members, and circulation records.');
  logActivity('Victoria Sterling (Admin)', 'Role Assignment', 'Assigned Marcus Thorne to Librarian role.');
  logActivity('Marcus Thorne (Librarian)', 'Book Issue', 'Issued "The Pragmatic Programmer" to Emily Watson.');

  console.log('Database successfully initialized and seeded!');
}

// Helper to refresh overdue statuses and calculate fines automatically
function updateOverdueRecords() {
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'fine_per_day'").get();
  const fineRate = settingsRow ? parseFloat(settingsRow.value) : 1.0;
  const todayStr = new Date().toISOString().split('T')[0];

  const overdueLoans = db.prepare(`
    SELECT id, due_date, fine_paid, fine_amount, status
    FROM borrowings
    WHERE return_date IS NULL AND due_date < ?
  `).all(todayStr);

  const updateStmt = db.prepare(`
    UPDATE borrowings
    SET status = 'Overdue',
        fine_amount = ?,
        fine_status = CASE 
          WHEN fine_paid >= ? THEN 'Paid' 
          WHEN fine_paid > 0 THEN 'Partially Paid' 
          ELSE 'Unpaid' 
        END
    WHERE id = ?
  `);

  for (const loan of overdueLoans) {
    const due = new Date(loan.due_date);
    const now = new Date(todayStr);
    const diffDays = Math.max(1, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));
    const calculatedFine = Number((diffDays * fineRate).toFixed(2));
    updateStmt.run(calculatedFine, calculatedFine, loan.id);
  }
}

module.exports = {
  db,
  initDatabase,
  seedDatabase,
  logActivity,
  updateOverdueRecords
};
