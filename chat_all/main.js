// main.js — Firebase v11 完全安定版（履歴＋送信）

import { db, auth } from "../login/firebase-config.js";
import {
  ref,
  push,
  onChildAdded,
  get,
  child
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* -------------------------
   HTMLエスケープ
--------------------------*/
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* -------------------------
   メッセージ描画
--------------------------*/
function addMessageToDOM(msg, currentUserEmail, chatContainer) {
  const isMine = msg.senderEmail === currentUserEmail;
  const dateId = `date-${msg.date.replace(/\//g, "-")}`;

  // 日付区切りを追加
  if (!document.getElementById(dateId)) {
    const divider = document.createElement("div");
    divider.id = dateId;
    divider.className = "date-divider";
    divider.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(divider);
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  // 他人メッセージには送信者名
  if (!isMine) {
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = msg.senderName || msg.senderEmail;
    wrapper.appendChild(sender);
  }

  // 吹き出し
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;
  bubble.innerHTML = escapeHtml(msg.text || "");
  wrapper.appendChild(bubble);

  // 時刻
  const time = document.createElement("div");
  time.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
  time.textContent = msg.timestamp || "";
  wrapper.appendChild(time);

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   チャット初期化
--------------------------*/
async function initChat(currentUser, chatContainer) {
  try {
    const snapshot = await get(child(ref(db), "chat_messages"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      // timeValueで並べ替え
      const messages = Object.values(data).sort((a, b) => (a.timeValue || 0) - (b.timeValue || 0));
      for (const d of messages) {
        addMessageToDOM(d, currentUser.email, chatContainer);
      }
    } else {
      alert("履歴がまだありません。");
    }
  } catch (err) {
    alert("履歴取得エラー: " + (err.message || err));
  }

  // 新着をリアルタイム追加
  onChildAdded(ref(db, "chat_messages"), (snap) => {
    const d = snap.val();
    addMessageToDOM(d, currentUser.email, chatContainer);
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
    .catch(err => {
      alert("送信エラー: " + (err.message || err));
    });
}

/* -------------------------
   DOM構築後に開始
--------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  let currentUser = null;

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

  sendBtn.addEventListener("click", () => {
    if (!currentUser) return;
    sendMessage(chatInput.value, currentUser, chatInput);
  });

  chatInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!currentUser) return;
      sendMessage(chatInput.value, currentUser, chatInput);
    }
  });
});
