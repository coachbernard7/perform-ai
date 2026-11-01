<?php
declare(strict_types=1);

function macgyver_private_root(): string {
    $document = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__));
    if ($document === false) throw new RuntimeException('Storage unavailable.');
    $leaf = defined('PERFORM_AI_PREVIEW_MODE') && PERFORM_AI_PREVIEW_MODE === true ? 'macgyver-review-v1' : 'macgyver-v1';
    $directory = dirname($document) . '/perform-ai-private/' . $leaf;
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new RuntimeException('Storage unavailable.');
    $resolved = realpath($directory);
    if (!$resolved || str_starts_with($resolved . '/', rtrim($document, '/') . '/')) throw new RuntimeException('Private storage must be outside the website.');
    return $resolved;
}

function macgyver_locked(string $file, callable $operation): mixed {
    $previousMask = umask(0077);
    try { $handle = fopen($file . '.lock', 'c'); } finally { umask($previousMask); }
    if (!$handle) throw new RuntimeException('Storage unavailable.');
    try {
        if (!flock($handle, LOCK_EX)) throw new RuntimeException('Storage unavailable.');
        $state = is_file($file) ? json_decode((string)file_get_contents($file), true, 64, JSON_THROW_ON_ERROR) : null;
        if ($state !== null && !is_array($state)) throw new RuntimeException('Storage unavailable.');
        [$next, $result] = $operation($state);
        if ($next !== null) {
            $encoded = json_encode($next, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
            if (strlen($encoded) > 2000000) throw new DomainException('Memory is full. Export it before starting a new account archive.');
            $temporary = tempnam(dirname($file), 'mg-');
            if ($temporary === false) throw new RuntimeException('Storage unavailable.');
            try {
                chmod($temporary, 0600);
                if (file_put_contents($temporary, $encoded) !== strlen($encoded) || !rename($temporary, $file)) throw new RuntimeException('Storage unavailable.');
            } finally { if (is_file($temporary)) unlink($temporary); }
        }
        return $result;
    } finally { flock($handle, LOCK_UN); fclose($handle); }
}

function macgyver_consume_limits(array $limits): void {
    macgyver_locked(macgyver_private_root() . '/usage.json', function (?array $state) use ($limits): array {
        $state ??= []; $now = time();
        foreach ($limits as [$key, $count, $window]) {
            $entries = array_values(array_filter($state[$key] ?? [], fn($time) => is_int($time) && $time > $now - $window));
            if (count($entries) >= $count) throw new OverflowException('Usage limit reached. Try again after the test window resets.');
            $state[$key] = [...$entries, $now];
        }
        // Failed checks never persist any of the tentative counters.
        return [$state, null];
    });
}

function macgyver_memory(string $id, ?int $revision = null, ?callable $change = null): array {
    return macgyver_locked(macgyver_private_root() . '/user-' . hash('sha256', $id) . '.json', function (?array $state) use ($revision, $change): array {
        $state ??= ['version'=>1, 'revision'=>0, 'notes'=>'', 'preferences'=>['personality'=>'Supportive','speed'=>1,'voice'=>''], 'messages'=>[]];
        if ($change === null) return [null, $state];
        if ($revision !== $state['revision']) throw new DomainException('Memory changed in another tab. Reload it before sending again.');
        $next = $change($state); $next['revision'] = $state['revision'] + 1;
        if (count($next['messages']) > 200) throw new DomainException('Conversation archive is full. Export it; existing messages have been preserved.');
        return [$next, $next];
    });
}
