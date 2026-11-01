# PERFORM AI — Windows Local PWA Recovery

If `http://127.0.0.1:4182/app/` shows a blank page and the browser console reports either **“Response body is already used”** or **“Unexpected token '<'”**, the browser has retained an earlier local service-worker cache. This is a browser cache condition, not a failed login or missing application feature.

Use the corrected `PERFORM_AI_WINDOWS_LOCAL_TEST_FIXED.zip` bundle instead of editing the old source folder. Extract it to a new short folder, such as `D:\perform-ai-fixed`, and run `START_PERFORM_AI_LOCAL_TEST.ps1`. The starter serves the corrected generated release on `http://127.0.0.1:4183/`, which does not share the old port-4182 local PWA cache.

The script creates local-only private storage and a temporary `localadmin` account. It does not create or upload a real account file, payment proof, reviewer credential, provider key, or HostGator configuration. Keep the PowerShell window open while testing. Use `Ctrl+C` in that window to stop the server when finished.

The corrected release uses a new service-worker cache revision and caches only validated static JavaScript, CSS, image, font, and worker responses. A fresh Chromium profile test confirmed that the app renders before and after reload, the JavaScript bundle is returned as `application/javascript`, and no service-worker cache errors occur.
