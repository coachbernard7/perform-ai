<?php
declare(strict_types=1);
ini_set('display_errors','0');
require_once __DIR__.'/account-auth.php';
require_once __DIR__.'/assistant-store.php';
require_once __DIR__.'/macgyver-provider.php';
header('Cache-Control: no-store');
try {
    $account = perform_ai_require_account();
    if (!is_string($account['id']??null) || $account['id']==='') throw new RuntimeException('Account unavailable.');
    $id = $account['id'];
    $configPath = dirname(perform_ai_document_root()).'/perform-ai-private/coaching.php';
    $config = is_file($configPath) ? require $configPath : [];
    if (!is_array($config)) throw new RuntimeException('Configuration unavailable.');
    if ($_SERVER['REQUEST_METHOD']==='GET') {
        if (isset($_GET['account']) && $_GET['account']!==$id) perform_ai_json(409,['ok'=>false,'error'=>'Account changed in another tab. Sign in again.']);
        if (($_GET['action']??'')==='health') perform_ai_json(200,['ok'=>true,'runtime'=>['phpVersion'=>PHP_VERSION,'curl'=>extension_loaded('curl'),'fileinfo'=>extension_loaded('fileinfo')],'providerConfigured'=>!empty($config['api_key']),'textModel'=>$config['model']??'gpt-4o-mini','transcriptionModel'=>$config['transcription_model']??'gpt-4o-mini-transcribe']);
        $memory = macgyver_memory($id);
        perform_ai_json(200,['ok'=>true,'account'=>$id,'memory'=>$memory,'providerConfigured'=>extension_loaded('curl')&&!empty($config['api_key'])]);
    }
    if ($_SERVER['REQUEST_METHOD']!=='POST') perform_ai_json(405,['ok'=>false,'error'=>'Use JSON POST.']);
    $https = (!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off') || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO']??''))==='https';
    $origin = ($https?'https://':'http://').($_SERVER['HTTP_HOST']??'');
    if (($_SERVER['HTTP_ORIGIN']??'')!==$origin || !str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json')) perform_ai_json(403,['ok'=>false,'error'=>'Same-site JSON requests are required.']);
    perform_ai_require_csrf();
    $raw = file_get_contents('php://input',false,null,0,24001);
    if ($raw===false || strlen($raw)>24000) perform_ai_json(413,['ok'=>false,'error'=>'Request too large.']);
    $input = json_decode($raw,true,16,JSON_THROW_ON_ERROR);
    if (!is_array($input)) throw new InvalidArgumentException('Invalid request.');
    if (($input['account']??null)!==$id) perform_ai_json(409,['ok'=>false,'error'=>'Account changed. Sign in again.']);
    session_write_close(); // Provider latency must not block logout or other tabs.
    if (!is_int($input['revision']??null)) throw new InvalidArgumentException('Reload memory before editing it.');
    macgyver_consume_limits([['requests-'.hash('sha256',$id),120,60]]);
    if (($input['action']??'')==='save') {
        $notes=$input['notes']??null; $preferences=$input['preferences']??null;
        if (!is_string($notes)||strlen($notes)>4000||!is_array($preferences)) throw new InvalidArgumentException('Memory notes are too long or invalid.');
        if (!in_array($preferences['personality']??null,['Supportive','Calm','Direct','Challenging','Sarcastic','Condescending','Loving'],true) || !is_numeric($preferences['speed']??null) || $preferences['speed']<0.6 || $preferences['speed']>1.5 || !is_string($preferences['voice']??null) || strlen($preferences['voice'])>300) throw new InvalidArgumentException('Invalid voice preferences.');
        $memory=macgyver_memory($id,$input['revision'],function(array $state) use ($notes,$preferences): array {$state['notes']=$notes;$state['preferences']=['personality'=>$preferences['personality'],'speed'=>(float)$preferences['speed'],'voice'=>$preferences['voice']];return $state;});
        perform_ai_json(200,['ok'=>true,'account'=>$id,'memory'=>$memory]);
    }
    if (($input['action']??'')!=='turn') throw new InvalidArgumentException('Unsupported instruction.');
    $message=$input['message']??null; $screen=$input['screen']??'';
    if (!is_string($message)||trim($message)===''||strlen($message)>6000||!is_string($screen)||strlen($screen)>160) throw new InvalidArgumentException('Keep instructions under 6,000 bytes.');
    $memory=macgyver_memory($id);
    if ($memory['revision']!==$input['revision']) throw new DomainException('Memory changed. Reload before sending again.');
    if (count($memory['messages'])>=200) throw new DomainException('Conversation archive is full. Export it; existing messages have been preserved.');
    macgyver_consume_limits([['provider-global',max(1,min(100,(int)($config['text_daily_global_limit']??20))),86400],['provider-'.hash('sha256',$id),max(1,min(50,(int)($config['text_daily_user_limit']??8))),86400]]);
    $reply=macgyver_provider($config,$memory,trim($message),$screen);
    $saved=macgyver_memory($id,$input['revision'],function(array $state) use ($message,$reply): array {
        $date=gmdate('c');$state['messages'][]=['role'=>'user','text'=>trim($message),'date'=>$date];$state['messages'][]=['role'=>'assistant','text'=>$reply['message'],'date'=>$date];return $state;
    });
    perform_ai_json(200,['ok'=>true,'account'=>$id,'memory'=>$saved,'reply'=>$reply]);
} catch (InvalidArgumentException|JsonException $error) { perform_ai_json(400,['ok'=>false,'error'=>'The instruction or memory settings were invalid.']); }
catch (DomainException $error) { perform_ai_json(409,['ok'=>false,'error'=>$error->getMessage()]); }
catch (OverflowException $error) { perform_ai_json(429,['ok'=>false,'error'=>$error->getMessage()]); }
catch (Throwable) { perform_ai_json(503,['ok'=>false,'error'=>'The coach or private storage is unavailable. Your typed instruction has been kept.']); }
