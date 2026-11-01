<?php
declare(strict_types=1);
function macgyver_transcribe(array $config, string $path, string $mime, string $extension): string {
    if (!extension_loaded('curl') || empty($config['api_key'])) throw new RuntimeException('Provider unavailable.');
    $curl = curl_init('https://api.openai.com/v1/audio/transcriptions');
    curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>45,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$config['api_key']],CURLOPT_POSTFIELDS=>['model'=>$config['transcription_model']??'gpt-4o-mini-transcribe','response_format'=>'json','file'=>new CURLFile($path,$mime,'practice.'.$extension)]]);
    try { $body=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_HTTP_CODE); } finally { curl_close($curl); }
    if ($body===false||$status<200||$status>=300) throw new RuntimeException('Provider unavailable.');
    $result=json_decode($body,true,64,JSON_THROW_ON_ERROR);
    if (!is_string($result['text']??null)||trim($result['text'])===''||strlen($result['text'])>200000) throw new RuntimeException('Transcript unavailable.');
    return trim($result['text']);
}
