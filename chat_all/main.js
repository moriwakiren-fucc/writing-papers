// main.js — Firebase v11 安定完全版
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

/* ---------- シンプルなデバッグ ---------- */
function info(msgs) {
  alert(Array.isArray(msgs) ? msgs.join("\n") : msgs);
}

/* ---------- DOM取得 ---------- */
let chatContainer, chatInput, sendBtn;

/* ---------- エスケープ ---------- */
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------- メッセージ描画 ---------- */
function addMessageToDOM(msg, currentUserEmail) {
  const isMine = msg.senderEmail === currentUserEmail;
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
const loadedKeys = new Set(); // ✅ 重複防止セット

/* ---------- 初期化 ---------- */
async function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));

  try {
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([key, d]) => {
        loadedKeys.add(key);
        addMessageToDOM(d, currentUser.email);
      });
      info(["履歴取得完了", `user: ${currentUser.email}`]);
    } else {
      info(["履歴なし", `user: ${currentUser.email}`]);
    }
  } catch (err) {
    info(["履歴取得エラー", err.message || err]);
  }

  // ✅ 新規メッセージのみリアルタイム追加
  onChildAdded(ref(db, "chat_messages"), snap => {
    const key = snap.key;
    if (!loadedKeys.has(key)) {
      loadedKeys.add(key);
      const d = snap.val();
      addMessageToDOM(d, currentUser.email);
    }
  });
}

/* ---------- メッセージ送信 ---------- */
function sendMessage(text) {
  if (!currentUser) {
    info("未ログインのため送信できません");
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

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
    })
    .catch(err => {
      info(["送信失敗", err.message || err]);
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

/* ---------- DOM イベント ---------- */
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
