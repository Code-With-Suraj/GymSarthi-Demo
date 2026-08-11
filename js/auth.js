/**
 * GymSarthi — Session & Auth State Manager
 * Ensures persistent session storage in localStorage ("ek login hone ke baad baar baar login na karna pade").
 */

const Auth = {
  // Save active session
  setSession(token, user) {
    Utils.storage.set('token', token);
    Utils.storage.set('user', user);
  },

  // Get active user
  getUser() {
    return Utils.storage.get('user', null);
  },

  // Get auth token
  getToken() {
    return Utils.storage.get('token', null);
  },

  // Check if logged in
  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  // Check role
  isOwner() {
    const u = this.getUser();
    return u && String(u.role).toUpperCase() === 'OWNER';
  },

  isMember() {
    const u = this.getUser();
    return u && String(u.role).toUpperCase() === 'MEMBER';
  },

  // Logout
  logout() {
    Utils.storage.remove('token');
    Utils.storage.remove('user');
    window.location.href = 'login.html';
  },

  // Enforce Access Rules for pages
  requireAuth(requiredRole = null) {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }

    const user = this.getUser();
    if (requiredRole === 'OWNER' && !this.isOwner()) {
      window.location.href = 'member-dashboard.html';
      return false;
    }

    if (requiredRole === 'MEMBER' && !this.isMember()) {
      window.location.href = 'owner-dashboard.html';
      return false;
    }

    return true;
  },

  // Auto redirect logged in user from landing/login/register
  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      if (this.isOwner()) {
        window.location.href = 'owner-dashboard.html';
      } else {
        window.location.href = 'member-dashboard.html';
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.Auth = Auth;
}
