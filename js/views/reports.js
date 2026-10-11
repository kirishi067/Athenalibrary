// public/js/views/reports.js - Analytics, Circulation Statistics & CSV Export
const ReportsView = {
  async render(container) {
    if (AppState.isMember()) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body" style="text-align: center; padding: 48px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🔒</div>
            <h3 style="color: var(--slate-800);">Staff Access Required</h3>
            <p style="color: var(--slate-500); font-size: 13.5px; margin-top: 6px;">Library circulation reporting and administrative exports are restricted to staff.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Generating library analytics &amp; statistics...</div>
      </div>
    `;

    try {
      const summary = await API.getReportsSummary();
      const books = await API.getBooks();

      container.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Library Reports &amp; Circulation Analytics</h1>
            <p class="page-description">Institutional metrics, reading trends, most circulated titles, and data exports.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary" onclick="window.print()">
              <span>🖨️</span> Print Report
            </button>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
          <div class="stat-card">
            <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">📚</div>
            <div class="stat-info">
              <div class="stat-value">${summary.totalCirculation}</div>
              <div class="stat-label">Lifetime Loans Issued</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #15803d;">✅</div>
            <div class="stat-info">
              <div class="stat-value">${summary.returnedCount}</div>
              <div class="stat-label">Successful Returns</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #b45309;">💰</div>
            <div class="stat-info">
              <div class="stat-value">${formatCurrency(summary.totalFinesAccrued)}</div>
              <div class="stat-label">Lifetime Fines Assessed</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #ecfdf5; color: #059669;">💵</div>
            <div class="stat-info">
              <div class="stat-value">${formatCurrency(summary.totalFinesPaid)}</div>
              <div class="stat-label">Total Revenue Collected</div>
            </div>
          </div>
        </div>

        <!-- Quick Export Cards -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <div class="card-title">📥 Data Export Hub (CSV Downloads)</div>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
              <div style="border: 1px solid var(--slate-200); padding: 16px; border-radius: var(--radius-md); background: var(--slate-50);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">Complete Book Catalog</div>
                <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Export all titles, ISBNs, authors, copy counts, and shelf numbers.</p>
                <button class="btn btn-secondary btn-sm" onclick="exportBooksCSV()">Download Books CSV</button>
              </div>

              <div style="border: 1px solid var(--slate-200); padding: 16px; border-radius: var(--radius-md); background: var(--slate-50);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">Circulation Log</div>
                <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Complete record of all issue dates, return dates, and loan statuses.</p>
                <button class="btn btn-secondary btn-sm" onclick="exportCirculationCSV()">Download Circulation CSV</button>
              </div>

              <div style="border: 1px solid var(--slate-200); padding: 16px; border-radius: var(--radius-md); background: var(--slate-50);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">Overdue &amp; Fines Ledger</div>
                <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Detailed list of late returns, outstanding amounts, and settled fines.</p>
                <button class="btn btn-secondary btn-sm" onclick="exportFinesCSV()">Download Fines CSV</button>
              </div>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
          <!-- Top Borrowers -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🏆 Top Active Borrowers</div>
              <span style="font-size: 12px; color: var(--slate-500);">By total checkouts</span>
            </div>
            <div class="card-body" style="padding: 0;">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Member</th>
                      <th>Type</th>
                      <th>Total Loans</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summary.topBorrowers.length === 0 ? `
                      <tr><td colspan="4" style="text-align: center; padding: 20px;">No loan data.</td></tr>
                    ` : summary.topBorrowers.map((mb, idx) => `
                      <tr>
                        <td style="font-weight: 700; color: var(--slate-400);">#${idx + 1}</td>
                        <td>
                          <div style="font-weight: 600; color: var(--slate-900);">${escapeHTML(mb.name)}</div>
                          <div style="font-size: 11px; color: var(--primary); font-family: monospace;">${escapeHTML(mb.member_code)}</div>
                        </td>
                        <td><span class="badge badge-secondary">${escapeHTML(mb.member_type)}</span></td>
                        <td><strong style="color: var(--primary);">${mb.total_borrowed} books</strong></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Category Popularity -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">📊 Circulation by Subject Category</div>
            </div>
            <div class="card-body" style="padding: 0;">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Genre / Category</th>
                      <th>Loans Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summary.categoryCirculation.map(cc => `
                      <tr>
                        <td style="font-weight: 600;">${escapeHTML(cc.category_name)}</td>
                        <td>
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="badge badge-primary">${cc.borrow_count} loans</span>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load reports: ${err.message}</div></div>`;
    }
  }
};

// CSV Export Helpers
function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Downloaded ${filename}`, 'success');
}

async function exportBooksCSV() {
  try {
    const books = await API.getBooks();
    let csv = 'ID,ISBN,Title,Author,Category,Publisher,Year,TotalCopies,AvailableCopies,ShelfLocation\n';
    books.forEach(b => {
      csv += `"${b.id}","${b.isbn}","${(b.title || '').replace(/"/g, '""')}","${(b.author_name || '').replace(/"/g, '""')}","${(b.category_name || '').replace(/"/g, '""')}","${(b.publisher || '').replace(/"/g, '""')}","${b.publish_year || ''}","${b.total_copies}","${b.available_copies}","${(b.shelf_location || '').replace(/"/g, '""')}"\n`;
    });
    downloadCSV(`library_catalog_${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportCirculationCSV() {
  try {
    const loans = await API.getBorrowings();
    let csv = 'LoanID,BookTitle,ISBN,MemberName,MemberCode,IssueDate,DueDate,ReturnDate,Status,FineAmount,FineStatus\n';
    loans.forEach(l => {
      csv += `"${l.id}","${(l.book_title || '').replace(/"/g, '""')}","${l.isbn}","${(l.member_name || '').replace(/"/g, '""')}","${l.member_code}","${l.issue_date}","${l.due_date}","${l.return_date || 'Active'}","${l.status}","${l.fine_amount}","${l.fine_status}"\n`;
    });
    downloadCSV(`circulation_log_${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportFinesCSV() {
  try {
    const payments = await API.getFinePayments();
    let csv = 'ReceiptNo,MemberName,MemberCode,BookTitle,AmountPaid,PaymentMethod,Date,Notes\n';
    payments.forEach(p => {
      csv += `"${p.receipt_no}","${(p.member_name || '').replace(/"/g, '""')}","${p.member_code}","${(p.book_title || '').replace(/"/g, '""')}","${p.amount_paid}","${p.payment_method}","${p.payment_date}","${(p.notes || '').replace(/"/g, '""')}"\n`;
    });
    downloadCSV(`fines_ledger_${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
