/**
 * GymSarthi — Progressive Web App (PWA) & Mobile Installation Controller
 */

const PWA = {
  deferredPrompt: null,

  init() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[PWA] ServiceWorker registered with scope:', reg.scope))
          .catch(err => console.warn('[PWA] ServiceWorker registration failed:', err));
      });
    }

    // 2. Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('[PWA] beforeinstallprompt event captured');
      this.showInstallButtons();
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] GymSarthi App installed successfully!');
      this.deferredPrompt = null;
      this.hideInstallButtons();
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('GymSarthi Mobile App Installed! 🎉', 'success');
      }
    });

    // 3. Inject PWA install button in mobile navigation and headers if needed
    this.injectInstallUI();

    // 4. iOS Safari Check
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isIOS && !isStandalone) {
      this.showIOSBanner();
    }
  },

  showInstallButtons() {
    document.querySelectorAll('.pwa-install-btn').forEach(btn => {
      btn.classList.remove('hidden');
      btn.style.display = 'inline-flex';
    });
  },

  hideInstallButtons() {
    document.querySelectorAll('.pwa-install-btn').forEach(btn => {
      btn.classList.add('hidden');
      btn.style.display = 'none';
    });
  },

  async install() {
    if (!this.deferredPrompt) {
      alert('📲 Install GymSarthi on Mobile:\n\n1. Open your browser menu (3 dots or Share icon)\n2. Tap "Add to Home Screen" or "Install App"\n3. Enjoy GymSarthi as a full-screen Mobile App!');
      return;
    }
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('[PWA] User install choice outcome:', outcome);
      this.deferredPrompt = null;
      if (outcome === 'accepted') {
        this.hideInstallButtons();
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
  },

  injectInstallUI() {
    // Automatically attach click listener to any button with onclick="PWA.install()" or class "pwa-install-btn"
    document.addEventListener('click', (e) => {
      if (e.target.closest('.pwa-install-trigger')) {
        this.install();
      }
    });
  },

  showIOSBanner() {
    const iosBox = document.getElementById('pwa-ios-prompt');
    if (iosBox) {
      iosBox.classList.remove('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => PWA.init());
