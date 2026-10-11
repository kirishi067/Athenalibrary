// public/js/views/members.js - Member Directory & Profile Management
const MembersView = {
  searchTerm: '',
  statusFilter: '',
  typeFilter: '',
  cachedMembers: [],

  async render(container) {
    if (AppState.isMember()) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body" style="text-align: center; padding: 48px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🔒</div>
            <h3 style="color: var(--slate-800);">Staff Access Required</h3>
            <p style="color: var(--slate-500); font-size: 13.5px; margin-top: 6px;">The full member directory is restricted to library administrators and staff. Switch role above to Admin or Librarian to manage members.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Loading member directory...</div>
      </div>
    `;

    try {
      this.cachedMembers = await API.getMembers();
      this.renderDirectory(container);
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load members: ${err.message}</div></div>`;
    }
  },

  renderDirectory(container) {
    let filtered = this.cachedMembers.filter(m => {
      const matchSearch = !this.searchTerm ||
        m.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.member_code.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (m.phone && m.phone.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchStatus = !this.statusFilter || m.status === this.statusFilter;
      const matchType = !this.typeFilter || m.member_type === this.typeFilter;

      return matchSearch && matchStatus && matchType;
    });

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Member Directory &amp; Cards</h1>
          <p class="page-description">Manage student, faculty, and community member accounts, circulation limits, and borrowing privileges.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openAddMemberModal()">
            <span>➕</span> Register New Member
          </button>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-body" style="padding: 16px 20px;">
          <div class="filter-toolbar" style="margin-bottom: 0;">
            <div class="filter-group">
              <div class="search-input-box">
                <span class="icon">🔍</span>
                <input type="text" placeholder="Search by Name, Member ID, Email, Phone..." value="${escapeHTML(this.searchTerm)}" oninput="MembersView.handleSearch(this.value)">
              </div>

              <select class="form-select" onchange="MembersView.handleStatusFilter(this.value)">
                <option value="">All Statuses</option>
                <option value="Active" ${this.statusFilter === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Suspended" ${this.statusFilter === 'Suspended' ? 'selected' : ''}>Suspended</option>
                <option value="Expired" ${this.statusFilter === 'Expired' ? 'selected' : ''}>Expired</option>
              </select>

              <select class="form-select" onchange="MembersView.handleTypeFilter(this.value)">
                <option value="">All Membership Types</option>
                <option value="Student" ${this.typeFilter === 'Student' ? 'selected' : ''}>Student</option>
                <option value="Faculty" ${this.typeFilter === 'Faculty' ? 'selected' : ''}>Faculty</option>
                <option value="General" ${this.typeFilter === 'General' ? 'selected' : ''}>General</option>
              </select>
            </div>

            <div class="filter-group">
              <span style="font-size: 13px; color: var(--slate-500);">${filtered.length} of ${this.cachedMembers.length} members</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Members Table -->
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Full Name</th>
                  <th>Contact Info</th>
                  <th>Type</th>
                  <th>Active Loans</th>
                  <th>Unpaid Fines</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 36px; color: var(--slate-500);">
                      No members found matching your search.
                    </td>
                  </tr>
                ` : filtered.map(m => {
                  const hasFines = m.outstanding_fines > 0;
                  return `
                    <tr>
                      <td>
                        <span style="font-family: monospace; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 3px 8px; border-radius: 4px;">
                          ${escapeHTML(m.member_code)}
                        </span>
                      </td>
                      <td style="font-weight: 600; color: var(--slate-900);">
                        ${escapeHTML(m.name)}
                      </td>
                      <td>
                        <div style="font-size: 13px; color: var(--slate-800);">${escapeHTML(m.email)}</div>
                        <div style="font-size: 11.5px; color: var(--slate-500);">${escapeHTML(m.phone || '-')}</div>
                      </td>
                      <td>
                        <span class="badge badge-secondary">${escapeHTML(m.member_type)}</span>
                      </td>
                      <td>
                        <span style="font-weight: 600;">${m.current_loans} / ${m.borrow_limit}</span> books
                      </td>
                      <td>
                        ${hasFines ? `<strong style="color: var(--danger);">${formatCurrency(m.outstanding_fines)}</strong>` : '<span style="color: var(--slate-400);">$0.00</span>'}
                      </td>
                      <td>
                        <span class="badge ${m.status === 'Active' ? 'badge-success' : 'badge-danger'}">
                          ${escapeHTML(m.status)}
                        </span>
                      </td>
                      <td>
                        <div style="display: flex; gap: 6px;">
                          <button class="btn btn-secondary btn-sm" onclick="openMemberProfileModal(${m.id})">Profile</button>
                          <button class="btn btn-primary btn-sm" onclick="openIssueModal(null, ${m.id})" ${m.status !== 'Active' || m.current_loans >= m.borrow_limit ? 'disabled title="Cannot issue"' : ''}>Issue</button>
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
    this.renderDirectory(document.getElementById('mainAppContainer'));
  },

  handleStatusFilter(val) {
    this.statusFilter = val;
    this.renderDirectory(document.getElementById('mainAppContainer'));
  },

  handleTypeFilter(val) {
    this.typeFilter = val;
    this.renderDirectory(document.getElementById('mainAppContainer'));
  }
};

// Global member profile and edit handlers
async function openMemberProfileModal(memberId) {
  try {
    const member = await API.getMember(memberId);
    const body = document.getElementById('memberProfileBody');
    if (!body) return;

    const activeLoans = member.borrowings.filter(b => !b.return_date);
    const pastLoans = member.borrowings.filter(b => b.return_date);
    const totalUnpaidFines = activeLoans.reduce((sum, b) => sum + (b.fine_amount - b.fine_paid), 0);

    body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--slate-200); padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <h2 style="font-size: 20px; font-weight: 700; color: var(--slate-900);">${escapeHTML(member.name)}</h2>
            <span class="badge ${member.status === 'Active' ? 'badge-success' : 'badge-danger'}">${escapeHTML(member.status)}</span>
            <span class="badge badge-secondary">${escapeHTML(member.member_type)}</span>
          </div>
          <div style="font-size: 13px; color: var(--slate-500); margin-top: 4px;">
            Member ID: <strong>${escapeHTML(member.member_code)}</strong> &bull; Joined: ${formatDate(member.joined_date)} &bull; Expiry: ${formatDate(member.expiry_date)}
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="openEditMemberModal(${member.id})">Edit Profile</button>
          <button class="btn btn-primary btn-sm" onclick="openIssueModal(null, ${member.id})" ${member.status !== 'Active' ? 'disabled' : ''}>Issue Book</button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: var(--slate-50); padding: 12px; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: var(--primary);">${activeLoans.length} / ${member.borrow_limit}</div>
          <div style="font-size: 11.5px; color: var(--slate-500);">Current Borrowed</div>
        </div>
        <div style="background: var(--slate-50); padding: 12px; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: var(--slate-700);">${pastLoans.length}</div>
          <div style="font-size: 11.5px; color: var(--slate-500);">Returned Titles</div>
        </div>
        <div style="background: var(--slate-50); padding: 12px; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: ${totalUnpaidFines > 0 ? 'var(--danger)' : 'var(--success)'};">${formatCurrency(totalUnpaidFines)}</div>
          <div style="font-size: 11.5px; color: var(--slate-500);">Unpaid Fines</div>
        </div>
        <div style="background: var(--slate-50); padding: 12px; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #7e22ce;">${member.reservations.length}</div>
          <div style="font-size: 11.5px; color: var(--slate-500);">Reservations</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="nav-tabs" id="memberProfileTabs">
        <button class="tab-btn active" onclick="switchMemberTab('loans')">Active Loans (${activeLoans.length})</button>
        <button class="tab-btn" onclick="switchMemberTab('history')">Loan History (${pastLoans.length})</button>
        <button class="tab-btn" onclick="switchMemberTab('fines')">Fines &amp; Receipts (${member.fineHistory.length})</button>
        <button class="tab-btn" onclick="switchMemberTab('reservations')">Reservations (${member.reservations.length})</button>
      </div>

      <!-- Tab Contents -->
      <div id="memberTabLoans">
        ${activeLoans.length === 0 ? `
          <div style="padding: 20px; text-align: center; color: var(--slate-500);">No active loans.</div>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${activeLoans.map(loan => `
                  <tr>
                    <td style="font-weight: 600;">${escapeHTML(loan.book_title)}</td>
                    <td>${formatDate(loan.issue_date)}</td>
                    <td><strong style="color: ${loan.status === 'Overdue' ? 'var(--danger)' : 'inherit'};">${formatDate(loan.due_date)}</strong></td>
                    <td><span class="badge ${loan.status === 'Overdue' ? 'badge-danger' : 'badge-primary'}">${loan.status}</span></td>
                    <td>${loan.fine_amount > 0 ? `<strong style="color: var(--danger);">${formatCurrency(loan.fine_amount - loan.fine_paid)}</strong>` : '$0.00'}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="processReturnFromModal(${loan.id})">Return</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div id="memberTabHistory" style="display: none;">
        ${pastLoans.length === 0 ? `
          <div style="padding: 20px; text-align: center; color: var(--slate-500);">No previous circulation records.</div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Issued</th>
                  <th>Returned</th>
                  <th>Fine Incurred</th>
                </tr>
              </thead>
              <tbody>
                ${pastLoans.map(p => `
                  <tr>
                    <td style="font-weight: 600;">${escapeHTML(p.book_title)}</td>
                    <td>${formatDate(p.issue_date)}</td>
                    <td>${formatDate(p.return_date)}</td>
                    <td>${p.fine_amount > 0 ? formatCurrency(p.fine_amount) : '$0.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div id="memberTabFines" style="display: none;">
        ${member.fineHistory.length === 0 ? `
          <div style="padding: 20px; text-align: center; color: var(--slate-500);">No fine payment history.</div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Book Title</th>
                  <th>Amount Paid</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${member.fineHistory.map(f => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHTML(f.receipt_no)}</td>
                    <td>${escapeHTML(f.book_title)}</td>
                    <td><strong>${formatCurrency(f.amount_paid)}</strong></td>
                    <td><span class="badge badge-secondary">${escapeHTML(f.payment_method)}</span></td>
                    <td>${formatDate(f.payment_date)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div id="memberTabReservations" style="display: none;">
        ${member.reservations.length === 0 ? `
          <div style="padding: 20px; text-align: center; color: var(--slate-500);">No reservations.</div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Reserved On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${member.reservations.map(r => `
                  <tr>
                    <td style="font-weight: 600;">${escapeHTML(r.book_title)}</td>
                    <td>${formatDate(r.reservation_date)}</td>
                    <td><span class="badge ${r.status === 'Ready' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    openModal('memberProfileModal');
  } catch (err) {
    showToast('Failed to load member profile: ' + err.message, 'error');
  }
}

function switchMemberTab(tabName) {
  const tabs = ['loans', 'history', 'fines', 'reservations'];
  tabs.forEach(t => {
    const el = document.getElementById(`memberTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) el.style.display = t === tabName ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('#memberProfileTabs .tab-btn');
  buttons.forEach((btn, i) => {
    if (tabs[i] === tabName) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function openAddMemberModal() {
  const form = document.getElementById('memberForm');
  if (form) form.reset();
  document.getElementById('memberFormId').value = '';
  document.getElementById('memberModalTitle').textContent = 'Register New Member';
  openModal('memberEditModal');
}

async function openEditMemberModal(memberId) {
  try {
    const member = await API.getMember(memberId);
    document.getElementById('memberFormId').value = member.id;
    document.getElementById('memberModalTitle').textContent = 'Edit Member: ' + member.name;

    document.getElementById('memberNameInput').value = member.name || '';
    document.getElementById('memberEmailInput').value = member.email || '';
    document.getElementById('memberPhoneInput').value = member.phone || '';
    document.getElementById('memberAddressInput').value = member.address || '';
    document.getElementById('memberTypeSelect').value = member.member_type || 'Student';
    document.getElementById('memberLimitInput').value = member.borrow_limit || 3;
    document.getElementById('memberStatusSelect').value = member.status || 'Active';
    document.getElementById('memberExpiryInput').value = member.expiry_date || '';

    closeModal('memberProfileModal');
    openModal('memberEditModal');
  } catch (err) {
    showToast('Error loading member: ' + err.message, 'error');
  }
}

async function saveMemberForm(e) {
  e.preventDefault();
  const memberId = document.getElementById('memberFormId').value;
  const payload = {
    name: document.getElementById('memberNameInput').value.trim(),
    email: document.getElementById('memberEmailInput').value.trim(),
    phone: document.getElementById('memberPhoneInput').value.trim(),
    address: document.getElementById('memberAddressInput').value.trim(),
    member_type: document.getElementById('memberTypeSelect').value,
    borrow_limit: parseInt(document.getElementById('memberLimitInput').value, 10) || 3,
    status: document.getElementById('memberStatusSelect').value,
    expiry_date: document.getElementById('memberExpiryInput').value || null,
    userName: AppState.currentUser.fullName
  };

  try {
    if (memberId) {
      await API.updateMember(memberId, payload);
      showToast('Member profile updated successfully!', 'success');
    } else {
      const res = await API.createMember(payload);
      showToast(`Member registered! Assigned Card ID: ${res.member_code}`, 'success');
    }
    closeModal('memberEditModal');
    navigate('members');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function processReturnFromModal(borrowingId) {
  closeModal('memberProfileModal');
  openReturnConfirmModal(borrowingId);
}
