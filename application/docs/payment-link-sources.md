# Payment Link Sources

- Trust Wallet Deep Linking: https://developer.trustwallet.com/developer/develop-for-trust/deeplinking — universal `https://link.trustwallet.com/send` links accept an asset Universal Asset ID, recipient address, and optional amount; installed apps open directly and otherwise show a download page.
- Trust Wallet Universal Asset ID: https://developer.trustwallet.com/developer/new-asset/universal_asset_id — Ethereum is `c60`, BNB Smart Chain is `c20000714`, and USDT on TRON is `c195_tTR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`.
- MetaMask mobile deeplinks: https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks/ — native transfers use `https://link.metamask.io/send/{recipient}@{chainId}` and token transfers use the token contract route.
- TronLink DeepLink: https://docs.tronlink.org/mobile/deeplink/ — TRON transfers require a structured encoded payload and sender/session callback details, so the release uses Trust Wallet's universal link plus a QR/copy fallback rather than fabricating a direct TronLink transfer.

These links justify the public wallet handoff only. They do not verify payment; submitted TXIDs and screenshots remain pending manual review.
