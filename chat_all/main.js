import { db } from "../login/firebase-config.js";
import {
  ref,
  push,
  onChildAdded,
  update,
  get,
  child,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

// ==============================
// メンバー定義
// ==============================
const currentUser = { email: "me@example.com", name: "私" };
const members = [
  { email: "me@example.com", name: "私" },
  { email: "user1@example.com", name: "山田" },
  { email: "user2@example.com", name: "佐藤" }
];

// ==============================
// DOM取得
// ==============================
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");

// ==============================
// メッセージ送信
// ==============================
function sendMessage(text) {
  const now = new Date();
  const date = now.toLocaleDateString("ja-JP");
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  const messageRef = ref(db, "chat_messages");
  push(messageRef, {
    senderEmail: currentUser.email,
    text,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime(), // 並び替え用
    readBy: [currentUser.email]
  });
}

// ==============================
// メッセージ表示（追加または履歴用）
// ==============================
function addMessage(message) {
  const dateId = `date-${message.date.replace(/\//g, "-")}`;

  // 日付区切りがまだなければ追加
  if (!document.getElementById(dateId)) {
    const dateDivider = document.createElement("div");
    dateDivider.classList.add("date-divider");
    dateDivider.id = dateId;
    dateDivider.textContent = `--- ${message.date} ---`;
    chatContainer.appendChild(dateDivider);
  }

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", message.sender === "私" ? "right" : "left");
  if (message.read) bubble.classList.add("unread");

  // 送信者名
  if (message.sender !== "私") {
    const senderEl = document.createElement("div");
    senderEl.classList.add("sender");
    senderEl.textContent = message.sender;
    bubble.appendChild(senderEl);
  }

  // 本文（URLリンク化）
  const textEl = document.createElement("div");
  textEl.innerHTML = message.text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  );
  bubble.appendChild(textEl);

  // 既読数
  const readEl = document.createElement("div");
  readEl.classList.add("read-status");
  readEl.textContent = `既読：${message.readCount}`;
  bubble.appendChild(readEl);

  // 時刻
  const timeEl = document.createElement("div");
  timeEl.classList.add("timestamp");
  timeEl.textContent = message.time;
  bubble.appendChild(timeEl);

  // 既読者確認
  bubble.addEventListener("dblclick", () => {
    alert(`既読順：${message.readers.join(", ")}`);
  });

  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ==============================
// 履歴取得（日時順）
// ==============================
const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
get(messagesRef).then(snapshot => {
  if (snapshot.exists()) {
    const messages = Object.entries(snapshot.val()).map(([key, data]) => ({
      id: key,
      sender: members.find(m => m.email === data.senderEmail)?.name || data.senderEmail,
      text: data.text,
      readCount: data.readBy ? data.readBy.length : 0,
      readers: data.readBy || [],
      time: data.timestamp,
      date: data.date,
      read: !data.readBy.includes(currentUser.email)
    }));

    messages.sort((a, b) => new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time));

    messages.forEach(m => addMessage(m));
  }
});

// ==============================
// リアルタイム更新
// ==============================
onChildAdded(messagesRef, (snapshot) => {
  const data = snapshot.val();
  const key = snapshot.key;

  const readCount = data.readBy ? data.readBy.length : 0;

  addMessage({
    id: key,
    sender: members.find(m => m.email === data.senderEmail)?.name || data.senderEmail,
    text: data.text,
    readCount,
    readers: data.readBy || [],
    time: data.timestamp,
    date: data.date,
    read: !data.readBy.includes(currentUser.email)
  });

  // 自分が未読なら既読に追加
  if (!data.readBy.includes(currentUser.email)) {
    const updateRef = ref(db, `chat_messages/${key}/readBy`);
    update(updateRef, [...(data.readBy || []), currentUser.email]);
  }
});

// ==============================
// イベント処理
// ==============================
sendBtn.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  sendMessage(text);
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
  input.multiple = true;
  input.onchange = () => {
    Array.from(input.files).forEach(file => {
      sendMessage(`[ファイル送信] ${file.name}`);
    });
  };
  input.click();
});
