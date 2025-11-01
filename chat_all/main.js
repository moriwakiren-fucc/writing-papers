// main.js — Firebase v11 送信バグ完全修正版
import { db, auth } from "../login/firebase-config.js";
import {
  ref,
  push,
  onChildAdded,
  get,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* ---------- 状態表示（デバッグ代替） ---------- */
function alertBox(msgs) {
  alert(Array.isArray(msgs) ? msgs.join("\n") : msgs);
}

/* ---------- DOM取得 ---------- */
let chatContainer, chatInput, sendBtn;

/* ---------- escape ---------- */
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------- 表示 ---------- */
function addMessageToDOM(msg, currentUserEmail) {
  const isMine = msg.senderEmail === currentUserEmail;
  const dateId = `date-${msg.date.replace(/\//g, "-")}`;

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

/* ---------- グローバル状態 ---------- */
let currentUser = null;
let initialized = false;

/* ---------- 初期ロード ---------- */
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));

  get(messagesRef)
    .then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).forEach(d => addMessageToDOM(d, currentUser.email));
      }
    })
    .catch(err => alertBox(["履歴取得エラー", err.message || err]));

  onChildAdded(ref(db, "chat_messages"), snap => {
    const d = snap.val();
    addMessageToDOM(d, currentUser.email);
  });
}

/* ---------- 送信 ---------- */
function sendMessage(text) {
  if (!currentUser) {
    alertBox("未ログインのため送信できません");
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    alertBox("空メッセージは送信できません");
    return;
  }

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const date = now.toLocaleDateString("ja-JP");

  const msg = {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: trimmed,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime()
  };

  push(ref(db, "chat_messages"), msg)
    .then(() => {
      chatInput.value = "";
      addMessageToDOM(msg, currentUser.email);
    })
    .catch(err => {
      alertBox(["送信失敗", err.message || err]);
    });
}

/* ---------- 認証 ---------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }

  currentUser = {
    email: user.email,
    uid: user.uid,
    name: user.displayName || user.email
  };
  initChat();
});

/* ---------- イベント登録 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  chatContainer = document.getElementById("chat-container");
  chatInput = document.getElementById("chat-input");
  sendBtn = document.getElementById("send-btn");

  sendBtn.addEventListener("click", () => sendMessage(chatInput.value));

  chatInput.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });
});
