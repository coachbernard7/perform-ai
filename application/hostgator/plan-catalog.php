<?php
declare(strict_types=1);

require_once __DIR__ . '/account-auth.php';
require_once __DIR__ . '/plan-storage.php';

if (!perform_ai_allowed_origin()) perform_ai_json(403, ['ok' => false, 'error' => 'Cross-site request rejected.']);
perform_ai_start_session();
$method = (string)($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = strtolower(trim((string)($_GET['action'] ?? 'list')));

if ($method === 'GET' && $action === 'list') {
    try {
        perform_ai_json(200, ['ok' => true, 'plans' => perform_ai_plan_catalog()]);
    } catch (RuntimeException $error) {
        error_log($error->getMessage());
        perform_ai_json(500, ['ok' => false, 'error' => 'Subscription catalogue is unavailable.']);
    }
}

if ($method === 'POST' && $action === 'update') {
    $account = perform_ai_require_account();
    if (($account['role'] ?? '') !== 'admin') perform_ai_json(403, ['ok' => false, 'error' => 'Administrator access is required.']);
    perform_ai_require_csrf();
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) perform_ai_json(422, ['ok' => false, 'error' => 'Subscription settings are invalid.']);
    try {
        $plans = perform_ai_write_plan_catalog($payload['plans'] ?? null);
        perform_ai_json(200, ['ok' => true, 'plans' => $plans]);
    } catch (InvalidArgumentException $error) {
        perform_ai_json(422, ['ok' => false, 'error' => $error->getMessage()]);
    } catch (RuntimeException $error) {
        error_log($error->getMessage());
        perform_ai_json(500, ['ok' => false, 'error' => 'Subscription settings could not be saved.']);
    }
}

perform_ai_json(405, ['ok' => false, 'error' => 'Unsupported subscription request.']);
