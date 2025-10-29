// サイドメニュー開閉
const menuBtn = document.getElementById("menu-btn");
const sideMenu = document.getElementById("side-menu");

menuBtn.addEventListener("click", () => {
  if (sideMenu.style.left === "0px") {
    sideMenu.style.left = "-250px";
  } else {
    sideMenu.style.left = "0px";
  }
});

// お知らせ折りたたみ
document.querySelectorAll(".toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const content = btn.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
      btn.textContent = btn.textContent.replace("▲", "▼");
    } else {
      content.style.display = "block";
      btn.textContent = btn.textContent.replace("▼", "▲");
    }
  });
});

// 未読件数（例として0を表示、後でFirebase連携予定）
const unreadCountEl = document.getElementById("unread-count");
unreadCountEl.textContent = 0;

// ログアウト処理
const logoutBtn = document.getElementById("logout-btn");
logoutBtn.addEventListener("click", () => {
  // Firebase authログアウト処理（後で追加予定）
  window.location.href = "login/index.html";
});

