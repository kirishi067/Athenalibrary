// public/js/views/books.js - Books Catalog & Inventory Management
const BooksView = {
  viewMode: 'grid', // 'grid' or 'table'
  searchTerm: '',
  categoryFilter: '',
  availabilityFilter: '',
  cachedBooks: [],
  categories: [],
  authors: [],

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Loading books catalog...</div>
      </div>
    `;

    try {
      const [books, categories, authors] = await Promise.all([
        API.getBooks(),
        API.getCategories(),
        API.getAuthors()
      ]);

      this.cachedBooks = books;
      this.categories = categories;
      this.authors = authors;

      this.renderCatalog(container);
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load books: ${err.message}</div></div>`;
    }
  },

  renderCatalog(container) {
    const isStaff = AppState.isStaff();

    let filtered = this.cachedBooks.filter(book => {
      const matchSearch = !this.searchTerm || 
        book.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        book.isbn.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (book.author_name && book.author_name.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (book.shelf_location && book.shelf_location.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchCat = !this.categoryFilter || String(book.category_id) === String(this.categoryFilter);
      
      const matchAvail = !this.availabilityFilter ||
        (this.availabilityFilter === 'available' && book.available_copies > 0) ||
        (this.availabilityFilter === 'out_of_stock' && book.available_copies === 0);

      return matchSearch && matchCat && matchAvail;
    });

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Books Catalog &amp; Collection</h1>
          <p class="page-description">Search, browse, manage shelf locations, check copy availability, and place reservations.</p>
        </div>
        <div class="page-actions">
          ${isStaff ? `
            <button class="btn btn-primary" onclick="openAddBookModal()">
              <span>➕</span> Add New Book
            </button>
          ` : `
            <button class="btn btn-secondary" onclick="navigate('dashboard')">
              <span>📋</span> My Borrowed Books
            </button>
          `}
        </div>
      </div>

      <!-- Filters & View Switcher -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-body" style="padding: 16px 20px;">
          <div class="filter-toolbar" style="margin-bottom: 0;">
            <div class="filter-group">
              <div class="search-input-box">
                <span class="icon">🔍</span>
                <input type="text" id="bookSearchInput" placeholder="Search by Title, ISBN, Author, Shelf..." value="${escapeHTML(this.searchTerm)}" oninput="BooksView.handleSearch(this.value)">
              </div>

              <select class="form-select" id="bookCategorySelect" onchange="BooksView.handleCategoryFilter(this.value)">
                <option value="">All Categories (${this.categories.length})</option>
                ${this.categories.map(c => `
                  <option value="${c.id}" ${this.categoryFilter == c.id ? 'selected' : ''}>${escapeHTML(c.name)}</option>
                `).join('')}
              </select>

              <select class="form-select" id="bookAvailSelect" onchange="BooksView.handleAvailFilter(this.value)">
                <option value="">All Availability</option>
                <option value="available" ${this.availabilityFilter === 'available' ? 'selected' : ''}>Available on Shelf</option>
                <option value="out_of_stock" ${this.availabilityFilter === 'out_of_stock' ? 'selected' : ''}>All Copies Loaned Out</option>
              </select>
            </div>

            <div class="filter-group">
              <span style="font-size: 13px; color: var(--slate-500);">${filtered.length} of ${this.cachedBooks.length} titles</span>
              <div style="display: flex; border: 1px solid var(--slate-200); border-radius: var(--radius-md); overflow: hidden;">
                <button class="btn btn-secondary btn-sm" style="border: none; border-radius: 0; background: ${this.viewMode === 'grid' ? 'var(--slate-100)' : 'white'};" onclick="BooksView.toggleMode('grid')">
                  🔲 Grid
                </button>
                <button class="btn btn-secondary btn-sm" style="border: none; border-radius: 0; background: ${this.viewMode === 'table' ? 'var(--slate-100)' : 'white'};" onclick="BooksView.toggleMode('table')">
                  📄 Table
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Catalog Container -->
      <div id="catalogContent">
        ${filtered.length === 0 ? `
          <div class="card">
            <div class="card-body" style="padding: 48px; text-align: center; color: var(--slate-500);">
              <div style="font-size: 32px; margin-bottom: 8px;">📚</div>
              <div style="font-size: 16px; font-weight: 600; color: var(--slate-700);">No books matched your criteria</div>
              <p style="font-size: 13px; margin-top: 4px;">Try adjusting your search terms or clearing the category filters.</p>
              <button class="btn btn-secondary btn-sm" style="margin-top: 14px;" onclick="BooksView.clearFilters()">Clear Filters</button>
            </div>
          </div>
        ` : this.viewMode === 'grid' ? this.renderGridView(filtered) : this.renderTableView(filtered)}
      </div>
    `;
  },

  renderGridView(books) {
    const isStaff = AppState.isStaff();
    const isMember = AppState.isMember();

    return `
      <div class="books-grid">
        ${books.map(b => {
          const isAvail = b.available_copies > 0;
          return `
            <div class="book-card">
              <div class="book-cover-wrap">
                <img src="${escapeHTML(b.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80')}" 
                     class="book-cover-img" alt="${escapeHTML(b.title)}">
                ${b.category_name ? `
                  <span class="book-category-tag" style="background: ${b.category_color || 'var(--primary)'};">
                    ${escapeHTML(b.category_name)}
                  </span>
                ` : ''}
              </div>
              <div class="book-details">
                <h3 class="book-title" title="${escapeHTML(b.title)}">${escapeHTML(b.title)}</h3>
                <div class="book-author">by ${escapeHTML(b.author_name || 'Unknown Author')}</div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">
                  <span>📍 ${escapeHTML(b.shelf_location || 'General Stacks')}</span>
                  <span>ISBN: ${escapeHTML(b.isbn)}</span>
                </div>

                <div class="book-footer">
                  <div>
                    <span class="badge ${isAvail ? 'badge-success' : 'badge-danger'}">
                      ${isAvail ? `${b.available_copies} of ${b.total_copies} Available` : 'All Loaned Out'}
                    </span>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" onclick="openBookDetailsModal(${b.id})">Details</button>
                    ${isStaff ? `
                      <button class="btn btn-primary btn-sm" onclick="quickIssueForBook(${b.id})" ${!isAvail ? 'disabled title="Out of stock"' : ''}>Issue</button>
                    ` : isMember ? `
                      <button class="btn ${isAvail ? 'btn-success' : 'btn-primary'} btn-sm" onclick="memberReserveBook(${b.id})">
                        ${isAvail ? 'Reserve' : 'Join Queue'}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderTableView(books) {
    const isStaff = AppState.isStaff();
    const isMember = AppState.isMember();

    return `
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title &amp; Author</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Shelf Location</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${books.map(b => {
                  const isAvail = b.available_copies > 0;
                  return `
                    <tr>
                      <td style="display: flex; align-items: center; gap: 12px;">
                        <img src="${escapeHTML(b.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=80&q=80')}"
                             style="width: 36px; height: 48px; object-fit: cover; border-radius: 4px;">
                        <div>
                          <div style="font-weight: 600; color: var(--slate-900); font-size: 13.5px;">${escapeHTML(b.title)}</div>
                          <div style="font-size: 12px; color: var(--slate-500);">by ${escapeHTML(b.author_name || 'Unknown')}</div>
                        </div>
                      </td>
                      <td style="font-family: monospace; font-size: 12.5px;">${escapeHTML(b.isbn)}</td>
                      <td>
                        <span class="badge" style="background: ${b.category_color}20; color: ${b.category_color};">
                          ${escapeHTML(b.category_name || '-')}
                        </span>
                      </td>
                      <td style="font-size: 12.5px; color: var(--slate-600);">📍 ${escapeHTML(b.shelf_location || '-')}</td>
                      <td>
                        <span class="badge ${isAvail ? 'badge-success' : 'badge-danger'}">
                          ${b.available_copies} / ${b.total_copies}
                        </span>
                      </td>
                      <td>
                        <div style="display: flex; gap: 6px;">
                          <button class="btn btn-secondary btn-sm" onclick="openBookDetailsModal(${b.id})">View</button>
                          ${isStaff ? `
                            <button class="btn btn-secondary btn-sm" onclick="openEditBookModal(${b.id})">Edit</button>
                            <button class="btn btn-primary btn-sm" onclick="quickIssueForBook(${b.id})" ${!isAvail ? 'disabled' : ''}>Issue</button>
                          ` : isMember ? `
                            <button class="btn ${isAvail ? 'btn-success' : 'btn-primary'} btn-sm" onclick="memberReserveBook(${b.id})">Reserve</button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  handleSearch(val) {
    this.searchTerm = val;
    this.refreshCatalogDOM();
  },

  handleCategoryFilter(val) {
    this.categoryFilter = val;
    this.refreshCatalogDOM();
  },

  handleAvailFilter(val) {
    this.availabilityFilter = val;
    this.refreshCatalogDOM();
  },

  toggleMode(mode) {
    this.viewMode = mode;
    this.refreshCatalogDOM();
  },

  clearFilters() {
    this.searchTerm = '';
    this.categoryFilter = '';
    this.availabilityFilter = '';
    const s = document.getElementById('bookSearchInput');
    const c = document.getElementById('bookCategorySelect');
    const a = document.getElementById('bookAvailSelect');
    if (s) s.value = '';
    if (c) c.value = '';
    if (a) a.value = '';
    this.refreshCatalogDOM();
  },

  refreshCatalogDOM() {
    const container = document.getElementById('catalogContent');
    if (!container) return;

    let filtered = this.cachedBooks.filter(book => {
      const matchSearch = !this.searchTerm || 
        book.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        book.isbn.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (book.author_name && book.author_name.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (book.shelf_location && book.shelf_location.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchCat = !this.categoryFilter || String(book.category_id) === String(this.categoryFilter);
      
      const matchAvail = !this.availabilityFilter ||
        (this.availabilityFilter === 'available' && book.available_copies > 0) ||
        (this.availabilityFilter === 'out_of_stock' && book.available_copies === 0);

      return matchSearch && matchCat && matchAvail;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body" style="padding: 48px; text-align: center; color: var(--slate-500);">
            <div style="font-size: 32px; margin-bottom: 8px;">📚</div>
            <div style="font-size: 16px; font-weight: 600; color: var(--slate-700);">No books matched your search</div>
            <button class="btn btn-secondary btn-sm" style="margin-top: 14px;" onclick="BooksView.clearFilters()">Clear Filters</button>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = this.viewMode === 'grid' ? this.renderGridView(filtered) : this.renderTableView(filtered);
    }
  }
};

// Global modals & actions for Books
async function openBookDetailsModal(bookId) {
  try {
    const book = await API.getBook(bookId);
    const body = document.getElementById('bookDetailsBody');
    if (!body) return;

    const isStaff = AppState.isStaff();
    const isMember = AppState.isMember();

    body.innerHTML = `
      <div style="display: flex; gap: 24px; margin-bottom: 24px;">
        <img src="${escapeHTML(book.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80')}" 
             style="width: 140px; height: 190px; object-fit: cover; border-radius: var(--radius-md); box-shadow: var(--shadow-md);">
        <div style="flex: 1;">
          <h2 style="font-size: 20px; font-weight: 700; color: var(--slate-900); margin-bottom: 6px;">${escapeHTML(book.title)}</h2>
          <div style="font-size: 14px; color: var(--slate-600); margin-bottom: 12px;">
            by <strong>${escapeHTML(book.author_name || 'Unknown')}</strong> &bull; 
            <span class="badge" style="background: ${book.category_color}20; color: ${book.category_color}; font-size: 12px;">${escapeHTML(book.category_name || 'General')}</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; background: var(--slate-50); padding: 12px; border-radius: var(--radius-md);">
            <div><strong>ISBN:</strong> ${escapeHTML(book.isbn)}</div>
            <div><strong>Shelf Location:</strong> 📍 ${escapeHTML(book.shelf_location || 'Stacks')}</div>
            <div><strong>Publisher:</strong> ${escapeHTML(book.publisher || 'N/A')}</div>
            <div><strong>Year / Edition:</strong> ${escapeHTML(book.publish_year || '-')} (${escapeHTML(book.edition || '1st')})</div>
            <div><strong>Total Copies:</strong> ${book.total_copies}</div>
            <div><strong>Available Copies:</strong> <span class="badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'}">${book.available_copies} Available</span></div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px; color: var(--slate-800);">Synopsis &amp; Description</h4>
        <p style="font-size: 13.5px; color: var(--slate-600); line-height: 1.6;">${escapeHTML(book.description || 'No description entered for this title.')}</p>
      </div>

      ${book.author_bio ? `
        <div style="margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
          <h5 style="font-size: 13px; font-weight: 700; color: var(--slate-800);">About the Author: ${escapeHTML(book.author_name)}</h5>
          <p style="font-size: 12.5px; color: var(--slate-600); margin-top: 4px;">${escapeHTML(book.author_bio)}</p>
        </div>
      ` : ''}

      ${isStaff ? `
        <div style="margin-top: 20px;">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: var(--slate-800);">Current Checked Out Copies (${book.activeBorrowings.length})</h4>
          ${book.activeBorrowings.length === 0 ? `
            <div style="font-size: 13px; color: var(--slate-500);">All copies are currently accounted for on shelves.</div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Member ID</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${book.activeBorrowings.map(ab => `
                    <tr>
                      <td style="font-weight: 600;">${escapeHTML(ab.member_name)}</td>
                      <td>${escapeHTML(ab.member_code)}</td>
                      <td>${formatDate(ab.issue_date)}</td>
                      <td><span style="color: ${ab.status === 'Overdue' ? 'var(--danger)' : 'inherit'}; font-weight: 600;">${formatDate(ab.due_date)}</span></td>
                      <td><span class="badge ${ab.status === 'Overdue' ? 'badge-danger' : 'badge-primary'}">${ab.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div style="margin-top: 20px;">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: var(--slate-800);">Active Reservation Queue (${book.reservations.length})</h4>
          ${book.reservations.length === 0 ? `
            <div style="font-size: 13px; color: var(--slate-500);">No pending reservations for this title.</div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Queue #</th>
                    <th>Member</th>
                    <th>Reserved Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${book.reservations.map((r, i) => `
                    <tr>
                      <td style="font-weight: 700;">#${i + 1}</td>
                      <td>${escapeHTML(r.member_name)} (${escapeHTML(r.member_code)})</td>
                      <td>${formatDate(r.reservation_date)}</td>
                      <td><span class="badge ${r.status === 'Ready' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      ` : ''}

      <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 10px;">
        ${isStaff ? `
          <button class="btn btn-secondary" onclick="openEditBookModal(${book.id})">Edit Book</button>
          <button class="btn btn-danger" onclick="deleteBookRecord(${book.id})">Delete Title</button>
          <button class="btn btn-primary" onclick="quickIssueForBook(${book.id})" ${book.available_copies <= 0 ? 'disabled' : ''}>Issue Copy</button>
        ` : isMember ? `
          <button class="btn ${book.available_copies > 0 ? 'btn-success' : 'btn-primary'}" onclick="memberReserveBook(${book.id})">
            ${book.available_copies > 0 ? 'Reserve Book' : 'Place Hold / Join Queue'}
          </button>
        ` : ''}
      </div>
    `;

    openModal('bookDetailsModal');
  } catch (err) {
    showToast('Failed to load book details: ' + err.message, 'error');
  }
}

function openAddBookModal() {
  const form = document.getElementById('bookForm');
  if (form) form.reset();
  document.getElementById('bookFormId').value = '';
  document.getElementById('bookModalTitle').textContent = 'Add New Book Title';
  populateAuthorAndCategoryOptions();
  openModal('bookEditModal');
}

async function openEditBookModal(bookId) {
  try {
    const book = await API.getBook(bookId);
    document.getElementById('bookFormId').value = book.id;
    document.getElementById('bookModalTitle').textContent = 'Edit Book: ' + book.title;

    document.getElementById('bookTitleInput').value = book.title || '';
    document.getElementById('bookIsbnInput').value = book.isbn || '';
    document.getElementById('bookPublisherInput').value = book.publisher || '';
    document.getElementById('bookYearInput').value = book.publish_year || '';
    document.getElementById('bookEditionInput').value = book.edition || '';
    document.getElementById('bookTotalCopiesInput').value = book.total_copies || 1;
    document.getElementById('bookShelfInput').value = book.shelf_location || '';
    document.getElementById('bookCoverUrlInput').value = book.cover_url || '';
    document.getElementById('bookDescInput').value = book.description || '';

    populateAuthorAndCategoryOptions(book.author_id, book.category_id);
    closeModal('bookDetailsModal');
    openModal('bookEditModal');
  } catch (err) {
    showToast('Error loading book: ' + err.message, 'error');
  }
}

function populateAuthorAndCategoryOptions(selectedAuthorId = null, selectedCatId = null) {
  const authSelect = document.getElementById('bookAuthorSelect');
  const catSelect = document.getElementById('bookCategorySelectInput');

  if (authSelect) {
    authSelect.innerHTML = '<option value="">-- Select Author --</option>' +
      BooksView.authors.map(a => `<option value="${a.id}" ${selectedAuthorId == a.id ? 'selected' : ''}>${escapeHTML(a.name)}</option>`).join('');
  }

  if (catSelect) {
    catSelect.innerHTML = '<option value="">-- Select Category --</option>' +
      BooksView.categories.map(c => `<option value="${c.id}" ${selectedCatId == c.id ? 'selected' : ''}>${escapeHTML(c.name)}</option>`).join('');
  }
}

async function saveBookForm(e) {
  e.preventDefault();
  const bookId = document.getElementById('bookFormId').value;
  const payload = {
    title: document.getElementById('bookTitleInput').value.trim(),
    isbn: document.getElementById('bookIsbnInput').value.trim(),
    author_id: document.getElementById('bookAuthorSelect').value || null,
    category_id: document.getElementById('bookCategorySelectInput').value || null,
    publisher: document.getElementById('bookPublisherInput').value.trim(),
    publish_year: parseInt(document.getElementById('bookYearInput').value, 10) || null,
    edition: document.getElementById('bookEditionInput').value.trim(),
    total_copies: parseInt(document.getElementById('bookTotalCopiesInput').value, 10) || 1,
    shelf_location: document.getElementById('bookShelfInput').value.trim(),
    cover_url: document.getElementById('bookCoverUrlInput').value.trim(),
    description: document.getElementById('bookDescInput').value.trim(),
    userName: AppState.currentUser.fullName
  };

  try {
    if (bookId) {
      await API.updateBook(bookId, payload);
      showToast('Book updated successfully!', 'success');
    } else {
      await API.createBook(payload);
      showToast('New book title added to library!', 'success');
    }
    closeModal('bookEditModal');
    navigate('books');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteBookRecord(bookId) {
  if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) return;
  try {
    await API.deleteBook(bookId);
    showToast('Book deleted from catalog', 'warning');
    closeModal('bookDetailsModal');
    navigate('books');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Member self-service book reservation
async function memberReserveBook(bookId) {
  if (!AppState.isMember() || !AppState.currentUser.memberId) {
    showToast('Please switch to a member persona to place reservations.', 'warning');
    return;
  }

  try {
    const res = await API.createReservation({
      book_id: bookId,
      member_id: AppState.currentUser.memberId,
      notes: 'Reserved through online catalog',
      userName: AppState.currentUser.fullName
    });
    showToast(res.message || 'Book reserved successfully!', 'success');
    closeModal('bookDetailsModal');
    navigate('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function quickIssueForBook(bookId) {
  closeModal('bookDetailsModal');
  openIssueModal(bookId);
}
