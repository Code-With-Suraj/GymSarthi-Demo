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

          // Clean up old modals from previous view (excluding sidebar backdrop)
          document.querySelectorAll('body > .fixed.inset-0:not(#mobile-sidebar-backdrop), body > [id$="-modal"], body > [id*="modal"], .spa-dynamic-modal').forEach(el => {
            if (el.id !== 'mobile-sidebar-backdrop' && !el.closest('main') && !el.closest('aside') && !el.closest('header')) {
              el.remove();
            }
          });

          // Append new view modals
          newModals.forEach(modal => {
            const modalClone = modal.cloneNode(true);
            modalClone.classList.add('spa-dynamic-modal');
            document.body.appendChild(modalClone);
          });

          // Update header content (Title, Subtitle, and Right-side Action Buttons / Widgets)
          const currentHeader = document.querySelector('header');
          const newHeader = doc.querySelector('header');

          if (currentHeader && newHeader) {
            const currentTitleBlock = currentHeader.children[0];
            const newTitleBlock = newHeader.children[0];

            if (currentTitleBlock && newTitleBlock) {
              const currentH1 = currentTitleBlock.querySelector('h1');
              const currentP = currentTitleBlock.querySelector('p');
              const newH1 = newTitleBlock.querySelector('h1');
              const newP = newTitleBlock.querySelector('p');

              if (currentH1 && newH1) currentH1.textContent = newH1.textContent;
              if (currentP && newP) currentP.textContent = newP.textContent;
            }

            // Remove all existing right-side header elements (everything after title block)
            while (currentHeader.children.length > 1) {
              currentHeader.removeChild(currentHeader.lastChild);
            }

            // Append all new right-side header elements from target document
            for (let i = 1; i < newHeader.children.length; i++) {
              currentHeader.appendChild(newHeader.children[i].cloneNode(true));
            }
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
        if (inlineCode && inlineCode.trim()) {
          try {
            // Find all top-level functions defined in the inline code
            const funcNames = [];
            const fnRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g;
            let match;
            while ((match = fnRegex.exec(inlineCode)) !== null) {
              funcNames.push(match[1]);
            }

            // Expose function declarations to global window inside IIFE to avoid let/const re-declaration syntax errors
            const assignments = funcNames.map(name => `try { if (typeof ${name} !== 'undefined') window.${name} = ${name}; } catch(e){}`).join('\n');
            const wrappedCode = `
              (function() {
                ${inlineCode}
                ${assignments}
              })();
            `;
            (0, eval)(wrappedCode);
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
