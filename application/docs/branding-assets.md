# PerformAI Branding Asset Record

The final release now uses the supplied public PerformAI source files as its canonical local brand assets. They are copied into the project so the HostGator package remains self-contained rather than relying on an external asset fetch.

| Asset | Supplied URL | Canonical local copy | SHA-256 |
| --- | --- | --- | --- |
| Saint Bernard mascot | `http://performai.co.uk/stbernard.png` | `assets/brand/performai-stbernard.png` | `879138066b323c4764e026fde7618ae563bd114706b89dbc05d1ce47cbd80d34` |
| Saint Bernard icon | `http://performai.co.uk/stbernard.ico` | `assets/brand/performai-stbernard.ico` | `b5a5ac181df09bd3f2f61e1b1a113661fa84e80a66d4926a5b89fc8c70176681` |

The mascot is used directly by the in-app Guardian view at its supplied 927 × 1343 resolution. Native app icons, splash art, Android adaptive icons, PWA icons, and `favicon.png` are derived with contain-fit padding so the image is never cropped. The supplied ICO is copied unchanged to `public/favicon.ico`; it overwrites Expo’s generated root favicon during the HostGator build.

## Visual confirmation

The retained in-app mascot renders as the complete supplied Saint Bernard portrait, with its body, feet, tail, and Alpha Omega chest emblem visible. The square 1024 × 1024 application icon is legible against the dark Alpha Omega field, keeps the full mascot within safe padding, and does not crop the source artwork.
