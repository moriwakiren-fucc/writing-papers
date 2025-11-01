// main.js — 送信確実化版（console.logなし）
// 前提: ../login/firebase-config.js が `export const db, auth` を提供していること。

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

/* ---------- state ---------- */
let currentUser = null;
let initialized = false;
let sending = false; // 送信中フラグ（多重送信防止）

/* ---------- members（表示名マップ） ---------- */
const members = [
  { email: "moriwaki@ren.ronbun", name: "森脇 廉" },
  { email: "muraya@kaho.ronbun", name: "村谷 佳穂" },
  { email: "kojo@yuina.ronbun", name: "小城 結菜" },
  { email: "nakano@aiko.ronbun", name: "中野 愛子" },
  { email: "kamimoto@yuta.ronbun", name: "神元 佑太" },
  { email: "sadahira@koto.ronbun", name: "定平 琴" },
  { email: "sunada@suzu.ronbun", name: "砂田 紗々" }
];

/* ---------- DOM 要素取得（遅延: DOM が確実にある状態で実行する） ---------- */
function getDOM() {
  return {
    chatContainer: document.getElementById("chat-container"),
    chatInput: document.getElementById("chat-input"),
    sendBtn: document.getElementById("send-btn"),
    // 簡易メッセージ領域を作る（存在しなければ作る）
    infoArea: (function(){
      let el = document.getElementById("chat-info-area");
      if (!el) {
        el = document.createElement("div");
        el.id = "chat-info-area";
        el.style.position = "fixed";
        el.style.left = "50%";
        el.style.transform = "translateX(-50%)";
        el.style.bottom = "56px"; // 入力帯の上
        el.style.zIndex = "999";
        el.style.padding = "6px 10px";
        el.style.borderRadius = "6px";
        el.style.background = "rgba(0,0,0,0.72)";
        el.style.color = "#fff";
        el.style.fontSize = "0.9rem";
        el.style.display = "none";
        document.body.appendChild(el);
      }
      return el;
    })()
  };
}

/* ---------- show/hide 簡易メッセージ ---------- */
function showInfo(msg, timeout = 2500) {
  const { infoArea } = getDOM();
  if (!infoArea) return;
  infoArea.textContent = msg;
  infoArea.style.display = "block";
  clearTimeout(infoArea._hideTimer);
  infoArea._hideTimer = setTimeout(() => {
    infoArea.style.display = "none";
  }, timeout);
}

