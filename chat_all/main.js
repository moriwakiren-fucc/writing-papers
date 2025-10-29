// メンバー情報リスト
const members = [
  { email: "me@example.com", name: "私" },
  { email: "user1@example.com", name: "山田" },
  { email: "user2@example.com", name: "佐藤" }
];

const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");

// 投稿を生成する関数
function addMessage(message) {
  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble");

  bubble.classList.add(message.sender === "私" ? "right" : "left");
  if (!message.read) bubble.classList.add("unread");

  // 送信者名（他者のみ）
  if (message.sender !== "私") {
    const senderEl = document.createElement("div");
    senderEl.classList.add("sender");
    senderEl.textContent = message.sender;
    bubble.appendChild(senderEl);
  }

  // メッセージ本文（URLをリンク化）
  const textEl = document.createElement("div");
  textEl.innerHTML = message.text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  );
  bubble.appendChild(textEl);

  // 既読数とタイムスタンプ
  const readEl = document.createElement("div");
  readEl.classList.add("read-status");
  readEl.textContent = `既読：${message.readCount}`;

  const timeEl = document.createElement("div");
  timeEl.classList.add("timestamp");
  timeEl.textContent = message.time;

  bubble.appendChild(readEl);
  bubble.appendChild(timeEl);

  // ダブルクリックで既読者リスト表示
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

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  addMessage({
    sender: "私",
    text,
    read: false,
    readCount: 0,
    readers: [],
    time: `${hh}:${mm}`
  });

  chatInput.value = "";
});

// Enterで送信
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

// 📂ボタンはファイル選択ダイアログを表示
fileBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.onchange = () => {
    Array.from(input.files).forEach(file => {
      addMessage({
        sender: "私",
        text: `[ファイル送信] ${file.name}`,
        read: false,
        readCount: 0,
        readers: [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });
  };
  input.click();
});
