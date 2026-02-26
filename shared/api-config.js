// Shared API Configuration for Xin Utilities
// Each tool can define its own endpoint path

const API_CONFIG = {
  // Base URLs for different environments
  BASE: {
    LOCAL: 'http://localhost:8080',
    // LOCAL: 'http://192.168.1.154:8080',  // 局域网测试用
    NGROK: 'https://43b1-99-250-110-81.ngrok-free.app',
    PRODUCTION: 'https://your-api-server.com'
  },

  // Auto-detect environment
  getBaseUrl() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || window.location.protocol === 'file:') {
      return this.BASE.LOCAL;
    }
    // GitHub Pages or other hosting - use ngrok for now
    return this.BASE.NGROK;
  },

  // Get full URL for an endpoint
  getUrl(endpoint) {
    return this.getBaseUrl() + endpoint;
  }
};

// Tool-specific endpoints
const ENDPOINTS = {
  CHAT: '/chat',
  IMAGE_BG_REMOVE: '/remove-background',
  KANBAN: '/kanban',
  QR_CREATE: '/qr/create',
  QR_REDIRECT: '/r',
  QR_STATS: '/qr',
  QR_LIST: '/qr/list'
};

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, ENDPOINTS };
}
