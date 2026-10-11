// public/js/views/circulation.js - Issue & Return Management
const CirculationView = {
  currentTab: 'active', // 'active', 'overdue', 'returned'
  searchTerm: '',
  cachedLoans: [],
  membersList: [],
  availableBooksList: [],

  async render(container) {
    if (AppState.isMember()) {
      await this.renderMemberCirculation(container);
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Loading circulation records...</div>
      </div>
    `;

    try {
      const [loans, members, books] = await Promise.all([
        API.getBorrowings(),
        API.getMembers(),
        API.getBooks({ availability: 'available' })
      ]);

      this.cachedLoans = loans;
      this.membersList = members;
      this.availableBooksList = books;

      this.renderCirculationDashboard(container);
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load circulation: ${err.message}</div></div>`;
    }
  },

  renderCirculationDashboard(container) {
    let filtered = this.cachedLoans.filter(l => {
      const isReturned = !!l.return_date;
      const isOverdue = !isReturned && (l.status === 'Overdue' || new Date(l.due_date) < new Date());

      if (this.currentTab === 'active' && isReturned) return false;
      if (this.currentTab === 'overdue' && (!isOverdue || isReturned)) return false;
      if (this.currentTab === 'returned' && !isReturned) return false;

      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        return (
          l.book_title.toLowerCase().includes(term) ||
          l.member_name.toLowerCase().includes(term) ||
          l.member_code.toLowerCase().includes(term) ||
          l.isbn.toLowerCase().includes(term)
        );
      }
      return true;
    });

    const activeCount = this.cachedLoans.filter(l => !l.return_date).length;
    const overdueCount = this.cachedLoans.filter(l => !l.return_date && (l.status === 'Overdue' || new Date(l.due_date) < new Date())).length;
    const returnedCount = this.cachedLoans.filter(l => l.return_date).length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Circulation &amp; Desk Operations</h1>
          <p class="page-description">Process book check-outs (issue), check-ins (returns), renewals, and monitor return deadlines.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openIssueModal()">
            <span>➕</span> Issue Book
          </button>
          <button class="btn btn-secondary" onclick="openQuickReturnModal()">
            <span>↩️</span> Quick Return
          </button>
        </div>
      </div>

      <!-- Circulation Tabs -->
      <div class="nav-tabs" style="margin-bottom: 20px;">
        <button class="tab-btn ${this.currentTab === 'active' ? 'active' : ''}" onclick="CirculationView.switchTab('active')">
          🔄 Active Checked-Out Loans (${activeCount})
        </button>
        <button class="tab-btn ${this.currentTab === 'overdue' ? 'active' : ''}" onclick="CirculationView.switchTab('overdue')">
          ⚠️ Overdue Loans (${overdueCount})
        </button>
        <button class="tab-btn ${this.currentTab === 'returned' ? 'active' : ''}" onclick="CirculationView.switchTab('returned')">
          ✅ Returned History (${returnedCount})
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-body" style="padding: 16px 20px;">
          <div class="filter-toolbar" style="margin-bottom: 0;">
            <div class="filter-group">
              <div class="search-input-box">
                <span class="icon">🔍</span>
                <input type="text" placeholder="Search by Book, Member, or Card ID..." value="${escapeHTML(this.searchTerm)}" oninput="CirculationView.handleSearch(this.value)">
              </div>
            </div>
            <div class="filter-group">
              <span style="font-size: 13px; color: var(--slate-500);">${filtered.length} records shown</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loans Table -->
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Book Title &amp; ISBN</th>
                  <th>Borrower Details</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  ${this.currentTab === 'returned' ? '<th>Returned On</th>' : '<th>Days Remaining / Overdue</th>'}
                  <th>Status &amp; Fines</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--slate-500);">
                      No circulation records in this view.
                    </td>
                  </tr>
                ` : filtered.map(loan => {
                  const today = new Date();
                  const dueDate = new Date(loan.due_date);
                  const isOverdue = !loan.return_date && (loan.status === 'Overdue' || dueDate < today);
                  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                  return `
                    <tr>
                      <td style="display: flex; align-items: center; gap: 10px;">
                        <img src="${escapeHTML(loan.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=80&q=80')}"
                             style="width: 34px; height: 46px; object-fit: cover; border-radius: 4px;">
                        <div>
                          <div style="font-weight: 600; color: var(--slate-900); font-size: 13.5px;">${escapeHTML(loan.book_title)}</div>
                          <div style="font-size: 11.5px; color: var(--slate-500);">ISBN: ${escapeHTML(loan.isbn)}</div>
                        </div>
                      </td>
                      <td>
                        <div style="font-weight: 600; color: var(--slate-900);">${escapeHTML(loan.member_name)}</div>
                        <div style="font-size: 11.5px; color: var(--primary); font-family: monospace;">${escapeHTML(loan.member_code)}</div>
                      </td>
                      <td>${formatDate(loan.issue_date)}</td>
                      <td>
                        <strong style="color: ${isOverdue ? 'var(--danger)' : 'var(--slate-800)'};">
                          ${formatDate(loan.due_date)}
                        </strong>
                      </td>
                      ${loan.return_date ? `
                        <td>${formatDate(loan.return_date)}</td>
                      ` : `
                        <td>
                          ${isOverdue ? `
                            <span style="color: var(--danger); font-weight: 700;">Overdue by ${Math.abs(diffDays)}d</span>
                          ` : `
                            <span style="color: var(--slate-600);">${diffDays === 0 ? 'Due today!' : `${diffDays} days left`}</span>
                          `}
                        </td>
                      `}
                      <td>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <div>
                            <span class="badge ${loan.return_date ? 'badge-success' : isOverdue ? 'badge-danger' : 'badge-primary'}">
                              ${loan.return_date ? 'Returned' : isOverdue ? 'Overdue' : 'On Loan'}
                            </span>
                            ${loan.renewal_count > 0 ? `<span class="badge badge-secondary" style="font-size: 10px;">${loan.renewal_count}x Renewed</span>` : ''}
                          </div>
                          ${loan.fine_amount > 0 ? `
                            <span style="font-size: 11px; font-weight: 600; color: ${loan.fine_status === 'Paid' ? 'var(--success)' : 'var(--danger)'};">
                              Fine: ${formatCurrency(loan.fine_amount)} (${loan.fine_status})
                            </span>
                          ` : ''}
                        </div>
                      </td>
                      <td>
                        <div style="display: flex; gap: 6px;">
                          ${!loan.return_date ? `
                            <button class="btn btn-success btn-sm" onclick="openReturnConfirmModal(${loan.id})">Return</button>
                            <button class="btn btn-secondary btn-sm" onclick="promptRenewLoan(${loan.id})" ${loan.renewal_count >= 2 ? 'disabled title="Max renewals reached"' : ''}>Renew</button>
                          ` : `
                            <span style="font-size: 12px; color: var(--slate-400);">Completed</span>
                          `}
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

  async renderMemberCirculation(container) {
    const memberId = AppState.currentUser.memberId;
    const memberData = await API.getMember(memberId);
    const active = memberData.borrowings.filter(b => !b.return_date);
    const past = memberData.borrowings.filter(b => b.return_date);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">My Borrowing Records &amp; Loans</h1>
          <p class="page-description">Track your active books, due dates, renewal options, and loan history.</p>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div class="card-title">📖 Currently Borrowed Books (${active.length})</div>
        </div>
        <div class="card-body" style="padding: 0;">
          ${active.length === 0 ? `
            <div style="padding: 32px; text-align: center; color: var(--slate-500);">No active loans.</div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${active.map(b => `
                    <tr>
                      <td style="font-weight: 600;">${escapeHTML(b.book_title)}</td>
                      <td>${formatDate(b.issue_date)}</td>
                      <td><strong>${formatDate(b.due_date)}</strong></td>
                      <td><span class="badge ${b.status === 'Overdue' ? 'badge-danger' : 'badge-primary'}">${b.status}</span></td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="requestRenewal(${b.id})" ${b.renewal_count >= 2 ? 'disabled' : ''}>
                          🔄 Renew (+14 Days)
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📜 Past Borrowing History (${past.length})</div>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Issue Date</th>
                  <th>Return Date</th>
                  <th>Fine Settled</th>
                </tr>
              </thead>
              <tbody>
                ${past.map(b => `
                  <tr>
                    <td style="font-weight: 600;">${escapeHTML(b.book_title)}</td>
                    <td>${formatDate(b.issue_date)}</td>
                    <td>${formatDate(b.return_date)}</td>
                    <td>${b.fine_amount > 0 ? formatCurrency(b.fine_amount) : '$0.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.renderCirculationDashboard(document.getElementById('mainAppContainer'));
  },

  handleSearch(val) {
    this.searchTerm = val;
    this.renderCirculationDashboard(document.getElementById('mainAppContainer'));
  }
};

// Global issue book modal & logic
async function openIssueModal(preselectedBookId = null, preselectedMemberId = null) {
  try {
    const [books, members] = await Promise.all([
      API.getBooks({ availability: 'available' }),
      API.getMembers({ status: 'Active' })
    ]);

    const bookSelect = document.getElementById('issueBookSelect');
    const memberSelect = document.getElementById('issueMemberSelect');

    if (bookSelect) {
      bookSelect.innerHTML = '<option value="">-- Choose Available Book --</option>' +
        books.map(b => `
          <option value="${b.id}" ${preselectedBookId == b.id ? 'selected' : ''}>
            ${escapeHTML(b.title)} (${b.available_copies} available) - ISBN: ${escapeHTML(b.isbn)}
          </option>
        `).join('');
    }

    if (memberSelect) {
      memberSelect.innerHTML = '<option value="">-- Choose Active Member --</option>' +
        members.map(m => `
          <option value="${m.id}" ${preselectedMemberId == m.id ? 'selected' : ''} ${m.current_loans >= m.borrow_limit ? 'disabled' : ''}>
            ${escapeHTML(m.name)} [${escapeHTML(m.member_code)}] - ${m.current_loans}/${m.borrow_limit} books ${m.current_loans >= m.borrow_limit ? '(Limit Reached)' : ''}
          </option>
        `).join('');
    }

    document.getElementById('issueLoanDays').value = '14';
    document.getElementById('issueRemarks').value = '';
    openModal('issueBookModal');
  } catch (err) {
    showToast('Failed to prepare issue form: ' + err.message, 'error');
  }
}

async function submitIssueBookForm(e) {
  e.preventDefault();
  const bookId = document.getElementById('issueBookSelect').value;
  const memberId = document.getElementById('issueMemberSelect').value;
  const loanDays = document.getElementById('issueLoanDays').value;
  const remarks = document.getElementById('issueRemarks').value;

  if (!bookId || !memberId) {
    showToast('Please select both a book and a member', 'warning');
    return;
  }

  try {
    const res = await API.issueBook({
      book_id: bookId,
      member_id: memberId,
      loan_days: loanDays,
      remarks,
      issued_by_user_id: AppState.currentUser.id,
      userName: AppState.currentUser.fullName
    });

    showToast(`Book issued successfully! Due date: ${formatDate(res.due_date)}`, 'success');
    closeModal('issueBookModal');
    navigate('circulation');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Return confirmation & fine calculation modal
let pendingReturnLoanId = null;

async function openReturnConfirmModal(borrowingId) {
  pendingReturnLoanId = borrowingId;
  try {
    const loans = await API.getBorrowings();
    const loan = loans.find(l => l.id === borrowingId);
    if (!loan) throw new Error('Loan record not found');

    const modalBody = document.getElementById('returnConfirmBody');
    const today = new Date();
    const dueDate = new Date(loan.due_date);
    const isOverdue = dueDate < today;
    const diffDays = isOverdue ? Math.max(1, Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))) : 0;
    const fineRate = parseFloat(AppState.systemSettings.fine_per_day || 1.0);
    const estimatedFine = diffDays * fineRate;

    modalBody.innerHTML = `
      <div style="background: var(--slate-50); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: 700; color: var(--slate-900);">${escapeHTML(loan.book_title)}</div>
        <div style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">Borrower: <strong>${escapeHTML(loan.member_name)}</strong> (${escapeHTML(loan.member_code)})</div>
        <div style="font-size: 12.5px; color: var(--slate-500); margin-top: 2px;">Issued on: ${formatDate(loan.issue_date)} &bull; Due date: ${formatDate(loan.due_date)}</div>
      </div>

      ${isOverdue ? `
        <div style="background: #fee2e2; border: 1px solid #f87171; padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px; color: #991b1b;">
          <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 6px;">
            <span>⚠️</span> Overdue Alert: ${diffDays} day(s) late
          </div>
          <div style="font-size: 13px; margin-top: 4px;">
            Fine assessed at <strong>${formatCurrency(fineRate)}/day</strong>:
            <span style="font-size: 18px; font-weight: 800; color: var(--danger); margin-left: 6px;">${formatCurrency(estimatedFine)}</span>
          </div>
        </div>
      ` : `
        <div style="background: #ecfdf5; border: 1px solid #6ee7b7; padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px; color: #065f46;">
          <div style="font-weight: 700; font-size: 14px;">✅ Returned On Time</div>
          <div style="font-size: 12.5px; margin-top: 2px;">No overdue fines incurred for this return.</div>
        </div>
      `}

      <div class="form-group">
        <label class="form-label">Return Notes / Condition Remarks</label>
        <input type="text" class="form-control" id="returnRemarksInput" placeholder="e.g. Good condition, returned at desk">
      </div>
    `;

    openModal('returnConfirmModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmProcessReturn() {
  if (!pendingReturnLoanId) return;
  const remarks = document.getElementById('returnRemarksInput')?.value || '';

  try {
    const res = await API.returnBook({
      borrowing_id: pendingReturnLoanId,
      remarks,
      userName: AppState.currentUser.fullName
    });

    closeModal('returnConfirmModal');
    showToast(res.message || 'Book returned successfully!', 'success');
    navigate('circulation');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function promptRenewLoan(borrowingId) {
  if (!confirm('Extend this loan by an additional 14 days?')) return;
  try {
    const res = await API.renewLoan({
      borrowing_id: borrowingId,
      extension_days: 14,
      userName: AppState.currentUser.fullName
    });
    showToast(res.message || 'Loan renewed!', 'success');
    navigate('circulation');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Quick return shortcut from anywhere
async function openQuickReturnModal() {
  try {
    const loans = await API.getBorrowings({ status: 'active' });
    const select = document.getElementById('quickReturnLoanSelect');
    if (select) {
      select.innerHTML = '<option value="">-- Select Active Loan to Return --</option>' +
        loans.map(l => `
          <option value="${l.id}">
            ${escapeHTML(l.book_title)} - Loaned to ${escapeHTML(l.member_name)} (${escapeHTML(l.member_code)})
          </option>
        `).join('');
    }
    openModal('quickReturnModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function proceedWithQuickReturn() {
  const loanId = document.getElementById('quickReturnLoanSelect').value;
  if (!loanId) {
    showToast('Please select a loan', 'warning');
    return;
  }
  closeModal('quickReturnModal');
  openReturnConfirmModal(parseInt(loanId, 10));
}
