<?php
declare(strict_types=1);

require_once __DIR__ . '/account-auth.php';

$account = perform_ai_require_account();
$action = strtolower(trim((string)($_GET['action'] ?? 'view')));

if ($action === 'view' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    try {
        $path = perform_ai_thumbnail_path((string)$account['id']);
    } catch (RuntimeException $error) {
        perform_ai_json(500, ['ok' => false, 'error' => 'Thumbnail storage is unavailable.']);
    }
    if (!is_file($path)) {
        http_response_code(404);
        header('Cache-Control: no-store');
        exit;
    }
    header('Content-Type: image/jpeg');
    header('Cache-Control: private, max-age=300');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

if ($action !== 'upload' || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') perform_ai_json(405, ['ok' => false, 'error' => 'Unsupported profile request.']);
perform_ai_require_csrf();
perform_ai_rate_limit('thumbnail', 8, 3600);

if (!function_exists('imagecreatetruecolor')) perform_ai_json(503, ['ok' => false, 'error' => 'Thumbnail processing is unavailable on this server.']);
$file = $_FILES['thumbnail'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) perform_ai_json(422, ['ok' => false, 'error' => 'Choose an image to upload.']);
if ((int)($file['size'] ?? 0) > 2 * 1024 * 1024) perform_ai_json(413, ['ok' => false, 'error' => 'Choose an image smaller than 2 MB.']);
$tmp = (string)$file['tmp_name'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
$dimensions = @getimagesize($tmp);
if ($dimensions === false || !in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) perform_ai_json(422, ['ok' => false, 'error' => 'Use a valid JPG, PNG, or WebP image.']);
$width = (int)$dimensions[0];
$height = (int)$dimensions[1];
if ($width < 32 || $height < 32 || $width > 8000 || $height > 8000) perform_ai_json(422, ['ok' => false, 'error' => 'Choose an image between 32 and 8000 pixels per side.']);

$source = match ($mime) {
    'image/jpeg' => @imagecreatefromjpeg($tmp),
    'image/png' => @imagecreatefrompng($tmp),
    'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmp) : false,
    default => false,
};
if ($source === false) perform_ai_json(422, ['ok' => false, 'error' => 'The selected image could not be processed.']);

$side = min($width, $height);
$sourceX = intdiv($width - $side, 2);
$sourceY = intdiv($height - $side, 2);
$thumbnail = imagecreatetruecolor(128, 128);
$background = imagecolorallocate($thumbnail, 5, 8, 17);
imagefill($thumbnail, 0, 0, $background);
if (!imagecopyresampled($thumbnail, $source, 0, 0, $sourceX, $sourceY, 128, 128, $side, $side)) {
    imagedestroy($source); imagedestroy($thumbnail);
    perform_ai_json(500, ['ok' => false, 'error' => 'The profile thumbnail could not be created.']);
}
imagedestroy($source);
try {
    $destination = perform_ai_thumbnail_path((string)$account['id']);
} catch (RuntimeException $error) {
    imagedestroy($thumbnail);
    perform_ai_json(500, ['ok' => false, 'error' => 'Thumbnail storage is unavailable.']);
}
if (!imagejpeg($thumbnail, $destination, 72)) {
    imagedestroy($thumbnail);
    perform_ai_json(500, ['ok' => false, 'error' => 'The profile thumbnail could not be stored.']);
}
imagedestroy($thumbnail);
@chmod($destination, 0600);
perform_ai_json(201, ['ok' => true, 'thumbnailUrl' => 'profile-thumbnail.php?action=view&v=' . rawurlencode((string)$account['id']) . '&t=' . time()]);
