# Better Google Form Filler

`Better Google Form Filler` 是一個 Chrome 擴充功能，會從 Google Sheets 讀取資料，協助你在 Google Forms 上快速搜尋、挑選並套用一筆紀錄到目前表單。

這個 repo 已整理成適合對外分享的版本：

- 移除了實際的 OAuth client id，改用公開 repo 可安全提交的占位值
- 補上公開專案需要的說明、忽略規則與編碼設定
- 提供可重複執行的 `build` / `check` 腳本
- 保留目前的輕量架構，方便直接載入 Chrome 測試

## 功能

- 從 Google Sheets 讀取回應資料
- 在 Google Forms 頁面內開啟側邊面板
- 依欄位內容快速搜尋紀錄
- 自動比對表單題目與試算表欄位
- 支援文字、單選、核取方塊、下拉選單
- 可用 `mappingOverrides` 手動覆寫欄位對應

## 專案結構

```text
.
├─ background.js
├─ content.js
├─ content.css
├─ manifest.json
├─ options.html
├─ options.js
├─ popup.html
├─ popup.js
├─ ui.css
├─ utils.js
└─ scripts/
   ├─ build.mjs
   └─ check.mjs
```

## 開始使用

### 1. 安裝依賴

這個專案沒有第三方 runtime 依賴，只需要本機有 Node.js 18+。

### 2. 設定 OAuth Client ID

公開 repo 不會提交真正的 Google OAuth Client ID，所以你需要自行準備一組。

在 Google Cloud Console 建立對應的 Chrome Extension OAuth client 後，有兩種做法：

1. 直接編輯 [manifest.json](./manifest.json)
2. 或在 build 時用環境變數注入

PowerShell 範例：

```powershell
$env:GOOGLE_OAUTH_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
npm run build
```

如果你不走 build 流程，也可以直接把 `manifest.json` 內的 `oauth2.client_id` 替換成你的值。

### 3. 驗證與打包

```powershell
npm run check
npm run build
```

`npm run build` 會輸出可直接載入的資料夾到 `dist/BetterGoogleForm-extension`。

### 4. 載入 Chrome

1. 開啟 `chrome://extensions`
2. 啟用「開發人員模式」
3. 點選「載入未封裝項目」
4. 選擇 `dist/BetterGoogleForm-extension`

## 使用方式

1. 在擴充功能設定頁填入 `Spreadsheet ID`
2. 選擇要讀取的工作表名稱
3. 視需要調整 `searchFields`
4. 開啟 Google Forms 的 `viewform` 頁面
5. 點擴充功能 popup 或頁面右下角按鈕打開面板
6. 重新整理資料、搜尋目標紀錄並套用

## `mappingOverrides` 範例

```json
{
  "報名者姓名": "姓名",
  "個人網站": "作品集 URL"
}
```

左邊是 Google Forms 題目，右邊是 Google Sheets 欄位名稱。

## 權限與隱私

- 需要 `identity` 權限以取得 Google OAuth token
- 需要 `storage` 權限保存本機設定
- 需要存取 `docs.google.com/forms/*` 以在表單頁面提供面板
- 需要存取 `sheets.googleapis.com` 以讀取指定試算表

更精簡的隱私說明可見 [PRIVACY.md](./PRIVACY.md)。

## 對外發布前建議

- 補上正式的 extension icon
- 選定授權條款並新增 `LICENSE`
- 如果要上 Chrome Web Store，再補商店頁文案與隱私政策網址
