# Local source export only. This does not run or deploy the application.
[CmdletBinding()]
param(
    [string]$Source = 'L:\alpha-omega-core\perform-ai\ACTOR-MODE-DEV',
    [string]$OutputDirectory = [Environment]::GetFolderPath('Desktop')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not (Test-Path -LiteralPath (Join-Path $Source 'package.json') -PathType Leaf)) {
    throw 'The selected source folder does not contain package.json.'
}
if (-not (Test-Path -LiteralPath $OutputDirectory -PathType Container)) {
    throw 'The output folder does not exist.'
}
$sourceRoot = [IO.Path]::GetFullPath($Source).TrimEnd('\')
$outputPath = Join-Path $OutputDirectory ('perform-ai-source-review-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,6) + '.zip')
$excludedFolders = @(
    'node_modules','.git','.expo','.manus','.actor-local','.next','.cache',
    'backups','backup','output','dist','build','coverage','tmp','temp',
    'private','perform-ai-private','spr-private','ready-mind-private',
    'data','memory','sessions','recordings','uploads','registrations','profile-thumbnails'
)
$sourceFolders = @('app','components','constants','hooks','lib','server','shared','types','tests','drizzle','scripts','docs','assets','public','hostgator')
$extensions = @('.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.yaml','.yml','.css','.md','.php','.sql','.svg','.html','.sh','.ps1','.png','.jpg','.jpeg','.webp','.gif','.ico','.ttf','.otf','.woff','.woff2')
$textExtensions = @('.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.yaml','.yml','.css','.md','.php','.sql','.svg','.html','.sh','.ps1')
$omissions = New-Object 'System.Collections.Generic.List[string]'
$count = 0

function Add-SourceFile {
    param([IO.FileInfo]$File, [IO.Compression.ZipArchive]$Archive)
    $relative = $File.FullName.Substring($sourceRoot.Length + 1).Replace('\','/')
    if (($File.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        $omissions.Add($relative + ' (link skipped)'); return
    }
    if ($File.Name -match '(?i)^\.|^sess_|^accounts\.|^coaching(?:-users)?\.|credentials|secrets|service[-_]?account|users\.(?:json|csv|txt)$|\.env|\.pem$|\.key$|\.pfx$|\.p12$|\.sqlite|\.db$') {
        $omissions.Add($relative + ' (private/configuration filename skipped)'); return
    }
    if ($extensions -notcontains $File.Extension.ToLowerInvariant()) {
        $omissions.Add($relative + ' (unsupported file type skipped)'); return
    }
    if ($File.Length -gt 5MB) {
        $omissions.Add($relative + ' (larger than 5 MB; supply separately if needed)'); return
    }
    # Known credential formats: never print their values, and omit the complete file.
    # This is a conservative check, not a guarantee against every kind of secret.
    if ($textExtensions -contains $File.Extension.ToLowerInvariant()) {
        $text = [IO.File]::ReadAllText($File.FullName)
        if ($text -match '(?i)sk-(?:proj-)?[a-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|gh[pousr]_[a-z0-9_]{20,}|\$2[aby]\$\d\d\$[./a-z0-9]{40,}') {
            $omissions.Add($relative + ' (possible credential/hash omitted; inspect privately)'); return
        }
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($Archive,$File.FullName,$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $script:count++
}

function Add-SourceDirectory {
    param([IO.DirectoryInfo]$Directory, [IO.Compression.ZipArchive]$Archive)
    $relative = $Directory.FullName.Substring($sourceRoot.Length + 1).Replace('\','/')
    if (($Directory.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $Directory.Name.StartsWith('.') -or $excludedFolders -contains $Directory.Name) {
        $omissions.Add($relative + '/ (local/private/generated directory skipped)'); return
    }
    foreach ($child in Get-ChildItem -LiteralPath $Directory.FullName -Force) {
        if ($child.PSIsContainer) { Add-SourceDirectory $child $Archive }
        else { Add-SourceFile $child $Archive }
    }
}

$archive = $null
$stream = $null
try {
    $stream = [IO.File]::Open($outputPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    $archive = New-Object IO.Compression.ZipArchive($stream,[IO.Compression.ZipArchiveMode]::Create,$true)
    foreach ($folder in $sourceFolders) {
        $path = Join-Path $sourceRoot $folder
        if (Test-Path -LiteralPath $path -PathType Container) { Add-SourceDirectory (Get-Item -LiteralPath $path) $archive }
    }
    foreach ($file in Get-ChildItem -LiteralPath $sourceRoot -File -Force) { Add-SourceFile $file $archive }
    $entry = $archive.CreateEntry('SOURCE-EXPORT-OMISSIONS.txt')
    $writer = New-Object IO.StreamWriter($entry.Open())
    try {
        $writer.WriteLine('Source review export. Originals were not modified. No provider or hosting calls were made.')
        $writer.WriteLine('Allowlisted source directories only; private/local/generated directories are excluded.')
        $writer.WriteLine('The exporter screens filenames and several known secret formats, but cannot guarantee that all credentials or personal data have been identified. Review privately before sharing.')
        $writer.WriteLine('Omitted paths (values are never recorded):')
        foreach ($line in $omissions) { $writer.WriteLine($line) }
    } finally { $writer.Dispose() }
    $archive.Dispose(); $archive = $null
    $stream.Dispose(); $stream = $null
    if ((Get-Item -LiteralPath $outputPath).Length -gt 30MB) { throw 'The archive exceeds 30 MB. Keep it local and report that message rather than uploading it.' }
    Write-Host "Created source review ZIP with $count files:"
    Write-Host $outputPath
    Write-Host 'Review its contents privately before attaching it in chat. Do not upload it to HostGator.'
    Write-Host 'No application files were changed and nothing was deployed.'
} catch {
    if ($archive) { $archive.Dispose() }
    if ($stream) { $stream.Dispose() }
    Write-Host 'Source export did not complete. Do not upload a partial ZIP.'
    throw
}
