# AndroidSimpleChatRoomServer
Android簡易聊天室，透過nodejs實現

## 功能介紹
一個簡單的Android聊天室Server，能處理即時通訊、圖片上傳、登入、好友

## 安裝
```javascript
npm install
```

## 修改MogoDB連結
至 **models/chatRoomModel.js** 和 **models/memberModel.js**
```javascript
const mongoDB = '輸入你的MongoDB連結可為遠端或是本地'; //這裡改成你MogoDB的連結
```

## 啟動Server
``` javascript
npm start
```

## 注意事項
- 手機和Server需要連線相同的區域網路
- 不同的手機可能導致連線不同步，這裡需要再改進
- 圖片上傳需要在目錄中有 **`uploads`** 資料夾
- 有錯誤的地方或更好的寫法歡迎提出指教
