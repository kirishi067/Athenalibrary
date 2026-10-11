// public/js/views/fines.js - Overdue Tracking & Fine Payment Management
const FinesView = {
  currentTab: 'overdue', // 'overdue' or 'payments'
  cachedOverdue: [],
  cachedPayments: [],

  async render(container) {
    if (AppState.isMember()) {
      await this.renderMemberFines(container);
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Loading fines and overdue accounts...</div>
      </div>
    `;

    try {
      const [overdue, payments] = await Promise.all([
        API.getOverdueLoans(),
        API.getFinePayments()
      ]);

      this.cachedOverdue = overdue;
      this.cachedPayments = payments;

      this.renderFinesDashboard(container);
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load fines: ${err.message}</div></div>`;
    }
  },

  renderFinesDashboard(container) {
    const totalPendingFines = this.cachedOverdue.reduce((sum, l) => sum + (l.fine_amount - l.fine_paid), 0);
    const totalCollected = this.cachedPayments.reduce((sum, p) => sum + p.amount_paid, 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Overdue Tracking &amp; Fine Management</h1>
          <p class="page-description">Automated overdue fee accrual, fine collections, electronic receipts, and penalty waivers.</p>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="stat-card">
          <div class="stat-icon" style="background: #fee2e2; color: #b91c1c;">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${this.cachedOverdue.length}</div>
            <div class="stat-label">Overdue Loans</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #b45309;">💰</div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(totalPendingFines)}</div>
            <div class="stat-label">Pending Fine Balance</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #dcfce7; color: #15803d;">💵</div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(totalCollected)}</div>
            <div class="stat-label">Total Fines Collected</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">🧾</div>
          <div class="stat-info">
            <div class="stat-value">${this.cachedPayments.length}</div>
            <div class="stat-label">Issued Receipts</div>
          </div>
        </div>
      </div>

      <!-- Sub Tabs -->
      <div class="nav-tabs" style="margin-bottom: 20px;">
        <button class="tab-btn ${this.currentTab === 'overdue' ? 'active' : ''}" onclick="FinesView.switchTab('overdue')">
          ⚠️ Outstanding Overdue Loans (${this.cachedOverdue.length})
        </button>
        <button class="tab-btn ${this.currentTab === 'payments' ? 'active' : ''}" onclick="FinesView.switchTab('payments')">
          🧾 Fine Payment History &amp; Receipts (${this.cachedPayments.length})
        </button>
      </div>

      <!-- Tab Content -->
      ${this.currentTab === 'overdue' ? this.renderOverdueTable() : this.renderPaymentsTable()}
    `;
  },

  renderOverdueTable() {
    return `
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Borrower Details</th>
                  <th>Overdue Book</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Accrued Fine</th>
                  <th>Fine Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${this.cachedOverdue.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--success); font-weight: 600;">
                      🎉 Great news! No overdue books or pending fines in the library.
                    </td>
                  </tr>
                ` : this.cachedOverdue.map(loan => {
                  const netBalance = loan.fine_amount - loan.fine_paid;
                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 600; color: var(--slate-900);">${escapeHTML(loan.member_name)}</div>
                        <div style="font-size: 11.5px; color: var(--primary); font-family: monospace;">${escapeHTML(loan.member_code)}</div>
                        <div style="font-size: 11px; color: var(--slate-500);">${escapeHTML(loan.member_phone || loan.member_email)}</div>
                      </td>
                      <td>
                        <div style="font-weight: 600; color: var(--slate-900); font-size: 13.5px;">${escapeHTML(loan.book_title)}</div>
                        <div style="font-size: 11.5px; color: var(--slate-500);">ISBN: ${escapeHTML(loan.isbn)}</div>
                      </td>
                      <td style="font-weight: 600; color: var(--danger);">${formatDate(loan.due_date)}</td>
                      <td>
                        <span class="badge badge-danger" style="font-size: 12px;">
                          ${loan.days_overdue} days late
                        </span>
                      </td>
                      <td>
                        <div style="font-size: 15px; font-weight: 700; color: var(--danger);">${formatCurrency(loan.fine_amount)}</div>
                        ${loan.fine_paid > 0 ? `<div style="font-size: 11px; color: var(--success);">Paid: ${formatCurrency(loan.fine_paid)}</div>` : ''}
                      </td>
                      <td>
                        <span class="badge ${loan.fine_status === 'Paid' ? 'badge-success' : 'badge-warning'}">
                          ${loan.fine_status}
                        </span>
                      </td>
                      <td>
                        <div style="display: flex; gap: 6px;">
                          ${netBalance > 0 ? `
                            <button class="btn btn-primary btn-sm" onclick="openPayFineModal(${loan.id}, ${netBalance}, '${escapeHTML(loan.member_name)}')">Collect Fine</button>
                            <button class="btn btn-secondary btn-sm" onclick="promptWaiveFine(${loan.id})">Waive</button>
                          ` : `
                            <span class="badge badge-success">Settled</span>
                          `}
                          <button class="btn btn-success btn-sm" onclick="openReturnConfirmModal(${loan.id})">Return</button>
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

  renderPaymentsTable() {
    return `
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Member</th>
                  <th>Associated Book</th>
                  <th>Amount Paid</th>
                  <th>Payment Method</th>
                  <th>Date &amp; Time</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${this.cachedPayments.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: var(--slate-500);">
                      No payment history recorded yet.
                    </td>
                  </tr>
                ` : this.cachedPayments.map(p => `
                  <tr>
                    <td>
                      <span style="font-family: monospace; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 3px 8px; border-radius: 4px;">
                        ${escapeHTML(p.receipt_no)}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--slate-900);">${escapeHTML(p.member_name)}</div>
                      <div style="font-size: 11.5px; color: var(--slate-500);">${escapeHTML(p.member_code)}</div>
                    </td>
                    <td style="font-weight: 600; color: var(--slate-800);">${escapeHTML(p.book_title)}</td>
                    <td style="font-size: 14px; font-weight: 700; color: var(--success);">${formatCurrency(p.amount_paid)}</td>
                    <td><span class="badge badge-secondary">${escapeHTML(p.payment_method)}</span></td>
                    <td style="font-size: 12.5px; color: var(--slate-600);">${p.payment_date}</td>
                    <td style="font-size: 12px; color: var(--slate-500);">${escapeHTML(p.notes || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async renderMemberFines(container) {
    const memberId = AppState.currentUser.memberId;
    const memberData = await API.getMember(memberId);
    const activeLoans = memberData.borrowings.filter(b => !b.return_date && b.fine_amount > 0);
    const totalPending = activeLoans.reduce((sum, l) => sum + (l.fine_amount - l.fine_paid), 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">My Overdue &amp; Fines Balance</h1>
          <p class="page-description">Overview of incurred overdue penalties and past payment receipts.</p>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
        <div class="stat-card">
          <div class="stat-icon" style="background: ${totalPending > 0 ? '#fee2e2' : '#dcfce7'}; color: ${totalPending > 0 ? '#b91c1c' : '#15803d'};">
            ${totalPending > 0 ? '⚠️' : '✅'}
          </div>
          <div class="stat-info">
            <div class="stat-value" style="color: ${totalPending > 0 ? 'var(--danger)' : 'var(--success)'};">${formatCurrency(totalPending)}</div>
            <div class="stat-label">Total Outstanding Fine Balance</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">🧾</div>
          <div class="stat-info">
            <div class="stat-value">${memberData.fineHistory.length}</div>
            <div class="stat-label">Total Past Payments</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div class="card-title">⚠️ Outstanding Fines on Unreturned Books</div>
        </div>
        <div class="card-body" style="padding: 0;">
          ${activeLoans.length === 0 ? `
            <div style="padding: 28px; text-align: center; color: var(--success); font-weight: 600;">
              ✨ You have no unpaid fines! Thank you for maintaining good library standing.
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Due Date</th>
                    <th>Overdue Fine</th>
                    <th>Status</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeLoans.map(l => `
                    <tr>
                      <td style="font-weight: 600;">${escapeHTML(l.book_title)}</td>
                      <td style="color: var(--danger); font-weight: 700;">${formatDate(l.due_date)}</td>
                      <td style="color: var(--danger); font-size: 15px; font-weight: 700;">${formatCurrency(l.fine_amount - l.fine_paid)}</td>
                      <td><span class="badge badge-danger">${l.fine_status}</span></td>
                      <td style="font-size: 12.5px; color: var(--slate-600);">Please return item to the circulation desk to settle this fine.</td>
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
          <div class="card-title">📜 Payment History &amp; Receipts</div>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Book Title</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${memberData.fineHistory.length === 0 ? `
                  <tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--slate-500);">No receipts found.</td></tr>
                ` : memberData.fineHistory.map(f => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHTML(f.receipt_no)}</td>
                    <td>${escapeHTML(f.book_title)}</td>
                    <td style="font-weight: 700;">${formatCurrency(f.amount_paid)}</td>
                    <td><span class="badge badge-secondary">${escapeHTML(f.payment_method)}</span></td>
                    <td>${formatDate(f.payment_date)}</td>
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
    this.renderFinesDashboard(document.getElementById('mainAppContainer'));
  }
};

// Global pay fine modal
let pendingPayLoanId = null;

function openPayFineModal(borrowingId, dueAmount, memberName) {
  pendingPayLoanId = borrowingId;
  document.getElementById('payFineBorrowingId').value = borrowingId;
  document.getElementById('payFineMemberName').textContent = memberName;
  document.getElementById('payFineAmountInput').value = dueAmount.toFixed(2);
  document.getElementById('payFineAmountInput').max = dueAmount.toFixed(2);
  document.getElementById('payFineMethodSelect').value = 'Cash';
  document.getElementById('payFineNotesInput').value = '';
  openModal('payFineModal');
}

async function submitFinePayment(e) {
  e.preventDefault();
  const borrowingId = document.getElementById('payFineBorrowingId').value;
  const amount = document.getElementById('payFineAmountInput').value;
  const paymentMethod = document.getElementById('payFineMethodSelect').value;
  const notes = document.getElementById('payFineNotesInput').value;

  try {
    const res = await API.payFine({
      borrowing_id: borrowingId,
      amount,
      payment_method: paymentMethod,
      notes,
      userName: AppState.currentUser.fullName
    });

    closeModal('payFineModal');
    showToast(`Payment collected! Receipt: ${res.receipt_no}`, 'success');
    navigate('fines');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function promptWaiveFine(borrowingId) {
  const reason = prompt('Enter authorized reason for waiving this fine (e.g., Medical exemption, Staff courtesy):');
  if (!reason) return;

  try {
    await API.waiveFine({
      borrowing_id: borrowingId,
      reason,
      userName: AppState.currentUser.fullName
    });
    showToast('Fine successfully waived', 'success');
    navigate('fines');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
