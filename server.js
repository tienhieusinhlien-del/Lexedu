const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Phục vụ file tĩnh (HTML, CSS, JS) từ thư mục gốc
app.use(express.static(path.join(__dirname)));

// Route rõ ràng cho trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/pages/:page', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', req.params.page));
});

// 1. KẾT NỐI VÀ KHỞI TẠO CƠ SỞ DỮ LIỆU SQLITE (SQL DATABASE)
const dbPath = path.join(__dirname, 'LawTANT.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Lỗi kết nối SQL Database:', err.message);
  else console.log('✅ Đã kết nối thành công Cơ sở dữ liệu SQL (LawTANT.db)');
});

// Tạo các bảng SQL nếu chưa tồn tại
db.serialize(() => {
  // Bảng Người dùng (Users)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    class_dept TEXT,
    email TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bảng Bài đăng Đồng kiến tạo (Forum Posts)
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tag TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    author_avatar TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bảng Phản hồi / Bình luận bài đăng (Post Replies)
  db.run(`CREATE TABLE IF NOT EXISTS post_replies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    text TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    author_avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  // Bảng Tình huống Pháp lý (Cases)
  db.run(`CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    area TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    questions TEXT,
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bảng Bình luận Tình huống (Case Comments)
  db.run(`CREATE TABLE IF NOT EXISTS case_comments (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
  )`);

  // Đèn mẫu mặc định cho Users nếu rỗng
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO users (id, name, password, role, class_dept, email, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)");
      stmt.run('sv2025001', 'Nguyễn Minh Hiếu', '123456', 'student', 'K47-Luật Hành chính', 'sv2025001@HVHCQTC.edu.vn', 'MH');
      stmt.run('sv2025002', 'Trần Thị Lan', '123456', 'student', 'K47-Luật Dân sự', 'sv2025002@HVHCQTC.edu.vn', 'TL');
      stmt.run('gv.nguyenvana@HVHCQTC.edu.vn', 'TS. Nguyễn Văn A', 'gv123456', 'lecturer', 'Khoa Luật', 'gv.nguyenvana@HVHCQTC.edu.vn', 'NA');
      stmt.finalize();
      console.log('🌱 Đã khởi tạo dữ liệu tài khoản mẫu vào SQL Database!');
    }
  });
});

// 2. CÁC API ENDPOINTS
// Đăng nhập
app.post('/api/login', (req, res) => {
  const { id, password } = req.body;
  db.get("SELECT id, name, role, class_dept, email, avatar FROM users WHERE id = ? AND password = ?", [id, password], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi server' });
    if (!row) return res.status(400).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    res.json({ success: true, user: row });
  });
});

// Đăng ký
app.post('/api/register', (req, res) => {
  const { id, password, role, name, email, class: cls, dept } = req.body;
  const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const class_dept = cls || dept || '';

  db.get("SELECT id FROM users WHERE id = ?", [id], (err, row) => {
    if (row) return res.status(400).json({ success: false, message: 'Mã số / Email đã tồn tại' });

    const stmt = db.prepare("INSERT INTO users (id, name, password, role, class_dept, email, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, name, password, role || 'student', class_dept, email, avatar, function(err2) {
      if (err2) return res.status(500).json({ success: false, message: 'Không thể tạo tài khoản' });
      res.json({ success: true, user: { id, name, role, class_dept, email, avatar } });
    });
  });
});

// Lấy danh sách bài đăng đồng kiến tạo
app.get('/api/posts', (req, res) => {
  db.all("SELECT * FROM posts ORDER BY created_at DESC", [], (err, posts) => {
    if (err) return res.status(500).json([]);
    
    // Ghép replies cho từng post
    db.all("SELECT * FROM post_replies ORDER BY created_at ASC", [], (err2, replies) => {
      const postsWithReplies = posts.map(p => ({
        ...p,
        authorName: p.author_name,
        authorRole: p.author_role,
        authorAvatar: p.author_avatar,
        createdAt: p.created_at,
        replies: (replies || []).filter(r => r.post_id === p.id).map(r => ({
          ...r,
          authorName: r.author_name,
          authorRole: r.author_role,
          authorAvatar: r.author_avatar,
          createdAt: r.created_at
        }))
      }));
      res.json(postsWithReplies);
    });
  });
});

// 3. GIAO THỨC TRUYỀN TIN THỜI GIAN THỰC (SOCKET.IO / WEBSOCKETS)
io.on('connection', (socket) => {
  console.log('⚡ Nối mạng Realtime WebSocket:', socket.id);

  // Sự kiện 1: Đăng bài thảo luận mới -> Lưu SQL -> Đẩy ngay tới TẤT CẢ mọi người
  socket.on('create_post', (data) => {
    const id = 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const stmt = db.prepare("INSERT INTO posts (id, title, body, tag, author_name, author_role, author_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, data.title, data.body, data.tag, data.authorName, data.authorRole, data.authorAvatar, function(err) {
      if (!err) {
        const newPost = {
          id,
          title: data.title,
          body: data.body,
          tag: data.tag,
          authorName: data.authorName,
          authorRole: data.authorRole,
          authorAvatar: data.authorAvatar,
          likes: 0,
          replies: [],
          created_at: new Date().toISOString()
        };
        // Phát tín hiệu Realtime cho tất cả máy đang kết nối
        io.emit('new_post_created', newPost);
      }
    });
  });

  // Sự kiện 2: Trả lời / Bình luận -> Lưu SQL -> Đẩy ngay tức thì
  socket.on('create_reply', (data) => {
    const id = 'rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const stmt = db.prepare("INSERT INTO post_replies (id, post_id, text, author_name, author_role, author_avatar) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(id, data.postId, data.text, data.authorName, data.authorRole, data.authorAvatar, function(err) {
      if (!err) {
        const newReply = {
          id,
          post_id: data.postId,
          text: data.text,
          authorName: data.authorName,
          authorRole: data.authorRole,
          authorAvatar: data.authorAvatar,
          createdAt: new Date().toISOString()
        };
        io.emit('new_reply_created', { postId: data.postId, reply: newReply });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Ngắt kết nối WebSocket:', socket.id);
  });
});

const DEFAULT_PORT = process.env.PORT || 8080;

function startServer(port) {
  server.listen(port, () => {
    console.log(`🚀 Server LawTANT SQL & Socket.IO đang chạy tại: http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Cổng ${port} đã bị chiếm, tự động chuyển sang cổng ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Lỗi khởi động Server:', err);
    }
  });
}

startServer(DEFAULT_PORT);
