/* style.css */

* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; font-family: "Noto Sans JP", sans-serif; }
body { display: flex; flex-direction: column; background: #9cb2d9; }

/* ヘッダー */
header {
  position: fixed; top: 0; left: 0; right: 0;
  height: 3rem; background: #fff; border-bottom: 1px solid #444;
  display: flex; align-items: center; gap: .75rem; padding: 0 .75rem; z-index: 10;
}
header h2 { margin: 0; font-size: 1.6rem; }
header h2 a { text-decoration: none; color: #000; }
header h1 { margin: 0; font-size: 1.3rem; flex: 1; text-align: center; }

/* チャットコンテナ */
#chat-container {
  margin-top: 3.5rem;
  margin-bottom: 4rem;
  padding: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

/* 日付区切り */
.date-divider {
  text-align: center;
  color: #333;
  margin: 0.5rem 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

/* メッセージ配置 */
.message-wrapper {
  display: flex;
  flex-direction: column;
  margin: 0.4rem 0;
}

/* 自分（右寄せ） */
.message-wrapper.mine {
  align-items: flex-end;
}

/* 他人（左寄せ） */
.message-wrapper.theirs {
  align-items: flex-start;
}

/* 吹き出し */
.chat-bubble {
  max-width: 70%;
  padding: 0.6rem 0.8rem;
  border-radius: 12px;
  word-break: break-word;
}
.chat-bubble.right {
  background: #98e887;
  border: 1px solid #77c766;
}
.chat-bubble.left {
  background: #fff;
  border: 1px solid #ddd;
}

/* 送信者名（相手のみ） */
.sender {
  font-size: 0.8rem;
  margin-bottom: 0.2rem;
  color: #222;
}

/* 時刻 */
.msg-time {
  font-size: 0.7rem;
  margin-top: 0.1rem;
  opacity: 0.8;
}
.mine-time {
  align-self: flex-end;
  margin-right: 4px;
}
.theirs-time {
  align-self: flex-start;
  margin-left: 4px;
}

/* 入力帯 */
.chat-input-area {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; gap: .5rem; align-items: center;
  padding: .5rem; background: #fff; border-top: 1px solid #ccc;
}
#chat-input {
  flex: 1;
  resize: none;
  padding: .5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  min-height: 2.2rem;
}
#send-btn {
  border: none;
  background: #4caf50;
  color: #fff;
  border-radius: 8px;
  padding: .4rem .8rem;
  cursor: pointer;
}
#send-btn:hover {
  background: #3a9e42;
}
