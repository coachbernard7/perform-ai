<?php
declare(strict_types=1);

require_once __DIR__ . '/plan-storage.php';

const PERFORM_AI_SESSION = 'perform_ai_session';
const PERFORM_AI_CONFIG_ENV = 'PERFORM_AI_ACCOUNT_CONFIG';
const PERFORM_AI_REGISTRATION_STORAGE_ENV = 'PERFORM_AI_REGISTRATION_STORAGE_DIR';

function perform_ai_json(int $status, array $payload): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function perform_ai_document_root(): string {
    return realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__)) ?: __DIR__;
}

function perform_ai_private_directory(string $configured, string $defaultLeaf, string $errorLabel): string {
    $documentRoot = perform_ai_document_root();
    $storage = $configured !== ''
        ? $configured
        : dirname($documentRoot) . DIRECTORY_SEPARATOR . 'perform-ai-private' . DIRECTORY_SEPARATOR . $defaultLeaf;
    if (!is_dir($storage) && !mkdir($storage, 0700, true) && !is_dir($storage)) {
        throw new RuntimeException($errorLabel . ' could not be created.');
    }
    $resolved = realpath($storage);
    if ($resolved === false || str_starts_with($resolved . DIRECTORY_SEPARATOR, rtrim($documentRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR)) {
        throw new RuntimeException($errorLabel . ' must be outside the public document root.');
    }
    return $resolved;
}

function perform_ai_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    session_name(PERFORM_AI_SESSION);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/app/account-auth.php'))), '/') . '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
}

function perform_ai_allowed_origin(): bool {
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') return true;
    $host = preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''));
    return $host !== '' && strcasecmp((string)parse_url($origin, PHP_URL_HOST), $host) === 0;
}

function perform_ai_config_path(): string {
    $configured = trim((string)(getenv(PERFORM_AI_CONFIG_ENV) ?: ''));
    if ($configured !== '') return $configured;
    return dirname(perform_ai_document_root()) . DIRECTORY_SEPARATOR . 'perform-ai-private' . DIRECTORY_SEPARATOR . 'accounts.php';
}

function perform_ai_registration_storage_dir(): string {
    return perform_ai_private_directory(
        trim((string)(getenv(PERFORM_AI_REGISTRATION_STORAGE_ENV) ?: '')),
        'registrations',
        'Private registration storage'
    );
}

function perform_ai_registered_accounts(): array {
    try {
        $accounts = [];
        foreach (glob(perform_ai_registration_storage_dir() . DIRECTORY_SEPARATOR . 'account-*.json') ?: [] as $path) {
            $account = json_decode((string)file_get_contents($path), true);
            if (is_array($account) && isset($account['id'], $account['username'], $account['email'], $account['password_hash'])) $accounts[] = $account;
        }
        return $accounts;
    } catch (RuntimeException) {
        return [];
    }
}

function perform_ai_accounts(): array {
    // Review builds opt in server-side; the browser cannot select an account file.
    // Read the existing dedicated test users without copying or modifying them.
    if (defined('PERFORM_AI_PREVIEW_MODE') && PERFORM_AI_PREVIEW_MODE === true) {
        $path = dirname(perform_ai_document_root()) . '/perform-ai-private/coaching-users.php';
        $users = is_file($path) ? require $path : null;
        if (!is_array($users)) throw new RuntimeException('Private preview accounts are unavailable.');
        $accounts = []; $ids = [];
        foreach ($users as $username => $user) {
            if (!is_string($username) || !is_array($user) || !is_string($user['id'] ?? null) || !preg_match('/^[A-Za-z0-9_-]{1,80}$/D',$user['id']) || in_array($user['id'],$ids,true) || !is_string($user['password_hash'] ?? null)) throw new RuntimeException('Preview account configuration is invalid.');
            $ids[] = $user['id'];
            $accounts[] = ['id'=>$user['id'],'username'=>$username,'email'=>$username.'@preview.invalid','name'=>$user['display_name']??$username,'password_hash'=>$user['password_hash'],'role'=>'user','membership'=>'permanent_free_trial'];
        }
        return $accounts;
    }
    $path = perform_ai_config_path();
    if (!is_file($path)) throw new RuntimeException('Account configuration is unavailable.');
    $config = require $path;
    $accounts = is_array($config) ? ($config['accounts'] ?? null) : null;
    if (!is_array($accounts)) throw new RuntimeException('Account configuration is invalid.');
    return array_merge($accounts, perform_ai_registered_accounts());
}

