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

Scan one QR code to add one item; the camera closes after a successful scan to avoid duplicate additions. Open it again to scan another item. Quantity controls support up to 99 of each product. Checkout offers pretend cash (including change), QR payment, or card, followed by a receipt and an empty basket for the next customer.

Products start with P001 milk ¥10/bottle, P002 water ¥2/bottle, P003 coke ¥3/bottle, and P004 noodles ¥10/pack. **QR labels contain only IDs**, so products can be reassigned without reprinting. Products can be edited or added in 商品管理 / Products. Print the labels tab using the browser's print dialog. Unknown QR IDs need a catalog entry before scanning.

Catalog, language, and basket are saved in this browser's local storage. Export/import JSON backups from Products; clearing site data or changing the site origin can erase/separate data. Import replaces the catalog and clears the basket after confirmation. No cross-device sync.

## GitHub Pages

The workflow `.github/workflows/pages.yml` builds and deploys on pushes to `main`. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. Once this version is pushed to GitHub, the workflow publishes to `https://cyannahan24.github.io/KidsPlayground/` (subject to the repository's Pages availability).

No paid services or runtime secrets are required. A deployment needs repository push permission and Pages enabled. Physical camera scanning, Android installation, and print sizing should be checked on the actual phone/printer.
