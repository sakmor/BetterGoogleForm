# Chrome Web Store Reviewer Notes Draft

Use this as the basis for the Developer Dashboard "Test instructions" tab if you want to reduce review friction.

## Best review setup

The review setup for this extension is public-link based:

- Google Form test page is accessible to anyone with the link
- Google Sheets test spreadsheet is accessible to anyone with the link
- no paid account is required
- no private backend is required

Reviewers should still sign into a normal Google account when testing, because the extension uses Google OAuth to read spreadsheet data.

## Draft reviewer instructions

1. Install the unpacked or uploaded extension build.
2. Open the extension options page.
3. Paste the provided test spreadsheet URL or spreadsheet ID.
4. Click `Load sheets` and select the provided test sheet.
5. Save settings.
6. Open the provided Google Forms `viewform` URL.
7. Open the extension popup and click `Open panel`, or click the in-page launcher button.
8. Search for the provided sample record.
9. Click `Apply this record`.
10. Confirm that matching fields in the form are populated.

## Review test data

- Test spreadsheet URL: `https://docs.google.com/spreadsheets/d/1VRYSPPkrxZzdfhrxUyf5cm5EN-F6ShYpos1tk28jOXU/edit?resourcekey=&gid=372858698#gid=372858698`
- Test sheet name: `Form Reply`
- Test Google Form URL: `https://docs.google.com/forms/d/e/1FAIpQLSeb9Yy_P-et9ijhr31x4Ijyn3TTutlPAGEGl3WMqncxetn07g/viewform`
- Sample record to search:
  - `Full Name: Donald Duck`
  - `Gender: Male`
  - `Hobbies: Music, Reading`

## If a reviewer account is required

No special reviewer account or pre-shared credential is required beyond a normal Google account for the OAuth sign-in flow.

## Expected result

When the extension is configured with the provided sheet and opened on the provided Google Form, the reviewer should be able to:

- load records from the spreadsheet,
- search for the sample record,
- apply that record to the form,
- see supported text, checkbox, radio, and dropdown fields filled where labels match.

## Notes for reviewers

- This extension is intended for Google Forms `viewform` pages.
- It does not require a custom backend.
- It does not execute remote code.
- It uses Google OAuth and Google Sheets API only to read spreadsheet data selected by the user.
