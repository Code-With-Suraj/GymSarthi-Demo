/**
 * GymSarthi — Owner Portal Shared Sidebar & Top Navigation Bar
 */

const OwnerSidebar = {
  render(activeKey = 'dashboard') {
    const user = Auth.getUser() || { name: 'Gym Owner', mobile: '9876543210' };

    const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: '📊', url: 'owner-dashboard.html' },
      { key: 'members', label: 'Members & Alerts', icon: '👥', url: 'owner-members.html', badge: 'ALERTS' },
      { key: 'packages', label: 'Gym Packages', icon: '🏷️', url: 'owner-packages.html' },
      { key: 'store', label: 'Gym Store', icon: '🛒', url: 'owner-store.html', reqPro: true },
      { key: 'payments', label: 'Payment Audit', icon: '💳', url: 'owner-payments.html' },
      { key: 'expenses', label: 'Expenses Log', icon: '💰', url: 'owner-expenses.html' },
      { key: 'subscription', label: 'App Subscription', icon: '⚡', url: 'owner-subscription.html' }
    ];

    const sidebarHtml = `
      <!-- Mobile Backdrop Overlay -->
      <div id="mobile-sidebar-backdrop" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 hidden lg:hidden"></div>

      <aside id="owner-sidebar" class="fixed inset-y-0 left-0 z-40 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 flex flex-col justify-between">
        <div>
          <!-- Header Logo -->
          <div class="h-20 flex items-center justify-between px-6 border-b border-gray-800">
            <div class="flex items-center space-x-3">
              <img src="assets/logo.png" alt="GymSarthi Logo" class="w-10 h-10 rounded-xl object-cover shadow-lg shadow-emerald-500/20 border border-emerald-500/30">
              <div>
                <h1 class="text-lg font-bold text-white tracking-wide">GymSarthi</h1>
                <p class="text-xs text-emerald-400 font-medium">Owner Portal</p>
              </div>
            </div>
            <button id="close-mobile-menu" class="lg:hidden text-gray-400 hover:text-white p-2">
              ✕
            </button>
          </div>

          <!-- Navigation Links -->
          <nav class="px-4 py-4 space-y-1">
            ${navItems.map(item => {
              const isActive = item.key === activeKey;
              const activeClasses = isActive
                ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 text-emerald-400 border-l-4 border-emerald-500 font-semibold'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 font-medium';

              return `
                <a href="${item.url}" class="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-xs sm:text-sm ${activeClasses}">
                  <div class="flex items-center space-x-3">
                    <span class="text-lg">${item.icon}</span>
                    <span>${item.label}</span>
                  </div>
                  ${item.badge ? `<span class="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">${item.badge}</span>` : ''}
                </a>
              `;
            }).join('')}
          </nav>

          <!-- PWA Mobile App Install Widget -->
          <div class="px-4 pt-2">
            <button onclick="PWA.install()" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 font-bold text-xs flex items-center justify-center space-x-2 transition-all pwa-install-trigger">
              <span>📱 Install App on Phone</span>
            </button>
          </div>
        </div>

        <!-- Footer User Profile & Logout -->
        <div class="p-4 border-t border-gray-800 bg-gray-950/40">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 overflow-hidden">
              <div class="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-emerald-400 font-bold border border-gray-700">
                ${user.name ? user.name.charAt(0).toUpperCase() : 'O'}
              </div>
              <div class="truncate">
                <p class="text-xs font-semibold text-gray-200 truncate">${user.name || 'Gym Owner'}</p>
                <p class="text-[11px] text-gray-500 truncate">${user.mobile || ''}</p>
              </div>
            </div>
            <button onclick="Auth.logout()" title="Logout" class="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
              🚪
            </button>
          </div>
        </div>
      </aside>
    `;

    // Inject sidebar into element with id 'sidebar-container'
    const container = document.getElementById('sidebar-container');
    if (container) {
      container.innerHTML = sidebarHtml;

      // Mobile Menu Toggle handler
      const toggleBtn = document.getElementById('mobile-menu-toggle');
      const closeBtn = document.getElementById('close-mobile-menu');
      const backdrop = document.getElementById('mobile-sidebar-backdrop');
      const sidebar = document.getElementById('owner-sidebar');

      const openMenu = () => {
        sidebar.classList.remove('-translate-x-full');
        if (backdrop) backdrop.classList.remove('hidden');
      };

      const closeMenu = () => {
        sidebar.classList.add('-translate-x-full');
        if (backdrop) backdrop.classList.add('hidden');
      };

      if (toggleBtn && sidebar) toggleBtn.addEventListener('click', openMenu);
      if (closeBtn && sidebar) closeBtn.addEventListener('click', closeMenu);
      if (backdrop) backdrop.addEventListener('click', closeMenu);
    }
  }
};

if (typeof window !== 'undefined') {
  window.OwnerSidebar = OwnerSidebar;
}
