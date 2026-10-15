param([string]$BrowserPath)
# 설치 없이 실행하는 실제 Chrome/Edge 검사. 개인 브라우저 기록을 건드리지 않도록
# 매번 새 임시 프로필을 사용합니다. 브라우저 파일 접근 허용은 이 검사에만 적용합니다.
$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path -Parent $PSScriptRoot
if (-not $BrowserPath) {
    $browserCandidates = @('C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
    $BrowserPath = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $BrowserPath) { throw 'Specify a Chrome or Edge executable using -BrowserPath.' }
$profilePath = Join-Path $env:TEMP ('gdragon-check-' + [Guid]::NewGuid().ToString('N'))
$outputPath = Join-Path $PSScriptRoot 'browser-result.html'
$errorPath = Join-Path $env:TEMP ('gdragon-check-' + [Guid]::NewGuid().ToString('N') + '.log')
$targetUri = ([Uri](Join-Path $PSScriptRoot 'world1.html')).AbsoluteUri
$arguments = @('--headless','--disable-gpu','--no-first-run','--disable-background-networking','--allow-file-access-from-files',('--user-data-dir="' + $profilePath + '"'),'--virtual-time-budget=25000','--dump-dom',$targetUri)
$browserProcess = Start-Process -FilePath $BrowserPath -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardOutput $outputPath -RedirectStandardError $errorPath -PassThru
if (-not $browserProcess.WaitForExit(30000)) { Stop-Process -Id $browserProcess.Id -ErrorAction SilentlyContinue; throw 'Browser test timed out. See the temporary log.' }
$result = Get-Content -LiteralPath $outputPath -Encoding UTF8 -Raw
if ($result -notmatch 'ALL PASSED . (\d+) checks') { throw ('Test failed: ' + $outputPath + ' / browser log: ' + $errorPath) }
Write-Output ('Browser checks passed: ' + $Matches[1] + ' / report: ' + $outputPath)
