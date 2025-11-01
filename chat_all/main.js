// chat_all/main.js
// ※ index.html が main.js?v=乱数 で読み込まれる想定（キャッシュ回避）
// Firebase config module should export { db, auth }
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
   設定
--------------------------*/
const MAX_FILE_BYTES = 1500000; // 1.5 MB 上限（安全な範囲）
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
const fileBtn = document.getElementById("file-btn");
const videoModal = document.getElementById("video-modal");
const videoPlayer = document.getElementById("video-player");
const videoClose = document.getElementById("video-close");

/* -------------------------
   認証チェック
--------------------------*/
onAuthStateChanged(auth, user => {
  if (!user) {
    // ログインページへ（乱数付きでキャッシュ回避）
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
   メッセージ送信（DBにpush）
   - text または fileData を含むオブジェクトを送る
   - 既読は今回は扱わない
--------------------------*/
function sendMessage(payload) {
  // payload: { text?, fileType?, fileData?, thumbData? , fileName? }
  if (!currentUser) return;
  if (!payload || (!(payload.text && payload.text.trim()) && !payload.fileData)) return;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const date = now.toLocaleDateString("ja-JP");

  const messageRef = ref(db, "chat_messages");
  push(messageRef, {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: (payload.text || "").trim(),
    fileType: payload.fileType || null,
    fileData: payload.fileData || null,     // dataURL を入れる（画像や小さな動画）
    thumbData: payload.thumbData || null,   // 動画のサムネイル（dataURL）
    fileName: payload.fileName || null,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime()
  });

  // clear input if text sent
  if (payload.text) chatInput.value = "";
}

/* -------------------------
   メッセージを DOM に追加
   - UI: 自分のメッセは右寄せ、時刻は左下
   - 他人のメッセは左寄せ、送信者名を上に、時刻は右下
--------------------------*/
function addMessageToDOM(msg) {
  const isMine = (msg.senderEmail === currentUser.email);

  // 日付区切り
  const dateId = `date-${(msg.date || "").replace(/\//g, "-")}`;
  if (!document.getElementById(dateId)) {
    const div = document.createElement("div");
    div.id = dateId;
    div.className = "date-divider";
    div.textContent = `--- ${msg.date || ""} ---`;
    chatContainer.appendChild(div);
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  // 他人なら送信者名を上に表示
  if (!isMine) {
    const senderEl = document.createElement("div");
    senderEl.className = "sender";
    senderEl.textContent = msg.senderName || msg.senderEmail;
    wrapper.appendChild(senderEl);
  }

  // 吹き出し
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;

  // テキスト部分
  if (msg.text) {
    const textDiv = document.createElement("div");
    textDiv.className = "bubble-text";
    let safeText = escapeHtml(msg.text || "");
    safeText = safeText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    safeText = safeText
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
    textDiv.innerHTML = safeText;
    bubble.appendChild(textDiv);
  }

  // ファイル表示（dataURL 保存を想定）
  if (msg.fileType && msg.fileData) {
    if (msg.fileType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = msg.fileData;
      img.className = "bubble-media";
      bubble.appendChild(img);
    } else if (msg.fileType.startsWith("video/")) {
      // サムネ表示（thumbData があればそれを、なければ fileData へ試みる）
      const wrapperThumb = document.createElement("div");
      wrapperThumb.className = "video-thumb";
      const thumbImg = document.createElement("img");
      thumbImg.className = "bubble-media";
      thumbImg.src = msg.thumbData || msg.fileData; // thumbData preferable
      wrapperThumb.appendChild(thumbImg);

      const overlay = document.createElement("div");
      overlay.className = "thumb-overlay";
      overlay.innerHTML = `<div class="play">▶︎</div>`;
      wrapperThumb.appendChild(overlay);

      // クリックで全画面再生（base64 -> blob -> URL）
      wrapperThumb.addEventListener("click", async () => {
        // try to turn dataURL into blob URL
        try {
          const blob = await dataURLToBlob(msg.fileData);
          const objectUrl = URL.createObjectURL(blob);
          videoPlayer.src = objectUrl;
          videoModal.classList.add("show");
          videoModal.setAttribute("aria-hidden", "false");
        } catch (e) {
          alert("動画再生に失敗しました（ファイル形式またはサイズ）。");
          console.error(e);
        }
      });

      bubble.appendChild(wrapperThumb);
    } else {
      // その他ファイル -> 表示はファイル名とダウンロードリンク（dataURL）
      const fileEl = document.createElement("div");
      const a = document.createElement("a");
      a.href = msg.fileData;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = msg.fileName || "ファイルを開く";
      fileEl.appendChild(a);
      bubble.appendChild(fileEl);
    }
  }

  wrapper.appendChild(bubble);

  // 時刻（自分は左下、他人は右下）
  const timeEl = document.createElement("div");
  timeEl.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
  timeEl.textContent = msg.timestamp || "";
  wrapper.appendChild(timeEl);

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   ヘルパー：dataURL を Blob に変換
--------------------------*/
function dataURLToBlob(dataURL) {
  return fetch(dataURL).then(res => res.blob());
}

/* -------------------------
   HTML エスケープ
--------------------------*/
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* -------------------------
   初期ロード & リアルタイム監視
   - onChildAdded で新着を DOM に追加
--------------------------*/
let initialized = false;
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));

  // まず履歴を取得して順に表示
  get(messagesRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      // data はオブジェクト（キー順は timeValue 昇順の保証あり）
      Object.values(data).forEach(d => {
        addMessageToDOM(d);
      });
    }
  }).catch(e => console.error("history error:", e));

  // リアルタイムで子要素追加を監視
  onChildAdded(ref(db, "chat_messages"), (snap) => {
    const d = snap.val();
    addMessageToDOM(d);
  });
}

