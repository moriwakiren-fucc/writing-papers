// main.js (モジュール)
import { db, auth } from "../login/firebase-config.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import { ref, push, onChildAdded, update, get, query, orderByChild, onValue } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* -------------------------
   メンバー情報
--------------------------*/
let currentUser = null;
const members = [
  {email: "moriwaki@ren.ronbun", name: "森脇 廉"},
  {email: "muraya@kaho.ronbun", name: "村谷 佳穂"},
  {email: "kojo@yuina.ronbun", name: "小城 結菜"},
  {email: "nakano@aiko.ronbun", name: "中野 愛子"},
  {email: "kamimoto@yuta.ronbun", name: "神元 佑太"},
  {email: "sadahira@koto.ronbun", name: "定平 琴"},
  {email: "sunada@suzu.ronbun", name: "砂田 紗々"}
];

// DOM
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");
const videoModal = document.getElementById("video-modal");
const videoPlayer = document.getElementById("video-player");
const videoClose = document.getElementById("video-close");

// Firebase Storage
const storage = getStorage();

/* -------------------------
   認証チェック
--------------------------*/
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  const email = user.email;
  const member = members.find(m => m.email === email);
  currentUser = { email, uid: user.uid, name: member ? member.name : email };
  initChat();
});

/* -------------------------
   メッセージ送信
--------------------------*/
function sendMessage(payload) {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2,"0");
  const mm = now.getMinutes().toString().padStart(2,"0");
  const date = now.toLocaleDateString("ja-JP");

  const messageRef = ref(db, "chat_messages");
  push(messageRef, {
    senderEmail: currentUser.email,
    senderName: currentUser.name,
    text: payload.text || "",
    fileType: payload.fileType || null,
    fileURL: payload.fileURL || null,
    thumbURL: payload.thumbURL || null,
    fileName: payload.fileName || null,
    timestamp: `${hh}:${mm}`,
    date,
    timeValue: now.getTime(),
    readBy: [] // 初期状態は誰も既読にしない
  });
}

/* -------------------------
   DOMにメッセージ追加
--------------------------*/
function addMessageToDOM(msg) {
  const isMine = (msg.senderEmail === currentUser.email);
  const dateId = `date-${msg.date.replace(/\//g,'-')}`;

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
  if (msg.unread) bubble.classList.add("unread");

  // 送信者名（吹き出し外）
  if (!isMine) {
    const senderEl = document.createElement("div");
    senderEl.className = "sender";
    senderEl.textContent = msg.senderName || msg.senderEmail;
    row.appendChild(senderEl);
  }

  // 本文
  const textEl = document.createElement("div");
  textEl.className = "bubble-text";
  let safeText = escapeHtml(msg.text || "");
  safeText = safeText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  safeText = safeText.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                     .replace(/\*(.+?)\*/g,'<em>$1</em>')
                     .replace(/`(.+?)`/g,'<code>$1</code>');
  textEl.innerHTML = safeText;
  bubble.appendChild(textEl);

  // ファイル表示
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
      wrapper.appendChild(img);
      const overlay = document.createElement("div");
      overlay.className = "thumb-overlay";
      overlay.innerHTML = `<div class="play">▶︎</div>`;
      wrapper.appendChild(overlay);
      wrapper.addEventListener("click", () => {
        videoPlayer.src = msg.fileURL;
        videoModal.classList.add("show");
        videoModal.setAttribute("aria-hidden","false");
      });
      bubble.appendChild(wrapper);
    } else {
      const fileEl = document.createElement("div");
      fileEl.innerHTML = `<a href="${msg.fileURL}" target="_blank" rel="noopener noreferrer">${escapeHtml(msg.fileName||'ファイル')}</a>`;
      bubble.appendChild(fileEl);
    }
  }

  // メタ情報
  const meta = document.createElement("div");
  meta.className = "msg-meta " + (isMine ? "self" : "other");

  const timeEl = document.createElement("div");
  timeEl.className = "meta-time";
  timeEl.textContent = msg.timestamp || "";

  const readEl = document.createElement("div");
  readEl.className = "meta-read";
  readEl.textContent = `既読者：${(msg.readBy||[]).length}`;

  meta.appendChild(timeEl);
  meta.appendChild(readEl);

  // ダブルクリックで既読者名表示
  bubble.addEventListener("dblclick", () => {
    const names = (msg.readBy||[]).map(email => {
      const m = members.find(x => x.email === email);
      return m ? m.name : email;
    });
    alert(`既読者：\n${names.join("\n") || "(なし)"}`);
  });

  row.appendChild(bubble);
  row.appendChild(meta);
  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* -------------------------
   HTMLエスケープ
