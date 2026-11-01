<?php
declare(strict_types=1);

require_once __DIR__ . '/payment-storage.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

try {
    $storage = spr_payment_storage_dir();
} catch (RuntimeException $error) {
    http_response_code(500);
    exit('Private payment storage is unavailable.');
}

$expectedUser = (string)(getenv('SPR_REVIEW_USER') ?: '');
$passwordHash = (string)(getenv('SPR_REVIEW_PASSWORD_HASH') ?: '');
$privateConfig = dirname($storage) . DIRECTORY_SEPARATOR . 'reviewer.json';
if (($expectedUser === '' || $passwordHash === '') && is_file($privateConfig)) {
    $credentials = json_decode((string)file_get_contents($privateConfig), true);
    if (is_array($credentials)) {
        $expectedUser = (string)($credentials['username'] ?? '');
        $passwordHash = (string)($credentials['password_hash'] ?? '');
    }
}
if ($expectedUser === '' || $passwordHash === '') {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Payment review is disabled until SPR_REVIEW_USER and SPR_REVIEW_PASSWORD_HASH are configured.\n");
}

$user = (string)($_SERVER['PHP_AUTH_USER'] ?? '');
$password = (string)($_SERVER['PHP_AUTH_PW'] ?? '');
if (!hash_equals($expectedUser, $user) || !password_verify($password, $passwordHash)) {
    header('WWW-Authenticate: Basic realm="PERFORM AI payment review"');
    http_response_code(401);
    exit('Authentication required.');
}

session_name('spr_payment_review');
session_start(['cookie_httponly' => true, 'cookie_secure' => !empty($_SERVER['HTTPS']), 'cookie_samesite' => 'Strict', 'use_strict_mode' => true]);
if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));

function load_record(string $reference): array {
    $path = spr_payment_record_path($reference);
    if (!is_file($path)) throw new RuntimeException('Submission not found.');
    $record = json_decode((string)file_get_contents($path), true);
    if (!is_array($record)) throw new RuntimeException('Submission record is invalid.');
    return $record;
}

