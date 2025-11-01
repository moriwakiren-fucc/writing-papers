// main.js — Firebase v11対応・完全安定版（送信バグ修正済）

import { db, auth } from "../login/firebase-config.js?v=" + Math.floor(Math.random() * 1000000);
import {
  ref,
  push,
  onChildAdded,
  get,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* ---------- デバッグ表示 ---------- */
function statusBox(text) {
  let box = document.getElementById("chat-status-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "chat-status-box";
    Object.assign(box.style, {
      position: "fixed",
      top: "8px",
      right: "8px",
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      fontSize: "12px",
      padding: "8px",
      borderRadius: "6px",
      zIndex: "9999",
      maxWidth: "300px",
      lineHeight: "1.4",
      whiteSpace: "pre-wrap"
    });
    document.body.appendChild(box);
  }
  box.innerHTML = Array.isArray(text)
    ? text.map(t => `<div>${t}</div>`).join("")
    : `<div>${text}</div>`;
}

/* ---------- DOM取得 ---------- */
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

/* ---------- escape ---------- */
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------- メッセージ追加 ---------- */
function addMessageToDOM(msg, currentUserEmail) {
  const isMine = (msg.senderEmail === currentUserEmail);
  const dateKey = msg.date.replace(/\//g, "-");
  const dateId = `date-${dateKey}`;

  if (!document.getElementById(dateId)) {
    const div = document.createElement("div");
    div.id = dateId;
    div.className = "date-divider";
    div.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(div);
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  if (!isMine) {
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = msg.senderName || msg.senderEmail;
    wrapper.appendChild(sender);
  }

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;
  bubble.textContent = msg.text;
  wrapper.appendChild(bubble);

  const time = document.createElement("div");
  time.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
  time.textContent = msg.timestamp;
  wrapper.appendChild(time);

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ---------- 状態 ---------- */
let currentUser = null;
let initialized = false;

/* ---------- チャット初期化 ---------- */
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));

  get(messagesRef)
    .then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const sorted = Object.values(data).sort((a, b) => a.timeValue - b.timeValue);
        sorted.forEach(d => addMessageToDOM(d, currentUser.email));
        statusBox(["履歴取得完了", `user: ${currentUser.email}`]);
      } else {
        statusBox(["履歴なし", `user: ${currentUser.email}`]);
      }
    })
    .catch(err => {
      statusBox(["履歴取得エラー", err.message || err]);
    });

  // リアルタイム監視
  const liveRef = ref(db, "chat_messages");
  onChildAdded(liveRef, snap => {
    const d = snap.val();
    addMessageToDOM(d, currentUser.email);
  });
}

/* ---------- 送信 ---------- */
function sendMessage(text) {
  if (!currentUser) {
    statusBox(["送信不可：未ログイン"]);
    return;
  }
  const trimmed = text.trim();
  if (!trimmed) return;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  const msg = {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: trimmed,
    timestamp: `${hh}:${mm}`,
    date: now.toLocaleDateString("ja-JP"),
    timeValue: now.getTime()
  };

  const msgRef = ref(db, "chat_messages");
  push(msgRef, msg)
    .then(() => {
      chatInput.value = "";
      statusBox(["送信成功", trimmed]);
    })
    .catch(err => {
      statusBox(["送信失敗", err.message || err]);
    });
}

/* ---------- 認証 ---------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../login/index.html?v=" + Math.floor(Math.random() * 1000000);
    return;
  }
  currentUser = {
    email: user.email,
    uid: user.uid,
    name: user.displayName || user.email
  };
  statusBox(["認証OK", `user: ${user.email}`]);
  initChat();
});

/* ---------- イベント ---------- */
sendBtn.addEventListener("click", () => sendMessage(chatInput.value));

chatInput.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});
