# Matrix Rain QA

The live Expo web preview was switched to the persisted `matrix` theme with reduced motion disabled. The next checks verify the rendered falling-code layer, visual depth behind translucent surfaces, and motion between captured frames.

Production-export verification passed at 390 × 844. The page rendered 13 independent glyph columns. All eight sampled columns changed vertical transforms over 4.2 seconds, and the two frame images differed. The later frame visibly shows green binary/Latin/half-width Katakana code falling behind the interface. Translucent Matrix cards preserve the effect while maintaining readable headings, actions, progress metrics, mascot artwork, and bottom navigation. Reduced-motion support freezes columns at deterministic offsets rather than removing the theme.
