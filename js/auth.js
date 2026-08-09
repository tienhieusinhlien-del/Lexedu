/**
 * LawTANT Auth Module
 * Quản lý đăng nhập, đăng ký và phiên người dùng bằng localStorage
 */

const Auth = (() => {
  const KEY_USERS = 'LawTANT_users';
  const KEY_SESSION = 'LawTANT_session';

  // Tài khoản demo mặc định (được khởi tạo nếu chưa có data)
  const DEFAULT_USERS = [
    { id: 'sv2025001', password: '123456', role: 'student', name: 'Nguyễn Minh Hiếu', avatar: 'MH', class: 'K47-Luật Hành chính', email: 'sv2025001@HVHCQTC.edu.vn', createdAt: '2025-08-01' },
    { id: 'sv2025002', password: '123456', role: 'student', name: 'Trần Thị Lan', avatar: 'TL', class: 'K47-Luật Dân sự', email: 'sv2025002@HVHCQTC.edu.vn', createdAt: '2025-08-01' },
    { id: 'gv.nguyenvana@HVHCQTC.edu.vn', password: 'gv123456', role: 'lecturer', name: 'TS. Nguyễn Văn A', avatar: 'NA', dept: 'Khoa Luật', email: 'gv.nguyenvana@HVHCQTC.edu.vn', createdAt: '2025-08-01' },
    { id: 'gv.tranthib@HVHCQTC.edu.vn', password: 'gv123456', role: 'lecturer', name: 'PGS. Trần Thị B', avatar: 'TB', dept: 'Khoa Luật', email: 'gv.tranthib@HVHCQTC.edu.vn', createdAt: '2025-08-01' },
  ];

  // Khởi tạo dữ liệu mặc định
  function init() {
    if (!localStorage.getItem(KEY_USERS)) {
      localStorage.setItem(KEY_USERS, JSON.stringify(DEFAULT_USERS));
    }
  }

  // Lấy danh sách users
  function getUsers() {
    return JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
  }

  // Lưu danh sách users
  function saveUsers(users) {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  }

  // Đăng nhập
  function login(id, password) {
    const users = getUsers();
    const user = users.find(u => u.id === id && u.password === password);
    if (!user) return { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu.' };
    const session = { ...user };
    delete session.password;
    localStorage.setItem(KEY_SESSION, JSON.stringify(session));
    return { success: true, user: session };
  }

  // Đăng ký
  function register(data) {
    const users = getUsers();
    // Kiểm tra trùng ID
    if (users.find(u => u.id === data.id)) {
      return { success: false, message: 'Mã số / Email đã tồn tại trong hệ thống.' };
    }
    if (data.email && users.find(u => u.email === data.email)) {
      return { success: false, message: 'Email này đã được sử dụng.' };
    }
    const newUser = {
      id: data.id,
      password: data.password,
      role: data.role || 'student',
      name: data.name,
      avatar: data.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      class: data.class || '',
      dept: data.dept || '',
      email: data.email || '',
      createdAt: new Date().toISOString().split('T')[0],
    };
    users.push(newUser);
    saveUsers(users);
    if (typeof CloudDB !== 'undefined' && CloudDB.saveUserToCloud) {
      CloudDB.saveUserToCloud(newUser);
    }
    return { success: true, user: newUser };
  }

  // Lấy phiên hiện tại
  function getSession() {
    const raw = localStorage.getItem(KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  }

  // Kiểm tra đã đăng nhập
  function isLoggedIn() {
    return !!getSession();
  }

  // Đăng xuất
  function logout() {
    localStorage.removeItem(KEY_SESSION);
  }

  // Bảo vệ trang — redirect nếu chưa đăng nhập
  function requireLogin(redirectTo = '../pages/login.html') {
    if (!isLoggedIn()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  // Bảo vệ trang — chỉ cho role cụ thể
  function requireRole(role, redirectTo = '../pages/login.html') {
    const user = getSession();
    if (!user || user.role !== role) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  init();
  return { login, register, logout, getSession, isLoggedIn, requireLogin, requireRole, getUsers };
})();
