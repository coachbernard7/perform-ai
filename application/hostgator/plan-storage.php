<?php
declare(strict_types=1);

const PERFORM_AI_PLAN_STORAGE_ENV = 'PERFORM_AI_PLAN_STORAGE_DIR';

function perform_ai_plan_document_root(): string {
    return realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__)) ?: __DIR__;
}

function perform_ai_plan_storage_dir(): string {
    $configured = trim((string)(getenv(PERFORM_AI_PLAN_STORAGE_ENV) ?: ''));
    $documentRoot = perform_ai_plan_document_root();
    $storage = $configured !== ''
        ? $configured
        : dirname($documentRoot) . DIRECTORY_SEPARATOR . 'perform-ai-private';
    if (!is_dir($storage) && !mkdir($storage, 0700, true) && !is_dir($storage)) {
        throw new RuntimeException('Private subscription storage could not be created.');
    }
    $resolved = realpath($storage);
    if ($resolved === false || str_starts_with($resolved . DIRECTORY_SEPARATOR, rtrim($documentRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('Private subscription storage must be outside the public document root.');
    }
    return $resolved;
}

function perform_ai_default_plan_catalog(): array {
    return [
        ['id' => 'basic', 'label' => 'Basic', 'amount' => 5.0, 'cycle' => 'annual'],
        ['id' => 'pro', 'label' => 'Pro', 'amount' => 10.0, 'cycle' => 'annual'],
        ['id' => 'elite', 'label' => 'Elite', 'amount' => 20.0, 'cycle' => 'annual'],
        ['id' => 'sovereign', 'label' => 'Sovereign', 'amount' => 30.0, 'cycle' => 'annual'],
        ['id' => 'multiverse', 'label' => 'Multiverse', 'amount' => 50.0, 'cycle' => 'annual'],
    ];
}

function perform_ai_plan_catalog_path(): string {
    return perform_ai_plan_storage_dir() . DIRECTORY_SEPARATOR . 'subscription-catalog.json';
}

function perform_ai_validate_plan_catalog(mixed $plans): array {
    if (!is_array($plans) || count($plans) !== 5) throw new InvalidArgumentException('Exactly five subscription plans are required.');
    $defaults = perform_ai_default_plan_catalog();
    $expected = array_column($defaults, 'id');
    $allowedCycles = ['weekly', 'monthly', '3-monthly', '6-monthly', 'annual'];
    $normalised = [];
    foreach ($plans as $plan) {
        if (!is_array($plan)) throw new InvalidArgumentException('Plan data is invalid.');
        $id = strtolower(trim((string)($plan['id'] ?? '')));
        $label = trim((string)($plan['label'] ?? ''));
        $amount = filter_var($plan['amount'] ?? null, FILTER_VALIDATE_FLOAT);
        $cycle = strtolower(trim((string)($plan['cycle'] ?? '')));
        if (!in_array($id, $expected, true) || $label === '' || strlen($label) > 40 || !preg_match('/^[a-zA-Z0-9 &-]+$/', $label) || $amount === false || $amount < 0 || $amount > 100000 || !in_array($cycle, $allowedCycles, true)) {
            throw new InvalidArgumentException('One or more subscription settings are invalid.');
        }
        $normalised[$id] = ['id' => $id, 'label' => $label, 'amount' => round((float)$amount, 2), 'cycle' => $cycle];
    }
    if (array_keys($normalised) !== $expected) {
        $ordered = [];
        foreach ($expected as $id) {
            if (!isset($normalised[$id])) throw new InvalidArgumentException('Every subscription plan must be present.');
            $ordered[] = $normalised[$id];
        }
        return $ordered;
    }
    return array_values($normalised);
}

function perform_ai_plan_catalog(): array {
    $path = perform_ai_plan_catalog_path();
    if (!is_file($path)) return perform_ai_default_plan_catalog();
    $decoded = json_decode((string)file_get_contents($path), true);
    try {
        return perform_ai_validate_plan_catalog($decoded['plans'] ?? $decoded);
    } catch (InvalidArgumentException) {
        return perform_ai_default_plan_catalog();
    }
}

function perform_ai_plan_ids(): array {
    return array_column(perform_ai_plan_catalog(), 'id');
}

function perform_ai_write_plan_catalog(array $plans): array {
    $validated = perform_ai_validate_plan_catalog($plans);
    $record = ['updatedAt' => gmdate('c'), 'plans' => $validated];
    if (file_put_contents(perform_ai_plan_catalog_path(), json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
        throw new RuntimeException('Subscription settings could not be saved.');
    }
    return $validated;
}
