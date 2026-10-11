// public/js/views/reservations.js - Book Reservations & Holds Management
const ReservationsView = {
  statusFilter: '',
  cachedReservations: [],

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Loading book reservations...</div>
      </div>
    `;

    try {
      const isMember = AppState.isMember();
      const params = {};
      if (isMember) {
        params.member_id = AppState.currentUser.memberId;
      }
      this.cachedReservations = await API.getReservations(params);
      this.renderReservationsList(container);
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load reservations: ${err.message}</div></div>`;
    }
  },

  renderReservationsList(container) {
    const isStaff = AppState.isStaff();
    const isMember = AppState.isMember();

    let filtered = this.cachedReservations.filter(r => {
      if (!this.statusFilter) return true;
      return r.status === this.statusFilter;
    });

    const pendingCount = this.cachedReservations.filter(r => r.status === 'Pending').length;
    const readyCount = this.cachedReservations.filter(r => r.status === 'Ready').length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${isMember ? 'My Book Reservations' : 'Book Reservations &amp; Holds'}</h1>
          <p class="page-description">Manage waiting queues, holds for checked-out books, and pickup readiness notifications.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openNewReservationModal()">
            <span>➕</span> Place Reservation
          </button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">🔖</div>
          <div class="stat-info">
            <div class="stat-value">${this.cachedReservations.length}</div>
            <div class="stat-label">Total Reservations</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #b45309;">⏳</div>
          <div class="stat-info">
            <div class="stat-value">${pendingCount}</div>
            <div class="stat-label">In Waiting Queue (Pending)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #dcfce7; color: #15803d;">🎉</div>
          <div class="stat-info">
            <div class="stat-value">${readyCount}</div>
            <div class="stat-label">Ready for Desk Pickup</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-body" style="padding: 16px 20px;">
          <div class="filter-toolbar" style="margin-bottom: 0;">
            <div class="filter-group">
              <select class="form-select" onchange="ReservationsView.handleFilter(this.value)">
                <option value="">All Statuses</option>
                <option value="Pending" ${this.statusFilter === 'Pending' ? 'selected' : ''}>Pending (Waiting for returned copy)</option>
                <option value="Ready" ${this.statusFilter === 'Ready' ? 'selected' : ''}>Ready for Pickup (On hold shelf)</option>
                <option value="Fulfilled" ${this.statusFilter === 'Fulfilled' ? 'selected' : ''}>Fulfilled</option>
                <option value="Cancelled" ${this.statusFilter === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Member</th>
                  <th>Date Reserved</th>
                  <th>Shelf Copies Available</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: var(--slate-500);">
                      No reservations found.
                    </td>
                  </tr>
                ` : filtered.map(r => `
                  <tr>
                    <td>
                      <div style="font-weight: 600; color: var(--slate-900); font-size: 13.5px;">${escapeHTML(r.book_title)}</div>
                      <div style="font-size: 11.5px; color: var(--slate-500);">ISBN: ${escapeHTML(r.isbn)}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--slate-900);">${escapeHTML(r.member_name)}</div>
                      <div style="font-size: 11.5px; color: var(--primary); font-family: monospace;">${escapeHTML(r.member_code)}</div>
                    </td>
                    <td>${formatDate(r.reservation_date)}</td>
                    <td>
                      <span class="badge ${r.available_copies > 0 ? 'badge-success' : 'badge-danger'}">
                        ${r.available_copies} available
                      </span>
                    </td>
                    <td>
                      <span class="badge ${r.status === 'Ready' ? 'badge-success' : r.status === 'Pending' ? 'badge-warning' : r.status === 'Fulfilled' ? 'badge-primary' : 'badge-secondary'}">
                        ${r.status === 'Ready' ? '🎉 Ready for Pickup' : r.status}
                      </span>
                    </td>
                    <td style="font-size: 12.5px; color: var(--slate-600); max-width: 180px;">${escapeHTML(r.notes || '-')}</td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        ${isStaff && r.status === 'Pending' ? `
                          <button class="btn btn-secondary btn-sm" onclick="markReservationStatus(${r.id}, 'Ready')">Mark Ready</button>
                        ` : ''}
                        ${isStaff && (r.status === 'Pending' || r.status === 'Ready') ? `
                          <button class="btn btn-primary btn-sm" onclick="openIssueModal(${r.book_id}, ${r.member_id})">Issue</button>
                        ` : ''}
                        ${(r.status === 'Pending' || r.status === 'Ready') ? `
                          <button class="btn btn-danger btn-sm" onclick="cancelReservation(${r.id})">Cancel</button>
                        ` : `
                          <span style="font-size: 12px; color: var(--slate-400);">-</span>
                        `}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  handleFilter(val) {
    this.statusFilter = val;
    this.renderReservationsList(document.getElementById('mainAppContainer'));
  }
};

async function openNewReservationModal() {
  try {
    const [books, members] = await Promise.all([
      API.getBooks(),
      API.getMembers({ status: 'Active' })
    ]);

    const bookSelect = document.getElementById('resBookSelect');
    const memberSelect = document.getElementById('resMemberSelect');
    const memberGroup = document.getElementById('resMemberGroup');

    if (bookSelect) {
      bookSelect.innerHTML = '<option value="">-- Choose Book to Reserve --</option>' +
        books.map(b => `<option value="${b.id}">${escapeHTML(b.title)} (${b.available_copies} available) - ISBN: ${escapeHTML(b.isbn)}</option>`).join('');
    }

    if (AppState.isMember()) {
      if (memberGroup) memberGroup.style.display = 'none';
      if (memberSelect) memberSelect.value = AppState.currentUser.memberId;
    } else {
      if (memberGroup) memberGroup.style.display = 'block';
      if (memberSelect) {
        memberSelect.innerHTML = '<option value="">-- Select Member --</option>' +
          members.map(m => `<option value="${m.id}">${escapeHTML(m.name)} (${escapeHTML(m.member_code)})</option>`).join('');
      }
    }

    document.getElementById('resNotesInput').value = '';
    openModal('newReservationModal');
  } catch (err) {
    showToast('Failed to open reservation form: ' + err.message, 'error');
  }
}

async function submitReservationForm(e) {
  e.preventDefault();
  const bookId = document.getElementById('resBookSelect').value;
  let memberId = document.getElementById('resMemberSelect').value;
  const notes = document.getElementById('resNotesInput').value;

  if (AppState.isMember()) {
    memberId = AppState.currentUser.memberId;
  }

  if (!bookId || !memberId) {
    showToast('Please select both a book and a member', 'warning');
    return;
  }

  try {
    const res = await API.createReservation({
      book_id: bookId,
      member_id: memberId,
      notes,
      userName: AppState.currentUser.fullName
    });
    showToast(res.message || 'Reservation placed successfully!', 'success');
    closeModal('newReservationModal');
    navigate('reservations');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markReservationStatus(resId, status) {
  try {
    await API.updateReservationStatus(resId, { status });
    showToast(`Reservation marked as ${status}!`, 'success');
    navigate('reservations');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelReservation(resId) {
  if (!confirm('Cancel this reservation?')) return;
  try {
    await API.cancelReservation(resId);
    showToast('Reservation cancelled', 'warning');
    navigate('reservations');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
