import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const errorMessage = document.getElementById("error-message");

// --- ブラウザに保存したログイン情報があれば自動入力 ---
emailInput.value = localStorage.getItem("savedEmail") || "";
passwordInput.value = localStorage.getItem("savedPassword") || "";

// --- Enterキーでログイン ---
emailInput.addEventListener("keyup", (e) => { if (e.key === "Enter") loginBtn.click(); });
passwordInput.addEventListener("keyup", (e) => { if (e.key === "Enter") loginBtn.click(); });

// --- ログインボタンクリック処理 ---
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  errorMessage.textContent = "";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // ブラウザに保存
    localStorage.setItem("savedEmail", email);
    localStorage.setItem("savedPassword", password);

    // チャットページへ
    window.location.href = "../chat.html";
  } catch (error) {
    console.error(error);
    errorMessage.textContent = "ログインに失敗しました。メールアドレスまたはパスワードを確認してください。";
  }
});

// --- ログイン状態チェック ---
onAuthStateChanged(auth, user => {
  if (user) {
    // すでにログイン済みならチャットページへ
    if (!window.location.href.includes("chat.html")) {
      window.location.href = "../chat.html";
    }
  }
});
