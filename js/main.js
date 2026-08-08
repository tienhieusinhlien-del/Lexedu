// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 40);
});

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');
hamburger?.addEventListener('click', () => navLinksEl?.classList.toggle('open'));

// ===== ACTIVE NAV LINK =====
const currentPath = window.location.pathname.split('/').pop();
document.querySelectorAll('.nav-link').forEach(link => {
  const href = link.getAttribute('href')?.split('/').pop();
  link.classList.toggle('active', href === currentPath || (currentPath === '' && href === 'index.html'));
});

// ===== AUTH STATE – Fix logout khi chuyển trang =====
(function updateNavAuth() {
  const raw = localStorage.getItem('lexedu_session');
  const user = raw ? JSON.parse(raw) : null;
  const actionsEl = document.querySelector('.nav-actions');
  if (!actionsEl) return;

  if (user) {
    // Thay nút "Đăng nhập" bằng avatar + tên người dùng
    const dashHref = user.role === 'lecturer'
      ? 'pages/dashboard-lecturer.html'
      : 'pages/dashboard-student.html';
    // Điều chỉnh path tùy theo vị trí file
    const isInPages = window.location.pathname.includes('/pages/');
    const prefix = isInPages ? '' : 'pages/';

    actionsEl.innerHTML = `
      <a href="${prefix}${user.role === 'lecturer' ? 'dashboard-lecturer.html' : 'dashboard-student.html'}"
         style="display:flex;align-items:center;gap:8px;text-decoration:none;">
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#1e3a5f,#c8960c);
                    display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.78rem;color:#fff;">
          ${user.avatar || user.name.slice(0,2).toUpperCase()}
        </div>
        <span style="font-size:0.85rem;color:#fff;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${user.name}
        </span>
      </a>
      <button onclick="lexeduLogout()" class="btn btn-outline" style="font-size:0.82rem;padding:0.4rem 0.9rem;">
        Đăng xuất
      </button>
      <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
    `;
    // Re-attach hamburger
    document.getElementById('hamburger')?.addEventListener('click', () => navLinksEl?.classList.toggle('open'));
  }
})();

window.lexeduLogout = function() {
  localStorage.removeItem('lexedu_session');
  const isInPages = window.location.pathname.includes('/pages/');
  window.location.href = isInPages ? 'login.html' : 'pages/login.html';
};

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.feature-card, .role-card, .float-card').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

const style = document.createElement('style');
style.textContent = `
  .fade-up { opacity: 0; transform: translateY(24px); transition: opacity 0.5s ease, transform 0.5s ease; }
  .fade-up.visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);
