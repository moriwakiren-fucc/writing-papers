import { db, auth } from "../login/firebase-config.js";
import { ref, push, onChildAdded, update, get, child } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

// ユーザー情報（ログインユーザー）
const currentUser = { email: "me@example.com", name: "私" };

// メンバーリスト
const members = [
  {email: "moriwaki@ren.ronbun", name: "森脇 廉"},
  {email: "muraya@kaho.ronbun", name: "村谷 佳穂"},
  {email: "kojo@yuina.ronbun", name: "小城 結菜"},
  {email: "nakano@aiko.ronbun", name: "中野 愛子"},
  {email: "kamimoto@yuta.ronbun", name: "神元 佑太"},
  {email: "sadahira@koto.ronbun", name: "定平 琴"},
  {email: "sunada@suzu.ronbun", name: "砂田 紗々"}
];

const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");

// メッセージ送信
function sendMessage(text) {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  const messageRef = ref(db, "chat_messages");
  push(messageRef, {
    senderEmail: currentUser.email,
    text,
    timestamp: `${hh}:${mm}`,
    readBy: [currentUser.email]
  });
}

// 受信・表示
const messagesRef = ref(db, "chat_messages");
import { ref, push, onChildAdded, update, get, child } 
  from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

// 👇 これを追加
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
const dbRef = ref(db, "chat_messages");

// ページ読み込み時に過去のメッセージを全部取得
get(dbRef).then(snapshot => {
  if (snapshot.exists()) {
    const messages = snapshot.val();
    Object.entries(messages).forEach(([key, data]) => {
      const readCount = data.readBy ? data.readBy.length : 0;
      addMessage({
        id: key,
        sender: members.find(m => m.email === data.senderEmail)?.name || data.senderEmail,
        text: data.text,
        readCount,
        readers: data.readBy || [],
        time: data.timestamp,
        read: !data.readBy.includes(currentUser.email)
      });
    });
  }
});

onChildAdded(messagesRef, (snapshot) => {
  const data = snapshot.val();
  const key = snapshot.key;

  // 誰が既読か判定
  const readCount = data.readBy ? data.readBy.length : 0;

  addMessage({
    id: key,
    sender: members.find(m => m.email === data.senderEmail)?.name || data.senderEmail,
    text: data.text,
    readCount,
    readers: data.readBy || [],
    time: data.timestamp,
    read: !data.readBy.includes(currentUser.email)
  });

  // ローカルで自分の既読に追加
  if (!data.readBy.includes(currentUser.email)) {
    const updateRef = ref(db, `chat_messages/${key}/readBy`);
    update(updateRef, [...(data.readBy || []), currentUser.email]);
  }
});

// DOMにメッセージ追加
function addMessage(message) {
  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", message.sender === "私" ? "right" : "left");
  if (message.read) bubble.classList.add("unread");

  // 他者の送信者名
  if (message.sender !== "私") {
    const senderEl = document.createElement("div");
    senderEl.classList.add("sender");
    senderEl.textContent = message.sender;
    bubble.appendChild(senderEl);
  }

  const textEl = document.createElement("div");
  textEl.innerHTML = message.text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  );
  bubble.appendChild(textEl);

  const readEl = document.createElement("div");
  readEl.classList.add("read-status");
  readEl.textContent = `既読：${message.readCount}`;

  const timeEl = document.createElement("div");
  timeEl.classList.add("timestamp");
  timeEl.textContent = message.time;

  bubble.appendChild(readEl);
  bubble.appendChild(timeEl);

  bubble.addEventListener("dblclick", () => {
    alert(`既読順：${message.readers.join(", ")}`);
  });

  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 送信ボタン
sendBtn.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  sendMessage(text);
  chatInput.value = "";
});

// Enterで送信
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

// ファイル送信
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
