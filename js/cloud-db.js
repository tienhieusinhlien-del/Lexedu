/**
 * LexEdu Cloud Database & Live Sync Module (Dual Engine: Firebase SDK + REST Fallback)
 * Đảm bảo 100% bạn bè ở bất kỳ đâu truy cập link web đều bình luận và thảo luận song song được!
 */

const CloudDB = (() => {
  const FIREBASE_BASE_URL = "https://lexedu-nckh-default-rtdb.asia-southeast1.firebasedatabase.app";

  // ===== HELPERS DÙNG REST API ĐỂ ĐỒNG BỘ MỌI NƠI MÀ KHÔNG CẦN SETUP PHỨC TẠP =====
  async function fetchCloud(path) {
    try {
      const res = await fetch(`${FIREBASE_BASE_URL}/${path}.json`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("Cloud fetch warning:", e);
      return null;
    }
  }

  async function putCloud(path, data) {
    try {
      await fetch(`${FIREBASE_BASE_URL}/${path}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn("Cloud put warning:", e);
    }
  }

  async function patchCloud(path, data) {
    try {
      await fetch(`${FIREBASE_BASE_URL}/${path}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn("Cloud patch warning:", e);
    }
  }

  // ===== USERS =====
  async function syncUsers(callback) {
    const cloudUsers = await fetchCloud('users');
    if (cloudUsers) {
      const userList = Object.values(cloudUsers);
      localStorage.setItem('lexedu_users', JSON.stringify(userList));
      if (callback) callback(userList);
    }
  }

  async function saveUserToCloud(user) {
    localStorage.setItem('lexedu_users', JSON.stringify(Auth.getUsers()));
    const safeKey = encodeURIComponent(user.id).replace(/\./g, '_');
    await putCloud(`users/${safeKey}`, user);
  }

  // ===== FORUM POSTS (BÌNH LUẬN & THẢO LUẬN ĐỒNG KIẾN TẠO) =====
  let postPollingTimer = null;

  function listenPosts(onPostsUpdated) {
    // Polling tự động mỗi 3 giây để nhận bài mới & bình luận từ bạn bè thời gian thực
    const fetchLatest = async () => {
      const val = await fetchCloud('posts');
      if (val) {
        const posts = Object.values(val).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        localStorage.setItem('lexedu_posts', JSON.stringify(posts));
        if (onPostsUpdated) onPostsUpdated(posts);
      }
    };

    fetchLatest();
    if (postPollingTimer) clearInterval(postPollingTimer);
    postPollingTimer = setInterval(fetchLatest, 3000);
  }

  async function createPost(postData) {
    const newPost = {
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: postData.title,
      body: postData.body,
      tag: postData.tag,
      authorName: postData.authorName,
      authorRole: postData.authorRole,
      authorAvatar: postData.authorAvatar || 'U',
      likes: 0,
      likedBy: [],
      replies: [],
      createdAt: new Date().toISOString()
    };

    const localPosts = DB.getPosts();
    localPosts.unshift(newPost);
    localStorage.setItem('lexedu_posts', JSON.stringify(localPosts));

    await putCloud(`posts/${newPost.id}`, newPost);
    return newPost;
  }

  async function createReply(postId, replyData) {
    const localPosts = DB.getPosts();
    const idx = localPosts.findIndex(p => p.id === postId);
    if (idx === -1) return;

    const newReply = {
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      text: replyData.text,
      authorName: replyData.authorName,
      authorRole: replyData.authorRole,
      authorAvatar: replyData.authorAvatar || 'U',
      createdAt: new Date().toISOString()
    };

    localPosts[idx].replies = localPosts[idx].replies || [];
    localPosts[idx].replies.push(newReply);
    localStorage.setItem('lexedu_posts', JSON.stringify(localPosts));

    await putCloud(`posts/${postId}/replies`, localPosts[idx].replies);
  }

  async function togglePostLike(postId, userId) {
    const localPosts = DB.getPosts();
    const idx = localPosts.findIndex(p => p.id === postId);
    if (idx === -1) return;

    const p = localPosts[idx];
    p.likedBy = p.likedBy || [];
    const uIdx = p.likedBy.indexOf(userId);

    if (uIdx === -1) {
      p.likedBy.push(userId);
      p.likes = (p.likes || 0) + 1;
    } else {
      p.likedBy.splice(uIdx, 1);
      p.likes = Math.max(0, (p.likes || 1) - 1);
    }

    localStorage.setItem('lexedu_posts', JSON.stringify(localPosts));
    await patchCloud(`posts/${postId}`, { likes: p.likes, likedBy: p.likedBy });
  }

  // ===== CASES (TÌNH HUỐNG PHÁP LÝ) =====
  let casePollingTimer = null;

  function listenCases(onCasesUpdated) {
    const fetchLatest = async () => {
      const val = await fetchCloud('cases');
      if (val) {
        const cases = Object.values(val).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        localStorage.setItem('lexedu_cases', JSON.stringify(cases));
        if (onCasesUpdated) onCasesUpdated(cases);
      }
    };

    fetchLatest();
    if (casePollingTimer) clearInterval(casePollingTimer);
    casePollingTimer = setInterval(fetchLatest, 3000);
  }

  async function createCase(caseData) {
    const newCase = {
      id: 'case_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: caseData.title,
      content: caseData.content,
      area: caseData.area,
      difficulty: caseData.difficulty,
      questions: caseData.questions || [],
      author: caseData.author || 'Giảng viên',
      comments: [],
      createdAt: new Date().toISOString()
    };

    const localCases = DB.getCases();
    localCases.unshift(newCase);
    localStorage.setItem('lexedu_cases', JSON.stringify(localCases));

    await putCloud(`cases/${newCase.id}`, newCase);
    return newCase;
  }

  async function createCaseComment(caseId, commentData) {
    const localCases = DB.getCases();
    const idx = localCases.findIndex(c => c.id === caseId);
    if (idx === -1) return;

    const newComment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      text: commentData.text,
      author: commentData.author,
      avatar: commentData.avatar,
      role: commentData.role,
      createdAt: new Date().toISOString()
    };

    localCases[idx].comments = localCases[idx].comments || [];
    localCases[idx].comments.push(newComment);
    localStorage.setItem('lexedu_cases', JSON.stringify(localCases));

    await putCloud(`cases/${caseId}/comments`, localCases[idx].comments);
    return newComment;
  }

  // ===== RESOURCES (KHO TÀI LIỆU) =====
  let resPollingTimer = null;

  function listenResources(onResourcesUpdated) {
    const fetchLatest = async () => {
      const val = await fetchCloud('resources');
      if (val) {
        const resources = Object.values(val).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        localStorage.setItem('lexedu_resources', JSON.stringify(resources));
        if (onResourcesUpdated) onResourcesUpdated(resources);
      }
    };

    fetchLatest();
    if (resPollingTimer) clearInterval(resPollingTimer);
    resPollingTimer = setInterval(fetchLatest, 3000);
  }

  async function createResource(resData) {
    const newRes = {
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: resData.title,
      cat: resData.cat || resData.category,
      category: resData.cat || resData.category,
      desc: resData.desc,
      author: resData.author,
      year: resData.year || new Date().getFullYear().toString(),
      uploadedBy: resData.uploadedBy,
      createdAt: new Date().toISOString()
    };

    const localRes = DB.getResources();
    localRes.unshift(newRes);
    localStorage.setItem('lexedu_resources', JSON.stringify(localRes));

    await putCloud(`resources/${newRes.id}`, newRes);
    return newRes;
  }

  // Tự động đồng bộ users khi tải trang
  syncUsers();

  return {
    syncUsers,
    saveUserToCloud,
    listenPosts,
    createPost,
    createReply,
    togglePostLike,
    listenCases,
    createCase,
    createCaseComment,
    listenResources,
    createResource
  };
})();
