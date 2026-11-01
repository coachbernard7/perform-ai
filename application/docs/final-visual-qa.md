# Final Visual QA

The Expo SDK 57 web preview was captured at 390 × 844 on 20 September 2026. The home screen renders the Alpha Omega lockup, Saint Bernard artwork, primary rehearsal actions, progress metrics, latest script card, and five-item bottom navigation without clipping or overlap. The card and type hierarchy remain readable at phone width.

The payments route renders the five GBP plans, four payment methods, BNB network warning, scannable QR code, complete merchant address, and working action buttons within the phone viewport. The form continues below the fold as intended. No horizontal overflow, clipped text, broken image, or obscured navigation was observed in either capture.

The progressive rehearsal route also passed at 390 × 844. The section label, timer, progress line, four progressive-memory levels, script text, retry/reveal controls, record/analyse action, transport button, and final action remain readable and reachable without overlap. The TXT/PDF/DOCX/PPTX import screen shows the supported formats and speaker-note claim accurately, with usable title, script, duration, and save controls. The save button continues just below the viewport within the intended scroll container.

End-to-end browser interaction created a new two-section script through the real form, persisted it under the versioned local state key, opened the rehearsal, and confirmed the corrected `1/2` section count when no section filter is supplied. Advancing and finishing stored a 100% completion session with both section results and `analysisStatus: not-recorded`, then opened the result route. The result deliberately displayed speech accuracy and transcript metrics as unavailable rather than inventing scores when no recording was analysed.

The profile route exposed the six theme choices, dedicated Dark mode switch, focus/reduced-motion switches, filler-word editor, and local privacy explanation. Triggering the real Dark mode control changed persisted theme state from `alpha-omega` to `white`; triggering it again restored `alpha-omega`. The previously completed rehearsal remained in local storage throughout, confirming that settings changes do not discard history.
