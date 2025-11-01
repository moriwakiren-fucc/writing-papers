// main.js（動作保証版）
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

let currentUser = null;

// ✅ DOM読み込み後に実行
window.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  if (!chatContainer || !chatInput || !sendBtn) {
    alert("必要な要素が見つかりません（HTMLのidを確認してください）");
    return;
  }

  const members = [
    { email: "moriwaki@ren.ronbun", name: "森脇 廉" },
    { email: "muraya@kaho.ronbun", name: "村谷 佳穂" },
    { email: "kojo@yuina.ronbun", name: "小城 結菜" },
    { email: "nakano@aiko.ronbun", name: "中野 愛子" },
    { email: "kamimoto@yuta.ronbun", name: "神元 佑太" },
    { email: "sadahira@koto.ronbun", name: "定平 琴" },
    { email: "sunada@suzu.ronbun", name: "砂田 紗々" }
  ];

  onAuthStateChanged(auth, user => {
    if (!user) {
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

  // ✅ メッセージ送信
  function sendMessage(text) {
    if (!currentUser) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const date = now.toLocaleDateString("ja-JP");

    const messageRef = ref(db, "chat_messages");
    push(messageRef, {
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      text: trimmed,
      timestamp: `${hh}:${mm}`,
      date,
      timeValue: now.getTime()
    });
    chatInput.value = "";
  }

  // ✅ DOM描画
  function addMessageToDOM(msg) {
    const isMine = msg.senderEmail === currentUser.email;
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
    time.textContent = msg.timestamp || "";
    wrapper.appendChild(time);

    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // ✅ 初期ロード
  function initChat() {
    const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
    get(messagesRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).forEach(d => addMessageToDOM(d));
      }
    });

    onChildAdded(ref(db, "chat_messages"), snap => {
      addMessageToDOM(snap.val());
    });
  }

  // ✅ 送信ボタン
  sendBtn.addEventListener("click", () => sendMessage(chatInput.value));

  // ✅ Ctrl+Enter or Cmd+Enter で送信
  chatInput.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });
});
