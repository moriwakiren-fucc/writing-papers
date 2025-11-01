// main.js — 未ログインなら ../login/ にリダイレクト

// Firebaseモジュールの読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from "../login/firebase-config.js";  // ← ../login/ から設定を読み込む

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* -------------------------
   ログイン状態の監視
-------------------------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // 未ログイン → ../login/ に強制移動
    window.location.href = "../login/index.html?v=" + Math.floor(Math.random() * 1000000);
  } else {
    console.log("ログイン中:", user.email);
    initPage(user);
  }
});

/* -------------------------
   ページ機能（ログイン済みのみ有効）
-------------------------- */
function initPage(user) {
  // ページを表示（非表示設定している場合のために）
  document.body.style.display = "block";

  // サイドメニュー開閉
  const menuBtn = document.getElementById("menu-btn");
  const sideMenu = document.getElementById("side-menu");
  if (menuBtn && sideMenu) {
    menuBtn.addEventListener("click", () => {
      if (sideMenu.style.left === "0px") {
        sideMenu.style.left = "-250px";
      } else {
        sideMenu.style.left = "0px";
      }
    });
  }

  // お知らせ折りたたみ
  document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      if (!content) return;
      if (content.style.display === "block") {
        content.style.display = "none";
        btn.textContent = btn.textContent.replace("▲", "▼");
      } else {
        content.style.display = "block";
        btn.textContent = btn.textContent.replace("▼", "▲");
      }
    });
  });

  // 未読件数（仮の値）
  const unreadCountEl = document.getElementById("unread-count");
  if (unreadCountEl) unreadCountEl.textContent = "0";

  // ログアウト機能
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          window.location.href = "../login/index.html?v=" + Math.floor(Math.random() * 1000000);
        })
        .catch(err => alert("ログアウトエラー: " + err.message));
    });
  }
}

/* -------------------------
   読み込み中はbody非表示にしておく（未ログインでもチラ見防止）
-------------------------- */
document.body.style.display = "none";
