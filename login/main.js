import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ログインボタンのクリック処理
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "../chat.html"; // 成功したらチャットへ
  } catch (error) {
    errorMessage.textContent = "ログインに失敗しました。メールアドレスまたはパスワードを確認してください。";
  }
});
