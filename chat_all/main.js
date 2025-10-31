// main.js (モジュール)
import { db, auth } from "../login/firebase-config.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import {
  ref,
  push,
  onChildAdded,
  set,
  get,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* -------------------------
   メンバー情報（メール→表示名）
--------------------------*/
let currentUser = null;
const members = [
  {email: "moriwaki@ren.ronbun", name: "森脇 廉"},
  {email: "muraya@kaho.ronbun", name: "村谷 佳穂"},
  {email: "kojo@yuina.ronbun", name: "小城 結菜"},
  {email: "nakano@aiko.ronbun", name: "中野 愛子"},
  {email: "kamimoto@yuta.ronbun", name: "神元 佑太"},
  {email: "sadahira@koto.ronbun", name: "定平 琴"},
  {email: "sunada@suzu.ronbun", name: "砂田 紗々"}
];

/* -------------------------
   DOM要素
--------------------------*/
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");
const videoModal = document.getElementById("video-modal");
const videoPlayer = document.getElementById("video-player");
const videoClose = document.getElementById("video-close");

/* -------------------------
   Firebase Storage 初期化
--------------------------*/
const storage = getStorage();

/* -------------------------
   認証チェック
--------------------------*/
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  const email = user.email;
  const member = members.find(m => m.email === email);
  currentUser = {
    email,
    uid: user.uid,
    name: member ? member.name : email
  };
  initChat();
});

/* -------------------------
   メッセージ送信
--------------------------*/
function sendMessage(payload) {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2,"0");
  const mm = now.getMinutes().toString().padStart(2,"0");
  const date = now.toLocaleDateString("ja-JP");

  const messageRef = ref(db, "chat_messages");
  push(messageRef, {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: payload.text || "",
    fileType: payload.fileType || null,
    fileURL: payload.fileURL || null,
    thumbURL: payload.thumbURL || null,
    fileName: payload.fileName || null,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime(),
    readBy: { [currentUser.email]: true } // オブジェクト形式
  });
}

