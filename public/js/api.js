// Universal API Service Layer: Supports both Node.js Backend and Standalone GitHub Pages ClientDB
const API = {
  baseUrl: '/api',
  mode: null, // 'backend' or 'client'

  async detectMode() {
    if (this.mode) return this.mode;

    // If on GitHub Pages, directly use client mode
    if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
      this.mode = 'client';
      ClientDB.init();
      return this.mode;
    }

    // Otherwise test if local backend responds
    try {
      const res = await fetch(`${this.baseUrl}/dashboard/stats`, { method: 'GET' });
      if (res.ok) {
        this.mode = 'backend';
        return this.mode;
      }
    } catch (e) {
      // Backend not running
    }

    this.mode = 'client';
    ClientDB.init();
    return this.mode;
  },

  async request(endpoint, options = {}) {
    const mode = await this.detectMode();
    if (mode === 'backend') {
      const url = `${this.baseUrl}${endpoint}`;
      const defaultHeaders = { 'Content-Type': 'application/json' };
      const config = {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
      };
      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP error ${response.status}`);
      return data;
    }
  },

  // 1. Dashboard
  async getDashboardStats() {
    if (await this.detectMode() === 'backend') return this.request('/dashboard/stats');
    return ClientDB.getDashboardStats();
  },

  // 2. Books
  async getBooks(params = {}) {
    if (await this.detectMode() === 'backend') {
      const query = new URLSearchParams(params).toString();
      return this.request(`/books${query ? `?${query}` : ''}`);
    }
    return ClientDB.getBooks(params);
  },

  async getBook(id) {
    if (await this.detectMode() === 'backend') return this.request(`/books/${id}`);
    return ClientDB.getBook(id);
  },

  async createBook(data) {
    if (await this.detectMode() === 'backend') return this.request('/books', { method: 'POST', body: data });
    return ClientDB.createBook(data);
  },

  async updateBook(id, data) {
    if (await this.detectMode() === 'backend') return this.request(`/books/${id}`, { method: 'PUT', body: data });
    return ClientDB.updateBook(id, data);
  },

  async deleteBook(id) {
    if (await this.detectMode() === 'backend') return this.request(`/books/${id}`, { method: 'DELETE' });
    return ClientDB.deleteBook(id);
  },

  // 3. Authors
  async getAuthors() {
    if (await this.detectMode() === 'backend') return this.request('/authors');
    return ClientDB.getAuthors();
  },

  async createAuthor(data) {
    if (await this.detectMode() === 'backend') return this.request('/authors', { method: 'POST', body: data });
    return ClientDB.createAuthor(data);
  },

  async updateAuthor(id, data) {
    if (await this.detectMode() === 'backend') return this.request(`/authors/${id}`, { method: 'PUT', body: data });
    return ClientDB.updateAuthor(id, data);
  },

  async deleteAuthor(id) {
    if (await this.detectMode() === 'backend') return this.request(`/authors/${id}`, { method: 'DELETE' });
    return ClientDB.deleteAuthor(id);
  },

  // 4. Categories
  async getCategories() {
    if (await this.detectMode() === 'backend') return this.request('/categories');
    return ClientDB.getCategories();
  },

  async createCategory(data) {
    if (await this.detectMode() === 'backend') return this.request('/categories', { method: 'POST', body: data });
    return ClientDB.createCategory(data);
  },

  async updateCategory(id, data) {
    if (await this.detectMode() === 'backend') return this.request(`/categories/${id}`, { method: 'PUT', body: data });
    return ClientDB.updateCategory(id, data);
  },

  async deleteCategory(id) {
    if (await this.detectMode() === 'backend') return this.request(`/categories/${id}`, { method: 'DELETE' });
    return ClientDB.deleteCategory(id);
  },

  // 5. Members
  async getMembers(params = {}) {
    if (await this.detectMode() === 'backend') {
      const query = new URLSearchParams(params).toString();
      return this.request(`/members${query ? `?${query}` : ''}`);
    }
    return ClientDB.getMembers(params);
  },

  async getMember(id) {
    if (await this.detectMode() === 'backend') return this.request(`/members/${id}`);
    return ClientDB.getMember(id);
  },

  async createMember(data) {
    if (await this.detectMode() === 'backend') return this.request('/members', { method: 'POST', body: data });
    return ClientDB.createMember(data);
  },

  async updateMember(id, data) {
    if (await this.detectMode() === 'backend') return this.request(`/members/${id}`, { method: 'PUT', body: data });
    return ClientDB.updateMember(id, data);
  },

  async deleteMember(id) {
    if (await this.detectMode() === 'backend') return this.request(`/members/${id}`, { method: 'DELETE' });
    return ClientDB.deleteMember(id);
  },

  // 6. Circulation
  async getBorrowings(params = {}) {
    if (await this.detectMode() === 'backend') {
      const query = new URLSearchParams(params).toString();
      return this.request(`/borrowings${query ? `?${query}` : ''}`);
    }
    return ClientDB.getBorrowings(params);
  },

  async issueBook(data) {
    if (await this.detectMode() === 'backend') return this.request('/borrowings/issue', { method: 'POST', body: data });
    return ClientDB.issueBook(data);
  },

  async returnBook(data) {
    if (await this.detectMode() === 'backend') return this.request('/borrowings/return', { method: 'POST', body: data });
    return ClientDB.returnBook(data);
  },

  async renewLoan(data) {
    if (await this.detectMode() === 'backend') return this.request('/borrowings/renew', { method: 'POST', body: data });
    return ClientDB.renewLoan(data);
  },

  // 7. Reservations
  async getReservations(params = {}) {
    if (await this.detectMode() === 'backend') {
      const query = new URLSearchParams(params).toString();
      return this.request(`/reservations${query ? `?${query}` : ''}`);
    }
    return ClientDB.getReservations(params);
  },

  async createReservation(data) {
    if (await this.detectMode() === 'backend') return this.request('/reservations', { method: 'POST', body: data });
    return ClientDB.createReservation(data);
  },

  async updateReservationStatus(id, data) {
    if (await this.detectMode() === 'backend') return this.request(`/reservations/${id}`, { method: 'PUT', body: data });
    return ClientDB.updateReservationStatus(id, data);
  },

  async cancelReservation(id) {
    if (await this.detectMode() === 'backend') return this.request(`/reservations/${id}`, { method: 'DELETE' });
    return ClientDB.cancelReservation(id);
  },

  // 8. Fines & Overdues
  async getOverdueLoans() {
    if (await this.detectMode() === 'backend') return this.request('/fines/overdue');
    return ClientDB.getOverdueLoans();
  },

  async getFinePayments() {
    if (await this.detectMode() === 'backend') return this.request('/fines/payments');
    return ClientDB.getFinePayments();
  },

  async payFine(data) {
    if (await this.detectMode() === 'backend') return this.request('/fines/pay', { method: 'POST', body: data });
    return ClientDB.payFine(data);
  },

  async waiveFine(data) {
    if (await this.detectMode() === 'backend') return this.request('/fines/waive', { method: 'POST', body: data });
    return ClientDB.waiveFine(data);
  },

  // 9. Notifications
  async getNotifications(params = {}) {
    if (await this.detectMode() === 'backend') {
      const query = new URLSearchParams(params).toString();
      return this.request(`/notifications${query ? `?${query}` : ''}`);
    }
    return ClientDB.getNotifications(params);
  },

  async markAllNotificationsRead() {
    if (await this.detectMode() === 'backend') return this.request('/notifications/read-all', { method: 'POST' });
    return ClientDB.markAllNotificationsRead();
  },

  // 10. Reports
  async getReportsSummary() {
    if (await this.detectMode() === 'backend') return this.request('/reports/summary');
    return ClientDB.getReportsSummary();
  },

  // 11. Settings & Users
  async getUsers() {
    if (await this.detectMode() === 'backend') return this.request('/users');
    return ClientDB.getUsers();
  },

  async getSettings() {
    if (await this.detectMode() === 'backend') return this.request('/settings');
    return ClientDB.getSettings();
  },

  async saveSettings(data) {
    if (await this.detectMode() === 'backend') return this.request('/settings', { method: 'POST', body: data });
    return ClientDB.saveSettings(data);
  },

  async resetDatabase() {
    if (await this.detectMode() === 'backend') return this.request('/settings/reset', { method: 'POST' });
    return ClientDB.resetDatabase();
  }
};

// ClientDB: Full In-Browser Database Engine for GitHub Pages
const ClientDB = {
  key: 'athena_library_storage_v1',
  data: null,

  init() {
    const saved = localStorage.getItem(this.key);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        this.updateOverdueStatus();
        return;
      } catch (e) {
        console.warn('Failed to parse saved state, reseeding.');
      }
    }
    this.seed();
  },

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  },

  seed() {
    const today = new Date();
    const formatYMD = d => d.toISOString().split('T')[0];
    const addDays = days => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      return formatYMD(d);
    };

    this.data = {
      settings: {
        fine_per_day: '1.00',
        loan_period_days: '14',
        max_renewals: '2',
        currency_symbol: '$',
        library_name: 'Metropolitan Central Library',
        library_email: 'contact@librarycentral.org'
      },
      categories: [
        { id: 1, name: 'Computer Science', description: 'Programming, Algorithms, AI, Systems', color: '#2563eb' },
        { id: 2, name: 'Classic Literature', description: 'Timeless literary masterpieces and historic fiction', color: '#7c3aed' },
        { id: 3, name: 'Science & Physics', description: 'Astrophysics, Quantum Mechanics, Natural Sciences', color: '#059669' },
        { id: 4, name: 'History & Philosophy', description: 'World History, civilizations, thought, ethics', color: '#d97706' },
        { id: 5, name: 'Fiction & Mystery', description: 'Modern thrillers, detective fiction, contemporary novels', color: '#dc2626' },
        { id: 6, name: 'Business & Economics', description: 'Economics, startup leadership, finance, management', color: '#0891b2' }
      ],
      authors: [
        { id: 1, name: 'Donald E. Knuth', nationality: 'American', birth_year: 1938, death_year: null, biography: 'Renowned computer scientist, author of The Art of Computer Programming.' },
        { id: 2, name: 'Robert C. Martin', nationality: 'American', birth_year: 1952, death_year: null, biography: 'Known as Uncle Bob, software engineer and clean code author.' },
        { id: 3, name: 'George Orwell', nationality: 'British', birth_year: 1903, death_year: 1950, biography: 'Novelist, essayist noted for lucid prose and sharp social criticism.' },
        { id: 4, name: 'Richard P. Feynman', nationality: 'American', birth_year: 1918, death_year: 1988, biography: 'Theoretical physicist known for quantum electrodynamics.' },
        { id: 5, name: 'Yuval Noah Harari', nationality: 'Israeli', birth_year: 1976, death_year: null, biography: 'Historian, author of Sapiens: A Brief History of Humankind.' },
        { id: 6, name: 'Arthur Conan Doyle', nationality: 'British', birth_year: 1859, death_year: 1930, biography: 'British writer and physician who created Sherlock Holmes.' },
        { id: 7, name: 'Martin Fowler', nationality: 'British', birth_year: 1963, death_year: null, biography: 'Software engineer and author on software architecture.' }
      ],
      books: [
        { id: 1, isbn: '978-0132350884', title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author_id: 2, category_id: 1, publisher: 'Prentice Hall', publish_year: 2008, edition: '1st Edition', total_copies: 5, available_copies: 3, shelf_location: 'Shelf CS-102', description: 'Even bad code can function. But if code is not clean, it can bring a development organization to its knees.', cover_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=400&q=80' },
        { id: 2, isbn: '978-0201616224', title: 'The Pragmatic Programmer: Your Journey To Mastery', author_id: 7, category_id: 1, publisher: 'Addison-Wesley', publish_year: 2019, edition: '20th Anniversary Edition', total_copies: 4, available_copies: 2, shelf_location: 'Shelf CS-105', description: 'Filled with entertaining anecdotes and interesting analogies illustrating best practices.', cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80' },
        { id: 3, isbn: '978-0451524935', title: '1984', author_id: 3, category_id: 2, publisher: 'Signet Classic', publish_year: 1949, edition: 'Reprint Edition', total_copies: 6, available_copies: 5, shelf_location: 'Shelf LIT-301', description: 'Classic dystopian novel exploring totalitarianism, mass surveillance, and thoughtcrime.', cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80' },
        { id: 4, isbn: '978-0393355949', title: "Surely You're Joking, Mr. Feynman!", author_id: 4, category_id: 3, publisher: 'W. W. Norton', publish_year: 1985, edition: 'Expanded Edition', total_copies: 3, available_copies: 3, shelf_location: 'Shelf SCI-204', description: 'Adventures of a curious character. Nobel Prize winner Richard Feynman recounts his hilarious experiences.', cover_url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=400&q=80' },
        { id: 5, isbn: '978-0062316097', title: 'Sapiens: A Brief History of Humankind', author_id: 5, category_id: 4, publisher: 'Harper', publish_year: 2014, edition: '1st Harper Edition', total_copies: 5, available_copies: 4, shelf_location: 'Shelf HIST-101', description: 'How did our species succeed in the battle for dominance?', cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80' },
        { id: 6, isbn: '978-1503222687', title: 'The Adventures of Sherlock Holmes', author_id: 6, category_id: 5, publisher: 'CreateSpace', publish_year: 1892, edition: 'Collector Edition', total_copies: 4, available_copies: 2, shelf_location: 'Shelf MYS-402', description: 'Short stories featuring fictional detective Sherlock Holmes and Dr. John H. Watson.', cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80' },
        { id: 7, isbn: '978-0201896831', title: 'The Art of Computer Programming: Volume 1', author_id: 1, category_id: 1, publisher: 'Addison-Wesley', publish_year: 1997, edition: '3rd Edition', total_copies: 2, available_copies: 1, shelf_location: 'Shelf CS-REF-01', description: 'Fundamental algorithms and comprehensive mathematical foundations of modern computing.', cover_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80' },
        { id: 8, isbn: '978-0201485677', title: 'Refactoring: Improving the Design of Existing Code', author_id: 7, category_id: 1, publisher: 'Addison-Wesley', publish_year: 2018, edition: '2nd Edition', total_copies: 3, available_copies: 3, shelf_location: 'Shelf CS-108', description: 'Technique for improving the design of an existing code base safely.', cover_url: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=400&q=80' },
        { id: 9, isbn: '978-0451526342', title: 'Animal Farm', author_id: 3, category_id: 2, publisher: 'Signet Classic', publish_year: 1945, edition: 'Classic Edition', total_copies: 5, available_copies: 5, shelf_location: 'Shelf LIT-302', description: 'A satirical allegorical novella reflecting events leading up to the Russian Revolution.', cover_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80' }
      ],
      members: [
        { id: 1, member_code: 'LIB-1001', name: 'Emily Watson', email: 'emily.watson@university.edu', phone: '+1 (555) 234-5678', address: '452 Elm Street, Oxford', member_type: 'Student', borrow_limit: 4, status: 'Active', joined_date: '2025-09-10', expiry_date: '2027-09-10' },
        { id: 2, member_code: 'LIB-1002', name: 'Dr. Alexander Vance', email: 'alex.vance@mit.edu', phone: '+1 (555) 987-6543', address: '12 Research Blvd, Cambridge', member_type: 'Faculty', borrow_limit: 8, status: 'Active', joined_date: '2024-01-15', expiry_date: '2028-01-15' },
        { id: 3, member_code: 'LIB-1003', name: 'Sarah Jenkins', email: 'sarah.j@gmail.com', phone: '+1 (555) 345-6789', address: '78 Oak Lane, London', member_type: 'General', borrow_limit: 3, status: 'Active', joined_date: '2025-11-20', expiry_date: '2026-11-20' },
        { id: 4, member_code: 'LIB-1004', name: 'David Kim', email: 'dkim_developer@outlook.com', phone: '+1 (555) 678-1234', address: '101 Cyber Park, Seattle', member_type: 'Student', borrow_limit: 4, status: 'Active', joined_date: '2026-02-01', expiry_date: '2027-02-01' },
        { id: 5, member_code: 'LIB-1005', name: 'Rachel Green', email: 'rachel.g@nyu.edu', phone: '+1 (555) 432-8765', address: '90 Bedford St, New York', member_type: 'Student', borrow_limit: 3, status: 'Suspended', joined_date: '2025-05-12', expiry_date: '2026-05-12' }
      ],
      users: [
        { id: 1, username: 'admin', full_name: 'Victoria Sterling (Admin)', email: 'admin@librarycentral.org', role: 'Admin', member_id: null, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80' },
        { id: 2, username: 'librarian', full_name: 'Marcus Thorne (Librarian)', email: 'marcus.librarian@librarycentral.org', role: 'Librarian', member_id: null, avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80' },
        { id: 3, username: 'emily', full_name: 'Emily Watson', email: 'emily.watson@university.edu', role: 'Member', member_id: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' },
        { id: 4, username: 'alex', full_name: 'Dr. Alexander Vance', email: 'alex.vance@mit.edu', role: 'Member', member_id: 2, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' }
      ],
      borrowings: [
        { id: 1, book_id: 1, member_id: 1, issue_date: addDays(-20), due_date: addDays(-6), return_date: null, renewal_count: 0, status: 'Overdue', fine_amount: 6.00, fine_paid: 0.00, fine_status: 'Unpaid', remarks: 'Loan overdue by 6 days' },
        { id: 2, book_id: 2, member_id: 1, issue_date: addDays(-5), due_date: addDays(9), return_date: null, renewal_count: 1, status: 'Borrowed', fine_amount: 0.00, fine_paid: 0.00, fine_status: 'None', remarks: 'Renewed once' },
        { id: 3, book_id: 7, member_id: 2, issue_date: addDays(-2), due_date: addDays(12), return_date: null, renewal_count: 0, status: 'Borrowed', fine_amount: 0.00, fine_paid: 0.00, fine_status: 'None', remarks: 'Faculty research loan' },
        { id: 4, book_id: 6, member_id: 4, issue_date: addDays(-7), due_date: addDays(7), return_date: null, renewal_count: 0, status: 'Borrowed', fine_amount: 0.00, fine_paid: 0.00, fine_status: 'None', remarks: 'Standard loan' },
        { id: 5, book_id: 3, member_id: 3, issue_date: addDays(-35), due_date: addDays(-21), return_date: addDays(-18), renewal_count: 0, status: 'Returned', fine_amount: 3.00, fine_paid: 3.00, fine_status: 'Paid', remarks: 'Returned 3 days late, paid at desk' }
      ],
      reservations: [
        { id: 1, book_id: 7, member_id: 4, reservation_date: addDays(-2), status: 'Pending', notes: 'Research hold' },
        { id: 2, book_id: 1, member_id: 3, reservation_date: addDays(-6), status: 'Ready', notes: 'Held at desk for 48h' }
      ],
      fine_payments: [
        { id: 1, borrowing_id: 5, member_id: 3, amount_paid: 3.00, payment_date: addDays(-18), payment_method: 'Cash', receipt_no: 'RCP-2026-0042', notes: 'Settled at front counter' }
      ],
      notifications: [
        { id: 1, user_id: 3, member_id: 1, type: 'Overdue', title: 'Action Required: Book Overdue', message: 'Your loan of "Clean Code" is past due. Current overdue fine: $6.00.', is_read: 0, created_at: addDays(-6) },
        { id: 2, user_id: 3, member_id: 1, type: 'DueWarning', title: 'Reminder: Due Date Approaching', message: '"The Pragmatic Programmer" is due soon. Renew online if needed.', is_read: 0, created_at: addDays(-1) },
        { id: 3, user_id: 2, member_id: null, type: 'ReservationReady', title: 'Reservation Ready for Pickup', message: 'Hold ready for member Sarah Jenkins for book "Clean Code".', is_read: 0, created_at: addDays(-2) }
      ],
      activity_logs: [
        { id: 1, user_name: 'System', action: 'System Initialization', details: 'Database initialized with full library collection.', timestamp: addDays(-30) },
        { id: 2, user_name: 'Victoria Sterling (Admin)', action: 'Role Assignment', details: 'Assigned Marcus Thorne to Librarian role.', timestamp: addDays(-25) },
        { id: 3, user_name: 'Marcus Thorne (Librarian)', action: 'Issue Book', details: 'Issued "The Pragmatic Programmer" to Emily Watson.', timestamp: addDays(-5) }
      ]
    };
    this.save();
  },

  updateOverdueStatus() {
    const today = new Date();
    const rate = parseFloat(this.data.settings.fine_per_day || 1.0);
    this.data.borrowings.forEach(b => {
      if (!b.return_date) {
        const due = new Date(b.due_date);
        if (due < today) {
          const diffDays = Math.max(1, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
          b.status = 'Overdue';
          b.fine_amount = Number((diffDays * rate).toFixed(2));
          b.fine_status = b.fine_paid >= b.fine_amount ? 'Paid' : (b.fine_paid > 0 ? 'Partially Paid' : 'Unpaid');
        }
      }
    });
    this.save();
  },

  logActivity(userName, action, details) {
    this.data.activity_logs.unshift({
      id: Date.now(),
      user_name: userName || 'Staff',
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
    this.save();
  },

  // Implementation of all methods
  getDashboardStats() {
    this.updateOverdueStatus();
    const totalBooks = this.data.books.length;
    const totalCopies = this.data.books.reduce((s, b) => s + b.total_copies, 0);
    const availableCopies = this.data.books.reduce((s, b) => s + b.available_copies, 0);
    const borrowedCopies = totalCopies - availableCopies;
    const totalMembers = this.data.members.length;
    const activeMembers = this.data.members.filter(m => m.status === 'Active').length;
    const activeLoans = this.data.borrowings.filter(b => !b.return_date).length;
    const overdueLoans = this.data.borrowings.filter(b => !b.return_date && b.status === 'Overdue').length;
    const pendingFines = this.data.borrowings.filter(b => !b.return_date).reduce((s, b) => s + (b.fine_amount - b.fine_paid), 0);
    const collectedFines = this.data.fine_payments.reduce((s, p) => s + p.amount_paid, 0);
    const activeReservations = this.data.reservations.filter(r => r.status === 'Pending' || r.status === 'Ready').length;

    const popularBooks = this.data.books.map(b => {
      const count = this.data.borrowings.filter(br => br.book_id === b.id).length;
      const author = this.data.authors.find(a => a.id === b.author_id);
      const cat = this.data.categories.find(c => c.id === b.category_id);
      return { ...b, author_name: author?.name, category_name: cat?.name, borrow_count: count };
    }).sort((a, b) => b.borrow_count - a.borrow_count).slice(0, 5);

    const categoryStats = this.data.categories.map(c => {
      const booksInCat = this.data.books.filter(b => b.category_id === c.id);
      const totalCopiesInCat = booksInCat.reduce((s, b) => s + b.total_copies, 0);
      return { id: c.id, name: c.name, color: c.color, book_count: booksInCat.length, total_copies: totalCopiesInCat };
    });

    return {
      stats: { totalBooks, totalCopies, availableCopies, borrowedCopies, totalMembers, activeMembers, activeLoans, overdueLoans, pendingFines, collectedFines, activeReservations },
      popularBooks,
      categoryStats,
      recentActivities: this.data.activity_logs.slice(0, 8)
    };
  },

  getBooks(params = {}) {
    let list = this.data.books.map(b => {
      const author = this.data.authors.find(a => a.id === b.author_id);
      const cat = this.data.categories.find(c => c.id === b.category_id);
      return { ...b, author_name: author?.name, category_name: cat?.name, category_color: cat?.color, borrowed_copies: b.total_copies - b.available_copies };
    });

    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(b => b.title.toLowerCase().includes(s) || b.isbn.toLowerCase().includes(s) || (b.author_name && b.author_name.toLowerCase().includes(s)));
    }
    if (params.category_id) {
      list = list.filter(b => String(b.category_id) === String(params.category_id));
    }
    if (params.availability === 'available') {
      list = list.filter(b => b.available_copies > 0);
    } else if (params.availability === 'out_of_stock') {
      list = list.filter(b => b.available_copies === 0);
    }
    return list;
  },

  getBook(id) {
    const book = this.getBooks().find(b => b.id === Number(id));
    if (!book) throw new Error('Book not found');
    const author = this.data.authors.find(a => a.id === book.author_id);
    const activeBorrowings = this.data.borrowings.filter(b => b.book_id === book.id && !b.return_date).map(b => {
      const member = this.data.members.find(m => m.id === b.member_id);
      return { ...b, member_name: member?.name, member_code: member?.member_code };
    });
    const reservations = this.data.reservations.filter(r => r.book_id === book.id && (r.status === 'Pending' || r.status === 'Ready')).map(r => {
      const member = this.data.members.find(m => m.id === r.member_id);
      return { ...r, member_name: member?.name, member_code: member?.member_code };
    });
    return { ...book, author_bio: author?.biography, activeBorrowings, reservations };
  },

  createBook(data) {
    const newId = Math.max(0, ...this.data.books.map(b => b.id)) + 1;
    const copies = parseInt(data.total_copies || 1, 10);
    const book = {
      id: newId,
      isbn: data.isbn,
      title: data.title,
      author_id: data.author_id ? Number(data.author_id) : null,
      category_id: data.category_id ? Number(data.category_id) : null,
      publisher: data.publisher || '',
      publish_year: data.publish_year ? Number(data.publish_year) : null,
      edition: data.edition || '',
      total_copies: copies,
      available_copies: copies,
      shelf_location: data.shelf_location || '',
      description: data.description || '',
      cover_url: data.cover_url || ''
    };
    this.data.books.unshift(book);
    this.logActivity(data.userName, 'Add Book', `Added book "${data.title}" (ISBN: ${data.isbn})`);
    this.save();
    return { id: newId, message: 'Book created successfully' };
  },

  updateBook(id, data) {
    const idx = this.data.books.findIndex(b => b.id === Number(id));
    if (idx === -1) throw new Error('Book not found');
    const cur = this.data.books[idx];
    const totalCopies = parseInt(data.total_copies ?? cur.total_copies, 10);
    const diff = totalCopies - cur.total_copies;
    let availableCopies = Math.max(0, cur.available_copies + diff);

    this.data.books[idx] = {
      ...cur,
      ...data,
      total_copies: totalCopies,
      available_copies: availableCopies
    };
    this.logActivity(data.userName, 'Update Book', `Updated details for "${cur.title}"`);
    this.save();
    return { message: 'Book updated successfully' };
  },

  deleteBook(id) {
    const active = this.data.borrowings.some(b => b.book_id === Number(id) && !b.return_date);
    if (active) throw new Error('Cannot delete book with active checked-out copies');
    this.data.books = this.data.books.filter(b => b.id !== Number(id));
    this.save();
    return { message: 'Book deleted' };
  },

  getAuthors() {
    return this.data.authors.map(a => {
      const book_count = this.data.books.filter(b => b.author_id === a.id).length;
      return { ...a, book_count };
    });
  },

  createAuthor(data) {
    const newId = Math.max(0, ...this.data.authors.map(a => a.id)) + 1;
    this.data.authors.push({ id: newId, ...data });
    this.save();
    return { id: newId, message: 'Author added' };
  },

  updateAuthor(id, data) {
    const idx = this.data.authors.findIndex(a => a.id === Number(id));
    if (idx !== -1) this.data.authors[idx] = { ...this.data.authors[idx], ...data };
    this.save();
    return { message: 'Author updated' };
  },

  deleteAuthor(id) {
    this.data.authors = this.data.authors.filter(a => a.id !== Number(id));
    this.save();
    return { message: 'Author deleted' };
  },

  getCategories() {
    return this.data.categories.map(c => {
      const book_count = this.data.books.filter(b => b.category_id === c.id).length;
      return { ...c, book_count };
    });
  },

  createCategory(data) {
    const newId = Math.max(0, ...this.data.categories.map(c => c.id)) + 1;
    this.data.categories.push({ id: newId, ...data });
    this.save();
    return { id: newId, message: 'Category created' };
  },

  updateCategory(id, data) {
    const idx = this.data.categories.findIndex(c => c.id === Number(id));
    if (idx !== -1) this.data.categories[idx] = { ...this.data.categories[idx], ...data };
    this.save();
    return { message: 'Category updated' };
  },

  deleteCategory(id) {
    this.data.categories = this.data.categories.filter(c => c.id !== Number(id));
    this.save();
    return { message: 'Category deleted' };
  },

  getMembers(params = {}) {
    let list = this.data.members.map(m => {
      const current_loans = this.data.borrowings.filter(b => b.member_id === m.id && !b.return_date).length;
      const outstanding_fines = this.data.borrowings.filter(b => b.member_id === m.id && !b.return_date).reduce((s, b) => s + (b.fine_amount - b.fine_paid), 0);
      return { ...m, current_loans, outstanding_fines };
    });
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(s) || m.member_code.toLowerCase().includes(s) || m.email.toLowerCase().includes(s));
    }
    if (params.status) list = list.filter(m => m.status === params.status);
    if (params.member_type) list = list.filter(m => m.member_type === params.member_type);
    return list;
  },

  getMember(id) {
    const member = this.getMembers().find(m => m.id === Number(id));
    if (!member) throw new Error('Member not found');
    const borrowings = this.data.borrowings.filter(b => b.member_id === member.id).map(b => {
      const book = this.data.books.find(bk => bk.id === b.book_id);
      const author = this.data.authors.find(a => a.id === book?.author_id);
      return { ...b, book_title: book?.title, isbn: book?.isbn, cover_url: book?.cover_url, author_name: author?.name };
    }).reverse();
    const reservations = this.data.reservations.filter(r => r.member_id === member.id).map(r => {
      const book = this.data.books.find(bk => bk.id === r.book_id);
      return { ...r, book_title: book?.title, isbn: book?.isbn, cover_url: book?.cover_url };
    }).reverse();
    const fineHistory = this.data.fine_payments.filter(f => f.member_id === member.id).map(f => {
      const borrowing = this.data.borrowings.find(b => b.id === f.borrowing_id);
      const book = this.data.books.find(bk => bk.id === borrowing?.book_id);
      return { ...f, book_title: book?.title };
    }).reverse();
    return { ...member, borrowings, reservations, fineHistory };
  },

  createMember(data) {
    const newId = Math.max(0, ...this.data.members.map(m => m.id)) + 1;
    const memberCode = data.member_code || `LIB-${1000 + newId}`;
    const member = {
      id: newId,
      member_code: memberCode,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      address: data.address || '',
      member_type: data.member_type || 'Student',
      borrow_limit: Number(data.borrow_limit || 3),
      status: data.status || 'Active',
      joined_date: new Date().toISOString().split('T')[0],
      expiry_date: data.expiry_date || null
    };
    this.data.members.unshift(member);
    this.logActivity(data.userName, 'Add Member', `Registered new member ${data.name} (${memberCode})`);
    this.save();
    return { id: newId, member_code: memberCode, message: 'Member registered' };
  },

  updateMember(id, data) {
    const idx = this.data.members.findIndex(m => m.id === Number(id));
    if (idx !== -1) this.data.members[idx] = { ...this.data.members[idx], ...data };
    this.save();
    return { message: 'Member updated successfully' };
  },

  deleteMember(id) {
    const active = this.data.borrowings.some(b => b.member_id === Number(id) && !b.return_date);
    if (active) throw new Error('Cannot remove member with active borrowed books');
    this.data.members = this.data.members.filter(m => m.id !== Number(id));
    this.save();
    return { message: 'Member deleted' };
  },

  getBorrowings(params = {}) {
    this.updateOverdueStatus();
    let list = this.data.borrowings.map(b => {
      const book = this.data.books.find(bk => bk.id === b.book_id);
      const author = this.data.authors.find(a => a.id === book?.author_id);
      const member = this.data.members.find(m => m.id === b.member_id);
      return {
        ...b,
        book_title: book?.title,
        isbn: book?.isbn,
        cover_url: book?.cover_url,
        shelf_location: book?.shelf_location,
        author_name: author?.name,
        member_name: member?.name,
        member_code: member?.member_code,
        member_email: member?.email,
        member_phone: member?.phone
      };
    });

    if (params.status === 'active') list = list.filter(b => !b.return_date);
    else if (params.status === 'overdue') list = list.filter(b => !b.return_date && b.status === 'Overdue');
    else if (params.status === 'returned') list = list.filter(b => !!b.return_date);

    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(b => b.book_title.toLowerCase().includes(s) || b.member_name.toLowerCase().includes(s) || b.member_code.toLowerCase().includes(s));
    }
    return list.reverse();
  },

  issueBook(data) {
    const book = this.data.books.find(b => b.id === Number(data.book_id));
    const member = this.data.members.find(m => m.id === Number(data.member_id));
    if (!book || !member) throw new Error('Invalid book or member');
    if (member.status !== 'Active') throw new Error(`Member is ${member.status}. Cannot issue.`);
    if (book.available_copies <= 0) throw new Error('No copies available');

    const today = new Date();
    const loanDays = Number(data.loan_days || 14);
    const due = new Date(today);
    due.setDate(today.getDate() + loanDays);

    const newId = Math.max(0, ...this.data.borrowings.map(b => b.id)) + 1;
    const loan = {
      id: newId,
      book_id: book.id,
      member_id: member.id,
      issue_date: today.toISOString().split('T')[0],
      due_date: due.toISOString().split('T')[0],
      return_date: null,
      renewal_count: 0,
      status: 'Borrowed',
      fine_amount: 0.00,
      fine_paid: 0.00,
      fine_status: 'None',
      remarks: data.remarks || ''
    };

    book.available_copies -= 1;
    this.data.borrowings.push(loan);
    // Fulfill active reservation by this member if any
    const resIdx = this.data.reservations.findIndex(r => r.book_id === book.id && r.member_id === member.id && (r.status === 'Pending' || r.status === 'Ready'));
    if (resIdx !== -1) this.data.reservations[resIdx].status = 'Fulfilled';

    this.logActivity(data.userName, 'Issue Book', `Issued "${book.title}" to ${member.name}`);
    this.save();
    return { id: newId, message: 'Book successfully issued', due_date: loan.due_date };
  },

  returnBook(data) {
    const loan = this.data.borrowings.find(b => b.id === Number(data.borrowing_id));
    if (!loan) throw new Error('Loan not found');
    if (loan.return_date) throw new Error('Already returned');

    const book = this.data.books.find(bk => bk.id === loan.book_id);
    const member = this.data.members.find(m => m.id === loan.member_id);
    const todayStr = new Date().toISOString().split('T')[0];

    loan.return_date = todayStr;
    loan.status = 'Returned';
    if (data.remarks) loan.remarks = data.remarks;
    if (book) book.available_copies += 1;

    // Check reservations
    const pendingRes = this.data.reservations.find(r => r.book_id === loan.book_id && r.status === 'Pending');
    if (pendingRes) {
      pendingRes.status = 'Ready';
      this.data.notifications.unshift({
        id: Date.now(),
        member_id: pendingRes.member_id,
        type: 'ReservationReady',
        title: 'Reserved Book Ready for Pickup',
        message: `Your reserved copy of "${book?.title}" is ready on hold shelf.`,
        is_read: 0,
        created_at: todayStr
      });
    }

    this.logActivity(data.userName, 'Return Book', `Returned "${book?.title}" from ${member?.name}`);
    this.save();
    return { message: 'Book returned successfully', fine_amount: loan.fine_amount, fine_status: loan.fine_status };
  },

  renewLoan(data) {
    const loan = this.data.borrowings.find(b => b.id === Number(data.borrowing_id));
    if (!loan) throw new Error('Loan not found');
    const maxRenew = Number(this.data.settings.max_renewals || 2);
    if (loan.renewal_count >= maxRenew) throw new Error(`Max renewals of ${maxRenew} reached.`);

    const currentDue = new Date(loan.due_date);
    currentDue.setDate(currentDue.getDate() + Number(data.extension_days || 14));
    loan.due_date = currentDue.toISOString().split('T')[0];
    loan.renewal_count += 1;

    this.logActivity(data.userName, 'Renew Book', `Renewed loan #${loan.id} to ${loan.due_date}`);
    this.save();
    return { message: 'Loan renewed successfully', new_due_date: loan.due_date };
  },

  getReservations(params = {}) {
    let list = this.data.reservations.map(r => {
      const book = this.data.books.find(b => b.id === r.book_id);
      const member = this.data.members.find(m => m.id === r.member_id);
      return {
        ...r,
        book_title: book?.title,
        isbn: book?.isbn,
        available_copies: book?.available_copies || 0,
        member_name: member?.name,
        member_code: member?.member_code,
        member_email: member?.email
      };
    });
    if (params.status) list = list.filter(r => r.status === params.status);
    if (params.member_id) list = list.filter(r => r.member_id === Number(params.member_id));
    return list.reverse();
  },

  createReservation(data) {
    const book = this.data.books.find(b => b.id === Number(data.book_id));
    const member = this.data.members.find(m => m.id === Number(data.member_id));
    const newId = Math.max(0, ...this.data.reservations.map(r => r.id)) + 1;
    const status = (book && book.available_copies > 0) ? 'Ready' : 'Pending';

    this.data.reservations.push({
      id: newId,
      book_id: Number(data.book_id),
      member_id: Number(data.member_id),
      reservation_date: new Date().toISOString().split('T')[0],
      status,
      notes: data.notes || ''
    });

    this.logActivity(data.userName, 'Reserve Book', `Reserved "${book?.title}" for ${member?.name}`);
    this.save();
    return { id: newId, status, message: 'Reservation placed successfully' };
  },

  updateReservationStatus(id, data) {
    const res = this.data.reservations.find(r => r.id === Number(id));
    if (res) res.status = data.status;
    this.save();
    return { message: 'Reservation updated' };
  },

  cancelReservation(id) {
    this.data.reservations = this.data.reservations.filter(r => r.id !== Number(id));
    this.save();
    return { message: 'Reservation cancelled' };
  },

  getOverdueLoans() {
    this.updateOverdueStatus();
    const today = new Date();
    return this.data.borrowings
      .filter(b => !b.return_date && (b.status === 'Overdue' || new Date(b.due_date) < today))
      .map(b => {
        const book = this.data.books.find(bk => bk.id === b.book_id);
        const member = this.data.members.find(m => m.id === b.member_id);
        const due = new Date(b.due_date);
        const days = Math.max(1, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
        return {
          ...b,
          book_title: book?.title,
          isbn: book?.isbn,
          member_name: member?.name,
          member_code: member?.member_code,
          member_email: member?.email,
          member_phone: member?.phone,
          days_overdue: days
        };
      });
  },

  getFinePayments() {
    return this.data.fine_payments.map(f => {
      const member = this.data.members.find(m => m.id === f.member_id);
      const loan = this.data.borrowings.find(b => b.id === f.borrowing_id);
      const book = this.data.books.find(bk => bk.id === loan?.book_id);
      return {
        ...f,
        member_name: member?.name,
        member_code: member?.member_code,
        book_title: book?.title
      };
    }).reverse();
  },

  payFine(data) {
    const loan = this.data.borrowings.find(b => b.id === Number(data.borrowing_id));
    if (!loan) throw new Error('Loan not found');
    const amount = parseFloat(data.amount);
    loan.fine_paid = (loan.fine_paid || 0) + amount;
    loan.fine_status = loan.fine_paid >= loan.fine_amount ? 'Paid' : 'Partially Paid';

    const receiptNo = `RCP-${Date.now().toString().slice(-6)}`;
    this.data.fine_payments.push({
      id: Date.now(),
      borrowing_id: loan.id,
      member_id: loan.member_id,
      amount_paid: amount,
      payment_method: data.payment_method || 'Cash',
      receipt_no: receiptNo,
      payment_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: data.notes || ''
    });

    this.logActivity(data.userName, 'Collect Fine', `Collected fine $${amount.toFixed(2)} on loan #${loan.id}`);
    this.save();
    return { message: 'Payment recorded', receipt_no: receiptNo, fine_status: loan.fine_status };
  },

  waiveFine(data) {
    const loan = this.data.borrowings.find(b => b.id === Number(data.borrowing_id));
    if (loan) {
      loan.fine_status = 'Waived';
      loan.remarks += ` [Waived: ${data.reason || 'Admin waiver'}]`;
    }
    this.logActivity(data.userName, 'Waive Fine', `Waived fine for loan #${data.borrowing_id}`);
    this.save();
    return { message: 'Fine waived' };
  },

  getNotifications(params = {}) {
    let list = this.data.notifications;
    if (params.member_id) list = list.filter(n => n.member_id === Number(params.member_id));
    return list;
  },

  markAllNotificationsRead() {
    this.data.notifications.forEach(n => n.is_read = 1);
    this.save();
    return { message: 'All notifications read' };
  },

  getReportsSummary() {
    const totalCirculation = this.data.borrowings.length;
    const returnedCount = this.data.borrowings.filter(b => !!b.return_date).length;
    const totalFinesAccrued = this.data.borrowings.reduce((s, b) => s + b.fine_amount, 0);
    const totalFinesPaid = this.data.fine_payments.reduce((s, p) => s + p.amount_paid, 0);

    const categoryCirculation = this.data.categories.map(c => {
      const booksInCat = this.data.books.filter(b => b.category_id === c.id);
      const bookIds = booksInCat.map(b => b.id);
      const count = this.data.borrowings.filter(b => bookIds.includes(b.book_id)).length;
      return { category_name: c.name, borrow_count: count };
    });

    const topBorrowers = this.data.members.map(m => {
      const count = this.data.borrowings.filter(b => b.member_id === m.id).length;
      return { id: m.id, member_code: m.member_code, name: m.name, member_type: m.member_type, total_borrowed: count };
    }).sort((a, b) => b.total_borrowed - a.total_borrowed).slice(0, 10);

    return { totalCirculation, returnedCount, totalFinesAccrued, totalFinesPaid, categoryCirculation, topBorrowers };
  },

  getUsers() {
    return this.data.users;
  },

  getSettings() {
    return this.data.settings;
  },

  saveSettings(data) {
    this.data.settings = { ...this.data.settings, ...data };
    this.save();
    return { message: 'Settings saved' };
  },

  resetDatabase() {
    this.seed();
    return { message: 'Database reset to default demo data successfully' };
  }
};