/* -------------------------
   ファイル送信（Base64 / dataURL）処理
   - 画像: dataURL にして送信
   - 動画: サイズ制限内なら動画自体を dataURL にして送信 + サムネ生成
   - それ以外: dataURL を送信（小さめファイル向け）
--------------------------*/
fileBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "*/*";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      alert("ファイルが大きすぎます（上限 1.5MB）。短くするか外部サービスを利用してください。");
      return;
    }

    // 画像は dataURL にして送信
    if (file.type.startsWith("image/")) {
      const dataUrl = await fileToDataURL(file);
      sendMessage({ fileType: file.type, fileData: dataUrl, fileName: file.name });
      return;
    }

    // 動画はサムネを生成してから dataURL で送る（サイズが小さければ可）
    if (file.type.startsWith("video/")) {
      const dataUrl = await fileToDataURL(file);
      const thumbBlob = await captureVideoThumbnail(file);
      let thumbData = null;
      if (thumbBlob) {
        thumbData = await blobToDataURL(thumbBlob);
      }
      sendMessage({ fileType: file.type, fileData: dataUrl, thumbData, thumbData, fileName: file.name, thumbData });
      return;
    }

    // その他（PDF等）: dataURL にして送る（1ページ目の画像変換は未実装）
    const dataUrl = await fileToDataURL(file);
    sendMessage({ fileType: file.type, fileData: dataUrl, fileName: file.name });
  };
  input.click();
});

/* -------------------------
   ファイルユーティリティ
--------------------------*/
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
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

    v.addEventListener("loadeddata", () => {
      // try to capture at 0.1s for some formats
      try { v.currentTime = 0.1; } catch(e) { v.currentTime = 0; }
    }, { once: true });

    v.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth || 320;
      canvas.height = v.videoHeight || 180;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, "image/png");
    }, { once: true });

    v.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });

    // タイムアウト
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 10000);
  });
}

/* -------------------------
   送信ショートカット：Ctrl/Cmd+Enter で送信、Enter は改行
--------------------------*/
sendBtn.addEventListener("click", () => {
  sendMessage({ text: chatInput.value });
});

chatInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    sendMessage({ text: chatInput.value });
    return;
  }
  // Enter 単独は改行（何もしない）
});

/* -------------------------
   動画モーダルのクローズ
--------------------------*/
if (videoClose) {
  videoClose.addEventListener("click", () => {
    videoPlayer.pause();
    videoPlayer.src = "";
    videoModal.classList.remove("show");
    videoModal.setAttribute("aria-hidden", "true");
  });
  videoModal.addEventListener("click", (e) => {
    if (e.target === videoModal) videoClose.click();
  });
}