/* -------------------------
   メッセージ DOM 追加
--------------------------*/
function addMessageToDOM(msg) {
  const isMine = (msg.senderEmail === currentUser.email);

  const dateId = `date-${msg.date.replace(/\//g,'-')}`;
  if (!document.getElementById(dateId)) {
    const div = document.createElement("div");
    div.id = dateId;
    div.className = "date-divider";
    div.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(div);
  }

  const row = document.createElement("div");
  row.className = "message-row";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + (isMine ? "right" : "left");

  if (!isMine) {
    const senderEl = document.createElement("div");
    senderEl.className = "sender";
    senderEl.textContent = msg.senderName || msg.senderEmail;
    bubble.appendChild(senderEl);
  }

  const textEl = document.createElement("div");
  textEl.className = "bubble-text";
  let safeText = escapeHtml(msg.text || "");
  safeText = safeText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  safeText = safeText
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  textEl.innerHTML = safeText;
  bubble.appendChild(textEl);

  // ファイル表示
  if (msg.fileType && msg.fileURL) {
    if (msg.fileType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = msg.fileURL;
      img.className = "bubble-media";
      bubble.appendChild(img);
    } else if (msg.fileType.startsWith("video/")) {
      const wrapper = document.createElement("div");
      wrapper.className = "video-thumb";
      const img = document.createElement("img");
      img.src = msg.thumbURL || msg.fileURL;
      img.className = "bubble-media";
      wrapper.appendChild(img);

      const overlay = document.createElement("div");
      overlay.className = "thumb-overlay";
      overlay.innerHTML = `<div class="play">▶︎</div>`;
      wrapper.appendChild(overlay);

      wrapper.addEventListener("click", () => {
        videoPlayer.src = msg.fileURL;
        videoModal.classList.add("show");
        videoModal.setAttribute("aria-hidden", "false");
      });

      bubble.appendChild(wrapper);
    } else {
      const fileEl = document.createElement("div");
      fileEl.innerHTML = `<a href="${msg.fileURL}" target="_blank" rel="noopener noreferrer">${escapeHtml(msg.fileName || 'ファイル')}</a>`;
      bubble.appendChild(fileEl);
    }
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const readCount = msg.readBy ? Object.keys(msg.readBy).length : 0;
  const readEl = document.createElement("div");
  readEl.className = "meta-read";
  readEl.textContent = `既読：${readCount}`;
  const timeEl = document.createElement("div");
  timeEl.className = "meta-time";
  timeEl.textContent = msg.timestamp || "";

  meta.appendChild(readEl);
  meta.appendChild(timeEl);

  bubble.addEventListener("dblclick", () => {
    const readers = msg.readBy ? Object.keys(msg.readBy).map(email => {
      const m = members.find(x => x.email === email);
      return m ? m.name : email;
    }) : [];
    alert(`既読順：\n${readers.join("\n") || "(なし)"}`);
  });

  row.appendChild(bubble);
  row.appendChild(meta);
  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* -------------------------
   ファイルアップロード処理
--------------------------*/
async function uploadFileAndSend(file) {
  try {
    const now = Date.now();
    const path = `chat_files/${now}_${file.name}`;
    const sRef = storageRef(storage, path);
    const snapshot = await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);

    if (file.type.startsWith("image/")) {
      sendMessage({ fileType: file.type, fileURL: url, fileName: file.name });
      return;
    }

    if (file.type.startsWith("video/")) {
      const thumbBlob = await captureVideoThumbnail(file);
      let thumbURL = null;
      if (thumbBlob) {
        const thumbPath = `chat_files/thumb_${now}_${file.name}.png`;
        const tRef = storageRef(storage, thumbPath);
        await uploadBytes(tRef, thumbBlob);
        thumbURL = await getDownloadURL(tRef);
      }
      sendMessage({ fileType: file.type, fileURL: url, thumbURL, fileName: file.name });
      return;
    }

    sendMessage({ fileType: file.type, fileURL: url, fileName: file.name });

  } catch (e) {
    console.error("upload failed:", e);
    alert("ファイル送信に失敗しました");
  }
}

/* -------------------------
   動画サムネ生成
--------------------------*/
function captureVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadeddata", () => {
      video.currentTime = 1;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob), "image/png");
      URL.revokeObjectURL(video.src);
    });
  });
}

/* -------------------------
   初期ロード & リアルタイム監視
--------------------------*/
let initialized = false;
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
  get(messagesRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([key, d]) => {
        const readBy = d.readBy || {};
        if (!readBy[currentUser.email]) {
          readBy[currentUser.email] = true;
          set(ref(db, `chat_messages/${key}/readBy`), readBy).catch(console.error);
        }
        addMessageToDOM({ id:key, ...d, readBy });
      });
    }
  }).catch(console.error);

  const liveRef = ref(db, "chat_messages");
  onChildAdded(liveRef, snap => {
    const d = snap.val();
    const readBy = d.readBy || {};
    if (!readBy[currentUser.email]) {
      readBy[currentUser.email] = true;
      set(ref(db, `chat_messages/${snap.key}/readBy`), readBy).catch(console.error);
    }
    addMessageToDOM({ id: snap.key, ...d, readBy });
  });
}

/* -------------------------
   送信 / Enter / ファイル選択イベント
--------------------------*/
sendBtn.addEventListener("click", () => {
  const text = chatInput.value;
  if (!text || !text.trim()) return;
  sendMessage({ text: text.trim() });
  chatInput.value = "";
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

fileBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = false;
  input.accept = "*/*";
  input.onchange = () => {
    const f = input.files[0];
    if (f) uploadFileAndSend(f);
  };
  input.click();
});

/* -------------------------
   動画モーダルのクローズ
--------------------------*/
videoClose.addEventListener("click", () => {
  videoPlayer.pause();
  videoPlayer.src = "";
  videoModal.classList.remove("show");
  videoModal.setAttribute("aria-hidden", "true");
});
videoModal.addEventListener("click", (e) => {
  if (e.target === videoModal) videoClose.click();
});

/* -------------------------
   既読者表示
--------------------------*/
function readerNamesFromEmails(emails) {
  return Object.keys(emails || {}).map(email => {
    const m = members.find(x => x.email === email);
    return m ? m.name : email;
  });
}
