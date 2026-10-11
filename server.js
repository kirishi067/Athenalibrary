// server.js - Native HTTP Server, REST API Router, and SQLite Controller
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { db, initDatabase, seedDatabase, logActivity, updateOverdueRecords } = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize database schema and default records
initDatabase();

// MIME Types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // 10MB limit guard
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Router
async function handleRequest(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  try {
    // ----------------------------------------------------
    // API ROUTES
    // ----------------------------------------------------
    if (pathname.startsWith('/api/')) {
      // 1. Dashboard Stats
      if (pathname === '/api/dashboard/stats' && method === 'GET') {
        updateOverdueRecords();

        const booksCount = db.prepare('SELECT COUNT(*) as count, SUM(total_copies) as total_copies, SUM(available_copies) as available_copies FROM books').get();
        const membersCount = db.prepare("SELECT COUNT(*) as count, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active FROM members").get();
        const loansCount = db.prepare(`
          SELECT 
            COUNT(CASE WHEN return_date IS NULL THEN 1 END) as active_loans,
            COUNT(CASE WHEN return_date IS NULL AND due_date < DATE('now') THEN 1 END) as overdue_loans,
            COALESCE(SUM(CASE WHEN return_date IS NULL AND fine_status != 'Paid' THEN fine_amount - fine_paid ELSE 0 END), 0) as pending_fines
          FROM borrowings
        `).get();
        const reservationsCount = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status IN ('Pending', 'Ready')").get();
        const paymentsTotal = db.prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM fine_payments').get();

        const recentActivities = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 8').all();

        const popularBooks = db.prepare(`
          SELECT b.id, b.title, b.isbn, b.cover_url, a.name as author_name, c.name as category_name, COUNT(br.id) as borrow_count
          FROM books b
          LEFT JOIN authors a ON b.author_id = a.id
          LEFT JOIN categories c ON b.category_id = c.id
          LEFT JOIN borrowings br ON b.id = br.book_id
          GROUP BY b.id
          ORDER BY borrow_count DESC
          LIMIT 5
        `).all();

        const categoryStats = db.prepare(`
          SELECT c.id, c.name, c.color, COUNT(b.id) as book_count, COALESCE(SUM(b.total_copies), 0) as total_copies
          FROM categories c
          LEFT JOIN books b ON c.id = b.category_id
          GROUP BY c.id
        `).all();

        return sendJSON(res, 200, {
          stats: {
            totalBooks: booksCount.count || 0,
            totalCopies: booksCount.total_copies || 0,
            availableCopies: booksCount.available_copies || 0,
            borrowedCopies: (booksCount.total_copies || 0) - (booksCount.available_copies || 0),
            totalMembers: membersCount.count || 0,
            activeMembers: membersCount.active || 0,
            activeLoans: loansCount.active_loans || 0,
            overdueLoans: loansCount.overdue_loans || 0,
            pendingFines: loansCount.pending_fines || 0,
            collectedFines: paymentsTotal.total || 0,
            activeReservations: reservationsCount.count || 0
          },
          popularBooks,
          categoryStats,
          recentActivities
        });
      }

      // 2. Books API
      if (pathname === '/api/books') {
        if (method === 'GET') {
          let sql = `
            SELECT b.*, a.name as author_name, c.name as category_name, c.color as category_color,
                   (b.total_copies - b.available_copies) as borrowed_copies
            FROM books b
            LEFT JOIN authors a ON b.author_id = a.id
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE 1=1
          `;
          const params = [];

          if (query.search) {
            sql += ` AND (b.title LIKE ? OR b.isbn LIKE ? OR a.name LIKE ? OR b.shelf_location LIKE ?)`;
            const s = `%${query.search}%`;
            params.push(s, s, s, s);
          }
          if (query.category_id) {
            sql += ` AND b.category_id = ?`;
            params.push(query.category_id);
          }
          if (query.availability === 'available') {
            sql += ` AND b.available_copies > 0`;
          } else if (query.availability === 'out_of_stock') {
            sql += ` AND b.available_copies = 0`;
          }

          sql += ` ORDER BY b.id DESC`;
          const books = db.prepare(sql).all(...params);
          return sendJSON(res, 200, books);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          if (!body.title || !body.isbn) {
            return sendJSON(res, 400, { error: 'Title and ISBN are required' });
          }

          const existing = db.prepare('SELECT id FROM books WHERE isbn = ?').get(body.isbn);
          if (existing) {
            return sendJSON(res, 400, { error: 'Book with this ISBN already exists' });
          }

          const totalCopies = parseInt(body.total_copies || 1, 10);
          const availableCopies = body.available_copies !== undefined ? parseInt(body.available_copies, 10) : totalCopies;

          const stmt = db.prepare(`
            INSERT INTO books (isbn, title, author_id, category_id, publisher, publish_year, edition, total_copies, available_copies, shelf_location, description, cover_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const result = stmt.run(
            body.isbn,
            body.title,
            body.author_id || null,
            body.category_id || null,
            body.publisher || '',
            body.publish_year || null,
            body.edition || '',
            totalCopies,
            availableCopies,
            body.shelf_location || '',
            body.description || '',
            body.cover_url || ''
          );

          logActivity(body.userName || 'Staff', 'Add Book', `Added book "${body.title}" (ISBN: ${body.isbn})`);
          return sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Book created successfully' });
        }
      }

      // Single Book Routes (/api/books/:id)
      const bookMatch = pathname.match(/^\/api\/books\/(\d+)$/);
      if (bookMatch) {
        const bookId = parseInt(bookMatch[1], 10);

        if (method === 'GET') {
          const book = db.prepare(`
            SELECT b.*, a.name as author_name, a.biography as author_bio, c.name as category_name, c.color as category_color
            FROM books b
            LEFT JOIN authors a ON b.author_id = a.id
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.id = ?
          `).get(bookId);

          if (!book) return sendJSON(res, 404, { error: 'Book not found' });

          const activeBorrowings = db.prepare(`
            SELECT br.*, m.name as member_name, m.member_code
            FROM borrowings br
            JOIN members m ON br.member_id = m.id
            WHERE br.book_id = ? AND br.return_date IS NULL
          `).all(bookId);

          const reservations = db.prepare(`
            SELECT r.*, m.name as member_name, m.member_code
            FROM reservations r
            JOIN members m ON r.member_id = m.id
            WHERE r.book_id = ? AND r.status IN ('Pending', 'Ready')
            ORDER BY r.id ASC
          `).all(bookId);

          return sendJSON(res, 200, { ...book, activeBorrowings, reservations });
        }

        if (method === 'PUT') {
          const body = await parseBody(req);
          const current = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
          if (!current) return sendJSON(res, 404, { error: 'Book not found' });

          const totalCopies = parseInt(body.total_copies ?? current.total_copies, 10);
          const diff = totalCopies - current.total_copies;
          let availableCopies = current.available_copies + diff;
          if (availableCopies < 0) availableCopies = 0;
          if (body.available_copies !== undefined) {
            availableCopies = parseInt(body.available_copies, 10);
          }

          db.prepare(`
            UPDATE books SET
              isbn = ?, title = ?, author_id = ?, category_id = ?, publisher = ?,
              publish_year = ?, edition = ?, total_copies = ?, available_copies = ?,
              shelf_location = ?, description = ?, cover_url = ?
            WHERE id = ?
          `).run(
            body.isbn ?? current.isbn,
            body.title ?? current.title,
            body.author_id !== undefined ? body.author_id : current.author_id,
            body.category_id !== undefined ? body.category_id : current.category_id,
            body.publisher ?? current.publisher,
            body.publish_year !== undefined ? body.publish_year : current.publish_year,
            body.edition ?? current.edition,
            totalCopies,
            availableCopies,
            body.shelf_location ?? current.shelf_location,
            body.description ?? current.description,
            body.cover_url ?? current.cover_url,
            bookId
          );

          logActivity(body.userName || 'Staff', 'Update Book', `Updated details for book "${body.title || current.title}"`);
          return sendJSON(res, 200, { message: 'Book updated successfully' });
        }

        if (method === 'DELETE') {
          const activeLoans = db.prepare('SELECT COUNT(*) as count FROM borrowings WHERE book_id = ? AND return_date IS NULL').get(bookId);
          if (activeLoans.count > 0) {
            return sendJSON(res, 400, { error: 'Cannot delete book with active checked-out copies' });
          }

          const book = db.prepare('SELECT title FROM books WHERE id = ?').get(bookId);
          db.prepare('DELETE FROM books WHERE id = ?').run(bookId);
          logActivity('Staff', 'Delete Book', `Deleted book "${book ? book.title : bookId}"`);
          return sendJSON(res, 200, { message: 'Book deleted successfully' });
        }
      }

      // 3. Authors API
      if (pathname === '/api/authors') {
        if (method === 'GET') {
          const authors = db.prepare(`
            SELECT a.*, COUNT(b.id) as book_count
            FROM authors a
            LEFT JOIN books b ON a.id = b.author_id
            GROUP BY a.id
            ORDER BY a.name ASC
          `).all();
          return sendJSON(res, 200, authors);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          if (!body.name) return sendJSON(res, 400, { error: 'Author name is required' });

          const stmt = db.prepare(`
            INSERT INTO authors (name, biography, nationality, birth_year, death_year)
            VALUES (?, ?, ?, ?, ?)
          `);
          const resInsert = stmt.run(body.name, body.biography || '', body.nationality || '', body.birth_year || null, body.death_year || null);
          logActivity(body.userName || 'Staff', 'Add Author', `Added author "${body.name}"`);
          return sendJSON(res, 201, { id: resInsert.lastInsertRowid, message: 'Author added successfully' });
        }
      }

      const authorMatch = pathname.match(/^\/api\/authors\/(\d+)$/);
      if (authorMatch) {
        const authorId = parseInt(authorMatch[1], 10);
        if (method === 'PUT') {
          const body = await parseBody(req);
          db.prepare(`
            UPDATE authors SET name = ?, biography = ?, nationality = ?, birth_year = ?, death_year = ?
            WHERE id = ?
          `).run(body.name, body.biography || '', body.nationality || '', body.birth_year || null, body.death_year || null, authorId);
          logActivity(body.userName || 'Staff', 'Update Author', `Updated author #${authorId}`);
          return sendJSON(res, 200, { message: 'Author updated' });
        }
        if (method === 'DELETE') {
          db.prepare('DELETE FROM authors WHERE id = ?').run(authorId);
          logActivity('Staff', 'Delete Author', `Deleted author #${authorId}`);
          return sendJSON(res, 200, { message: 'Author deleted' });
        }
      }

      // 4. Categories API
      if (pathname === '/api/categories') {
        if (method === 'GET') {
          const categories = db.prepare(`
            SELECT c.*, COUNT(b.id) as book_count
            FROM categories c
            LEFT JOIN books b ON c.id = b.category_id
            GROUP BY c.id
            ORDER BY c.name ASC
          `).all();
          return sendJSON(res, 200, categories);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          if (!body.name) return sendJSON(res, 400, { error: 'Category name is required' });

          const stmt = db.prepare('INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)');
          const resCat = stmt.run(body.name, body.description || '', body.color || '#4f46e5', body.icon || 'book');
          logActivity(body.userName || 'Staff', 'Add Category', `Created category "${body.name}"`);
          return sendJSON(res, 201, { id: resCat.lastInsertRowid, message: 'Category created' });
        }
      }

      const categoryMatch = pathname.match(/^\/api\/categories\/(\d+)$/);
      if (categoryMatch) {
        const catId = parseInt(categoryMatch[1], 10);
        if (method === 'PUT') {
          const body = await parseBody(req);
          db.prepare('UPDATE categories SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?')
            .run(body.name, body.description || '', body.color || '#4f46e5', body.icon || 'book', catId);
          return sendJSON(res, 200, { message: 'Category updated' });
        }
        if (method === 'DELETE') {
          db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
          return sendJSON(res, 200, { message: 'Category deleted' });
        }
      }

      // 5. Members API
      if (pathname === '/api/members') {
        if (method === 'GET') {
          let sql = `
            SELECT m.*,
              (SELECT COUNT(*) FROM borrowings WHERE member_id = m.id AND return_date IS NULL) as current_loans,
              (SELECT COALESCE(SUM(fine_amount - fine_paid), 0) FROM borrowings WHERE member_id = m.id AND return_date IS NULL AND fine_status != 'Paid') as outstanding_fines
            FROM members m
            WHERE 1=1
          `;
          const params = [];
          if (query.search) {
            sql += ` AND (m.name LIKE ? OR m.member_code LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)`;
            const s = `%${query.search}%`;
            params.push(s, s, s, s);
          }
          if (query.status) {
            sql += ` AND m.status = ?`;
            params.push(query.status);
          }
          if (query.member_type) {
            sql += ` AND m.member_type = ?`;
            params.push(query.member_type);
          }
          sql += ` ORDER BY m.id DESC`;
          const members = db.prepare(sql).all(...params);
          return sendJSON(res, 200, members);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          if (!body.name || !body.email) {
            return sendJSON(res, 400, { error: 'Member name and email are required' });
          }

          // Auto-generate code if missing
          let memberCode = body.member_code;
          if (!memberCode) {
            const lastId = db.prepare('SELECT MAX(id) as maxId FROM members').get().maxId || 1000;
            memberCode = `LIB-${lastId + 1}`;
          }

          const stmt = db.prepare(`
            INSERT INTO members (member_code, name, email, phone, address, member_type, borrow_limit, status, joined_date, expiry_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, DATE('now')), COALESCE(?, DATE('now', '+1 year')))
          `);

          const result = stmt.run(
            memberCode,
            body.name,
            body.email,
            body.phone || '',
            body.address || '',
            body.member_type || 'Student',
            body.borrow_limit ? parseInt(body.borrow_limit, 10) : 3,
            body.status || 'Active',
            body.joined_date || null,
            body.expiry_date || null
          );

          logActivity(body.userName || 'Staff', 'Add Member', `Registered new member ${body.name} (${memberCode})`);
          return sendJSON(res, 201, { id: result.lastInsertRowid, member_code: memberCode, message: 'Member registered' });
        }
      }

      const memberMatch = pathname.match(/^\/api\/members\/(\d+)$/);
      if (memberMatch) {
        const memberId = parseInt(memberMatch[1], 10);
        if (method === 'GET') {
          const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
          if (!member) return sendJSON(res, 404, { error: 'Member not found' });

          const borrowings = db.prepare(`
            SELECT br.*, b.title as book_title, b.isbn, b.cover_url, a.name as author_name
            FROM borrowings br
            JOIN books b ON br.book_id = b.id
            LEFT JOIN authors a ON b.author_id = a.id
            WHERE br.member_id = ?
            ORDER BY br.id DESC
          `).all(memberId);

          const reservations = db.prepare(`
            SELECT r.*, b.title as book_title, b.isbn, b.cover_url
            FROM reservations r
            JOIN books b ON r.book_id = b.id
            WHERE r.member_id = ?
            ORDER BY r.id DESC
          `).all(memberId);

          const fineHistory = db.prepare(`
            SELECT fp.*, b.title as book_title
            FROM fine_payments fp
            JOIN borrowings br ON fp.borrowing_id = br.id
            JOIN books b ON br.book_id = b.id
            WHERE fp.member_id = ?
            ORDER BY fp.id DESC
          `).all(memberId);

          return sendJSON(res, 200, { ...member, borrowings, reservations, fineHistory });
        }

        if (method === 'PUT') {
          const body = await parseBody(req);
          db.prepare(`
            UPDATE members SET
              name = ?, email = ?, phone = ?, address = ?,
              member_type = ?, borrow_limit = ?, status = ?, expiry_date = ?
            WHERE id = ?
          `).run(
            body.name,
            body.email,
            body.phone || '',
            body.address || '',
            body.member_type || 'Student',
            parseInt(body.borrow_limit, 10) || 3,
            body.status || 'Active',
            body.expiry_date,
            memberId
          );
          logActivity(body.userName || 'Staff', 'Update Member', `Updated member profile #${memberId}`);
          return sendJSON(res, 200, { message: 'Member updated successfully' });
        }

        if (method === 'DELETE') {
          const active = db.prepare('SELECT COUNT(*) as count FROM borrowings WHERE member_id = ? AND return_date IS NULL').get(memberId);
          if (active.count > 0) {
            return sendJSON(res, 400, { error: 'Cannot remove member with active borrowed books' });
          }
          db.prepare('DELETE FROM members WHERE id = ?').run(memberId);
          logActivity('Staff', 'Delete Member', `Deleted member #${memberId}`);
          return sendJSON(res, 200, { message: 'Member deleted' });
        }
      }

      // 6. Circulation / Borrowings API
      if (pathname === '/api/borrowings') {
        if (method === 'GET') {
          updateOverdueRecords();

          let sql = `
            SELECT br.*, 
                   b.title as book_title, b.isbn, b.cover_url, b.shelf_location,
                   a.name as author_name,
                   m.name as member_name, m.member_code, m.email as member_email, m.phone as member_phone,
                   u.full_name as issued_by_name
            FROM borrowings br
            JOIN books b ON br.book_id = b.id
            LEFT JOIN authors a ON b.author_id = a.id
            JOIN members m ON br.member_id = m.id
            LEFT JOIN users u ON br.issued_by_user_id = u.id
            WHERE 1=1
          `;
          const params = [];

          if (query.status === 'active') {
            sql += ` AND br.return_date IS NULL`;
          } else if (query.status === 'overdue') {
            sql += ` AND br.return_date IS NULL AND br.due_date < DATE('now')`;
          } else if (query.status === 'returned') {
            sql += ` AND br.return_date IS NOT NULL`;
          }

          if (query.member_id) {
            sql += ` AND br.member_id = ?`;
            params.push(query.member_id);
          }

          if (query.book_id) {
            sql += ` AND br.book_id = ?`;
            params.push(query.book_id);
          }

          if (query.search) {
            sql += ` AND (b.title LIKE ? OR m.name LIKE ? OR m.member_code LIKE ? OR b.isbn LIKE ?)`;
            const s = `%${query.search}%`;
            params.push(s, s, s, s);
          }

          sql += ` ORDER BY br.id DESC`;
          const records = db.prepare(sql).all(...params);
          return sendJSON(res, 200, records);
        }
      }

      // Issue Book
      if (pathname === '/api/borrowings/issue' && method === 'POST') {
        const body = await parseBody(req);
        const { book_id, member_id, issued_by_user_id, loan_days, remarks, userName } = body;

        if (!book_id || !member_id) {
          return sendJSON(res, 400, { error: 'Book and Member are required' });
        }

        // Check member
        const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
        if (!member) return sendJSON(res, 404, { error: 'Member not found' });
        if (member.status !== 'Active') {
          return sendJSON(res, 400, { error: `Member account is ${member.status}. Cannot issue books.` });
        }

        // Check member loan limit
        const activeCount = db.prepare('SELECT COUNT(*) as count FROM borrowings WHERE member_id = ? AND return_date IS NULL').get(member_id).count;
        if (activeCount >= member.borrow_limit) {
          return sendJSON(res, 400, { error: `Member reached max borrowing limit (${member.borrow_limit} books).` });
        }

        // Check book availability
        const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
        if (!book) return sendJSON(res, 404, { error: 'Book not found' });
        if (book.available_copies <= 0) {
          return sendJSON(res, 400, { error: 'No copies of this book are currently available for loan' });
        }

        // Calculate due date
        const loanPeriod = parseInt(loan_days || 14, 10);
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + loanPeriod);
        const issueDateStr = today.toISOString().split('T')[0];
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // Insert borrowing
        const insertStmt = db.prepare(`
          INSERT INTO borrowings (book_id, member_id, issued_by_user_id, issue_date, due_date, status, remarks)
          VALUES (?, ?, ?, ?, ?, 'Borrowed', ?)
        `);
        const result = insertStmt.run(book_id, member_id, issued_by_user_id || null, issueDateStr, dueDateStr, remarks || '');

        // Decrement book available copies
        db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);

        // Fulfill any waiting reservation by this same member if applicable
        db.prepare("UPDATE reservations SET status = 'Fulfilled' WHERE book_id = ? AND member_id = ? AND status IN ('Pending', 'Ready')")
          .run(book_id, member_id);

        logActivity(userName || 'Staff', 'Issue Book', `Issued "${book.title}" to ${member.name} (Due: ${dueDateStr})`);
        return sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Book successfully issued', due_date: dueDateStr });
      }

      // Return Book
      if (pathname === '/api/borrowings/return' && method === 'POST') {
        const body = await parseBody(req);
        const { borrowing_id, remarks, userName } = body;

        if (!borrowing_id) return sendJSON(res, 400, { error: 'Borrowing record ID is required' });

        const loan = db.prepare(`
          SELECT br.*, b.title as book_title, m.name as member_name
          FROM borrowings br
          JOIN books b ON br.book_id = b.id
          JOIN members m ON br.member_id = m.id
          WHERE br.id = ?
        `).get(borrowing_id);

        if (!loan) return sendJSON(res, 404, { error: 'Loan record not found' });
        if (loan.return_date) return sendJSON(res, 400, { error: 'This book has already been returned' });

        const todayStr = new Date().toISOString().split('T')[0];
        const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'fine_per_day'").get();
        const fineRate = settingsRow ? parseFloat(settingsRow.value) : 1.0;

        let fineAmount = 0;
        let fineStatus = 'None';

        if (todayStr > loan.due_date) {
          const due = new Date(loan.due_date);
          const now = new Date(todayStr);
          const diffDays = Math.max(1, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));
          fineAmount = Number((diffDays * fineRate).toFixed(2));
          fineStatus = loan.fine_paid >= fineAmount ? 'Paid' : 'Unpaid';
        }

        // Update borrowing
        db.prepare(`
          UPDATE borrowings
          SET return_date = ?,
              status = 'Returned',
              fine_amount = ?,
              fine_status = ?,
              remarks = COALESCE(?, remarks)
          WHERE id = ?
        `).run(todayStr, fineAmount, fineStatus, remarks || null, borrowing_id);

        // Increment book available copies
        db.prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?').run(loan.book_id);

        // Check if there is a pending reservation for this book
        const pendingReservation = db.prepare(`
          SELECT r.*, m.name as member_name, m.email as member_email, u.id as user_id
          FROM reservations r
          JOIN members m ON r.member_id = m.id
          LEFT JOIN users u ON u.member_id = m.id
          WHERE r.book_id = ? AND r.status = 'Pending'
          ORDER BY r.reservation_date ASC
          LIMIT 1
        `).get(loan.book_id);

        if (pendingReservation) {
          db.prepare('UPDATE reservations SET status = "Ready", notification_sent = 1 WHERE id = ?').run(pendingReservation.id);
          db.prepare(`
            INSERT INTO notifications (user_id, member_id, type, title, message)
            VALUES (?, ?, 'ReservationReady', 'Reserved Book Ready for Pickup', ?)
          `).run(
            pendingReservation.user_id || null,
            pendingReservation.member_id,
            `Your reserved copy of "${loan.book_title}" is now available at the desk. Held for 48 hours.`
          );
        }

        logActivity(userName || 'Staff', 'Return Book', `Returned "${loan.book_title}" from ${loan.member_name} (Fine: $${fineAmount.toFixed(2)})`);
        return sendJSON(res, 200, { message: 'Book returned successfully', fine_amount: fineAmount, fine_status: fineStatus });
      }

      // Renew Loan
      if (pathname === '/api/borrowings/renew' && method === 'POST') {
        const body = await parseBody(req);
        const { borrowing_id, extension_days, userName } = body;

        const loan = db.prepare('SELECT * FROM borrowings WHERE id = ?').get(borrowing_id);
        if (!loan) return sendJSON(res, 404, { error: 'Loan not found' });
        if (loan.return_date) return sendJSON(res, 400, { error: 'Cannot renew an already returned book' });

        const maxRenewals = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'max_renewals'").get()?.value || 2, 10);
        if (loan.renewal_count >= maxRenewals) {
          return sendJSON(res, 400, { error: `Maximum renewal limit of ${maxRenewals} reached for this item.` });
        }

        const days = parseInt(extension_days || 14, 10);
        const currentDue = new Date(loan.due_date);
        currentDue.setDate(currentDue.getDate() + days);
        const newDueStr = currentDue.toISOString().split('T')[0];

        db.prepare('UPDATE borrowings SET due_date = ?, renewal_count = renewal_count + 1 WHERE id = ?')
          .run(newDueStr, borrowing_id);

        logActivity(userName || 'Member', 'Renew Book', `Renewed loan #${borrowing_id} until ${newDueStr}`);
        return sendJSON(res, 200, { message: 'Loan renewed successfully', new_due_date: newDueStr });
      }

      // 7. Reservations API
      if (pathname === '/api/reservations') {
        if (method === 'GET') {
          let sql = `
            SELECT r.*, b.title as book_title, b.isbn, b.available_copies,
                   m.name as member_name, m.member_code, m.email as member_email
            FROM reservations r
            JOIN books b ON r.book_id = b.id
            JOIN members m ON r.member_id = m.id
            WHERE 1=1
          `;
          const params = [];
          if (query.status) {
            sql += ` AND r.status = ?`;
            params.push(query.status);
          }
          if (query.member_id) {
            sql += ` AND r.member_id = ?`;
            params.push(query.member_id);
          }
          sql += ` ORDER BY r.id DESC`;
          const reservations = db.prepare(sql).all(...params);
          return sendJSON(res, 200, reservations);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          const { book_id, member_id, notes, userName } = body;

          if (!book_id || !member_id) return sendJSON(res, 400, { error: 'Book and member are required' });

          const existing = db.prepare("SELECT id FROM reservations WHERE book_id = ? AND member_id = ? AND status IN ('Pending', 'Ready')")
            .get(book_id, member_id);
          if (existing) {
            return sendJSON(res, 400, { error: 'Member already has an active reservation for this title' });
          }

          const book = db.prepare('SELECT title, available_copies FROM books WHERE id = ?').get(book_id);
          const member = db.prepare('SELECT name FROM members WHERE id = ?').get(member_id);

          // If available copies > 0, make Ready immediately
          const initialStatus = book.available_copies > 0 ? 'Ready' : 'Pending';

          const resRow = db.prepare('INSERT INTO reservations (book_id, member_id, status, notes) VALUES (?, ?, ?, ?)')
            .run(book_id, member_id, initialStatus, notes || '');

          logActivity(userName || 'User', 'Reserve Book', `Reserved "${book.title}" for ${member.name} (Status: ${initialStatus})`);
          return sendJSON(res, 201, { id: resRow.lastInsertRowid, status: initialStatus, message: 'Reservation placed successfully' });
        }
      }

      const resMatch = pathname.match(/^\/api\/reservations\/(\d+)$/);
      if (resMatch) {
        const resId = parseInt(resMatch[1], 10);
        if (method === 'PUT') {
          const body = await parseBody(req);
          db.prepare('UPDATE reservations SET status = ?, notes = COALESCE(?, notes) WHERE id = ?')
            .run(body.status, body.notes || null, resId);
          return sendJSON(res, 200, { message: 'Reservation updated' });
        }
        if (method === 'DELETE') {
          db.prepare('DELETE FROM reservations WHERE id = ?').run(resId);
          return sendJSON(res, 200, { message: 'Reservation cancelled' });
        }
      }

      // 8. Fines & Overdue API
      if (pathname === '/api/fines/overdue' && method === 'GET') {
        updateOverdueRecords();
        const overdueList = db.prepare(`
          SELECT br.*, b.title as book_title, b.isbn,
                 m.name as member_name, m.member_code, m.email as member_email, m.phone as member_phone,
                 CAST((julianday('now') - julianday(br.due_date)) AS INTEGER) as days_overdue
          FROM borrowings br
          JOIN books b ON br.book_id = b.id
          JOIN members m ON br.member_id = m.id
          WHERE br.return_date IS NULL AND br.due_date < DATE('now')
          ORDER BY days_overdue DESC
        `).all();
        return sendJSON(res, 200, overdueList);
      }

      if (pathname === '/api/fines/payments' && method === 'GET') {
        const payments = db.prepare(`
          SELECT fp.*, m.name as member_name, m.member_code, b.title as book_title
          FROM fine_payments fp
          JOIN members m ON fp.member_id = m.id
          JOIN borrowings br ON fp.borrowing_id = br.id
          JOIN books b ON br.book_id = b.id
          ORDER BY fp.id DESC
        `).all();
        return sendJSON(res, 200, payments);
      }

      if (pathname === '/api/fines/pay' && method === 'POST') {
        const body = await parseBody(req);
        const { borrowing_id, amount, payment_method, notes, userName } = body;

        const loan = db.prepare('SELECT * FROM borrowings WHERE id = ?').get(borrowing_id);
        if (!loan) return sendJSON(res, 404, { error: 'Borrowing record not found' });

        const payAmount = parseFloat(amount);
        if (isNaN(payAmount) || payAmount <= 0) return sendJSON(res, 400, { error: 'Valid payment amount required' });

        const newPaid = loan.fine_paid + payAmount;
        let fineStatus = 'Unpaid';
        if (newPaid >= loan.fine_amount) fineStatus = 'Paid';
        else if (newPaid > 0) fineStatus = 'Partially Paid';

        const receiptNo = `RCP-${Date.now().toString().slice(-6)}`;

        db.prepare('UPDATE borrowings SET fine_paid = ?, fine_status = ? WHERE id = ?')
          .run(newPaid, fineStatus, borrowing_id);

        db.prepare(`
          INSERT INTO fine_payments (borrowing_id, member_id, amount_paid, payment_method, receipt_no, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(borrowing_id, loan.member_id, payAmount, payment_method || 'Cash', receiptNo, notes || '');

        logActivity(userName || 'Staff', 'Collect Fine', `Collected fine $${payAmount.toFixed(2)} on loan #${borrowing_id} (Receipt: ${receiptNo})`);
        return sendJSON(res, 201, { message: 'Payment recorded', receipt_no: receiptNo, fine_status: fineStatus });
      }

      if (pathname === '/api/fines/waive' && method === 'POST') {
        const body = await parseBody(req);
        const { borrowing_id, reason, userName } = body;

        db.prepare("UPDATE borrowings SET fine_status = 'Waived', remarks = remarks || ' [Fine Waived: ' || ? || ']' WHERE id = ?")
          .run(reason || 'Authorized waiver', borrowing_id);

        logActivity(userName || 'Admin', 'Waive Fine', `Waived fine for loan #${borrowing_id} (Reason: ${reason || 'Admin waiver'})`);
        return sendJSON(res, 200, { message: 'Fine waived successfully' });
      }

      // 9. Notifications API
      if (pathname === '/api/notifications' && method === 'GET') {
        const userId = query.user_id ? parseInt(query.user_id, 10) : null;
        const memberId = query.member_id ? parseInt(query.member_id, 10) : null;

        let sql = 'SELECT * FROM notifications WHERE 1=1';
        const params = [];
        if (userId) {
          sql += ' AND (user_id = ? OR user_id IS NULL)';
          params.push(userId);
        } else if (memberId) {
          sql += ' AND member_id = ?';
          params.push(memberId);
        }
        sql += ' ORDER BY id DESC LIMIT 20';
        const notifications = db.prepare(sql).all(...params);
        return sendJSON(res, 200, notifications);
      }

      if (pathname === '/api/notifications/read-all' && method === 'POST') {
        db.prepare('UPDATE notifications SET is_read = 1').run();
        return sendJSON(res, 200, { message: 'All notifications marked as read' });
      }

      // 10. Reports & Analytics API
      if (pathname === '/api/reports/summary' && method === 'GET') {
        const totalCirculation = db.prepare('SELECT COUNT(*) as count FROM borrowings').get().count;
        const returnedCount = db.prepare('SELECT COUNT(*) as count FROM borrowings WHERE return_date IS NOT NULL').get().count;
        const totalFinesAccrued = db.prepare('SELECT COALESCE(SUM(fine_amount), 0) as total FROM borrowings').get().total;
        const totalFinesPaid = db.prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM fine_payments').get().total;

        const categoryCirculation = db.prepare(`
          SELECT c.name as category_name, COUNT(br.id) as borrow_count
          FROM categories c
          LEFT JOIN books b ON c.id = b.category_id
          LEFT JOIN borrowings br ON b.id = br.book_id
          GROUP BY c.id
          ORDER BY borrow_count DESC
        `).all();

        const topBorrowers = db.prepare(`
          SELECT m.id, m.member_code, m.name, m.email, m.member_type, COUNT(br.id) as total_borrowed
          FROM members m
          JOIN borrowings br ON m.id = br.member_id
          GROUP BY m.id
          ORDER BY total_borrowed DESC
          LIMIT 10
        `).all();

        const monthlyTrends = db.prepare(`
          SELECT strftime('%Y-%m', issue_date) as month, COUNT(*) as issue_count
          FROM borrowings
          GROUP BY month
          ORDER BY month DESC
          LIMIT 6
        `).all();

        return sendJSON(res, 200, {
          totalCirculation,
          returnedCount,
          totalFinesAccrued,
          totalFinesPaid,
          categoryCirculation,
          topBorrowers,
          monthlyTrends
        });
      }

      // 11. User Accounts API
      if (pathname === '/api/users' && method === 'GET') {
        const users = db.prepare('SELECT id, username, full_name, email, role, member_id, avatar, created_at FROM users').all();
        return sendJSON(res, 200, users);
      }

      if (pathname === '/api/users/login' && method === 'POST') {
        const body = await parseBody(req);
        const { username, password } = body;
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user || user.password_hash !== password) {
          return sendJSON(res, 401, { error: 'Invalid username or password' });
        }
        return sendJSON(res, 200, {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          member_id: user.member_id,
          avatar: user.avatar
        });
      }

      // 12. Settings API
      if (pathname === '/api/settings') {
        if (method === 'GET') {
          const rows = db.prepare('SELECT * FROM settings').all();
          const settingsObj = {};
          rows.forEach(r => { settingsObj[r.key] = r.value; });
          return sendJSON(res, 200, settingsObj);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          const upsertStmt = db.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `);
          for (const [k, v] of Object.entries(body)) {
            upsertStmt.run(k, String(v));
          }
          logActivity(body.userName || 'Admin', 'Update Settings', 'Updated system preferences and loan policies');
          return sendJSON(res, 200, { message: 'Settings saved successfully' });
        }
      }

      // Reset Database Endpoint
      if (pathname === '/api/settings/reset' && method === 'POST') {
        seedDatabase();
        return sendJSON(res, 200, { message: 'Database reset and re-seeded with demo records successfully' });
      }

      // If no API matched
      return sendJSON(res, 404, { error: 'Endpoint not found' });
    }

    // ----------------------------------------------------
    // STATIC FILE SERVING
    // ----------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    filePath = path.normalize(filePath);

    // If not found in public/, check root directory
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      const rootPath = path.normalize(path.join(__dirname, pathname === '/' ? 'index.html' : pathname));
      if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
        filePath = rootPath;
      }
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA if not found
        const fallbackIndex = fs.existsSync(path.join(PUBLIC_DIR, 'index.html')) 
          ? path.join(PUBLIC_DIR, 'index.html') 
          : path.join(__dirname, 'index.html');
        fs.readFile(fallbackIndex, (fbErr, content) => {
          if (fbErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('Server Error reading static file');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

  } catch (error) {
    console.error('Unhandled server error:', error);
    sendJSON(res, 500, { error: 'Internal Server Error: ' + error.message });
  }
}

// Start HTTP server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Athena Library Database Management System Server`);
  console.log(`  Live URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
