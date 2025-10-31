import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase, ref, update, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
// 0〜999999の乱数を生成してキャッシュバスターに使用
const randomVersion = Math.floor(Math.random() * 1000000);
import { firebaseConfig } from `./firebase-config.js?v=${randomVersion}`;


// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase();

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const errorMessage = document.getElementById("error-message");
const readersListEl = document.getElementById("readers-list");

// ブラウザに保存したログイン情報があれば自動入力
emailInput.value = localStorage.getItem("savedEmail") || "";
passwordInput.value = localStorage.getItem("savedPassword") || "";

// Enterキーでログイン
emailInput.addEventListener("keyup", e => { if (e.key === "Enter") loginBtn.click(); });
passwordInput.addEventListener("keyup", e => { if (e.key === "Enter") loginBtn.click(); });

// ログインボタン処理
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  errorMessage.textContent = "";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // ブラウザに保存
    localStorage.setItem("savedEmail", email);
    localStorage.setItem("savedPassword", password);

    // 全体のトップページに遷移
    window.location.href = "../index.html";
  } catch (error) {
    console.error(error);
    errorMessage.textContent = "ログインに失敗しました。メールアドレスまたはパスワードを確認してください。";
  }
});

// ログイン状態チェック & 既読者追加
onAuthStateChanged(auth, user => {
  if (user) {
    // すでにログイン済みならトップページへ
    if (!window.location.href.includes("index.html")) {
      window.location.href = "../index.html";
    }

    // 既読者処理
    const userId = user.uid;
    const userName = user.email; // 表示用にメールアドレス
    const readersRef = ref(db, "papers/paper1/readers");

    // 既読者を追加（既存データを消さずにマージ）
    update(readersRef, { [userId]: userName });

    // リアルタイムで既読者リストを監視
    onValue(readersRef, snapshot => {
      const data = snapshot.val() || {};
      if (readersListEl) {
        readersListEl.innerHTML = ""; // 一度クリア
        Object.values(data).forEach(name => {
          const li = document.createElement("li");
          li.textContent = name;
          readersListEl.appendChild(li);
        });
      }
    });
  }
});
