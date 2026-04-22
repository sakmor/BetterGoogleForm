# Privacy

Better Google Form Filler 只會在使用者主動操作時：

- 讀取你指定的 Google Sheets 資料
- 讀取目前開啟的 Google Forms 頁面內容
- 把你選擇的一筆資料填入目前表單
- 將必要設定儲存在 `chrome.storage.sync`

這個專案不包含自建後端，也不會把資料傳送到專案作者的伺服器。

所有資料交換都發生在：

- `docs.google.com`
- `www.googleapis.com`
- `sheets.googleapis.com`

如果你要對外發布，請依自己的部署方式與商店要求補上正式隱私政策。
