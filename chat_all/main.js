// main.js（console.log を一切使わない完全版）
// Realtime DB のみ使用。ファイル・既読機能なし。
// 重要: このファイルは </body> 直前で読み込まれることを想定。

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
   メンバー情報（表示名マップ）
--------------------------*/
const members = [
  { email: "moriwaki@ren.ronbun", name: "森脇 廉" },
  { email: "muraya@kaho.ronbun", name: "村谷 佳穂" },
  { email: "kojo@yuina.ronbun", name: "小城 結菜" },
  { email: "nakano@aiko.ronbun", name: "中野 愛子" },
  { email: "kamimoto@yuta.ronbun", name: "神元 佑太" },
  { email: "sadahira@koto.ronbun", name: "定平 琴" },
  { email: "sunada@suzu.ronbun", name: "砂田 紗々" }
];

let currentUser = null;

/* -------------------------
   DOM 要素（script は body 直前で読み込まれる想定）
--------------------------*/
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

/* -------------------------
   認証チェック（ログイン必須）
--------------------------*/
onAuthStateChanged(auth, user => {
  if (!user) {
    // 未ログインはログイン画面へ（乱数付与は HTML 側で行う）
    window.location.href = "../login/index.html";
    return;
  }

  const member = members.find(m => m.email === user.email);
  currentUser = {
    email: user.email,
    uid: user.uid,
    name: member ? member.name : user.email
  };

  initChat();
});

/* -------------------------
   送信：DB に push
--------------------------*/
function sendMessage(text) {
  if (!currentUser) return;
  if (!text || !text.trim()) return;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const date = now.toLocaleDateString("ja-JP");

  const messageRef = ref(db, "chat_messages");
  push(messageRef, {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: text.trim(),
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime()
  });

  chatInput.value = "";
}

/* -------------------------
   メッセージ表示（DOM生成）
   - 自分: 右寄せ、時刻は左下（.mine-time）
   - 他人: 左寄せ、送信者名上、時刻は右下（.theirs-time）
--------------------------*/
function addMessageToDOM(msg) {
  if (!msg || !msg.timestamp) return;

  const isMine = (msg.senderEmail === currentUser.email);

  // 日付区切り
  const dateId = `date-${(msg.date || "").replace(/\//g, "-")}`;
  if (!document.getElementById(dateId)) {
    const d = document.createElement("div");
    d.id = dateId;
    d.className = "date-divider";
    d.textContent = `--- ${msg.date || ""} ---`;
    chatContainer.appendChild(d);
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  if (!isMine) {
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = msg.senderName || msg.senderEmail || "";
    wrapper.appendChild(sender);
  }

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;

  const textDiv = document.createElement("div");
  textDiv.className = "bubble-text";
  let safeText = escapeHtml(msg.text || "");
  safeText = safeText
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
  textDiv.innerHTML = safeText;

  bubble.appendChild(textDiv);
  wrapper.appendChild(bubble);

  const timeEl = document.createElement("div");
  timeEl.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
  timeEl.textContent = msg.timestamp || "";
  wrapper.appendChild(timeEl);

  chatContainer.appendChild(wrapper);
  // 常に最下部へスクロール
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   HTML エスケープ補助
--------------------------*/
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* -------------------------
   初期ロード & リアルタイム監視
--------------------------*/
let initialized = false;
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));

  // 履歴取得（存在すれば順に描画）
  get(messagesRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      // timeValue でソート済みの想定。Object.values を順に描画
      Object.values(data).forEach(d => addMessageToDOM(d));
    }
  }).catch(() => {
    // エラーは無視（UIは崩れない）
  });

  // リアルタイムで追加を監視
  onChildAdded(ref(db, "chat_messages"), snap => {
    const d = snap.val();
    addMessageToDOM(d);
  });
}

/* -------------------------
   イベント：送信（ボタン / Ctrl/Cmd+Enter）
--------------------------*/
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    sendMessage(chatInput.value);
  });
}
if (chatInput) {
  chatInput.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
    // Enter 単体は改行 (何もしない)
  });
}
