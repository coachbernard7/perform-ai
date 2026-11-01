<?php
declare(strict_types=1);

function spr_payment_storage_dir(): string {
    $documentRoot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__)) ?: __DIR__;
    $configured = trim((string)(getenv('SPR_PAYMENT_STORAGE_DIR') ?: ''));
    $storage = $configured !== ''
        ? $configured
        : dirname($documentRoot) . DIRECTORY_SEPARATOR . 'spr-private' . DIRECTORY_SEPARATOR . 'payment-submissions';

    if (!is_dir($storage) && !mkdir($storage, 0700, true) && !is_dir($storage)) {
        throw new RuntimeException('Private payment storage could not be created.');
    }
    $resolved = realpath($storage);
    if ($resolved === false) throw new RuntimeException('Private payment storage is unavailable.');

    $rootPrefix = rtrim($documentRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    if (str_starts_with($resolved . DIRECTORY_SEPARATOR, $rootPrefix)) {
        throw new RuntimeException('Payment storage must be outside the public document root.');
    }
    return $resolved;
}

function spr_payment_record_path(string $reference): string {
    $safe = strtolower(preg_replace('/[^A-Z0-9-]/i', '', $reference) ?? '');
    if (!preg_match('/^spr-[a-f0-9]{10}$/', $safe)) throw new RuntimeException('Invalid payment reference.');
    return spr_payment_storage_dir() . DIRECTORY_SEPARATOR . $safe . '.json';
}
