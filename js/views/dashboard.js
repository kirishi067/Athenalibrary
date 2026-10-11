// public/js/views/dashboard.js - Interactive Dashboard View
const DashboardView = {
  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="font-size: 16px; color: var(--slate-500);">Loading dashboard analytics...</div>
      </div>
    `;

    try {
      const data = await API.getDashboardStats();
      const stats = data.stats;
      const popular = data.popularBooks;
      const categories = data.categoryStats;
      const activities = data.recentActivities;

      if (AppState.isMember()) {
        await this.renderMemberDashboard(container, stats);
        return;
      }

      // Staff / Admin Dashboard
      container.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Library Overview Dashboard</h1>
            <p class="page-description">Real-time circulation metrics, inventory availability, and operations log.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="openIssueModal()">
              <span>➕</span> Issue Book
            </button>
            <button class="btn btn-secondary" onclick="openQuickReturnModal()">
              <span>↩️</span> Return Book
            </button>
          </div>
        </div>

        <!-- Quick Action Shortcuts -->
        <div class="quick-actions-bar">
          <div class="quick-action-card" onclick="openIssueModal()">
            <div class="quick-action-icon" style="background: #e0e7ff; color: #4338ca;">📖</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700;">Issue Book</div>
              <div style="font-size: 11.5px; color: var(--slate-500);">Loan book to member</div>
            </div>
          </div>
          <div class="quick-action-card" onclick="openQuickReturnModal()">
            <div class="quick-action-icon" style="background: #dcfce7; color: #15803d;">📥</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700;">Process Return</div>
              <div style="font-size: 11.5px; color: var(--slate-500);">Check-in &amp; fine check</div>
            </div>
          </div>
          <div class="quick-action-card" onclick="openAddBookModal()">
            <div class="quick-action-icon" style="background: #fef3c7; color: #b45309;">📚</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700;">Add New Title</div>
              <div style="font-size: 11.5px; color: var(--slate-500);">Catalog new book</div>
            </div>
          </div>
          <div class="quick-action-card" onclick="openAddMemberModal()">
            <div class="quick-action-icon" style="background: #f3e8ff; color: #7e22ce;">👤</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700;">Register Member</div>
              <div style="font-size: 11.5px; color: var(--slate-500);">Issue member card</div>
            </div>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">📚</div>
            <div class="stat-info">
              <div class="stat-value">${stats.totalBooks}</div>
              <div class="stat-label">Unique Titles (${stats.totalCopies} copies)</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #15803d;">✅</div>
            <div class="stat-info">
              <div class="stat-value">${stats.availableCopies}</div>
              <div class="stat-label">Available on Shelf</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #e0f2fe; color: #0369a1;">🔄</div>
            <div class="stat-info">
              <div class="stat-value">${stats.activeLoans}</div>
              <div class="stat-label">Active Loans Checked Out</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #fee2e2; color: #b91c1c;">⚠️</div>
            <div class="stat-info">
              <div class="stat-value">${stats.overdueLoans}</div>
              <div class="stat-label">Overdue Items</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #b45309;">💰</div>
            <div class="stat-info">
              <div class="stat-value">${formatCurrency(stats.pendingFines)}</div>
              <div class="stat-label">Unpaid Fines Pending</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #fdf2f8; color: #be185d;">🔖</div>
            <div class="stat-info">
              <div class="stat-value">${stats.activeReservations}</div>
              <div class="stat-label">Active Reservations</div>
            </div>
          </div>
        </div>

        <!-- Circulation Charts & Popular Books -->
        <div style="display: grid; grid-template-columns: 2fr 1.3fr; gap: 24px; margin-bottom: 24px;">
          <!-- Category Distribution -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">📊 Catalog Inventory by Category</div>
              <span style="font-size: 12px; color: var(--slate-500);">${categories.length} Genres</span>
            </div>
            <div class="card-body">
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${categories.map(c => {
                  const pct = stats.totalCopies ? Math.round((c.total_copies / stats.totalCopies) * 100) : 0;
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: var(--slate-800);">${escapeHTML(c.name)}</span>
                        <span style="color: var(--slate-500); font-weight: 500;">${c.total_copies} copies (${c.book_count} titles) - ${pct}%</span>
                      </div>
                      <div style="background: var(--slate-100); height: 8px; border-radius: 9999px; overflow: hidden;">
                        <div style="background: ${c.color || 'var(--primary)'}; width: ${pct}%; height: 100%; border-radius: 9999px; transition: width 0.6s ease;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Top Borrowed Books -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">🔥 Most Circulated Books</div>
              <button class="btn btn-secondary btn-sm" onclick="navigate('reports')">View All</button>
            </div>
            <div class="card-body" style="padding: 0;">
              <div class="table-responsive">
                <table class="data-table">
                  <tbody>
                    ${popular.map((b, idx) => `
                      <tr>
                        <td style="width: 30px; font-weight: 700; color: var(--slate-400);">#${idx + 1}</td>
                        <td style="display: flex; align-items: center; gap: 10px;">
                          <img src="${escapeHTML(b.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=80&q=80')}" 
                               style="width: 34px; height: 46px; object-fit: cover; border-radius: 4px;">
                          <div>
                            <div style="font-weight: 600; font-size: 13px; color: var(--slate-900);">${escapeHTML(b.title)}</div>
                            <div style="font-size: 11.5px; color: var(--slate-500);">${escapeHTML(b.author_name || 'Unknown')}</div>
                          </div>
                        </td>
                        <td style="text-align: right;">
                          <span class="badge badge-primary">${b.borrow_count} loans</span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚡ Recent System Activity Log</div>
            <span style="font-size: 12px; color: var(--slate-500);">Live audit stream</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${activities.map(a => `
                    <tr>
                      <td style="color: var(--slate-500); white-space: nowrap; font-size: 12px;">${a.timestamp}</td>
                      <td style="font-weight: 600; color: var(--slate-800);">${escapeHTML(a.user_name)}</td>
                      <td>
                        <span class="badge ${a.action.includes('Return') ? 'badge-success' : a.action.includes('Issue') ? 'badge-primary' : a.action.includes('Fine') ? 'badge-warning' : 'badge-secondary'}">
                          ${escapeHTML(a.action)}
                        </span>
                      </td>
                      <td style="color: var(--slate-600);">${escapeHTML(a.details)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load dashboard: ${err.message}</div></div>`;
    }
  },

  // Member Portal Dashboard View
  async renderMemberDashboard(container, stats) {
    const memberId = AppState.currentUser.memberId;
    const memberData = await API.getMember(memberId);

    const activeLoans = memberData.borrowings.filter(b => !b.return_date);
    const overdueLoans = activeLoans.filter(b => b.status === 'Overdue');
    const reservations = memberData.reservations.filter(r => r.status === 'Pending' || r.status === 'Ready');
    const unpaidFines = activeLoans.reduce((sum, b) => sum + (b.fine_amount - b.fine_paid), 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Welcome back, ${escapeHTML(AppState.currentUser.fullName)}! 👋</h1>
          <p class="page-description">Library Card: <strong>${escapeHTML(memberData.member_code)}</strong> &bull; Member Type: <strong>${escapeHTML(memberData.member_type)}</strong> &bull; Status: <span class="badge badge-success">${escapeHTML(memberData.status)}</span></p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="navigate('books')">
            <span>🔍</span> Browse Catalog &amp; Reserve
          </button>
        </div>
      </div>

      <!-- Member KPI Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">📖</div>
          <div class="stat-info">
            <div class="stat-value">${activeLoans.length} / ${memberData.borrow_limit}</div>
            <div class="stat-label">Books Checked Out</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: ${overdueLoans.length > 0 ? '#fee2e2' : '#dcfce7'}; color: ${overdueLoans.length > 0 ? '#b91c1c' : '#15803d'};">
            ${overdueLoans.length > 0 ? '⚠️' : '✅'}
          </div>
          <div class="stat-info">
            <div class="stat-value">${overdueLoans.length}</div>
            <div class="stat-label">Overdue Items</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #b45309;">💰</div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(unpaidFines)}</div>
            <div class="stat-label">Outstanding Fines</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #f3e8ff; color: #7e22ce;">🔖</div>
          <div class="stat-info">
            <div class="stat-value">${reservations.length}</div>
            <div class="stat-label">Active Reservations</div>
          </div>
        </div>
      </div>

      <!-- Currently Borrowed Books with 1-Click Renew -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📚 Your Active Borrowed Books (${activeLoans.length})</div>
          <button class="btn btn-secondary btn-sm" onclick="navigate('books')">Borrow More</button>
        </div>
        <div class="card-body" style="padding: 0;">
          ${activeLoans.length === 0 ? `
            <div style="padding: 32px; text-align: center; color: var(--slate-500);">
              You have no books currently checked out. <a href="javascript:navigate('books')" style="color: var(--primary); font-weight: 600;">Browse catalog</a> to find your next read!
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Fine</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeLoans.map(loan => {
                    const isOverdue = loan.status === 'Overdue';
                    return `
                      <tr>
                        <td style="display: flex; align-items: center; gap: 12px;">
                          <img src="${escapeHTML(loan.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=80&q=80')}"
                               style="width: 38px; height: 50px; object-fit: cover; border-radius: 4px;">
                          <div>
                            <div style="font-weight: 600; color: var(--slate-900);">${escapeHTML(loan.book_title)}</div>
                            <div style="font-size: 11.5px; color: var(--slate-500);">by ${escapeHTML(loan.author_name || 'Unknown')}</div>
                          </div>
                        </td>
                        <td>${formatDate(loan.issue_date)}</td>
                        <td>
                          <strong style="color: ${isOverdue ? 'var(--danger)' : 'var(--slate-800)'};">
                            ${formatDate(loan.due_date)}
                          </strong>
                        </td>
                        <td>
                          <span class="badge ${isOverdue ? 'badge-danger' : 'badge-primary'}">
                            ${isOverdue ? 'Overdue' : 'Active Loan'}
                          </span>
                          ${loan.renewal_count > 0 ? `<span class="badge badge-secondary" style="margin-left: 4px;">Renewed ${loan.renewal_count}x</span>` : ''}
                        </td>
                        <td>
                          ${loan.fine_amount > 0 ? `<span style="font-weight: 700; color: var(--danger);">${formatCurrency(loan.fine_amount - loan.fine_paid)}</span>` : '$0.00'}
                        </td>
                        <td>
                          <button class="btn btn-secondary btn-sm" onclick="requestRenewal(${loan.id})" ${loan.renewal_count >= 2 ? 'disabled title="Max renewals reached"' : ''}>
                            🔄 Renew
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- Active Reservations for Member -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔖 Your Reservations (${reservations.length})</div>
        </div>
        <div class="card-body" style="padding: 0;">
          ${reservations.length === 0 ? `
            <div style="padding: 24px; text-align: center; color: var(--slate-500);">No active reservations.</div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Reserved On</th>
                    <th>Status</th>
                    <th>Instructions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${reservations.map(res => `
                    <tr>
                      <td style="font-weight: 600;">${escapeHTML(res.book_title)}</td>
                      <td>${formatDate(res.reservation_date)}</td>
                      <td>
                        <span class="badge ${res.status === 'Ready' ? 'badge-success' : 'badge-warning'}">
                          ${res.status === 'Ready' ? '🎉 Ready for Pickup' : '⏳ In Queue'}
                        </span>
                      </td>
                      <td style="font-size: 12.5px; color: var(--slate-600);">
                        ${res.status === 'Ready' ? 'Please collect at library circulation desk within 48 hours.' : 'You will be notified once a copy is returned.'}
                      </td>
                      <td>
                        <button class="btn btn-danger btn-sm" onclick="cancelMemberReservation(${res.id})">Cancel</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }
};

// Global member renewal handler
async function requestRenewal(loanId) {
  try {
    const res = await API.renewLoan({
      borrowing_id: loanId,
      extension_days: 14,
      userName: AppState.currentUser.fullName
    });
    showToast(res.message || 'Loan renewed by 14 days!', 'success');
    navigate('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelMemberReservation(resId) {
  if (!confirm('Cancel this reservation?')) return;
  try {
    await API.cancelReservation(resId);
    showToast('Reservation cancelled', 'warning');
    navigate('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
