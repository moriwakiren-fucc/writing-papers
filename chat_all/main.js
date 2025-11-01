// main.js (モジュール)
// Firebase Realtime DB と Auth（login/firebase-config.js が初期化済みで export している想定）import { db, auth } from "../login/firebase-config.js";
import {
  ref,
  onValue,
  push,
  set,
  update,
  get,
  child,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const messagesDiv = document.getElementById("messages");

let currentUser = null;

// ========================
// ログイン状態の監視
// ========================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("ログイン中:", user.email);
    startChat();
  } else {
    window.location.href = "../login/index.html";
  }
});

// ========================
// チャットの読み込みと既読反映
// ========================
function startChat() {
  const messagesRef = ref(db, "chat_all/messages");

  onValue(messagesRef, async (snapshot) => {
    const data = snapshot.val();
    messagesDiv.innerHTML = "";

    if (!data) return;

    const entries = Object.entries(data);

    for (const [key, msg] of entries) {
      const msgElement = document.createElement("div");
      msgElement.classList.add("message");
      msgElement.classList.add(
        msg.uid === currentUser.uid ? "my-message" : "other-message"
      );

      // 既読人数
      const readCount = msg.readBy ? Object.keys(msg.readBy).length : 0;

      msgElement.innerHTML = `
        <div class="bubble">
          <p>${msg.text}</p>
          <div class="time-read ${
            msg.uid === currentUser.uid ? "left" : "right"
          }">
            <span class="time">${msg.time}</span><br>
            <span class="read">既読 ${readCount}人</span>
          </div>
        </div>
      `;

      messagesDiv.appendChild(msgElement);

      // ✅ 自分が既読していないメッセージを即時更新
      if (!msg.readBy || !msg.readBy[currentUser.uid]) {
        const readPath = `chat_all/messages/${key}/readBy/${currentUser.uid}`;
        await set(ref(db, readPath), true);
      }
    }

    // スクロールを常に下に
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// ========================
// メッセージ送信
// ========================
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  const newMsgRef = push(ref(db, "chat_all/messages"));
  await set(newMsgRef, {
    uid: currentUser.uid,
    text: text,
    time: time,
    readBy: { [currentUser.uid]: true }, // 自分は送信時点で既読
  });

  messageInput.value = "";
}


/* -------------------------
   メッセージDOM生成
--------------------------*/
function addMessageToDOM(msg) {
  const isMine = (msg.senderEmail === currentUser.email);

  const dateId = `date-${msg.date.replace(/\//g, '-')}`;
  if (!document.getElementById(dateId)) {
    const div = document.createElement("div");
    div.id = dateId;
    div.className = "date-divider";
    div.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(div);
  }

  const row = document.createElement("div");
  row.className = "message-row";

  // 吹き出し
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + (isMine ? "right" : "left");
  if (!msg.readBy.includes(currentUser.email)) bubble.classList.add("unread");

  // 送信者名（吹き出し外）
  const senderEl = document.createElement("div");
  senderEl.className = "sender";
  senderEl.style.marginBottom = "0.5em";
  senderEl.textContent = msg.senderName || msg.senderEmail;

  // 本文
  const textEl = document.createElement("div");
  textEl.className = "bubble-text";
  let safeText = escapeHtml(msg.text || "")
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  textEl.innerHTML = safeText;
  bubble.appendChild(textEl);

  // ファイルプレビュー
  if (msg.fileType && msg.fileURL) {
    if (msg.fileType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = msg.fileURL;
      img.className = "bubble-media";
      bubble.appendChild(img);
    } else if (msg.fileType.startsWith("video/")) {
      const wrapper = document.createElement("div");
      wrapper.className = "video-thumb";
      const img = document.createElement("img");
      img.src = msg.thumbURL || msg.fileURL;
      img.className = "bubble-media";
      const overlay = document.createElement("div");
      overlay.className = "thumb-overlay";
      overlay.innerHTML = `<div class="play">▶︎</div>`;
      wrapper.appendChild(img);
      wrapper.appendChild(overlay);
      wrapper.addEventListener("click", () => {
        videoPlayer.src = msg.fileURL;
        videoModal.classList.add("show");
      });
      bubble.appendChild(wrapper);
    } else {
      const link = document.createElement("a");
      link.href = msg.fileURL;
      link.target = "_blank";
      link.textContent = msg.fileName || "ファイルを開く";
      bubble.appendChild(link);
    }
  }

  // --- 🔽 ここを修正（既読と時刻のレイアウト） ---
  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const timeEl = document.createElement("div");
  timeEl.className = "meta-time";
  timeEl.textContent = msg.timestamp || "";
  const readEl = document.createElement("div");
  readEl.className = "meta-read";
  readEl.textContent = `既読：${(msg.readBy || []).length}`;
  meta.appendChild(timeEl);
  meta.appendChild(readEl);

  // 既読者一覧（ダブルクリック）
  bubble.addEventListener("dblclick", () => {
    const readers = (msg.readBy || []).map(e => {
      const m = members.find(x => x.email === e);
      return m ? m.name : e;
    });
    alert(`既読者：\n${readers.join("\n") || "(なし)"}`);
  });

  // 並べ方調整（吹き出し外の左右配置）
  if (isMine) {
    const metaWrapper = document.createElement("div");
    metaWrapper.className = "meta-wrapper left";
    metaWrapper.appendChild(meta);
    row.appendChild(metaWrapper);
    row.appendChild(bubble);
  } else {
    row.appendChild(bubble);
    const metaWrapper = document.createElement("div");
    metaWrapper.className = "meta-wrapper right";
    metaWrapper.appendChild(meta);
    row.appendChild(metaWrapper);
  }

  chatContainer.appendChild(senderEl);
  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   HTMLエスケープ
--------------------------*/
function escapeHtml(s) {
  return s ? s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) : "";
}

/* -------------------------
   チャット初期化
--------------------------*/
let initialized = false;
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
  get(messagesRef).then(snapshot => {
    if (snapshot.exists()) {
      Object.entries(snapshot.val()).forEach(([key, d]) => addMessageToDOM({...d, id:key}));
    }
  });

  const liveRef = ref(db, "chat_messages");
  onChildAdded(liveRef, snap => {
    const d = snap.val();
    addMessageToDOM({...d, id: snap.key});
    if (!d.readBy || !d.readBy.includes(currentUser.email)) {
      update(ref(db, `chat_messages/${snap.key}`), {
        readBy: [...(d.readBy || []), currentUser.email]
      });
    }
  });
}

/* -------------------------
   ファイル送信
--------------------------*/
async function uploadFileAndSend(file) {
  try {
    const now = Date.now();
    const sRef = storageRef(storage, `chat_files/${now}_${file.name}`);
    await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);

    if (file.type.startsWith("video/")) {
      const thumb = await captureVideoThumbnail(file);
      let thumbURL = null;
      if (thumb) {
        const tRef = storageRef(storage, `chat_files/thumb_${now}.png`);
        await uploadBytes(tRef, thumb);
        thumbURL = await getDownloadURL(tRef);
      }
      sendMessage({ fileType: file.type, fileURL: url, thumbURL, fileName: file.name });
    } else {
      sendMessage({ fileType: file.type, fileURL: url, fileName: file.name });
    }
  } catch (e) {
    console.error("upload failed:", e);
  }
}

/* -------------------------
   動画サムネ生成
--------------------------*/
function captureVideoThumbnail(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.src = url;
    v.muted = true;
    v.addEventListener("loadeddata", () => {
      v.currentTime = 0.1;
    }, { once: true });
    v.addEventListener("seeked", () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      c.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, "image/png");
    });
    v.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });
  });
}

/* -------------------------
   イベント
--------------------------*/
sendBtn.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (text) {
    sendMessage({ text });
    chatInput.value = "";
  }
});

chatInput.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    sendBtn.click();
  }
});

fileBtn.addEventListener("click", () => {
  const i = document.createElement("input");
  i.type = "file";
  i.onchange = () => {
    if (i.files[0]) uploadFileAndSend(i.files[0]);
  };
  i.click();
});

videoClose.addEventListener("click", () => {
  videoPlayer.pause();
  videoModal.classList.remove("show");
});
videoModal.addEventListener("click", e => {
  if (e.target === videoModal) videoClose.click();
});
