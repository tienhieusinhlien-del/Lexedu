/**
 * LawTANT Global Cloud WebSocket Module
 * Kết nối tất cả thiết bị từ MỌI Địa chỉ IP khác nhau trên toàn thế giới qua giao thức wss://
 */

const CloudSocket = (() => {
  // Giao thức WebSocket Đám mây công khai cho phép kết nối khác IP mạng
  const CLOUD_WSS_URL = "wss://free.system.piesocket.com/v3/LawTANT_nckh_channel?api_key=o7uL34sC8d3K9l0M";

  let ws = null;
  let listeners = {};
  let isConnected = false;

  function connect() {
    try {
      ws = new WebSocket(CLOUD_WSS_URL);

      ws.onopen = () => {
        isConnected = true;
        console.log("🌐 ⚡ Đã kết nối thành công Server Socket Đám mây Toàn cầu (Khác IP vẫn kết nối được)!");
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet && packet.event && listeners[packet.event]) {
            listeners[packet.event].forEach(cb => cb(packet.data));
          }
        } catch (e) {
          console.warn("Lỗi nhận gói tin Socket:", e);
        }
      };

      ws.onclose = () => {
        isConnected = false;
        console.warn("🔌 Socket ngắt kết nối, đang tự kết nối lại...");
        setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn("⚠️ Socket Cloud cảnh báo:", err);
      };
    } catch (e) {
      console.error("Lỗi khởi tạo WebSocket Cloud:", e);
    }
  }

  // Đăng ký nhận sự kiện từ các IP khác
  function on(eventName, callback) {
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(callback);
  }

  // Phát tín hiệu sang tất cả các IP khác
  function emit(eventName, data) {
    const packet = JSON.stringify({ event: eventName, data: data });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(packet);
    } else {
      console.warn("Socket đang kết nối lại, lưu gói tin tạm...");
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(packet);
      }, 1000);
    }
  }

  // Tự động kết nối khi tải file
  connect();

  return {
    on,
    emit,
    isConnected: () => isConnected
  };
})();
