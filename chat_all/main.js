// main.js — Firebase v11 完全安定版（履歴・送信とも正常動作）

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

/* -------------------------
   HTMLエスケープ関数
--------------------------*/
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* -------------------------
   メッセージをDOMに追加
--------------------------*/
function addMessageToDOM(msg, currentUserEmail, chatContainer) {
  const isMine = msg.senderEmail === currentUserEmail;

  // 日付区切りを追加（なければ）
  const dateId = `date-${msg.date.replace(/\//g, "-")}`;
  if (!document.getElementById(dateId)) {
    const divider = document.createElement("div");
    divider.id = dateId;
    divider.className = "date-divider";
    divider.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(divider);
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  // 他人のメッセージには送信者名
  if (!isMine) {
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = msg.senderName || msg.senderEmail;
    wrapper.appendChild(sender);
  }

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;
  bubble.innerHTML = escapeHtml(msg.text);
  wrapper.appendChild(bubble);

  const time = document.createElement("div");
  time.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
  time.textContent = msg.timestamp;
  wrapper.appendChild(time);

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   チャット初期化
--------------------------*/
async function initChat(currentUser, chatContainer) {
  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
  const loadedKeys = new Set();

  try {
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([key, d]) => {
        loadedKeys.add(key);
        addMessageToDOM(d, currentUser.email, chatContainer);
      });
    }
  } catch (err) {
    alert("履歴取得エラー: " + (err.message || err));
  }

  // 新規メッセージのみ追加
  onChildAdded(ref(db, "chat_messages"), (snap) => {
    const key = snap.key;
    if (!loadedKeys.has(key)) {
      loadedKeys.add(key);
      const d = snap.val();
      addMessageToDOM(d, currentUser.email, chatContainer);
    }
  });
}

/* -------------------------
   メッセージ送信
--------------------------*/
function sendMessage(text, currentUser, chatInput) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  push(ref(db, "chat_messages"), {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: trimmed,
    timestamp: `${hh}:${mm}`,
    date: now.toLocaleDateString("ja-JP"),
    timeValue: now.getTime()
  })
    .then(() => {
      chatInput.value = "";
    })
    .catch((err) => {
      alert("送信エラー: " + (err.message || err));
    });
}

/* -------------------------
   DOM読み込み後に全処理開始
--------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  let currentUser = null;

  // Firebase認証
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../login/index.html";
      return;
    }

    currentUser = {
      email: user.email,
      uid: user.uid,
      name: user.displayName || user.email
    };

    initChat(currentUser, chatContainer);
  });

  // ボタン送信
  sendBtn.addEventListener("click", () => {
    if (!currentUser) return;
    sendMessage(chatInput.value, currentUser, chatInput);
  });

  // Ctrl+Enter / Cmd+Enter送信
  chatInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!currentUser) return;
      sendMessage(chatInput.value, currentUser, chatInput);
    }
  });
});
