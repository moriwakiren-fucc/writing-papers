// main.js — Firebase v11対応・完全安定版（v=乱数なし）

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
   デバッグ用ステータス表示
--------------------------*/
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
      lineHeight: "1.4"
    });
    document.body.appendChild(box);
  }
  box.innerHTML = Array.isArray(text)
    ? text.map(t => `<div>${t}</div>`).join("")
    : `<div>${text}</div>`;
}

/* -------------------------
   DOM要素取得
--------------------------*/
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

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
function addMessageToDOM(msg, currentUserEmail) {
  const isMine = (msg.senderEmail === currentUserEmail);
  const dateKey = msg.date.replace(/\//g, "-");
  const dateId = `date-${dateKey}`;

  // 日付ごとに区切りを追加
  if (!document.getElementById(dateId)) {
    const div = document.createElement("div");
    div.id = dateId;
    div.className = "date-divider";
    div.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(div);
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  // 他人のメッセージには名前を表示
  if (!isMine) {
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = msg.senderName || msg.senderEmail;
    wrapper.appendChild(sender);
  }

  // 吹き出し
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;
  bubble.textContent = msg.text;
  wrapper.appendChild(bubble);

  // 時刻
  const time = document.createElement("div");
  time.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
  time.textContent = msg.timestamp;
  wrapper.appendChild(time);

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   状態変数
--------------------------*/
let currentUser = null;
let initialized = false;
const loadedKeys = new Set(); // ←既読済みメッセージ防止

/* -------------------------
   チャット初期化
--------------------------*/
async function initChat() {
  if (initialized) return;
  initialized = true;

  try {
    const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
    const snapshot = await get(messagesRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([key, d]) => {
        loadedKeys.add(key); // ←重複回避
        addMessageToDOM(d, currentUser.email);
      });
      statusBox(["履歴取得完了", `user: ${currentUser.email}`]);
    } else {
      statusBox(["履歴なし", `user: ${currentUser.email}`]);
    }

    // ★ onChildAdded は履歴取得後に1回だけ設定
    const liveRef = ref(db, "chat_messages");
    onChildAdded(liveRef, (snap) => {
      if (loadedKeys.has(snap.key)) return; // ←ここで無限ループ防止
      loadedKeys.add(snap.key);
      const d = snap.val();
      addMessageToDOM(d, currentUser.email);
    });

  } catch (err) {
    statusBox(["履歴取得エラー", err.message || err]);
  }
}

/* -------------------------
   メッセージ送信
--------------------------*/
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

  push(ref(db, "chat_messages"), msg)
    .then(() => {
      chatInput.value = "";
      statusBox(["送信成功", trimmed]);
    })
    .catch(err => {
      statusBox(["送信失敗", err.message || err]);
    });
}

/* -------------------------
   認証確認
--------------------------*/
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
  statusBox(["認証OK", `user: ${user.email}`]);
});

/* -------------------------
   イベント設定
--------------------------*/
sendBtn.addEventListener("click", () => sendMessage(chatInput.value));

chatInput.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});
