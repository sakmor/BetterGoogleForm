# Chrome Web Store Submission Checklist

## Account and publishing prerequisites

- Chrome Web Store developer account is registered
- Google account has 2-step verification enabled
- Publisher name and contact email are configured
- Support hub visibility is enabled if you want to use the built-in support experience

## Package readiness

- `manifest.json` contains the real OAuth client ID, not the placeholder
- `npm run check` passes
- `npm run build` passes
- the uploaded package matches the reviewed source

## Store listing tab

- Name and short description are final
- Detailed description is final
- Category is chosen
- Language is correct
- Homepage URL is live
- Support URL is live
- Privacy policy URL is live
- Official URL is only set if you have a verified domain

## Privacy tab

- Single purpose description is filled in
- Every permission has a justification
- Remote code is declared as `No`
- Data usage answers match the actual extension behavior
- Data usage answers match the privacy policy

## Assets

- 128x128 store icon is ready
- at least one 1280x800 screenshot is ready
- 440x280 small promo tile is ready
- optional 1400x560 marquee tile is ready
- optional promo video URL is ready

## Review support

- Reviewer notes are prepared if needed
- Test spreadsheet and form URLs are ready
- Reviewer credentials are prepared only if absolutely necessary

## Final consistency check

- Store description, privacy policy, and actual extension behavior all say the same thing
- No secrets or private credentials are committed to the repository
- No sample data that should stay private is included in the package
- Support contact details are real, not placeholders

## Optional hardening after launch

- Opt in to verified uploads for future releases
- Add GitHub issue templates for support and bug reports
- Add localized store assets if you later localize the extension itself
