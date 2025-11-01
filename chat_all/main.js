// main.js
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

/* -------------------------
   メンバー一覧
--------------------------*/
let currentUser = null;
const members = [
  { email: "moriwaki@ren.ronbun", name: "森脇 廉" },
  { email: "muraya@kaho.ronbun", name: "村谷 佳穂" },
  { email: "kojo@yuina.ronbun", name: "小城 結菜" },
  { email: "nakano@aiko.ronbun", name: "中野 愛子" },
  { email: "kamimoto@yuta.ronbun", name: "神元 佑太" },
  { email: "sadahira@koto.ronbun", name: "定平 琴" },
  { email: "sunada@suzu.ronbun", name: "砂田 紗々" }
];

/* -------------------------
   DOM 要素
--------------------------*/
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

/* -------------------------
   Firebase 認証チェック
--------------------------*/
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../login/index.html?v=" + Math.floor(Math.random() * 1000000);
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
   メッセージ送信
--------------------------*/
function sendMessage(text) {
  if (!currentUser) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const date = now.toLocaleDateString("ja-JP");

  const msgRef = ref(db, "chat_messages");
  push(msgRef, {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: trimmed,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime()
  });

  chatInput.value = "";
}

/* -------------------------
   メッセージ表示
--------------------------*/
function addMessageToDOM(msg) {
  const isMine = (msg.senderEmail === currentUser.email);

  // 日付ごとに区切りを作成
  const dateId = `date-${msg.date.replace(/\//g, "-")}`;
  if (!document.getElementById(dateId)) {
    const divider = document.createElement("div");
    divider.id = dateId;
    divider.className = "date-divider";
    divider.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(divider);
  }

  // 各メッセージのラッパー
  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  // 相手のメッセージには送信者名を表示
  if (!isMine) {
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = msg.senderName || msg.senderEmail;
    wrapper.appendChild(sender);
  }

  // 吹き出し部分
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;
  bubble.textContent = msg.text;
  wrapper.appendChild(bubble);

  // 時刻表示（位置はCSSで制御）
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
let initialized = false;
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));

  // 履歴取得
  get(messagesRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach(d => addMessageToDOM(d));
    }
  });

  // リアルタイム反映
  onChildAdded(ref(db, "chat_messages"), (snap) => {
    const d = snap.val();
    addMessageToDOM(d);
  });
}

/* -------------------------
   送信ボタン & キー操作
--------------------------*/
sendBtn.addEventListener("click", () => {
  sendMessage(chatInput.value);
});

// Ctrl+Enter / Cmd+Enter で送信
chatInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});