--------------------------*/
function escapeHtml(s){
  if(!s) return "";
  return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* -------------------------
   初期ロードとリアルタイム監視
--------------------------*/
let initialized = false;
function initChat(){
  if(initialized) return;
  initialized = true;

  const messagesRef = query(ref(db,"chat_messages"),orderByChild("timeValue"));
  get(messagesRef).then(snapshot=>{
    if(snapshot.exists()){
      Object.entries(snapshot.val()).forEach(([key,d])=>{
        addMessageToDOM({...d,id:key});
      });
    }
  }).catch(console.error);

  // リアルタイム追加
  const liveRef = ref(db,"chat_messages");
  onChildAdded(liveRef,snap=>{
    const d = snap.val();
    addMessageToDOM({...d,id:snap.key});

    // 自分以外の未読メッセージを自動既読
    if(d.senderEmail !== currentUser.email && (!d.readBy || !d.readBy.includes(currentUser.email))){
      const path = `chat_messages/${snap.key}/readBy`;
      update(ref(db,path),[...(d.readBy||[]),currentUser.email]).catch(console.error);
    }
  });

  // 既読リアルタイム反映
  onValue(ref(db,"chat_messages"),snapshot=>{
    if(!snapshot.exists()) return;
    Object.entries(snapshot.val()).forEach(([key,d])=>{
      const metaRead = document.querySelector(`#chat-container .message-row:nth-child(${Object.keys(snapshot.val()).indexOf(key)+1}) .meta-read`);
      if(metaRead) metaRead.textContent = `既読者：${(d.readBy||[]).length}`;
    });
  });
}

/* -------------------------
   ファイル送信
--------------------------*/
async function uploadFileAndSend(file){
  try{
    const now = Date.now();
    const path = `chat_files/${now}_${file.name}`;
    const sRef = storageRef(storage,path);
    await uploadBytes(sRef,file);
    const url = await getDownloadURL(sRef);

    if(file.type.startsWith("image/")){
      sendMessage({fileType:file.type,fileURL:url,fileName:file.name});
      return;
    }

    if(file.type.startsWith("video/")){
      const thumbBlob = await captureVideoThumbnail(file);
      let thumbURL=null;
      if(thumbBlob){
        const tRef = storageRef(storage,`chat_files/thumb_${now}_${file.name}.png`);
        await uploadBytes(tRef,thumbBlob);
        thumbURL = await getDownloadURL(tRef);
      }
      sendMessage({fileType:file.type,fileURL:url,thumbURL,fileName:file.name});
      return;
    }

    sendMessage({fileType:file.type,fileURL:url,fileName:file.name});

  }catch(e){ console.error(e); alert("ファイル送信に失敗しました"); }
}

/* -------------------------
   動画サムネ生成
--------------------------*/
function captureVideoThumbnail(file){
  return new Promise(resolve=>{
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload="metadata"; v.src=url; v.muted=true; v.playsInline=true;
    v.addEventListener("loadeddata",()=>{v.currentTime=0.1},{once:true});
    v.addEventListener("seeked",()=>{
      const canvas=document.createElement("canvas");
      canvas.width=v.videoWidth; canvas.height=v.videoHeight;
      canvas.getContext("2d").drawImage(v,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>{URL.revokeObjectURL(url); resolve(blob);}, "image/png");
    });
    v.addEventListener("error",()=>{URL.revokeObjectURL(url); resolve(null);});
    setTimeout(()=>{URL.revokeObjectURL(url); resolve(null);},10000);
  });
}

/* -------------------------
   送信・入力イベント
--------------------------*/
sendBtn.addEventListener("click",()=>{ sendCtrlEnter(); });

chatInput.addEventListener("keydown",(e)=>{
  if((e.ctrlKey || e.metaKey) && e.key==="Enter"){ e.preventDefault(); sendCtrlEnter(); }
});

function sendCtrlEnter(){
  const text=chatInput.value.trim();
  if(!text) return;
  sendMessage({text});
  chatInput.value="";
}

// ファイル選択
fileBtn.addEventListener("click",()=>{
  const input=document.createElement("input");
  input.type="file"; input.multiple=false; input.accept="*/*";
  input.onchange=()=>{ const f=input.files[0]; if(f) uploadFileAndSend(f); };
  input.click();
});

/* -------------------------
   動画モーダルクローズ
--------------------------*/
videoClose.addEventListener("click",()=>{
  videoPlayer.pause(); videoPlayer.src="";
  videoModal.classList.remove("show"); videoModal.setAttribute("aria-hidden","true");
});
videoModal.addEventListener("click",(e)=>{ if(e.target===videoModal) videoClose.click(); });
