/**
 * GymSarthi — Frontend Utility Helpers
 */

const Utils = {
  // LocalStorage Wrapper
  storage: {
    get(key, defaultValue = null) {
      try {
        const val = localStorage.getItem('gymsarthi_' + key);
        return val ? JSON.parse(val) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('gymsarthi_' + key, JSON.stringify(value));
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem('gymsarthi_' + key);
      } catch (e) {}
    },
    clear() {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('gymsarthi_'));
        keys.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  },

  // Safe DOM access helpers to prevent unhandled TypeError when setting text/html on null elements
  setElementText(idOrEl, text) {
    try {
      const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
      if (el) el.textContent = text !== undefined && text !== null ? text : '';
    } catch (e) {}
  },

  setElementHtml(idOrEl, html) {
    try {
      const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
      if (el) el.innerHTML = html !== undefined && html !== null ? html : '';
    } catch (e) {}
  },

  // Toast Notification System
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto toast-enter flex items-center p-4 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-medium transition-all duration-300';

    let icon = 'ℹ️';
    let bgBorder = 'bg-gray-900/90 border-gray-700 text-gray-100';

    if (type === 'success') {
      icon = '✅';
      bgBorder = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 emerald-glow';
    } else if (type === 'error') {
      icon = '⚠️';
      bgBorder = 'bg-rose-950/90 border-rose-500/50 text-rose-100';
    } else if (type === 'warning') {
      icon = '🔔';
      bgBorder = 'bg-amber-950/90 border-amber-500/50 text-amber-100';
    }

    toast.className += ` ${bgBorder}`;
    toast.innerHTML = `<span class="mr-3 text-lg">${icon}</span><div class="flex-1">${message}</div>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Formatting Helpers
  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN');
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    const str = String(timeStr).trim();
    if (!str || str === '--' || str.toLowerCase() === 'active' || str.toLowerCase() === 'inside') {
      return str;
    }

    // Already 12h format (e.g. "11:51 AM", "5:30 PM")
    if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(str)) {
      return str;
    }

    let hh = null;
    let mm = null;

    // ISO timestamp like "1899-12-30T11:51:50.000Z" or "2026-08-12T11:51:50.000Z"
    if (str.includes('T')) {
      const timePart = str.split('T')[1];
      if (timePart) {
        const parts = timePart.split(':');
        if (parts.length >= 2) {
          hh = parseInt(parts[0], 10);
          mm = parseInt(parts[1], 10);
        }
      }
    }

    // 24h format like "11:51", "17:30:00"
    if (hh === null && str.includes(':')) {
      const parts = str.split(':');
      if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10))) {
        hh = parseInt(parts[0], 10);
        mm = parseInt(parts[1], 10);
      }
    }

    // Fallback JavaScript Date parsing
    if (hh === null || isNaN(hh) || isNaN(mm)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        hh = d.getHours();
        mm = d.getMinutes();
      }
    }

    if (hh === null || isNaN(hh) || isNaN(mm)) {
      return str;
    }

    const ampm = hh >= 12 ? 'PM' : 'AM';
    let h12 = hh % 12;
    if (h12 === 0) h12 = 12;
    const mmStr = String(mm).padStart(2, '0');
    return `${h12}:${mmStr} ${ampm}`;
  },

  // Clean mobile string
  cleanMobile(mob) {
    let clean = String(mob || '').replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      clean = clean.slice(2);
    }
    return clean;
  },

  // 🖨️ High-Resolution A4 Gym Gate QR Poster Print
  printGateQRPoster(gymName = 'PowerHouse Fitness Gym', gymId = 'GYM_FITNESS_001', address = '', phone = '') {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(gymId)}`;

    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) {
      alert('Pop-up blocker is preventing the print window from opening. Please allow pop-ups for this site.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gate QR Poster — ${gymName}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
          body {
            margin: 0;
            padding: 40px;
            background: #ffffff;
            color: #0f172a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            min-h: 100vh;
          }
          .poster-card {
            width: 100%;
            max-width: 650px;
            border: 6px solid #10b981;
            border-radius: 32px;
            padding: 40px 30px;
            text-align: center;
            background: #ffffff;
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            position: relative;
          }
          .brand-header {
            margin-bottom: 24px;
          }
          .gym-title {
            font-size: 36px;
            font-weight: 900;
            color: #090d16;
            margin: 0 0 6px 0;
            text-transform: uppercase;
            letter-spacing: -0.5px;
          }
          .gym-sub {
            font-size: 14px;
            color: #64748b;
            margin: 0;
            font-weight: 600;
          }
          .badge-banner {
            display: inline-block;
            background: #ecfdf5;
            color: #059669;
            border: 2px solid #a7f3d0;
            padding: 8px 24px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 800;
            margin-bottom: 24px;
            letter-spacing: 0.5px;
          }
          .qr-box {
            background: #ffffff;
            border: 4px solid #10b981;
            border-radius: 24px;
            padding: 20px;
            display: inline-block;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15);
            margin-bottom: 24px;
          }
          .qr-img {
            width: 280px;
            height: 280px;
            display: block;
          }
          .scan-headline {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 8px 0;
          }
          .scan-subheadline {
            font-size: 16px;
            font-weight: 700;
            color: #059669;
            margin: 0 0 24px 0;
          }
          .steps-container {
            display: flex;
            justify-content: space-around;
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            border-radius: 20px;
            padding: 16px;
            margin-top: 10px;
          }
          .step-item {
            flex: 1;
            padding: 0 8px;
          }
          .step-num {
            width: 28px;
            height: 28px;
            background: #10b981;
            color: #ffffff;
            font-weight: 900;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 6px auto;
            font-size: 13px;
          }
          .step-text {
            font-size: 12px;
            font-weight: 700;
            color: #334155;
          }
          .footer-tag {
            margin-top: 30px;
            font-size: 12px;
            color: #94a3b8;
            font-weight: 600;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 12px 30px; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer; shadow: 0 4px 12px rgba(16,185,129,0.3);">
            🖨️ Click Here to Print Gate Poster
          </button>
        </div>

        <div class="poster-card">
          <div class="brand-header">
            <h1 class="gym-title">${gymName}</h1>
            <p class="gym-sub">${address ? address + ' • ' : ''}${phone || ''}</p>
          </div>

          <div class="badge-banner">
            ⚡ GATE ATTENDANCE PUNCH / प्रवेश एवं निकास
          </div>

          <div class="qr-box">
            <img src="${qrUrl}" alt="Gate QR Code" class="qr-img">
          </div>

          <h2 class="scan-headline">SCAN THIS QR TO RECORD ATTENDANCE</h2>
          <p class="scan-subheadline">जिम में एंट्री एवं एग्जिट दर्ज करने के लिए QR स्कैन करें</p>

          <div class="steps-container">
            <div class="step-item">
              <div class="step-num">1</div>
              <div class="step-text">Open GymSarthi App</div>
            </div>
            <div class="step-item">
              <div class="step-num">2</div>
              <div class="step-text">Tap "Scan Gate QR"</div>
            </div>
            <div class="step-item">
              <div class="step-num">3</div>
              <div class="step-text">Check-In / Out Punch</div>
            </div>
          </div>
        </div>

        <div class="footer-tag">
          Powered by GymSarthi • Automated Gate Attendance & Membership Engine
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  },

  // 💳 Printable Member QR ID Card
  printMemberIDCard(member = {}, gymName = 'PowerHouse Fitness Gym') {
    const memberId = member.member_id || member.id || 'MEM_UNKNOWN';
    const memberName = member.name || 'Member';
    const mobile = member.mobile || 'N/A';
    const pkgName = member.package_name || 'Standard Membership';
    const expiry = member.expiry_date || 'Active';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberId)}`;

    const printWin = window.open('', '_blank', 'width=700,height=600');
    if (!printWin) {
      alert('Pop-up blocker is preventing the print window from opening. Please allow pop-ups for this site.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Member ID Card — ${memberName}</title>
        <style>
          * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
          body {
            margin: 0;
            padding: 40px;
            background: #f1f5f9;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .id-card {
            width: 380px;
            background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
            color: #ffffff;
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.3);
            border: 2px solid #10b981;
            position: relative;
            overflow: hidden;
          }
          .id-card::before {
            content: '';
            position: absolute;
            top: -50px;
            right: -50px;
            width: 120px;
            height: 120px;
            background: rgba(16, 185, 129, 0.15);
            border-radius: 50%;
          }
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-b: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .card-gym {
            font-size: 16px;
            font-weight: 900;
            color: #10b981;
            text-transform: uppercase;
          }
          .card-badge {
            font-size: 10px;
            background: rgba(16,185,129,0.2);
            color: #34d399;
            padding: 3px 8px;
            border-radius: 20px;
            font-weight: 700;
          }
          .card-body {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .qr-wrapper {
            background: #ffffff;
            padding: 8px;
            border-radius: 14px;
            border: 2px solid #10b981;
          }
          .qr-img {
            width: 100px;
            height: 100px;
            display: block;
          }
          .member-info {
            flex: 1;
          }
          .member-name {
            font-size: 18px;
            font-weight: 800;
            margin: 0 0 4px 0;
            color: #ffffff;
          }
          .member-id {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 700;
            font-family: monospace;
            margin-bottom: 8px;
          }
          .info-row {
            font-size: 11px;
            color: #cbd5e1;
            margin-bottom: 3px;
          }
          .info-row strong {
            color: #34d399;
          }
          .card-footer {
            margin-top: 16px;
            padding-top: 10px;
            border-t: 1px dashed rgba(255,255,255,0.1);
            text-align: center;
            font-size: 9px;
            color: #64748b;
            font-weight: 600;
          }
          @media print {
            .no-print { display: none !important; }
            body { background: white; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 24px; background: #10b981; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">
            🖨️ Print Member ID Card
          </button>
        </div>

        <div class="id-card">
          <div class="card-header">
            <div class="card-gym">${gymName}</div>
            <div class="card-badge">MEMBER ID</div>
          </div>

          <div class="card-body">
            <div class="qr-wrapper">
              <img src="${qrUrl}" class="qr-img">
            </div>

            <div class="member-info">
              <h3 class="member-name">${memberName}</h3>
              <div class="member-id">ID: ${memberId}</div>
              <div class="info-row">Mobile: <strong>+91 ${mobile}</strong></div>
              <div class="info-row">Package: <strong>${pkgName}</strong></div>
              <div class="info-row">Expiry: <strong>${expiry}</strong></div>
            </div>
          </div>

          <div class="card-footer">
            Official GymSarthi Access Pass • Scan at Gate for Entry
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  }
};

if (typeof window !== 'undefined') {
  window.Utils = Utils;

  // Suppress browser extension message channel noise (Password managers, ad-blockers, extension background scripts)
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event &&
      event.reason &&
      (
        (typeof event.reason.message === 'string' && event.reason.message.includes('message channel closed before a response was received')) ||
        (typeof event.reason === 'string' && event.reason.includes('message channel closed before a response was received'))
      )
    ) {
      event.preventDefault();
    }
  });
}
