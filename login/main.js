// login/main.js
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  message.textContent = "ログイン中...";

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    message.textContent = "ログイン成功！";
    // チャットページなどに移動
    window.location.href = "../index.html";
  } catch (error) {
    message.textContent = "ログイン失敗：" + error.message;
  }
});
