// main.js — ログインしていない場合は ./login/ にリダイレクト

// 🔹 Firebaseモジュールを読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from "../login/firebase-config.js";

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔹 ログイン状態チェック
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // 未ログイン → ./login/ にリダイレクト
    window.location.href = "../login/index.html?v=" + Math.floor(Math.random() * 1000000);
  } else {
    console.log("ログイン中:", user.email);
    initPage(); // ページ機能を初期化
  }
});

// 🔹 ページのUI機能を初期化（ログイン済みユーザーのみ実行）
function initPage() {
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

  // 未読件数（例：後でFirebase連携予定）
  const unreadCountEl = document.getElementById("unread-count");
  if (unreadCountEl) unreadCountEl.textContent = 0;

  // ログアウト処理
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          // ログアウト完了 → loginページへ
          window.location.href = "../login/index.html?v=" + Math.floor(Math.random() * 1000000);
        })
        .catch((error) => {
          alert("ログアウトエラー: " + error.message);
        });
    });
  }
}
