# Local Object Detection

A small local-first browser app for live object detection. The camera starts only when you press **Start object detection**. Frames stay on this device and are not stored. Face recognition, face enrollment, person records, and QR workflows are not part of this app. COCO's `person` class is excluded from results.

## How it works

- React, TypeScript, and Vite run the local interface.
- COCO-SSD Lite runs in a web worker and loads only when detection starts.
- The object model is served from this app; no Vercel deployment, account, API key, or backend is required.
- The model supports its trained object classes and does not identify arbitrary objects.

## Requirements

- Node.js 22.12.0 or newer and npm.
- A recent Chrome or Edge browser and a webcam.
- The first detection downloads the COCO object model (about 21 MB). Later visits can use the browser cache.

## Install and run locally

Run these commands from the project folder:

```powershell
npm ci
npm start
```

Open the local URL printed by Vite (normally <http://localhost:5173>). If port 5173 is already in use, Vite selects and prints another available port.

On Windows, `.\setup.ps1` installs dependencies and verifies the production build; `setup.bat` runs the same setup.

For a production build and local preview:

```powershell
npm run build
npm run preview
```

No Vercel CLI or deployment is needed for local development.

## Testing and code quality

```powershell
npm test
npm run lint
npm run typecheck
npm run test:e2e
```

Playwright first-time browser setup:

```powershell
npx playwright install chromium
npm run test:e2e
```

## Troubleshooting

- **The dev server says a port is busy:** Vite automatically selects another port and prints the correct URL.
- **The camera does not start:** Use the URL printed by Vite and allow camera access in the browser.
- **The first detection is slow:** COCO-SSD Lite downloads about 21 MB on first use. Keep the page open until loading completes; the browser can cache model files for later runs.
- **The model does not load:** Check that `public/models/v1/coco-ssd/` is present and that the browser can fetch local assets from the Vite server. Do not open `index.html` directly as a file.
- **npm reports that `package.json` is missing:** Change to this project folder before running npm commands.

## License

The source code in this repository is MIT licensed. The object model has its own license and provenance; see [the model notices](public/MODEL_NOTICES.md).