function escape_html(mixed $value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

if (isset($_GET['proof'])) {
    try {
        $record = load_record((string)$_GET['proof']);
        $proofName = basename((string)($record['proof_file'] ?? ''));
        $path = $storage . DIRECTORY_SEPARATOR . $proofName;
        if ($proofName === '' || !is_file($path)) throw new RuntimeException('Proof image not found.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) throw new RuntimeException('Proof image is invalid.');
        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="payment-proof.' . pathinfo($proofName, PATHINFO_EXTENSION) . '"');
        readfile($path);
        exit;
    } catch (RuntimeException $error) {
        http_response_code(404);
        exit('Proof unavailable.');
    }
}

$message = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $csrf = (string)($_POST['csrf'] ?? '');
    if (!hash_equals((string)$_SESSION['csrf'], $csrf)) {
        http_response_code(403);
        exit('Invalid review token.');
    }
    $reference = strtoupper(trim((string)($_POST['reference'] ?? '')));
    $decision = (string)($_POST['decision'] ?? '');
    $note = substr(trim((string)($_POST['note'] ?? '')), 0, 500);
    if (!in_array($decision, ['approved_manual', 'rejected_manual'], true)) {
        http_response_code(422);
        exit('Invalid review decision.');
    }
    try {
        $record = load_record($reference);
        $record['status'] = $decision;
        $record['reviewed_at'] = gmdate('c');
        $record['reviewed_by'] = $user;
        $record['review_note'] = $note ?: null;
        $record['audit_log'] = array_values(array_merge(is_array($record['audit_log'] ?? null) ? $record['audit_log'] : [], [[
            'status' => $decision,
            'reviewed_at' => $record['reviewed_at'],
            'reviewed_by' => $user,
            'note' => $record['review_note'],
        ]]));
        if (file_put_contents(spr_payment_record_path($reference), json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
            throw new RuntimeException('Review decision could not be saved.');
        }
        $message = $reference . ' marked ' . $decision . '. No product access was granted automatically.';
    } catch (RuntimeException $error) {
        http_response_code(422);
        $message = $error->getMessage();
    }
}

$records = [];
foreach (glob($storage . DIRECTORY_SEPARATOR . 'spr-*.json') ?: [] as $path) {
    $record = json_decode((string)file_get_contents($path), true);
    if (is_array($record)) $records[] = $record;
}
usort($records, fn(array $left, array $right) => strcmp((string)($right['submitted_at'] ?? ''), (string)($left['submitted_at'] ?? '')));
?>
<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PERFORM AI Payment Review</title>
  <style>
    body{margin:0;background:#050811;color:#eef5ff;font:15px/1.5 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:32px 18px 80px}h1{font-family:Georgia,serif;font-size:34px;margin:0 0 8px}.note{color:#9caec4}.message{padding:12px 14px;border:1px solid #285f48;border-radius:12px;background:#0b241a;margin:18px 0}.card{border:1px solid #273454;border-radius:16px;background:#0c1222;padding:18px;margin:14px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.label{display:block;color:#8ea1ba;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.value{word-break:break-word}form{display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-top:16px}input,button{border-radius:10px;border:1px solid #334262;padding:11px;background:#08101f;color:#fff}button{cursor:pointer;font-weight:700}.approve{background:#12643d}.reject{background:#7f2832}a{color:#65dcff}@media(max-width:720px){.grid,form{grid-template-columns:1fr}}
  </style>
</head>
<body><main>
  <h1>Payment review</h1>
  <p class="note">Authenticated manual review only. A decision records an audit entry; it never grants access automatically.</p>
  <?php if ($message !== ''): ?><div class="message"><?= escape_html($message) ?></div><?php endif; ?>
  <?php if (!$records): ?><div class="card">No payment submissions yet.</div><?php endif; ?>
  <?php foreach ($records as $record): ?>
    <section class="card">
      <div class="grid">
        <div><span class="label">Reference</span><span class="value"><?= escape_html($record['reference'] ?? '') ?></span></div>
        <div><span class="label">Status</span><span class="value"><?= escape_html($record['status'] ?? '') ?></span></div>
        <div><span class="label">Submitted</span><span class="value"><?= escape_html($record['submitted_at'] ?? '') ?></span></div>
        <div><span class="label">Plan</span><span class="value"><?= escape_html(($record['plan_label'] ?? '') . ' ' . ($record['plan_price'] ?? '')) ?></span></div>
        <div><span class="label">Method / network</span><span class="value"><?= escape_html(($record['payment_method'] ?? '') . ' · ' . ($record['network'] ?? '')) ?></span></div>
        <div><span class="label">Reply email</span><span class="value"><?= escape_html($record['email'] ?? '—') ?></span></div>
        <div><span class="label">TXID / reference</span><span class="value"><?= escape_html($record['txid'] ?? '') ?></span></div>
        <div><span class="label">Destination</span><span class="value"><?= escape_html($record['wallet_address'] ?? '') ?></span></div>
        <div><span class="label">Proof</span><span class="value"><?php if (!empty($record['proof_file'])): ?><a href="?proof=<?= urlencode((string)$record['reference']) ?>" target="_blank" rel="noopener">View private image</a><?php else: ?>None<?php endif; ?></span></div>
      </div>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= escape_html($_SESSION['csrf']) ?>">
        <input type="hidden" name="reference" value="<?= escape_html($record['reference'] ?? '') ?>">
        <input name="note" maxlength="500" placeholder="Reviewer note (optional)" aria-label="Reviewer note">
        <button class="approve" name="decision" value="approved_manual">Approve manually</button>
        <button class="reject" name="decision" value="rejected_manual">Reject</button>
      </form>
    </section>
  <?php endforeach; ?>
</main></body></html>
