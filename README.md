# 小小超市 · Little Market

A Chinese/English pretend supermarket for kids. Prices use CNY. No backend, accounts, or real payments.

## Develop

Node.js 24 and npm are available in the cloud environment.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Play on Android

Deploy to GitHub Pages, open the HTTPS site in Chrome, then choose **Add to home screen / Install app**. Let the first online load finish before trying airplane mode. The production build caches the app for offline use. Camera access needs HTTPS and permission. Tap products or enter IDs in the scanner if the camera is unavailable.

The welcome screen keeps product management and QR labels separate from play. Tap **开始收银 / Start checkout** to open the checkout and automatically activate the rear camera. Scanning stays active as the basket updates. Holding a code in view adds it once; move it out of view for about one second before scanning it again. New products appear at the top; repeat scans increase their quantity. Scanning pauses during payment dialogs. The camera stops when returning home or backgrounding the app. A manual ID dialog is available if camera permission is denied. Only basket items scroll; the scanner, totals, and checkout button remain visible. Quantity controls support up to 99 of each product. Checkout offers pretend cash (including change), QR payment, or card, followed by a receipt and an empty basket for the next customer.

Products start with P001 milk ¥10/bottle, P002 water ¥2/bottle, P003 coke ¥3/bottle, and P004 noodles ¥10/pack. **QR labels contain only IDs**, so products can be reassigned without reprinting. Products can be edited or added in 商品管理 / Products. Print the labels tab using the browser's print dialog. Unknown QR IDs need a catalog entry before scanning.

Catalog, language, and basket are saved in this browser's local storage. Export/import JSON backups from Products; clearing site data or changing the site origin can erase/separate data. Import replaces the catalog and clears the basket after confirmation. No cross-device sync.

## GitHub Pages

The workflow `.github/workflows/pages.yml` builds and deploys on pushes to `main`. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. Once this version is pushed to GitHub, the workflow publishes to `https://cyannahan24.github.io/KidsPlayground/` (subject to the repository's Pages availability).

No paid services or runtime secrets are required. A deployment needs repository push permission and Pages enabled. Physical camera scanning, Android installation, and print sizing should be checked on the actual phone/printer.

## Phone layout checks

The app uses the actual viewport height (including a JavaScript fallback for browsers without dynamic viewport units), internal basket scrolling, safe-area padding, and compact/landscape layouts. Automated Chromium checks cover 360×560 (extra allowance for browser controls), 360×640, 412×732, and 640×360 CSS pixels. These are emulated viewports, not a claim of physical Galaxy C9 Pro validation. Physical display resolution and CSS viewport size differ with Android display scaling. Confirm real camera framing and browser toolbar behavior on the phone.

Browser checks: start the production preview, then `npx playwright test`. The configuration defaults to `/usr/bin/chromium`; set `CHROMIUM_PATH` to use another installed Chromium executable.

Payment dialogs reuse an already-open modal instead of calling `showModal()` again; the browser suite tests older-browser behavior that rejects duplicate modal opening, including Close and Finish for cash, QR, and card.
