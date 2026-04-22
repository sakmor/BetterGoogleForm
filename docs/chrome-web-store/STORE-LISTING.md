# Chrome Web Store Listing Draft

## Basic metadata

- Name: `Better Google Form Filler`
- Suggested category: `Productivity`
- Suggested primary language: `Traditional Chinese`
- Mature content: `No`

## Short description

Use the manifest summary or a close variant:

`Fill Google Forms faster by searching records from Google Sheets.`

Alternative Traditional Chinese short description:

`從 Google Sheets 搜尋資料，快速填入目前開啟的 Google Forms。`

## Detailed description (Traditional Chinese)

Better Google Form Filler 是一個協助 Google Forms 填表流程的 Chrome 擴充功能。你可以先連接自己的 Google Sheets 資料表，然後在 Google Forms 頁面內直接開啟搜尋面板，挑選一筆資料並套用到目前表單。

這個擴充功能適合用在需要重複填寫、驗證或比對資料的情境，例如活動報名整理、內部作業表單、測試流程、客服或營運支援等。它不需要自建後端，主要透過 Google OAuth 與 Google Sheets API 讀取你指定的試算表。

主要功能：

- 連接使用者指定的 Google Sheets
- 在 Google Forms 頁面中顯示資料搜尋面板
- 依姓名、Email、URL、代碼等欄位快速搜尋紀錄
- 自動嘗試比對表單題目與試算表欄位
- 支援文字、單選、核取方塊、下拉選單
- 允許以 `mappingOverrides` 手動覆寫對應規則

注意事項：

- 你需要自行提供 Google OAuth client ID
- 你必須對目標 Google Sheets 擁有存取權
- 最佳使用情境是 Google Forms 的 `viewform` 頁面

## Detailed description (English draft)

Better Google Form Filler is a Chrome extension that helps users fill Google Forms with records from Google Sheets. After connecting a spreadsheet, users can open an in-page panel on a Google Forms page, search for a record, and apply that record to the current form.

This extension is useful for repeated form entry, QA workflows, operations tasks, internal forms, and other scenarios where the same type of information needs to be copied from a spreadsheet into a form.

Key features:

- Connect to a user-selected Google Sheets spreadsheet
- Open a searchable side panel directly on Google Forms pages
- Search records by fields such as name, email, URL, or code
- Automatically match spreadsheet headers to form questions
- Support text inputs, radio buttons, checkboxes, and dropdowns
- Override field matching with manual mapping rules

Requirements:

- Your own Google OAuth client ID
- Access to the target spreadsheet
- Best used on Google Forms `viewform` pages

## URLs to fill in

- Homepage URL: `https://github.com/<your-account>/<your-repo>`
- Support URL: `https://github.com/<your-account>/<your-repo>/issues`
- Privacy policy URL:
  - preferred: GitHub Pages URL or your own site
  - fallback: `https://github.com/<your-account>/<your-repo>/blob/main/PRIVACY.md`
- Official URL:
  - leave blank unless you have a verified domain in Search Console

## Suggested screenshot captions

- `Connect your spreadsheet and choose the sheet to read`
- `Search records directly inside Google Forms`
- `Review matched fields before applying a record`
- `Fill text, checkbox, radio, and dropdown questions faster`
- `Override question-to-column mapping when your labels differ`
