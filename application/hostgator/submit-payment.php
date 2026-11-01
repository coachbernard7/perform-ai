<?php
declare(strict_types=1);

require_once __DIR__ . '/payment-storage.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['ok' => false, 'error' => 'POST required.']);
$length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length > 7 * 1024 * 1024) respond(413, ['ok' => false, 'error' => 'Submission exceeds the 7 MB request limit.']);

$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
$host = preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''));
if ($origin && $host && strcasecmp((string)parse_url($origin, PHP_URL_HOST), $host) !== 0) {
    respond(403, ['ok' => false, 'error' => 'Cross-site submission rejected.']);
}
$csrfSignal = (string)($_SERVER['HTTP_X_SPEECH_REHEARSER'] ?? '');
if (!hash_equals('proof-v1', $csrfSignal)) respond(403, ['ok' => false, 'error' => 'Missing submission security token.']);
if (trim((string)($_POST['website'] ?? '')) !== '') respond(422, ['ok' => false, 'error' => 'Submission rejected.']);

function clean(string $key, int $max = 180): string {
    $value = trim((string)($_POST[$key] ?? ''));
    $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? '';
    return substr($value, 0, $max);
}

$plans = ['basic', 'pro', 'elite', 'sovereign', 'multiverse'];
$methods = ['bnb-bep20', 'eth-erc20', 'usdt-trc20', 'revolut'];
$plan = clean('plan', 30);
$method = clean('payment_method', 30);
$txid = clean('txid', 180);
$email = clean('email', 254);
if (!in_array($plan, $plans, true) || !in_array($method, $methods, true)) respond(422, ['ok' => false, 'error' => 'Invalid plan or payment method.']);
if (!preg_match('/^[A-Za-z0-9._:\/-]{6,180}$/', $txid)) respond(422, ['ok' => false, 'error' => 'Enter a valid TXID or Revolut payment reference.']);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(422, ['ok' => false, 'error' => 'Enter a valid email address.']);

try {
    $storage = spr_payment_storage_dir();
} catch (RuntimeException $error) {
    error_log($error->getMessage());
    respond(500, ['ok' => false, 'error' => 'Private submission storage is unavailable.']);
}

$ipHash = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$rateFile = $storage . DIRECTORY_SEPARATOR . 'rate-' . $ipHash . '.json';
$now = time();
$recent = [];
if (is_file($rateFile)) {
    $decoded = json_decode((string)file_get_contents($rateFile), true);
    if (is_array($decoded)) $recent = array_values(array_filter($decoded, fn($timestamp) => is_int($timestamp) && $timestamp > $now - 3600));
}
if (count($recent) >= 10) respond(429, ['ok' => false, 'error' => 'Too many submissions. Please try again later.']);
$recent[] = $now;
file_put_contents($rateFile, json_encode($recent), LOCK_EX);

$reference = 'SPR-' . strtoupper(bin2hex(random_bytes(5)));
$proofName = null;
$proofSha256 = null;
if (isset($_FILES['proof']) && ($_FILES['proof']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['proof'];
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) respond(422, ['ok' => false, 'error' => 'The proof upload did not complete.']);
    if ((int)$file['size'] > 5 * 1024 * 1024) respond(413, ['ok' => false, 'error' => 'Proof images must be 5 MB or smaller.']);
    $temporaryPath = (string)$file['tmp_name'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime]) || @getimagesize($temporaryPath) === false) respond(422, ['ok' => false, 'error' => 'The proof file must be a valid JPG, PNG, or WebP image.']);
    $proofSha256 = hash_file('sha256', $temporaryPath);
    $proofName = strtolower($reference) . '-' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($temporaryPath, $storage . DIRECTORY_SEPARATOR . $proofName)) respond(500, ['ok' => false, 'error' => 'The proof image could not be stored.']);
}

$record = [
    'reference' => $reference,
    'status' => 'submitted_unverified',
    'submitted_at' => gmdate('c'),
    'plan' => $plan,
    'plan_label' => clean('plan_label', 60),
    'plan_price' => clean('plan_price', 30),
    'payment_method' => $method,
    'network' => clean('network', 100),
    'wallet_address' => clean('wallet_address', 180),
    'txid' => $txid,
    'email' => $email ?: null,
    'proof_file' => $proofName,
    'proof_sha256' => $proofSha256,
    'reviewed_at' => null,
    'reviewed_by' => null,
    'review_note' => null,
];

if (file_put_contents(spr_payment_record_path($reference), json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
    respond(500, ['ok' => false, 'error' => 'The submission record could not be stored.']);
}
respond(201, ['ok' => true, 'reference' => $reference, 'status' => 'pending_manual_verification', 'message' => 'Payment proof submitted for manual verification.']);
