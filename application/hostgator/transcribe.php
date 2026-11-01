<?php
declare(strict_types=1);
ini_set('display_errors','0');
require_once __DIR__.'/account-auth.php';
require_once __DIR__.'/assistant-store.php';
require_once __DIR__.'/transcription-provider.php';
try {
    $account=perform_ai_require_account();$id=(string)$account['id'];
    $path=dirname(perform_ai_document_root()).'/perform-ai-private/coaching.php';
    $config=is_file($path)?require $path:[];
    if (!is_array($config)) throw new RuntimeException('Configuration unavailable.');
    if ($_SERVER['REQUEST_METHOD']==='GET') perform_ai_json(200,['ok'=>true,'configured'=>extension_loaded('curl')&&extension_loaded('fileinfo')&&!empty($config['api_key']),'maximumBytes'=>5*1024*1024]);
    if ($_SERVER['REQUEST_METHOD']!=='POST') perform_ai_json(405,['ok'=>false,'error'=>'Use multipart POST.']);
    $https=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')||strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO']??''))==='https';
    if (($_SERVER['HTTP_ORIGIN']??'')!==($https?'https://':'http://').($_SERVER['HTTP_HOST']??'')) perform_ai_json(403,['ok'=>false,'error'=>'Same-site requests are required.']);
    perform_ai_require_csrf();
    if (($_POST['account']??null)!==$id) perform_ai_json(409,['ok'=>false,'error'=>'Account changed. Sign in again.']);
    session_write_close();
    $audio=$_FILES['audio']??null;
    if (!is_array($audio)||($audio['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($audio['tmp_name'])) perform_ai_json(400,['ok'=>false,'error'=>'The recording could not be uploaded. Check the hosting upload limit.']);
    $size=filesize($audio['tmp_name']);
    if (!$size||$size>5*1024*1024) perform_ai_json(413,['ok'=>false,'error'=>'Keep test recordings under 5 MB.']);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($audio['tmp_name']);
    $types=['audio/webm'=>'webm','video/webm'=>'webm','audio/wav'=>'wav','audio/x-wav'=>'wav','audio/mpeg'=>'mp3','audio/ogg'=>'ogg','audio/mp4'=>'m4a','video/mp4'=>'m4a','audio/x-m4a'=>'m4a'];
    if (!isset($types[$mime])) perform_ai_json(415,['ok'=>false,'error'=>'Use a WebM, WAV, MP3, Ogg or M4A recording.']);
    macgyver_consume_limits([['requests-'.hash('sha256',$id),120,60],['provider-global',max(1,min(100,(int)($config['text_daily_global_limit']??20))),86400],['provider-'.hash('sha256',$id),max(1,min(50,(int)($config['text_daily_user_limit']??8))),86400]]);
    $text=macgyver_transcribe($config,$audio['tmp_name'],$mime,$types[$mime]);
    perform_ai_json(200,['ok'=>true,'text'=>$text]);
} catch (OverflowException $error) { perform_ai_json(429,['ok'=>false,'error'=>$error->getMessage()]); }
catch (Throwable) { perform_ai_json(503,['ok'=>false,'error'=>'Recorded transcription is unavailable. Your take can still be reviewed without a speech score.']); }
