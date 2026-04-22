# Chrome Web Store Privacy Tab Draft

This file is a draft for the Privacy tab in the Chrome Web Store Developer Dashboard. Review it before submission and adjust it to match the real behavior of the published build.

## Single purpose description

`Read records from a user-selected Google Sheets spreadsheet and help the user search and apply one record into the currently open Google Forms page.`

Traditional Chinese variant:

`讀取使用者指定的 Google Sheets 資料，並協助使用者在目前開啟的 Google Forms 頁面中搜尋並套用一筆紀錄。`

## Permission justifications

### `storage`

Used to save the extension settings, including spreadsheet ID, sheet name, search fields, and mapping override rules.

### `identity`

Used to let the user sign in with Google and obtain an OAuth token for reading the selected spreadsheet through Google APIs.

### `tabs`

Used by the popup to detect the active tab and confirm that the current page is a supported Google Forms page.

### `scripting`

Used to inject the in-page panel and related scripts into the active Google Forms tab when the user opens the extension UI.

### Host permission: `https://docs.google.com/forms/*`

Required so the extension can run on Google Forms pages and fill the currently open form.

### Host permission: `https://sheets.googleapis.com/*`

Required to read spreadsheet data from the Google Sheets API.

### Host permission: `https://www.googleapis.com/*`

Required to fetch the signed-in Google profile and complete Google OAuth-related requests.

## Remote code

Suggested answer:

- `No, this extension does not execute remote code.`

## Data handling disclosure draft

Suggested disclosure summary:

- The extension handles user-selected spreadsheet data and the content of the currently open Google Forms page in order to fill forms.
- The extension may also access the signed-in Google account email or display name for authentication-related UI.
- The extension stores configuration settings in Chrome sync storage.
- The extension does not transmit user data to the developer's own servers.
- Data is only exchanged with Google services required for authentication and spreadsheet access.

## Suggested data-use notes

Use this wording as the basis for the dashboard answers:

`This extension processes spreadsheet content chosen by the user, the structure of the currently open Google Forms page, and basic Google account profile information needed for sign-in. The data is used only to read spreadsheet records, match them to form questions, and fill the form on the user's device. The extension does not sell data and does not send it to the developer's own servers.`

## Items to review before you click submit

- If your spreadsheet contains names, email addresses, IDs, or other personal information, make sure the data-use disclosure reflects that.
- Make sure the Privacy tab answers match [PRIVACY.md](../../PRIVACY.md).
- Make sure the Privacy tab answers match the actual build you upload.
