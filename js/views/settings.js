// public/js/views/settings.js - System Settings & User Account Administration
const SettingsView = {
  cachedSettings: {},
  cachedUsers: [],

  async render(container) {
    if (!AppState.isAdmin()) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body" style="text-align: center; padding: 48px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🔒</div>
            <h3 style="color: var(--slate-800);">Administrator Access Required</h3>
            <p style="color: var(--slate-500); font-size: 13.5px; margin-top: 6px;">System configuration and user account security settings are reserved for the Administrator role.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Loading system preferences...</div>
      </div>
    `;

    try {
      const [settings, users] = await Promise.all([
        API.getSettings(),
        API.getUsers()
      ]);

      this.cachedSettings = settings;
      this.cachedUsers = users;
      AppState.systemSettings = settings;

      container.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">System Settings &amp; Administration</h1>
            <p class="page-description">Configure circulation policies, fine parameters, authorized user accounts, and database maintenance.</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
          <!-- Left Column: Policy Settings Form -->
          <div>
            <div class="card">
              <div class="card-header">
                <div class="card-title">⚙️ Library Circulation Policies</div>
              </div>
              <div class="card-body">
                <form id="settingsForm" onsubmit="saveSystemSettings(event)">
                  <div class="form-group">
                    <label class="form-label">Library Institution Name</label>
                    <input type="text" class="form-control" id="setLibName" value="${escapeHTML(settings.library_name || '')}" required>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Administrative Contact Email</label>
                    <input type="email" class="form-control" id="setLibEmail" value="${escapeHTML(settings.library_email || '')}" required>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Standard Loan Duration (Days)</label>
                      <input type="number" min="1" max="90" class="form-control" id="setLoanDays" value="${settings.loan_period_days || 14}" required>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Max Renewals Permitted</label>
                      <input type="number" min="0" max="10" class="form-control" id="setMaxRenew" value="${settings.max_renewals || 2}" required>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Overdue Fine Rate (Per Day)</label>
                      <input type="number" step="0.25" min="0" class="form-control" id="setFineRate" value="${settings.fine_per_day || 1.00}" required>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Currency Symbol</label>
                      <select class="form-control" id="setCurrency">
                        <option value="$" ${settings.currency_symbol === '$' ? 'selected' : ''}>$ (USD / AUD / CAD)</option>
                        <option value="₹" ${settings.currency_symbol === '₹' ? 'selected' : ''}>₹ (INR)</option>
                        <option value="£" ${settings.currency_symbol === '£' ? 'selected' : ''}>£ (GBP)</option>
                        <option value="€" ${settings.currency_symbol === '€' ? 'selected' : ''}>€ (EUR)</option>
                      </select>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                    <button type="submit" class="btn btn-primary">Save Policy Changes</button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Database Maintenance Card -->
            <div class="card" style="border: 1px solid #fee2e2;">
              <div class="card-header" style="background: #fff5f5;">
                <div class="card-title" style="color: #991b1b;">⚠️ Database Maintenance &amp; Reset</div>
              </div>
              <div class="card-body">
                <p style="font-size: 13px; color: var(--slate-600); line-height: 1.5; margin-bottom: 16px;">
                  Restore the database schema to fresh demo records (catalog books, authors, members, active &amp; overdue loans, reservations, fines).
                </p>
                <button class="btn btn-danger" onclick="triggerDatabaseReset()">
                  <span>🔄</span> Reset &amp; Re-seed Demo Database
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: User Accounts Table -->
          <div>
            <div class="card">
              <div class="card-header">
                <div class="card-title">👥 User Accounts &amp; Roles</div>
                <span class="badge badge-primary">${users.length} Registered</span>
              </div>
              <div class="card-body" style="padding: 0;">
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${users.map(u => `
                        <tr>
                          <td style="display: flex; align-items: center; gap: 10px;">
                            <img src="${escapeHTML(u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80')}"
                                 style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
                            <div>
                              <div style="font-weight: 600; color: var(--slate-900); font-size: 13px;">${escapeHTML(u.full_name)}</div>
                              <div style="font-size: 11px; color: var(--slate-500); font-family: monospace;">@${escapeHTML(u.username)}</div>
                            </div>
                          </td>
                          <td>
                            <span class="badge ${u.role === 'Admin' ? 'badge-danger' : u.role === 'Librarian' ? 'badge-primary' : 'badge-secondary'}">
                              ${escapeHTML(u.role)}
                            </span>
                          </td>
                          <td>
                            <span class="badge badge-success">Active</span>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load settings: ${err.message}</div></div>`;
    }
  }
};

async function saveSystemSettings(e) {
  e.preventDefault();
  const payload = {
    library_name: document.getElementById('setLibName').value.trim(),
    library_email: document.getElementById('setLibEmail').value.trim(),
    loan_period_days: document.getElementById('setLoanDays').value,
    max_renewals: document.getElementById('setMaxRenew').value,
    fine_per_day: document.getElementById('setFineRate').value,
    currency_symbol: document.getElementById('setCurrency').value,
    userName: AppState.currentUser.fullName
  };

  try {
    await API.saveSettings(payload);
    AppState.systemSettings = { ...AppState.systemSettings, ...payload };
    showToast('System policies saved successfully!', 'success');
    navigate('settings');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function triggerDatabaseReset() {
  const confirmed = confirm('WARNING: This will wipe all current transactions and reset the database with fresh sample data. Continue?');
  if (!confirmed) return;

  try {
    const res = await API.resetDatabase();
    showToast(res.message || 'Database reset successfully!', 'success');
    navigate('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
