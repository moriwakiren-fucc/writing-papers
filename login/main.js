import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ログイン処理
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const errorMessage = document.getElementById("error-message");
  errorMessage.textContent = "";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(userCredential); // 確認用
    window.location.href = "../chat.html"; // 成功したらチャットへ
  } catch (error) {
    console.error(error); // 開発者コンソールにエラーを出力
    errorMessage.textContent = "ログインに失敗しました。メールアドレスまたはパスワードを確認してください。";
  }
});
