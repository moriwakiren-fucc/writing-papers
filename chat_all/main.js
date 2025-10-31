// main.js (モジュール)
// Firebase Realtime DB と Auth（login/firebase-config.js が初期化済みで export している想定）
import { db, auth } from "../login/firebase-config.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import {
  ref,
  push,
  onChildAdded,
  update,
  get,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* -------------------------
   メンバー情報（メール→表示名）
   実運用では管理画面で同期してください
--------------------------*/
let currentUser = null; // { email, uid, name }
const members = [
  { email: "me@example.com", name: "私" },
  { email: "user1@example.com", name: "山田" },
  { email: "user2@example.com", name: "佐藤" }
];

// DOM 要素
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");
const videoModal = document.getElementById("video-modal");
const videoPlayer = document.getElementById("video-player");
const videoClose = document.getElementById("video-close");

// Firebase Storage 初期化（login側で app が初期化済みなら getStorage() で default app）
const storage = getStorage();

/* -------------------------
   認証チェック（ログイン必須）
--------------------------*/
onAuthStateChanged(auth, user => {
  if (!user) {
    // 未ログインならログインページへ
    window.location.href = "../login/index.html";
    return;
  }
  // ログイン済み：currentUser を設定（表示名は members 配列から取得）
  const email = user.email;
  const member = members.find(m => m.email === email);
  currentUser = {
    email,
    uid: user.uid,
    name: member ? member.name : email
  };
  // ここで初期ロードなどを実行
  initChat();
});

/* -------------------------
   送信 ： DB にメッセージを push
   (text か fileMeta のどちらか、または両方を含める)
--------------------------*/
function sendMessage(payload) {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const date = now.toLocaleDateString("ja-JP");

  const messageRef = ref(db, "chat_messages");
  push(messageRef, {
    senderEmail: currentUser.email,
    senderName: currentUser.name, // 保存しておくと便利
    text: payload.text || "",
    fileType: payload.fileType || null,
    fileURL: payload.fileURL || null,
    thumbURL: payload.thumbURL || null,
    fileName: payload.fileName || null,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime(),
    readBy: [currentUser.email] // 最初は自分を既読に
  });
}

/* -------------------------
   メッセージ DOM 追加
   — 吹き出し（bubble） とメタ情報（右側に時刻・既読）を分離して表示
--------------------------*/
function addMessageToDOM(msg) {
  // msg: { id, senderName, text, fileType, fileURL, thumbURL, fileName, timestamp, date, readBy }
  const isMine = (msg.senderEmail === currentUser.email);

  // 日付区切り
  const dateId = `date-${msg.date.replace(/\//g,'-')}`;
  if (!document.getElementById(dateId)) {
    const div = document.createElement("div");
    div.id = dateId;
    div.className = "date-divider";
    div.textContent = `--- ${msg.date} ---`;
    chatContainer.appendChild(div);
  }

  // 行ラッパー
  const row = document.createElement("div");
  row.className = "message-row";

  // 吹き出し
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + (isMine ? "right" : "left");
  if (msg.unread) bubble.classList.add("unread");

  // 他者なら送信者名を出す
  if (!isMine) {
    const senderEl = document.createElement("div");
    senderEl.className = "sender";
    senderEl.textContent = msg.senderName || msg.senderEmail;
    bubble.appendChild(senderEl);
  }

  // 本文（マークダウン対応の簡易処理）
  const textEl = document.createElement("div");
  textEl.className = "bubble-text";
  // URLリンク化
  let safeText = escapeHtml(msg.text || "");
  safeText = safeText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  // 簡易Markdown（**bold**, *italic*, `code`） — ほんの一部対応
  safeText = safeText
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  textEl.innerHTML = safeText;
  bubble.appendChild(textEl);

  // ファイル表示（画像 / 動画サムネイル / それ以外リンク）
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
      img.src = msg.thumbURL || msg.fileURL; // サムネがあれば表示、なければ動画URL
      img.className = "bubble-media";
      wrapper.appendChild(img);

      const overlay = document.createElement("div");
      overlay.className = "thumb-overlay";
      overlay.innerHTML = `<div class="play">▶︎</div>`;
      wrapper.appendChild(overlay);

      wrapper.addEventListener("click", () => {
        // 全画面動画再生
        videoPlayer.src = msg.fileURL;
        videoModal.classList.add("show");
        videoModal.setAttribute("aria-hidden", "false");
      });

      bubble.appendChild(wrapper);
    } else {
      // その他ファイル → 表示はファイル名とリンク（ダウンロード/新タブで開く）
      const fileEl = document.createElement("div");
      fileEl.innerHTML = `<a href="${msg.fileURL}" target="_blank" rel="noopener noreferrer">${escapeHtml(msg.fileName || 'ファイル')}</a>`;
      bubble.appendChild(fileEl);
    }
  }

  // メタ（時刻・既読数）は吹き出しの外に表示（要求通り）
  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const readCount = (msg.readBy ? msg.readBy.length : 0);
  const readEl = document.createElement("div");
  readEl.className = "meta-read";
  readEl.textContent = `既読：${readCount}`;
  const timeEl = document.createElement("div");
  timeEl.className = "meta-time";
  timeEl.textContent = msg.timestamp || "";

  meta.appendChild(readEl);
  meta.appendChild(timeEl);

  // ダブルクリックで既読者（名前）を表示
  bubble.addEventListener("dblclick", () => {
    const readers = (msg.readBy || []).map(email => {
      const m = members.find(x => x.email === email);
      return m ? m.name : email;
    });
    alert(`既読順：\n${readers.join("\n") || "(なし)"}`);
  });

  // 行に並べる：自分は [bubble][meta], 他者は [bubble][meta]（レイアウトはCSSで調整）
  row.appendChild(bubble);
  row.appendChild(meta);
  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   ヘルパー：HTMLエスケープ
