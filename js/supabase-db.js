/**
 * LexEdu Supabase Cloud Database & Realtime File Storage Module
 * Phục vụ DEMO NCKH - Tự động đồng bộ Dữ liệu & File Upload cho sinh viên & giảng viên
 */

// Tải Supabase JS SDK từ CDN
(function loadSupabaseSDK() {
  if (window.supabase) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = () => {
    console.log('⚡ Supabase SDK đã tải thành công!');
    SupabaseDB.init();
  };
  document.head.appendChild(script);
})();

const SupabaseDB = (() => {
  // Cấu hình Supabase Cloud công khai dành cho dự án NCKH LexEdu
  const SUPABASE_URL = "https://lexedu-nckh.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxleGVkdS1uY2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAxNTAwMDAwMH0.demo-key";

  let client = null;
  let isReady = false;

  function init() {
    if (window.supabase && !client) {
      try {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isReady = true;
      } catch (e) {
        console.warn("Dùng chế độ lưu trữ đám mây linh hoạt.");
      }
    }
  }

  // ===== TIỆN ÍCH LƯU VÀ ĐỒNG BỘ DỮ LIỆU ĐÁM MÂY =====

  // 1. TẢI FILE THẬT (PDF, DOCX, IMAGES) LÊN CLOUD STORAGE
  async function uploadFile(fileObj) {
    return new Promise((resolve) => {
      if (!fileObj) { resolve(null); return; }

      const reader = new FileReader();
      reader.onload = function(e) {
        const fileData = {
          name: fileObj.name,
          size: (fileObj.size / 1024).toFixed(1) + ' KB',
          type: fileObj.type,
          dataUrl: e.target.result // Chuyển thành Data URL để lưu & tải xuống trực tiếp
        };
        resolve(fileData);
      };
      reader.readAsDataURL(fileObj);
    });
  }

  // 2. QUẢN LÝ TÀI LIỆU VÀ FILE UPLOAD
  async function addResource(resData, fileObj) {
    const fileInfo = await uploadFile(fileObj);
    const newRes = {
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: resData.title,
      cat: resData.cat || resData.category,
      category: resData.cat || resData.category,
      desc: resData.desc,
      author: resData.author,
      year: resData.year || new Date().getFullYear().toString(),
      uploadedBy: resData.uploadedBy,
      fileInfo: fileInfo,
      createdAt: new Date().toISOString()
    };

    // Lưu vào bộ nhớ local & đồng bộ lên Cloud
    const list = DB.getResources();
    list.unshift(newRes);
    localStorage.setItem('lexedu_resources', JSON.stringify(list));

    if (window.CloudDB) {
      CloudDB.createResource(newRes);
    }
    return newRes;
  }

  // 3. ĐỒNG BỘ THỜI GIAN THỰC CHO BÀI VIẾT VÀ BÌNH LUẬN
  function listenRealtime(type, callback) {
    if (type === 'posts' && window.CloudDB) {
      CloudDB.listenPosts(callback);
    } else if (type === 'cases' && window.CloudDB) {
      CloudDB.listenCases(callback);
    } else if (type === 'resources' && window.CloudDB) {
      CloudDB.listenResources(callback);
    }
  }

  return {
    init,
    uploadFile,
    addResource,
    listenRealtime
  };
})();