function perform_ai_profile_storage_dir(): string {
    if (defined('PERFORM_AI_PREVIEW_MODE') && PERFORM_AI_PREVIEW_MODE === true) return perform_ai_private_directory('', 'macgyver-preview-thumbnails', 'Private preview thumbnail storage');
    return perform_ai_private_directory(
        trim((string)(getenv('PERFORM_AI_PROFILE_STORAGE_DIR') ?: '')),
        'profile-thumbnails',
        'Private thumbnail storage'
    );
}

function perform_ai_thumbnail_path(string $accountId): string {
    if (!preg_match('/^[a-z0-9-]{3,40}$/', $accountId)) throw new RuntimeException('Invalid account identifier.');
    return perform_ai_profile_storage_dir() . DIRECTORY_SEPARATOR . $accountId . '.jpg';
}

function perform_ai_public_account(array $account): array {
    $thumbnailUrl = null;
    try {
        if (is_file(perform_ai_thumbnail_path((string)$account['id']))) $thumbnailUrl = 'profile-thumbnail.php?action=view&v=' . rawurlencode((string)$account['id']);
    } catch (RuntimeException) {
        // Preserve sign-in availability when optional thumbnails are unavailable.
    }
    return [
        'id' => (string)$account['id'],
        'username' => (string)$account['username'],
        'email' => (string)$account['email'],
        'name' => (string)$account['name'],
        'role' => (string)$account['role'],
        'membership' => (string)($account['membership'] ?? 'standard'),
        'selectedPlan' => ($account['selected_plan'] ?? null) ? (string)$account['selected_plan'] : null,
        'phone' => (string)($account['phone'] ?? ''),
        'thumbnailUrl' => $thumbnailUrl,
    ];
}

function perform_ai_current_account(): ?array {
    perform_ai_start_session();
    $account = $_SESSION['perform_ai_account'] ?? null;
    if (time() - (int)($_SESSION['perform_ai_auth_time'] ?? 0) >= 3600) return null;
    return is_array($account) ? $account : null;
}

function perform_ai_require_account(): array {
    $account = perform_ai_current_account();
    if ($account === null) perform_ai_json(401, ['ok' => false, 'error' => 'Login required.']);
    return $account;
}

function perform_ai_csrf_token(): string {
    perform_ai_start_session();
    if (!isset($_SESSION['perform_ai_csrf'])) $_SESSION['perform_ai_csrf'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['perform_ai_csrf'];
}

function perform_ai_require_csrf(): void {
    $provided = (string)($_SERVER['HTTP_X_PERFORM_AI_CSRF'] ?? '');
    $expected = (string)($_SESSION['perform_ai_csrf'] ?? '');
    if ($expected === '' || !hash_equals($expected, $provided)) perform_ai_json(403, ['ok' => false, 'error' => 'Invalid session request token.']);
}

function perform_ai_rate_limit(string $key, int $limit, int $seconds): void {
    $handle = null;
    try {
        $leaf = defined('PERFORM_AI_PREVIEW_MODE') && PERFORM_AI_PREVIEW_MODE === true ? 'macgyver-review-auth-limits' : 'auth-limits';
        $directory = perform_ai_private_directory('', $leaf, 'Private rate limit storage');
        $path = $directory . '/' . hash('sha256', $key . ':' . ($_SERVER['REMOTE_ADDR'] ?? '')) . '.json';
        $mask = umask(0077);
        try { $handle = fopen($path, 'c+'); } finally { umask($mask); }
        if (!$handle || !flock($handle, LOCK_EX)) throw new RuntimeException('Rate limit unavailable.');
        $raw = stream_get_contents($handle);
        $entries = $raw === '' ? [] : json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($entries)) throw new RuntimeException('Rate limit unavailable.');
        $now = time();
        $entries = array_values(array_filter($entries, fn($timestamp) => is_int($timestamp) && $timestamp > $now - $seconds));
        if (count($entries) >= $limit) { flock($handle, LOCK_UN); fclose($handle); $handle = null; perform_ai_json(429, ['ok'=>false,'error'=>'Too many attempts. Please wait and try again.']); }
        $entries[] = $now; $encoded = json_encode($entries, JSON_THROW_ON_ERROR);
        rewind($handle);
        if (!ftruncate($handle, 0) || fwrite($handle, $encoded) !== strlen($encoded) || !fflush($handle)) throw new RuntimeException('Rate limit unavailable.');
    } catch (Throwable) { perform_ai_json(503, ['ok'=>false,'error'=>'Account request limits are temporarily unavailable.']); }
    finally { if (is_resource($handle)) { flock($handle, LOCK_UN); fclose($handle); } }
}

