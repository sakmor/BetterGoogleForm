# Chrome Web Store Reviewer Notes Draft

Use this as the basis for the Developer Dashboard "Test instructions" tab if you want to reduce review friction.

## Best review setup

The cleanest review setup is:

- a public or reviewer-accessible Google Form test page,
- a reviewer-accessible Google Sheets test spreadsheet,
- no paid account requirement,
- no private backend requirement.

If you can provide that setup, reviewers may not need extra credentials.

## Draft reviewer instructions

1. Install the unpacked or uploaded extension build.
2. Open the extension options page.
3. Paste the provided test spreadsheet URL or spreadsheet ID.
4. Click `Load sheets` and select the provided test sheet.
5. Save settings.
6. Open the provided Google Forms `viewform` URL.
7. Open the extension popup and click `Open panel`, or click the in-page launcher button.
8. Search for one of the provided sample records.
9. Click `Apply this record`.
10. Confirm that matching fields in the form are populated.

## Information to prepare before submission

- Test spreadsheet URL: `<paste test spreadsheet URL here>`
- Test sheet name: `<paste test sheet name here>`
- Test Google Form URL: `<paste test form URL here>`
- Test record examples:
  - `<example record 1>`
  - `<example record 2>`

## If a reviewer account is required

Only add credentials if they are truly needed. If needed, provide:

- Google account email: `<reviewer test account>`
- Password or access method: `<temporary reviewer credential>`
- Any MFA bypass instructions if applicable

## Expected result

When the extension is configured with the provided sheet and opened on the provided Google Form, the reviewer should be able to:

- load records from the spreadsheet,
- search for a record,
- apply that record to the form,
- see text, checkbox, radio, and dropdown fields filled where labels match.

## Notes for reviewers

- This extension is intended for Google Forms `viewform` pages.
- It does not require a custom backend.
- It does not execute remote code.
- It uses Google OAuth and Google Sheets API only to read spreadsheet data selected by the user.