--------------------------*/
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* -------------------------
   初期ロード：履歴取得 & リアルタイム監視
--------------------------*/
let initialized = false;
function initChat() {
  if (initialized) return;
  initialized = true;

  // 履歴取得（timeValueで昇順）
  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));
  get(messagesRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([key, d]) => {
        addMessageToDOM({
          id: key,
          senderEmail: d.senderEmail,
          senderName: d.senderName,
          text: d.text,
          fileType: d.fileType,
          fileURL: d.fileURL,
          thumbURL: d.thumbURL,
          fileName: d.fileName,
          timestamp: d.timestamp,
          date: d.date,
          readBy: d.readBy || []
        });
      });
    }
  }).catch(err => console.error("history error:", err));

  // リアルタイム：子要素追加を監視
  const liveRef = ref(db, "chat_messages");
  onChildAdded(liveRef, (snap) => {
    const d = snap.val();
    // リアルタイム追加
    addMessageToDOM({
      id: snap.key,
      senderEmail: d.senderEmail,
      senderName: d.senderName,
      text: d.text,
      fileType: d.fileType,
      fileURL: d.fileURL,
      thumbURL: d.thumbURL,
      fileName: d.fileName,
      timestamp: d.timestamp,
      date: d.date,
      readBy: d.readBy || []
    });

    // 自分が未読なら既読に追加（DB更新）
    if (!d.readBy || !d.readBy.includes(currentUser.email)) {
      const path = `chat_messages/${snap.key}/readBy`;
      update(ref(db, path), [...(d.readBy || []), currentUser.email]).catch(e => {
        console.error("update readBy failed:", e);
      });
    }
  });
}

/* -------------------------
   ファイルアップロード処理
   - 画像はそのまま保存して表示
   - 動画はアップロード後サムネを生成してthumbURLを保存
   - その他はアップロードしてリンクを作る
--------------------------*/
async function uploadFileAndSend(file) {
  try {
    const now = Date.now();
    const path = `chat_files/${now}_${file.name}`;
    const sRef = storageRef(storage, path);
    const snapshot = await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);

    if (file.type.startsWith("image/")) {
      // 画像はそのまま送信
      sendMessage({ fileType: file.type, fileURL: url, fileName: file.name });
      return;
    }

    if (file.type.startsWith("video/")) {
      // 動画：サムネイルを作る（最初のフレーム）
      const thumbBlob = await captureVideoThumbnail(file);
      let thumbURL = null;
      if (thumbBlob) {
        const thumbPath = `chat_files/thumb_${now}_${file.name}.png`;
        const tRef = storageRef(storage, thumbPath);
        await uploadBytes(tRef, thumbBlob);
        thumbURL = await getDownloadURL(tRef);
      }
      sendMessage({ fileType: file.type, fileURL: url, thumbURL, fileName: file.name });
      return;
    }

    // それ以外（PDF等）: まず送信ファイルとしてアップロードしてリンクを作る
    // ※ PDFの1ページ目を画像に変換する処理はここでは実装していません（クライアント側でPDF.jsが必要）。
    sendMessage({ fileType: file.type, fileURL: url, fileName: file.name });

  } catch (e) {
    console.error("upload failed:", e);
    alert("ファイル送信に失敗しました");
  }
}

/* -------------------------
   動画サムネ生成（最初のフレームを canvas に取り出す）
--------------------------*/
function captureVideoThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.muted = true;
    v.playsInline = true;

    // 再生可能になったら0秒へシークしてキャプチャ
    v.addEventListener("loadeddata", () => {
      // try to capture at 0.1s for some formats
      v.currentTime = 0.1;
    }, { once: true });

    v.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, "image/png");
    });

    // エラー時は null を返す
    v.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });

    // セーフティ：もし10秒で捕れなければ諦める
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 10000);
  });
}

/* -------------------------
   イベント：送信ボタン / Enter送信 / ファイル選択
--------------------------*/
sendBtn.addEventListener("click", () => {
  const text = chatInput.value;
  if (!text || !text.trim()) return;
  sendMessage({ text: text.trim() });
  chatInput.value = "";
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

// ファイル選択
fileBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = false;
  input.accept = "*/*";
  input.onchange = () => {
    const f = input.files[0];
    if (f) uploadFileAndSend(f);
  };
  input.click();
});

/* -------------------------
   動画モーダルのクローズ処理
--------------------------*/
videoClose.addEventListener("click", () => {
  videoPlayer.pause();
  videoPlayer.src = "";
  videoModal.classList.remove("show");
  videoModal.setAttribute("aria-hidden", "true");
});
videoModal.addEventListener("click", (e) => {
  if (e.target === videoModal) {
    videoClose.click();
  }
});

/* -------------------------
   既読者表示：DBから読者配列を取得して名前へ変換して返す
--------------------------*/
function readerNamesFromEmails(emails) {
  return (emails || []).map(email => {
    const m = members.find(x => x.email === email);
    return m ? m.name : email;
  });
}