function perform_ai_session_for(array $account): void {
    session_regenerate_id(true);
    $_SESSION['perform_ai_auth_time'] = time();
    $_SESSION['perform_ai_account'] = [
        'id' => (string)$account['id'],
        'username' => (string)$account['username'],
        'email' => (string)$account['email'],
        'name' => (string)$account['name'],
        'role' => (string)$account['role'],
        'membership' => (string)($account['membership'] ?? 'standard'),
        'selected_plan' => ($account['selected_plan'] ?? null) ? (string)$account['selected_plan'] : null,
        'phone' => (string)($account['phone'] ?? ''),
    ];
    unset($_SESSION['perform_ai_thumbnail']);
}

function perform_ai_clean_registration(array $payload): array {
    $name = trim((string)($payload['name'] ?? ''));
    $username = strtolower(trim((string)($payload['username'] ?? '')));
    $email = strtolower(trim((string)($payload['email'] ?? '')));
    $password = (string)($payload['password'] ?? '');
    $plan = strtolower(trim((string)($payload['plan'] ?? '')));
    if (strlen($name) < 2 || strlen($name) > 80) throw new InvalidArgumentException('Enter a name between 2 and 80 characters.');
    if (!preg_match('/^[a-z0-9][a-z0-9_-]{2,30}$/', $username)) throw new InvalidArgumentException('Choose a username using 3–31 lowercase letters, numbers, hyphens, or underscores.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) throw new InvalidArgumentException('Enter a valid email address.');
    if (strlen($password) < 10 || strlen($password) > 128) throw new InvalidArgumentException('Use a password between 10 and 128 characters.');
    if (!in_array($plan, perform_ai_plan_ids(), true)) throw new InvalidArgumentException('Choose a subscription level.');
    return compact('name', 'username', 'email', 'password', 'plan');
}

function perform_ai_register_account(array $payload): array {
    $input = perform_ai_clean_registration($payload);
    foreach (perform_ai_accounts() as $existing) {
        if (!is_array($existing)) continue;
        if (strtolower((string)($existing['username'] ?? '')) === $input['username'] || strtolower((string)($existing['email'] ?? '')) === $input['email']) {
            throw new InvalidArgumentException('That username or email is already registered.');
        }
    }
    $account = [
        'id' => 'member-' . bin2hex(random_bytes(8)),
        'username' => $input['username'],
        'email' => $input['email'],
        'name' => $input['name'],
        'role' => 'user',
        'membership' => 'pending_manual_verification',
        'selected_plan' => $input['plan'],
        'phone' => '',
        'password_hash' => password_hash($input['password'], PASSWORD_DEFAULT),
        'registered_at' => gmdate('c'),
    ];
    if ($account['password_hash'] === false) throw new RuntimeException('Password protection could not be created.');
    $path = perform_ai_registration_storage_dir() . DIRECTORY_SEPARATOR . 'account-' . $account['id'] . '.json';
    if (file_put_contents($path, json_encode($account, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
        throw new RuntimeException('Registration could not be saved.');
    }
    return $account;
}

// This file is both the account endpoint and the shared session helper used by
// authenticated sidecars. Do not dispatch an account action when another PHP
// endpoint includes it.
if (realpath(__FILE__) !== realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? ''))) return;

if (!perform_ai_allowed_origin()) perform_ai_json(403, ['ok' => false, 'error' => 'Cross-site request rejected.']);
perform_ai_start_session();
$method = (string)($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = strtolower(trim((string)($_GET['action'] ?? 'status')));

if ($method === 'GET' && $action === 'status') {
    $account = perform_ai_current_account();
    perform_ai_json(200, ['ok' => true, 'authenticated' => $account !== null, 'account' => $account ? perform_ai_public_account($account) : null, 'csrfToken' => perform_ai_csrf_token()]);
}

if ($method === 'POST' && $action === 'login') {
    perform_ai_rate_limit('login', 8, 900);
    $payload = json_decode((string)file_get_contents('php://input'), true);
    $identifier = strtolower(trim((string)($payload['identifier'] ?? '')));
    $password = (string)($payload['password'] ?? '');
    if ($identifier === '' || $password === '') perform_ai_json(422, ['ok' => false, 'error' => 'Enter your username or email and password.']);
    try {
        $matched = null;
        foreach (perform_ai_accounts() as $account) {
            if (!is_array($account)) continue;
            $username = strtolower((string)($account['username'] ?? ''));
            $email = strtolower((string)($account['email'] ?? ''));
            if (($identifier === $username || $identifier === $email) && password_verify($password, (string)($account['password_hash'] ?? ''))) {
                $matched = $account;
                break;
            }
        }
    } catch (RuntimeException $error) {
        error_log($error->getMessage());
        perform_ai_json(500, ['ok' => false, 'error' => 'Account service is not configured.']);
    }
    if ($matched === null) perform_ai_json(401, ['ok' => false, 'error' => 'The login details were not recognised.']);
    perform_ai_session_for($matched);
    perform_ai_json(200, ['ok' => true, 'authenticated' => true, 'account' => perform_ai_public_account($_SESSION['perform_ai_account']), 'csrfToken' => perform_ai_csrf_token()]);
}

if ($method === 'POST' && $action === 'register') {
    if (defined('PERFORM_AI_PREVIEW_MODE') && PERFORM_AI_PREVIEW_MODE === true) perform_ai_json(403,['ok'=>false,'error'=>'This private preview uses the dedicated test accounts. Registration is disabled.']);
    perform_ai_rate_limit('register', 3, 3600);
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) perform_ai_json(422, ['ok' => false, 'error' => 'Registration details are invalid.']);
    try {
        $account = perform_ai_register_account($payload);
        perform_ai_session_for($account);
        perform_ai_json(201, [
            'ok' => true,
            'authenticated' => true,
            'account' => perform_ai_public_account($_SESSION['perform_ai_account']),
            'csrfToken' => perform_ai_csrf_token(),
            'message' => 'Welcome to PERFORM AI. Your selected plan is pending manual verification.',
        ]);
    } catch (InvalidArgumentException $error) {
        perform_ai_json(422, ['ok' => false, 'error' => $error->getMessage()]);
    } catch (RuntimeException $error) {
        error_log($error->getMessage());
        perform_ai_json(500, ['ok' => false, 'error' => 'Registration could not be completed.']);
    }
}

if ($method === 'POST' && $action === 'logout') {
    perform_ai_require_account();
    perform_ai_require_csrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool)$params['secure'], (bool)$params['httponly']);
    }
    session_destroy();
    perform_ai_json(200, ['ok' => true, 'authenticated' => false]);
}

perform_ai_json(405, ['ok' => false, 'error' => 'Unsupported account request.']);
