// main.js — 未ログイン時は ../login/ に即リダイレクト（完全非表示）

// ------------------------------
// Firebase 読み込み
// ------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from "../login/firebase-config.js";

// ------------------------------
// Firebase 初期化
// ------------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ------------------------------
// 認証チェック
// ------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // ❌ 未ログイン → 即リダイレクト（index.htmlを表示させない）
    document.documentElement.style.visibility = "hidden";
    document.body.style.opacity = "0";
    window.location.replace("../login/index.html?v=" + Math.floor(Math.random() * 1000000));
    return;
  }

  // ✅ ログイン済み → ページを表示
  document.documentElement.style.visibility = "visible";
  document.body.style.opacity = "1";

  initPage(user);
});

// ------------------------------
// ログイン済みのみ動作する処理
// ------------------------------
function initPage(user) {
  console.log("ログイン中:", user.email);

  // サイドメニュー開閉
  const menuBtn = document.getElementById("menu-btn");
  const sideMenu = document.getElementById("side-menu");
  if (menuBtn && sideMenu) {
    menuBtn.addEventListener("click", () => {
      sideMenu.style.left = sideMenu.style.left === "0px" ? "-250px" : "0px";
    });
  }

  // お知らせ折りたたみ
  document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      if (!content) return;
      const isOpen = content.style.display === "block";
      content.style.display = isOpen ? "none" : "block";
      btn.textContent = btn.textContent.replace(isOpen ? "▲" : "▼", isOpen ? "▼" : "▲");
    });
  });

  // 未読件数（仮）
  const unreadCountEl = document.getElementById("unread-count");
  if (unreadCountEl) unreadCountEl.textContent = "0";

  // ログアウトボタン
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          document.documentElement.style.visibility = "hidden";
          document.body.style.opacity = "0";
          window.location.replace("../login/index.html?v=" + Math.floor(Math.random() * 1000000));
        })
        .catch(err => alert("ログアウトエラー: " + err.message));
    });
  }
}
