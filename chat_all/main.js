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
let currentUser = null; // { email, uid, name }
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
    readBy: [currentUser.email] // 最初は自分を既読に
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
  if (msg.unread) bubble.classList.add("unread");

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

  // ファイル処理略（元コードと同じ）

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const readCount = (msg.readBy ? msg.readBy.length : 0);
  const readEl = document.createElement("div");
  readEl.className = "meta-read";
  readEl.textContent = `既読：${readCount}`;
  const timeEl = document.createElement("div");
  timeEl.className = "meta-time";
  timeEl.textContent = msg.timestamp || "";

  meta.appendChild(readEl);
  meta.appendChild(timeEl);

  bubble.addEventListener("dblclick", () => {
    const readers = (msg.readBy || []).map(email => {
      const m = members.find(x => x.email === email);
      return m ? m.name : email;
    });
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
        addMessageToDOM({
          id: key,
          senderEmail: d.senderEmail,
          senderName: d.senderName,
          text: d.text,
          fileType: d.fileType,
          fileURL: d.fileURL,
          thumbURL: d.thumbURL,
          fileName: d.fileName,
          timestamp: d.timestamp,
          date: d.date,
          readBy: d.readBy || []
        });
      });
    }
  }).catch(err => console.error("history error:", err));

  const liveRef = ref(db, "chat_messages");
  onChildAdded(liveRef, (snap) => {
    const d = snap.val();
    addMessageToDOM({
      id: snap.key,
      senderEmail: d.senderEmail,
      senderName: d.senderName,
      text: d.text,
      fileType: d.fileType,
      fileURL: d.fileURL,
      thumbURL: d.thumbURL,
      fileName: d.fileName,
      timestamp: d.timestamp,
      date: d.date,
      readBy: d.readBy || []
    });

    // --- 既読処理を set() に変更 ---
    if (!d.readBy || !d.readBy.includes(currentUser.email)) {
      const path = `chat_messages/${snap.key}/readBy`;
      const updatedReadBy = [...(d.readBy || []), currentUser.email];
      set(ref(db, path), updatedReadBy).catch(e => console.error("set readBy failed:", e));
    }
  });
}

/* -------------------------
   イベント：送信ボタン / Enter送信 / ファイル選択
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

// ファイル選択
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
   動画モーダルのクローズ処理
--------------------------*/
videoClose.addEventListener("click", () => {
  videoPlayer.pause();
  videoPlayer.src = "";
  videoModal.classList.remove("show");
  videoModal.setAttribute("aria-hidden", "true");
});
videoModal.addEventListener("click", (e) => {
  if (e.target === videoModal) {
    videoClose.click();
  }
});

/* -------------------------
   既読者表示：DBから読者配列を取得して名前へ変換して返す
--------------------------*/
function readerNamesFromEmails(emails) {
  return (emails || []).map(email => {
    const m = members.find(x => x.email === email);
    return m ? m.name : email;
  });
}
