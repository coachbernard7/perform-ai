$ErrorActionPreference = 'Stop'
$src = 'L:\alpha-omega-core\perform-ai\ACTOR-MODE-DEV'
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path "$src\package.json")) { throw 'Cannot find ACTOR-MODE-DEV on L:.' }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$files = New-Object 'System.Collections.Generic.List[System.IO.FileInfo]'
$omitted = New-Object 'System.Collections.Generic.List[string]'
$exclude = '^(\..*|node_modules|backups?|output|dist|build|coverage|tmp|temp|private|.*-private|data|memory|sessions|recordings|uploads|registrations|profile-thumbnails)$'
function Collect-Source($dir) {
    foreach ($item in Get-ChildItem -LiteralPath $dir -Force) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { $omitted.Add($item.FullName.Substring($src.Length + 1).Replace('\','/')); continue }
        if ($item.PSIsContainer) {
            if ($item.Name -notmatch $exclude) { Collect-Source $item.FullName }
        } else { $files.Add($item) }
    }
}
foreach ($dir in @('app','components','constants','hooks','lib','server','shared','types','tests','drizzle','scripts','docs','assets','public','hostgator')) {
    if (Test-Path "$src\$dir") { Collect-Source "$src\$dir" }
}
Get-ChildItem -LiteralPath $src -File -Force | ForEach-Object { $files.Add($_) }
$zip = Join-Path $desktop ('perform-ai-source-review-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.zip')
$archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
$complete = $false
try {
    foreach ($file in $files) {
        $name = $file.FullName.Substring($src.Length + 1).Replace('\','/')
        if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { $omitted.Add($name); continue }
        if ($file.Name -match '^\.|^sess_|^accounts\.|^coaching(?:-users)?\.|credentials|secrets|service[-_]?account|users\.(json|csv|txt)$|\.env|\.(pem|key|pfx|p12|db)$|\.sqlite' -or $file.Length -gt 5MB) { $omitted.Add($name); continue }
        if ($file.Extension -notmatch '^\.(tsx?|jsx?|mjs|cjs|json|ya?ml|css|md|php|sql|svg|html|sh|ps1|png|jpe?g|webp|gif|ico|ttf|otf|woff2?)$') { $omitted.Add($name); continue }
        if ($file.Extension -match '^\.(tsx?|jsx?|mjs|cjs|json|ya?ml|css|md|php|sql|svg|html|sh|ps1)$') {
            $text = [IO.File]::ReadAllText($file.FullName)
            if ($text -match 'sk-(proj-)?[a-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|gh[pousr]_[a-z0-9_]{20,}|\$2[aby]\$\d\d\$[./a-z0-9]{40,}') { $omitted.Add($name); continue }
        }
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$name) | Out-Null
    }
    $report = New-Object IO.StreamWriter($archive.CreateEntry('SOURCE-EXPORT-OMISSIONS.txt').Open())
    try { $report.WriteLine('Omitted files; private/local/generated directories also excluded. Review this ZIP privately before sharing.'); foreach ($name in $omitted) { $report.WriteLine($name) } } finally { $report.Dispose() }
    $complete = $true
} finally { $archive.Dispose() }
if (-not $complete) { throw 'Export failed. Do not upload the partial ZIP.' }
if ((Get-Item -LiteralPath $zip).Length -gt 30MB) { throw 'ZIP exceeds 30 MB; keep it local and report this message.' }
Write-Host "Created: $zip"
Write-Host 'Originals unchanged. Review the ZIP for private material before attaching it in chat.'
if ($env:OS -eq 'Windows_NT') { Start-Process explorer.exe -ArgumentList "/select,`"$zip`"" }
