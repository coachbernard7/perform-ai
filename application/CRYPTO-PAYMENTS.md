# Crypto and Revolut Payment Configuration

## Configured destinations

| Method | Network | Destination |
| --- | --- | --- |
| BNB | BNB Smart Chain (BEP-20) | `0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6` |
| Ethereum / ERC-20 | Ethereum | `0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6` |
| USDT | TRON (TRC-20) | `TFStsK6YQunN2jv9TXubFa73tc42bWrXs3` |
| Revolut | Revolut Pay | <https://revolut.me/coachbernard> |

The crypto buttons use official Trust Wallet universal-link syntax to prefill the network asset and recipient. QR codes encode the same link, and the copy-address control is the fallback. The user must still verify the asset, network, amount, and recipient in the wallet before approving a transaction.

The links intentionally do not prefill a crypto amount because the plans are priced in GBP and on-chain amounts change with the exchange rate. A fixed automatic amount requires a hosted crypto checkout provider that creates an expiring invoice and verifies it with an authenticated webhook. No provider secret belongs in the browser bundle.

## Manual proof intake

The form submits the selected plan, payment method, network, public destination, TXID/reference, optional reply email, and optional JPG/PNG/WebP image. `submit-payment.php` validates the request, rejects cross-site browser posts, requires a custom anti-CSRF signal, rate-limits by a one-way IP hash, enforces a 5 MB image limit, verifies the real MIME type and image structure, assigns a random server filename, records a SHA-256 evidence hash, and saves status `submitted_unverified`.

`payment-storage.php` resolves storage to `SPR_PAYMENT_STORAGE_DIR` when configured. Otherwise it creates `spr-private/payment-submissions` beside—never inside—the domain document root. Deployment fails closed if the resolved location is under `public_html`.

## Authenticated manual review

`payment-review.php` is an HTTP Basic authenticated dashboard. It shows the submitted plan, network, destination, TXID/reference, reply email, and private proof image. A reviewer can record `approved_manual` or `rejected_manual`, a note, reviewer identity, decision time, and an append-only decision entry in the record’s audit log. A review decision **does not grant product access automatically**.

Configure credentials outside `public_html` by creating `spr-private/reviewer.json` beside the `payment-submissions` directory:

```json
{
  "username": "reviewer",
  "password_hash": "$2y$10$REPLACE_WITH_A_REAL_PASSWORD_HASH"
}
```

Generate the hash locally or through cPanel Terminal with:

```bash
php -r 'echo password_hash("CHOOSE-A-LONG-UNIQUE-PASSWORD", PASSWORD_DEFAULT), PHP_EOL;'
```

Alternatively set the server environment variables `SPR_REVIEW_USER` and `SPR_REVIEW_PASSWORD_HASH`. Until one of these methods is configured, `/payment-review.php` returns HTTP 503. The reviewer page is no-cache, frame-denied, and session CSRF protected.

## Verification responsibility

A TXID or screenshot does not prove that the expected asset, network, amount, confirmations, and recipient are correct. The reviewer must verify the record against the appropriate blockchain explorer or Revolut account before choosing a decision. For a larger public product, use authenticated provider webhooks, private object storage, malware scanning, retention rules, and a full entitlement service.