/* ---------- HTML エスケープ ---------- */
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------- メッセージを DOM に追加 ---------- */
function addMessageToDOM(msg) {
  const { chatContainer } = getDOM();
  if (!chatContainer) return;
  // 必須チェック
  if (!msg || !msg.timestamp) return;

  const isMine = msg.senderEmail === (currentUser && currentUser.email);

  // 日付区切り
  const dateKey = (msg.date || "").replace(/\//g, "-");
  if (dateKey) {
    const dateId = `date-${dateKey}`;
    if (!document.getElementById(dateId)) {
      const div = document.createElement("div");
      div.id = dateId;
      div.className = "date-divider";
      div.textContent = `--- ${msg.date || ""} ---`;
      chatContainer.appendChild(div);
    }
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isMine ? "mine" : "theirs"}`;

  if (!isMine) {
    const senderEl = document.createElement("div");
    senderEl.className = "sender";
    senderEl.textContent = msg.senderName || msg.senderEmail || "";
    wrapper.appendChild(senderEl);
  }

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMine ? "right" : "left"}`;

  // 記号やリンクの簡易処理（XSS対策の上で）
  let txt = escapeHtml(msg.text || "");
  txt = txt.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  txt = txt.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`(.+?)`/g, "<code>$1</code>");
  bubble.innerHTML = txt;
  wrapper.appendChild(bubble);

  const timeEl = document.createElement("div");
  timeEl.className = `msg-time ${isMine ? "mine-time" : "theirs-time"}`;
  timeEl.textContent = msg.timestamp || "";
  wrapper.appendChild(timeEl);

  chatContainer.appendChild(wrapper);
  // スクロールは最後に安全に行う
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ---------- 初期化: 履歴取得 + リアルタイム監視 ---------- */
function initChat() {
  if (initialized) return;
  initialized = true;

  const messagesRef = query(ref(db, "chat_messages"), orderByChild("timeValue"));

  // 履歴取得
  get(messagesRef).then(snapshot => {
    if (snapshot && snapshot.exists && snapshot.exists()) {
      const data = snapshot.val();
      // 順序は orderByChild によりソート済みのはず
      Object.values(data).forEach(d => addMessageToDOM(d));
    }
  }).catch(() => {
    // 無言で許容（UIは生きる）
    showInfo("履歴取得に失敗しました（読み込みは継続）。");
  });

  // リアルタイム追加
  onChildAdded(ref(db, "chat_messages"), snap => {
    const d = snap.val();
    if (d) addMessageToDOM(d);
  });
}

/* ---------- 送信処理（安全） ---------- */
function sendMessageSafe(text) {
  const dom = getDOM();
  if (!dom || !dom.chatInput || !dom.sendBtn) return;
  if (!currentUser) {
    showInfo("ログイン情報が確認できません。");
    return;
  }
  const trimmed = (text || "").trim();
  if (!trimmed) {
    // 空送信防止
    return;
  }
  if (sending) return; // 多重送信防止

  sending = true;
  dom.sendBtn.disabled = true;
  dom.sendBtn.style.opacity = "0.6";

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const date = now.toLocaleDateString("ja-JP");

  // push(ref, value) は Promise を返す（モジュール v11）
  push(ref(db, "chat_messages"), {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: trimmed,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime()
  }).then(() => {
    // 成功時
    dom.chatInput.value = "";
    sending = false;
    dom.sendBtn.disabled = false;
    dom.sendBtn.style.opacity = "";
  }).catch(() => {
    // 失敗時
    sending = false;
    dom.sendBtn.disabled = false;
    dom.sendBtn.style.opacity = "";
    showInfo("送信に失敗しました。再試行してください。");
  });
}

/* ---------- イベント初期化（DOM が存在することを前提） ---------- */
function initEventHandlers() {
  const { chatInput, sendBtn } = getDOM();
  if (!chatInput || !sendBtn) return;

  // 初期はボタンを無効にしておく（認証前）
  sendBtn.disabled = true;
  sendBtn.style.opacity = "0.5";

  // ボタン押下 -> 現在の状態で安全に送信
  sendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sendMessageSafe(chatInput.value);
  });

  // Ctrl/Cmd + Enter で送信、Enter は改行
  chatInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessageSafe(chatInput.value);
    }
  });

  // 認証が確立したらボタンを有効にする（onAuthStateChanged 内で設定）
}

/* ---------- onAuthStateChanged で currentUser をセットし、送信ボタンを有効化 ---------- */
function setupAuthWatcher() {
  onAuthStateChanged(auth, user => {
    const { sendBtn } = getDOM();
    if (!user) {
      // 未ログイン時はログイン画面へ
      const v = Math.floor(Math.random() * 1000000);
      window.location.href = `../login/index.html?v=${v}`;
      return;
    }
    const member = members.find(m => m.email === user.email);
    currentUser = { email: user.email, uid: user.uid, name: member ? member.name : user.email };

    // 認証済になったので send ボタンを有効化（かつ initChat を開始）
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.style.opacity = "";
    }
    initChat();
  });
}

/* ---------- エントリポイント ---------- */
(function bootstrap() {
  // DOMがまだない可能性がある状況でも安全に動作するよう遅延初期化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initEventHandlers();
      setupAuthWatcher();
    });
  } else {
    initEventHandlers();
    setupAuthWatcher();
  }
})();
