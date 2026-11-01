# PERFORM AI — Four-Theme and Camera-Safe Visual QA

The exact generated HostGator directory was served locally at a 390 × 844 phone viewport. The application and root landing page now use these four global display choices:

| Theme | Background | Text and accent treatment | Code rain |
| --- | --- | --- | --- |
| **Blue + Green Rain** | Blue and dark blue | Light green text with green controls | Falling green code enabled |
| **Black + Gold** | Black with dark-gold depth | Gold text and gold controls | Disabled |
| **Black + Light Blue** | Black with deep-blue depth | Light-blue text and cyan-blue controls | Disabled |
| **White + Black / Blue** | White and pale blue | Black text with blue controls | Disabled |

**Blue + Green Rain** is the default. The app-wide four-button colour dock is created by the shared `AppScreen` shell, so it is available on every application page. The root public landing page presents the same four choices in its navigation bar.

The shared PERFORM AI lockup contains the bundled Saint Bernard icon and places it above the centred product title. The phone capture confirmed that the icon is visible and the **PERFORM AI** title clears the compact browser header zone. On a physical iPhone, `SafeAreaView` adds the device-specific camera/notch inset before this layout.

The freshly generated HostGator release was served locally and the visual check completed with no browser page errors. The landing test confirmed the blue default, moving green rain, theme persistence, privacy copy, and each of the four modes. The app capture confirmed four toolbar controls, a visible icon, and the browser-header clearance threshold. The verification records are written to `/home/ubuntu/perform-ai-landing-qa.json` and `/home/ubuntu/perform-ai-four-theme-qa.json`; repeat the checks with `scripts/test_perform_ai_landing.py` and `scripts/capture_four_theme_qa.py` against the exact generated release.
