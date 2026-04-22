# Better Google Form Filler Support

If you need help with Better Google Form Filler, use one of the support channels below.

## Support channels

- Issue tracker: `https://github.com/sakmor/BetterGoogleForm/issues`
- Documentation: `https://github.com/sakmor/BetterGoogleForm`
- Support email: `sakmor@gmail.com`

## What to include in a bug report

Please include:

- Chrome version
- Extension version
- The Google Forms page URL pattern you tested on
- Whether the issue happens in popup, options page, or in-page panel
- A screenshot or screen recording if possible
- Steps to reproduce
- Expected result
- Actual result

## Common setup questions

### The extension says OAuth client ID is not configured

Add your own Google OAuth client ID to `manifest.json`, or inject it during build with:

```powershell
$env:GOOGLE_OAUTH_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
npm run build
```

### The extension cannot read my spreadsheet

Check that:

- the spreadsheet ID is correct,
- the selected sheet name exists,
- your Google account has access to the spreadsheet,
- you completed Google sign-in in the extension.

### The extension opens but does not fill the form

Check that:

- you are on a Google Forms `viewform` page,
- the form question text is similar to your spreadsheet headers,
- you added any necessary `mappingOverrides` in the options page.
