// src/services/adminApi.js
class AdminApiService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
  }

  getHeaders() {
    const token = localStorage.getItem('admin_token');
    return {
      'X-Admin-Token': token,
      'Content-Type': 'application/json',
    };
  }

  async getStats() {
    const response = await fetch(`${this.baseURL}/admin/stats`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async getRides(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/admin/rides?${queryParams}`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async getRideDetails(rideId) {
    const response = await fetch(`${this.baseURL}/admin/rides/${rideId}`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async updateRideStatus(rideId, status) {
    const response = await fetch(`${this.baseURL}/admin/rides/${rideId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status })
    });
    return response.json();
  }

  async updatePaymentStatus(rideId, paymentStatus) {
    const response = await fetch(`${this.baseURL}/admin/rides/${rideId}/payment-status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ payment_status: paymentStatus })
    });
    return response.json();
  }

  async getUsers() {
    const response = await fetch(`${this.baseURL}/admin/users`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async getDailyReport(date) {
    const response = await fetch(`${this.baseURL}/admin/daily-report?date=${date}`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async exportData(format = 'csv') {
    const response = await fetch(`${this.baseURL}/admin/export?format=${format}`, {
      headers: this.getHeaders()
    });
    return response.json();
  }
}

export default new AdminApiService();