# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

html5-qrcode is a cross-platform HTML5 QR code & barcode scanner library supporting:
- Inline webcam/camera scanning (Android, iOS, desktop)
- File-based image scanning
- 16+ barcode formats (QR, EAN, CODE_128, UPC, PDF_417, AZTEC, etc.)

Two API modes:
- **Html5QrcodeScanner** - End-to-end scanner with built-in UI (easy integration)
- **Html5Qrcode** - Headless API for custom UIs

## Build Commands

```bash
npm install          # Install dependencies
npm run build        # Full build (prebuild → build → postbuild)
npm test             # Run tests via mocha-phantomjs
```

Build process: Babel transpiles ES6 to ES5 → babel-minify minifies → postbuild concatenates ZXing + source into `minified/html5-qrcode.min.js`.

## Architecture

```
src/
├── html5-qrcode.js          # Core scanning engine (low-level API)
└── html5-qrcode-scanner.js  # UI wrapper component (high-level API)

transpiled/                   # Auto-generated ES5 (never edit)
minified/                     # Auto-generated production bundle (never edit)
third_party/
└── zxing-js.umd.min.js      # ZXing barcode decoding library (bundled)
```

### Core Classes

**Html5Qrcode** (`src/html5-qrcode.js`):
- Wraps ZXing MultiFormatReader for barcode decoding
- Manages camera access via Media Constraints API
- Key methods: `getCameras()`, `start()`, `stop()`, `scanFile()`, `clear()`
- Handles browser compatibility (webkit/moz/ms prefixes)

**Html5QrcodeScanner** (`src/html5-qrcode-scanner.js`):
- High-level wrapper with complete UI
- Camera/file toggle, status messages, scan visualization
- Supports language config (`lang: "de"` for German)
- External CSS support, AJAX response container

## Development Workflow

1. Edit source files in `src/` only
2. Run `npm run build` to regenerate transpiled and minified outputs
3. Run `npm test` to verify changes
4. Commit includes changes to `src/`, `transpiled/`, and `minified/`

## Testing

Tests use Mocha + Chai + PhantomJS for headless browser testing.

- Test harness: `test/test.html5-qrcode.html`
- Test cases: `test/test.html5-qrcode.js`
- Tests cover constructor validation, state initialization, video constraints, and config handling

## Fork-Specific Features (individual branch)

This fork includes enhancements not in upstream:
- German language support
- External CSS support (removed inline CSS)
- Option to disable file scanning
- AJAX response container integration
