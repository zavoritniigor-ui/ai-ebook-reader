# Reader Offline Scanner for Android

A separate native scanner APK for AI E-book Reader. Latin OCR is bundled in the APK and runs on the Android device. English and French use the same model. No PC, account, Google Play Services model download, or network connection is required. The merged app manifest removes the `INTERNET` permission, including permissions requested by dependencies.

Choose an image using Android's file picker, or take a full-resolution photo using the system camera. Drag the four page corners; rotation and the optional grayscale contrast filter apply when adding the page. Add up to 20 pages, create the document, then save the PDF and optional geometry JSON using Android's document picker. Open the PDF in Reader through its existing file import. The share action also offers applications that accept PDF files; Android's chooser controls which installed apps appear.

The same final upright bitmap supplies OCR and the visible lossless PDF image. A per-word invisible Unicode layer uses an embedded DejaVu Sans font and explicit spaces. Word rectangles and four-point polygons in JSON are in final-image pixels from the top left. PDF coordinates use `72 / 300` points per pixel. Reading order uses recursive whitespace cuts for Latin text columns. All processing stays in private app storage until the user exports or shares a file.

This version corrects a flat page's perspective manually. It does not flatten a curved book spine. The contrast filter is optional and should be compared with the original on faint accents and small text. Real Pixel 9 / Lenovo photographs, Adobe Scan comparison, and physical device testing remain separate quality gates; emulator success does not establish their quality or speed. The page queue is a working session, not a saved library. It survives Android stopping the app while the camera, picker or save dialog is open (`ScanSession`, private storage); leaving the scanner removes its working copies, and a fresh start removes leftovers and exports older than 24 hours. A cancelled camera leaves no file; a cancelled or failed save removes the partial document; a cancel pressed while the PDF is being written still discards it.

Measured on the bundled model (emulator, airplane mode, synthetic 66-word page): a flat page reads with 2 word errors (WER 3 %; `cœur → ceur`, `Êtes → Étes`). On the synthetic book curve the WER is 10.6 % (`cœur → ccœur`, `bientôt → bientột`, `2026 → 202A`, lost full stops) and stays an open gap until dewarping exists. Re-reading small lines enlarged was tried and removed: it raised the flat page to 5 errors and did not help the curve.

## Build

Use JDK 21, Android SDK platform 36 and build tools 36.0.0. The Gradle wrapper pins Gradle 9.3.1 and its SHA-256. AGP 9.0.0, bundled ML Kit Latin 16.0.1 and PDFBox-Android 2.0.27.0 are pinned. Set `ANDROID_HOME` or put `sdk.dir=/absolute/path/to/sdk` in ignored `local.properties`.

```bash
cd android/ocr-scanner
./gradlew --no-daemon testDebugUnitTest lintDebug assembleDebug assembleDebugAndroidTest
```

The review APK is `app/build/outputs/apk/debug/app-debug.apk`. It is a debug build signed by the build machine's debug key, not an official production release. A production release needs a stable owner-controlled signing key. Keep keys and passwords outside Git; neither the source nor the build reads a production key by default.

Only install to a physical phone after the owner authorizes that device. A local emulator can be used without connecting a phone:

```bash
adb -s emulator-5580 shell cmd connectivity airplane-mode enable
adb -s emulator-5580 shell svc wifi disable
adb -s emulator-5580 shell svc data disable
ANDROID_SERIAL=emulator-5580 ./gradlew --no-daemon connectedDebugAndroidTest
```

The instrumentation test checks the missing network permission, airplane mode, actual bundled OCR on generated English/French text, accented PDF extraction, image transforms, and cancellation. It writes synthetic artifacts only to the app's private `files/validation/` directory. To independently inspect the exported PDF/JSON with PyMuPDF on a computer:

```bash
python3 tools/verify_export.py offline-control.pdf offline-control.json --report result.json
```

Host unit tests cover column order, spanning headings, Unicode preservation, and invalid geometry. A proposed dedicated Android GitHub Actions workflow is prepared separately for owner review because this repository's security gate requires review of workflow changes. Existing Reader CI does not implicitly build this Android project.

## Safety and licensing

- Source input is limited to 64 MiB and 80 megapixels. Decoding is sampled and the final long side is capped at 4000 pixels. Images and OCR are processed one page at a time; PDFBox uses temporary storage. Document size is capped at 20 pages.
- Android's system picker grants access to a selected image. No broad storage or camera permission is requested. The camera receives a temporary URI to the app's own capture file.
- Cancellation stops at stage boundaries and waits for an in-flight OCR task before recycling its bitmap. No partially written PDF is offered for export.
- OCR results are data; no result is evaluated as code or inserted into HTML. The app accepts no externally supplied PDF or font for parsing.
- PDFBox-Android is Apache-2.0; the bundled DejaVu font and its license are under `app/src/main/assets/fonts/`. ML Kit is governed by Google's ML Kit terms, not an open-source model license. No AGPL PDF library is bundled.

Primary documentation: [bundled ML Kit Android OCR](https://developers.google.com/ml-kit/vision/text-recognition/v2/android), [PDFBox-Android source and license](https://github.com/TomRoush/PdfBox-Android), [AGP 9 compatibility](https://developer.android.com/build/releases/agp-9-0-0-release-notes), [ML Kit terms](https://developers.google.com/ml-kit/terms).
