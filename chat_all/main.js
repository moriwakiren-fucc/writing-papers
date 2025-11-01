// main.js（確実動作版・console.logなし）
// 送信イベント確実発火＋レイアウト維持

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

window.onload = () => {
  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  if (!chatContainer || !chatInput || !sendBtn) return;

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

  function addMessageToDOM(msg) {
    if (!msg || !msg.timestamp) return;
    const isMine = msg.senderEmail === currentUser.email;

    const dateId = `date-${(msg.date || "").replace(/\//g, "-")}`;
    if (!document.getElementById(dateId)) {
      const divider = document.createElement("div");
      divider.id = dateId;
      divider.className = "date-divider";
      divider.textContent = `--- ${msg.date || ""} ---`;
      chatContainer.appendChild(divider);
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
    const textDiv = document.createElement("div");
    textDiv.className = "bubble-text";

    let safe = escapeHtml(msg.text || "");
    safe = safe
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
    textDiv.innerHTML = safe;
    bubble.appendChild(textDiv);
    wrapper.appendChild(bubble);

    const timeEl = document.createElement("div");
    timeEl.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
    timeEl.textContent = msg.timestamp || "";
    wrapper.appendChild(timeEl);

    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  let initialized = false;
  function initChat() {
    if (initialized) return;
    initialized = true;

    const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
    get(messagesRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).forEach(d => addMessageToDOM(d));
      }
    });

    onChildAdded(ref(db, "chat_messages"), snap => {
      const d = snap.val();
      addMessageToDOM(d);
    });
  }

  sendBtn.onclick = () => sendMessage(chatInput.value);

  chatInput.onkeydown = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  };
};
