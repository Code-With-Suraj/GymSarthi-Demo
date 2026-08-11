/**
 * GymSarthi — SPA Router & Dynamic Content Swapper Engine
 * Prevents full page reloads, preserves application state, handles popstate back/forward navigation.
 */

const OwnerRouter = {
  _viewCache: {},
  _activeView: null,
  _isNavigating: false,

  init() {
    // Intercept popstate (browser back/forward buttons)
    window.addEventListener('popstate', (e) => {
      const targetUrl = window.location.pathname.split('/').pop() || 'owner-dashboard.html';
      this.navigateTo(targetUrl, false);
    });

    // Detect active view from current URL
    const currentFile = window.location.pathname.split('/').pop() || 'owner-dashboard.html';
    this._activeView = this.getViewKey(currentFile);

    // Attach click interceptor to document for sidebar links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-spa-link], a.spa-nav-link');
      if (link) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('javascript:')) {
          e.preventDefault();
          this.navigateTo(href);
        }
      }
    });
  },

  getViewKey(url) {
    if (!url) return 'dashboard';
    const clean = url.split('?')[0].split('#')[0].replace('.html', '').replace('owner-', '');
    return clean || 'dashboard';
  },

  async navigateTo(targetUrl, pushState = true) {
    if (this._isNavigating) return;

    const targetFile = targetUrl.split('/').pop() || 'owner-dashboard.html';
    const viewKey = this.getViewKey(targetFile);

    // If already on the same view and pushState requested, don't re-navigate
    if (this._activeView === viewKey && pushState && window.location.pathname.endsWith(targetFile)) {
      return;
    }

    this._isNavigating = true;

    try {
      // Update sidebar active link state immediately (0ms visual feedback)
      if (typeof OwnerSidebar !== 'undefined') {
        OwnerSidebar.setActive(viewKey);
      }

      // Fetch target HTML
      let htmlContent = this._viewCache[targetFile];
      if (!htmlContent) {
        const response = await fetch(targetFile);
        if (!response.ok) {
          throw new Error(`Failed to load view: ${response.status}`);
        }
        htmlContent = await response.text();
        this._viewCache[targetFile] = htmlContent;
      }

      // Parse document
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Swap page title
      if (doc.title) {
        document.title = doc.title;
      }

      // Extract target main container
      const newMain = doc.querySelector('main');
      const currentMain = document.querySelector('main');

      // Extract target modals or extra top-level body containers
      const newModals = doc.querySelectorAll('.fixed.inset-0, [id$="-modal"]');

      if (newMain && currentMain) {
        // Smooth transition effect
        currentMain.style.opacity = '0.4';
        currentMain.style.transition = 'opacity 0.15s ease-out';

        setTimeout(() => {
          currentMain.innerHTML = newMain.innerHTML;
          currentMain.className = newMain.className;
          currentMain.style.opacity = '1';

          // Clean up old modals and append new modals
          document.querySelectorAll('.spa-dynamic-modal').forEach(el => el.remove());
          newModals.forEach(modal => {
            const modalClone = modal.cloneNode(true);
            modalClone.classList.add('spa-dynamic-modal');
            document.body.appendChild(modalClone);
          });

          // Update header title if present
          const newHeaderTitle = doc.querySelector('header h1');
          const newHeaderSub = doc.querySelector('header p');
          const currentHeaderTitle = document.querySelector('header h1');
          const currentHeaderSub = document.querySelector('header p');
          const currentHeaderActions = document.querySelector('header button:not(#mobile-menu-toggle), header a');
          const newHeaderActions = doc.querySelector('header button:not(#mobile-menu-toggle), header a');

          if (newHeaderTitle && currentHeaderTitle) currentHeaderTitle.textContent = newHeaderTitle.textContent;
          if (newHeaderSub && currentHeaderSub) currentHeaderSub.textContent = newHeaderSub.textContent;

          // Replace header right-side action buttons if needed
          const headerContainer = document.querySelector('header');
          if (headerContainer && newHeaderActions) {
            const oldActions = headerContainer.querySelectorAll('button:not(#mobile-menu-toggle), a:not(#mobile-menu-toggle)');
            oldActions.forEach(btn => btn.remove());
            headerContainer.appendChild(newHeaderActions.cloneNode(true));
          }

          // Execute embedded view scripts
          this.executeViewScripts(doc);

          // Update History URL
          if (pushState) {
            window.history.pushState({ targetFile, viewKey }, doc.title, targetFile);
          }

          this._activeView = viewKey;
          this._isNavigating = false;

          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 150);
      } else {
        // Fallback hard navigate if structural mismatch
        window.location.href = targetFile;
      }

    } catch (err) {
      console.error('SPA Navigation error:', err);
      this._isNavigating = false;
      window.location.href = targetFile; // Fallback
    }
  },

  executeViewScripts(doc) {
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => {
      // Ignore global library scripts that are already loaded in window
      const src = script.getAttribute('src');
      if (src) {
        if (src.includes('config.js') || src.includes('utils.js') || src.includes('api.js') || 
            src.includes('auth.js') || src.includes('pwa.js') || src.includes('owner-sidebar.js') || src.includes('owner-router.js')) {
          return; // Skip re-executing core framework scripts
        }
        // Load dynamically if external plugin script (e.g. razorpay.js, qrcode.js)
        if (!document.querySelector(`script[src="${src}"]`)) {
          const newScript = document.createElement('script');
          newScript.src = src;
          document.body.appendChild(newScript);
        }
      } else {
        // Inline page script execution
        const inlineCode = script.textContent;
        if (inlineCode && !inlineCode.includes('Auth.requireAuth')) {
          try {
            const fn = new Function(inlineCode);
            fn();
          } catch (e) {
            console.warn('Inline script execution warning:', e);
          }
        }
      }
    });
  }
};

// Initialize router when DOM is ready
if (typeof window !== 'undefined') {
  window.OwnerRouter = OwnerRouter;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => OwnerRouter.init());
  } else {
    OwnerRouter.init();
  }
}
