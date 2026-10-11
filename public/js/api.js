// public/js/api.js - Frontend API Service Layer
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },

  // Dashboard
  getDashboardStats() {
    return this.request('/dashboard/stats');
  },

  // Books
  getBooks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/books${query ? `?${query}` : ''}`);
  },

  getBook(id) {
    return this.request(`/books/${id}`);
  },

  createBook(bookData) {
    return this.request('/books', {
      method: 'POST',
      body: bookData
    });
  },

  updateBook(id, bookData) {
    return this.request(`/books/${id}`, {
      method: 'PUT',
      body: bookData
    });
  },

  deleteBook(id) {
    return this.request(`/books/${id}`, {
      method: 'DELETE'
    });
  },

  // Authors
  getAuthors() {
    return this.request('/authors');
  },

  createAuthor(authorData) {
    return this.request('/authors', {
      method: 'POST',
      body: authorData
    });
  },

  updateAuthor(id, authorData) {
    return this.request(`/authors/${id}`, {
      method: 'PUT',
      body: authorData
    });
  },

  deleteAuthor(id) {
    return this.request(`/authors/${id}`, {
      method: 'DELETE'
    });
  },

  // Categories
  getCategories() {
    return this.request('/categories');
  },

  createCategory(categoryData) {
    return this.request('/categories', {
      method: 'POST',
      body: categoryData
    });
  },

  updateCategory(id, categoryData) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: categoryData
    });
  },

  deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  },

  // Members
  getMembers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/members${query ? `?${query}` : ''}`);
  },

  getMember(id) {
    return this.request(`/members/${id}`);
  },

  createMember(memberData) {
    return this.request('/members', {
      method: 'POST',
      body: memberData
    });
  },

  updateMember(id, memberData) {
    return this.request(`/members/${id}`, {
      method: 'PUT',
      body: memberData
    });
  },

  deleteMember(id) {
    return this.request(`/members/${id}`, {
      method: 'DELETE'
    });
  },

  // Circulation
  getBorrowings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/borrowings${query ? `?${query}` : ''}`);
  },

  issueBook(issueData) {
    return this.request('/borrowings/issue', {
      method: 'POST',
      body: issueData
    });
  },

  returnBook(returnData) {
    return this.request('/borrowings/return', {
      method: 'POST',
      body: returnData
    });
  },

  renewLoan(renewData) {
    return this.request('/borrowings/renew', {
      method: 'POST',
      body: renewData
    });
  },

  // Reservations
  getReservations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reservations${query ? `?${query}` : ''}`);
  },

  createReservation(reservationData) {
    return this.request('/reservations', {
      method: 'POST',
      body: reservationData
    });
  },

  updateReservationStatus(id, statusData) {
    return this.request(`/reservations/${id}`, {
      method: 'PUT',
      body: statusData
    });
  },

  cancelReservation(id) {
    return this.request(`/reservations/${id}`, {
      method: 'DELETE'
    });
  },

  // Fines
  getOverdueLoans() {
    return this.request('/fines/overdue');
  },

  getFinePayments() {
    return this.request('/fines/payments');
  },

  payFine(paymentData) {
    return this.request('/fines/pay', {
      method: 'POST',
      body: paymentData
    });
  },

  waiveFine(waiveData) {
    return this.request('/fines/waive', {
      method: 'POST',
      body: waiveData
    });
  },

  // Notifications
  getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/notifications${query ? `?${query}` : ''}`);
  },

  markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'POST'
    });
  },

  // Reports
  getReportsSummary() {
    return this.request('/reports/summary');
  },

  // Users & Settings
  getUsers() {
    return this.request('/users');
  },

  getSettings() {
    return this.request('/settings');
  },

  saveSettings(settingsData) {
    return this.request('/settings', {
      method: 'POST',
      body: settingsData
    });
  },

  resetDatabase() {
    return this.request('/settings/reset', {
      method: 'POST'
    });
  }
};
