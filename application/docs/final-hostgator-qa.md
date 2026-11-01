# Final HostGator Pre-Upload QA

## Candidate under test

The candidate was built from the shared Expo SDK 57 source using `web.output: "single"`. This client-rendered SPA is the appropriate output for the supplied Apache SPA fallback and avoids the server/client hydration mismatches observed in the earlier prerendered static candidate.

## Automated production-browser smoke test

The exact candidate export was served locally and exercised with Chromium/Playwright at **390 × 844**. The final pass completed without console errors or page errors.

| Check | Result | Evidence |
| --- | --- | --- |
| Home route renders | Passed | Home headline rendered at phone viewport. |
| Animated Matrix theme | Passed | 13 code-rain columns rendered; all 8 sampled columns changed transform after the observation interval. |
| Payment methods | Passed | BNB BEP-20, Ethereum/ERC-20, USDT TRC-20, and Revolut selections were exercised. The supplied EVM and TRON destinations appeared only after selecting the correct method; the proof form remained available. |
| Script creation | Passed | A two-section script was created through the rendered form. |
| Rehearsal completion | Passed | The flow advanced through both sections and saved a result without inventing a speech score when no recording/transcript was supplied. |
| Local history after reload | Passed | The completed attempt remained in browser local storage after a full page reload. |
| Payment review safety | Passed | `payment-review.php` returned HTTP 503 while reviewer credentials were intentionally absent. |
| Hydration | Passed | The single-page export emitted no React hydration/page errors; the preceding prerendered candidate did emit React error 418 and was rejected. |

## Visual result

The final 390 × 844 screenshot shows the Matrix-theme practice-history screen. The header, summary card, saved attempt, and five-tab navigation are legible with no clipped controls or overlap. The saved sample session correctly shows **100% completion** but no fabricated accuracy/WPM score.

## Hosting boundary

The local PHP server cannot execute HostGator Apache `.htaccess` rewrite rules. The release validator confirmed physical-file, directory, and PHP exclusions plus SPA fallback rules in the upload. After uploading, the real domain still needs the short live checks listed in `DEPLOYMENT.md`: HTTPS redirect, direct asset delivery, and refresh of `/payments`, `/rehearse`, and `/profile`.
