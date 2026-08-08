/**
 * LexEdu DB Module
 * Lưu trữ dữ liệu thật bằng localStorage (JSON database)
 */

const DB = (() => {
  const KEYS = {
    resources: 'lexedu_resources',
    cases: 'lexedu_cases',
    posts: 'lexedu_posts',
    submissions: 'lexedu_submissions',
    diary: 'lexedu_diary',
    notifications: 'lexedu_notifications',
  };

  // Generic get/save
  function get(key) { return JSON.parse(localStorage.getItem(KEYS[key]) || '[]'); }
  function save(key, data) { localStorage.setItem(KEYS[key], JSON.stringify(data)); }
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ===== RESOURCES =====
  function getResources() { return get('resources'); }
  function addResource(item) {
    const list = getResources();
    const newItem = { ...item, id: genId(), createdAt: new Date().toISOString() };
    list.unshift(newItem);
    save('resources', list);
    return newItem;
  }

  // ===== CASES =====
  function getCases() { return get('cases'); }
  function addCase(item) {
    const list = getCases();
    const newItem = { ...item, id: genId(), createdAt: new Date().toISOString(), comments: [] };
    list.unshift(newItem);
    save('cases', list);
    return newItem;
  }
  function addCaseComment(caseId, comment) {
    const list = getCases();
    const idx = list.findIndex(c => c.id === caseId);
    if (idx === -1) return false;
    list[idx].comments = list[idx].comments || [];
    list[idx].comments.push({ ...comment, id: genId(), createdAt: new Date().toISOString() });
    save('cases', list);
    return true;
  }

  // ===== FORUM POSTS =====
  function getPosts() { return get('posts'); }
  function addPost(item) {
    const list = getPosts();
    const newItem = { ...item, id: genId(), createdAt: new Date().toISOString(), replies: [] };
    list.unshift(newItem);
    save('posts', list);
    return newItem;
  }
  function addReply(postId, reply) {
    const list = getPosts();
    const idx = list.findIndex(p => p.id === postId);
    if (idx === -1) return false;
    list[idx].replies = list[idx].replies || [];
    list[idx].replies.push({ ...reply, id: genId(), createdAt: new Date().toISOString() });
    save('posts', list);
    return true;
  }

  // ===== DIARY =====
  function getDiary(userId) { return get('diary').filter(d => d.userId === userId); }
  function addDiaryEntry(userId, entry) {
    const list = get('diary');
    const newItem = { ...entry, id: genId(), userId, createdAt: new Date().toISOString() };
    list.unshift(newItem);
    save('diary', list);
    return newItem;
  }

  // ===== NOTIFICATIONS =====
  function getNotifications(userId) { return get('notifications').filter(n => n.userId === userId || n.userId === 'all'); }
  function addNotification(item) {
    const list = get('notifications');
    list.unshift({ ...item, id: genId(), read: false, createdAt: new Date().toISOString() });
    save('notifications', list);
  }
  function markRead(notifId) {
    const list = get('notifications');
    const idx = list.findIndex(n => n.id === notifId);
    if (idx !== -1) { list[idx].read = true; save('notifications', list); }
  }

  // ===== SEED DATA =====
  function seedIfEmpty() {
    if (get('cases').length === 0) {
      const cases = [
        { title: 'Hợp đồng vô hiệu do lừa dối', area: 'Luật Dân sự', difficulty: 'mid', content: 'Bên A ký hợp đồng mua bán xe ô tô với bên B. Sau khi giao xe, bên A phát hiện bên B đã cố tình che giấu lịch sử tai nạn nghiêm trọng của xe.', questions: ['Cơ sở pháp lý để tuyên hợp đồng vô hiệu?', 'Quyền và nghĩa vụ các bên sau khi hợp đồng vô hiệu?', 'Bên A có thể yêu cầu bồi thường không?'], author: 'TS. Nguyễn Văn A', comments: [] },
        { title: 'Khiếu nại quyết định thu hồi đất', area: 'Luật Hành chính', difficulty: 'hard', content: 'UBND huyện X ra quyết định thu hồi 500m² đất của hộ ông B để xây trường học. Hộ ông B cho rằng mức bồi thường không thỏa đáng và thủ tục không đúng quy định.', questions: ['Ông B có quyền khiếu nại đến cơ quan nào?', 'Thời hạn khiếu nại và trình tự giải quyết?', 'Nếu khiếu nại không được giải quyết, ông B có thể khởi kiện không?'], author: 'PGS. Trần Thị B', comments: [] },
        { title: 'Xác định tội danh trong vụ ẩu đả', area: 'Luật Hình sự', difficulty: 'mid', content: 'A và B xảy ra xô xát, A dùng chai thủy tinh đánh vào đầu B gây thương tích 25%. B nhập viện điều trị 3 tuần.', questions: ['Hành vi của A cấu thành tội gì theo BLHS 2015?', 'Phân tích yếu tố mặt khách quan?', 'Có áp dụng tình tiết tăng nặng không?'], author: 'TS. Lê Văn C', comments: [] },
      ];
      cases.forEach(c => addCase(c));
    }
    if (get('posts').length === 0) {
      addPost({ title: 'Hướng dẫn phân tích tình huống tháng 8/2025', body: 'Khi phân tích tình huống cần xác định đủ 4 yếu tố: chủ thể, khách thể, mặt chủ quan, mặt khách quan...', tag: 'Thông báo', authorName: 'TS. Nguyễn Văn A', authorRole: 'lecturer', replies: [] });
      addPost({ title: 'Mọi hợp đồng vô hiệu có đều không phát sinh hiệu lực?', body: 'Mình đang nghiên cứu về hợp đồng vô hiệu và thấy có nhiều trường hợp khác nhau theo BLDS 2015...', tag: 'Hỏi-Đáp', authorName: 'Trần Thị Lan', authorRole: 'student', replies: [] });
    }
    if (get('notifications').length === 0) {
      addNotification({ userId: 'all', title: 'Chào mừng đến với LexEdu!', body: 'Nền tảng học tập Luật đồng kiến tạo đã sẵn sàng.', type: 'info' });
    }
  }

  seedIfEmpty();
  return { getResources, addResource, getCases, addCase, addCaseComment, getPosts, addPost, addReply, getDiary, addDiaryEntry, getNotifications, addNotification, markRead };
})();
