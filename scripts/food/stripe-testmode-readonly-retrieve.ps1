# FOOD-014. LOCAL PROMPT. READ-ONLY TEST Stripe API; no writes, no secret logs.
param([string]$SessionId = '', [switch]$NonInteractive)
$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\river\OneDrive\Desktop\RIVERKEPTFLOWING'
$retrieval = 'DEFERRED'
$class = 'NOT_ATTEMPTED'
$sessionRead = 'NO'
$intentRead = 'NO'
$reason = ''
$storage = 'NOT STORED'
$secure = $null
$plain = $null
$payload = $null
$ptr = [IntPtr]::Zero
$process = $null
$originalLocation = Get-Location
try {
    $tokens = $null
    $parseErrors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($PSCommandPath, [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) { throw 'PowerShell parser verification failed' }
    if (-not (Test-Path -LiteralPath $repo)) { throw 'Repository not found' }
    Set-Location -LiteralPath $repo
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node dependency unavailable' }
    if (-not (Test-Path 'node_modules/stripe/package.json')) { throw 'Stripe SDK dependency unavailable' }
    if (-not (Test-Path 'node_modules/tsx/package.json')) { throw 'TypeScript loader dependency unavailable' }
    $branch = (git branch --show-current).Trim()
    $head = (git rev-parse HEAD).Trim()
    if ($branch -ne 'cif-001-canonical-content-source-record' -or $head -ne '99af8686f1564372875409b6ca4fe52144f68dbe') {
        throw 'Unexpected branch or HEAD. No Stripe request performed.'
    }
    Write-Host ''
    Write-Host 'FOOD-014  PRIVATE STRIPE TEST-MODE READ-ONLY RETRIEVAL' -ForegroundColor Cyan
    Write-Host 'Only an EXISTING test Checkout Session will be retrieved.'
    Write-Host 'If none exists, press Enter. No Stripe request will be made.'
    Write-Host 'Never share the test API key in chat.'
    Write-Host ''
    if (-not $NonInteractive -and [string]::IsNullOrWhiteSpace($SessionId)) {
        $SessionId = Read-Host 'Paste an existing cs_test_ Checkout Session ID (Enter to skip)'
    }
    if ([string]::IsNullOrWhiteSpace($sessionId)) {
        $retrieval = 'DEFERRED_NO_EXISTING_TEST_SESSION'
        Write-Host 'DEFERRED: EXISTING TEST SESSION REQUIRED'
        $reason = 'No existing test Checkout Session provided; no network request made.'
    }
    elseif ($sessionId -cnotmatch '^cs_test_(?!synthetic_)[A-Za-z0-9]{16,160}$') {
        throw 'Only an actual non-synthetic cs_test_ Session ID is supported.'
    }
    else {
        if ($NonInteractive) { throw 'Secure interactive test credential required; no request performed' }
        Write-Host 'Enter a Stripe TEST restricted key (rk_test_) or TEST secret key (sk_test_).' -ForegroundColor Yellow
        Write-Host 'Input is masked; the key is passed through child-process STDIN only.'
        $secure = Read-Host -AsSecureString 'Stripe TEST API key'
        if ($null -eq $secure -or $secure.Length -eq 0) { throw 'Credential entry cancelled' }
        $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        $ptr = [IntPtr]::Zero
        if ($plain -cnotmatch '^(?:sk_test|rk_test)_[A-Za-z0-9_]{16,255}$') {
            throw 'Only test-mode API credentials are supported. No request performed.'
        }
        $payload = @{secretKey=$plain;sessionId=$sessionId} | ConvertTo-Json -Compress
        $plain = $null
        $secure.Dispose()
        $secure = $null
        $start = New-Object System.Diagnostics.ProcessStartInfo
        $start.FileName = 'node'
        $start.Arguments = '--import tsx scripts/food/stripe-testmode-real-readonly-cli.mjs'
        $start.WorkingDirectory = $repo
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardInput = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $start
        if (-not $process.Start()) {throw 'Could not start Node retrieval process'}
        $process.StandardInput.Write($payload)
        $process.StandardInput.Close()
        $payload = $null
        $outputTask = $process.StandardOutput.ReadToEndAsync()
        # Consume but never print stderr: SDK errors might include sensitive data.
        $errorTask = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(60000)) { $process.Kill(); throw 'Read timeout' }
        $output = $outputTask.GetAwaiter().GetResult()
        $null = $errorTask.GetAwaiter().GetResult()
        $exit = $process.ExitCode
        if ($output.Length -gt 8192) {throw 'Unexpected oversized retrieval response'}
        $report = $output | ConvertFrom-Json
        $allowed = @('PAID_PROVIDER_PAIR_OBSERVED_REVIEW_ONLY', 'UNPAID_PROVIDER_PAIR_OBSERVED_REVIEW_ONLY',
            'PROVIDER_PAYMENT_STATUS_NEEDS_REVIEW','PROVIDER_AMOUNT_OR_CURRENCY_MISMATCH',
            'INVALID_TEST_SESSION_RESPONSE','INVALID_TEST_PAYMENTINTENT_RESPONSE',
            'SESSION_ONLY_NO_PAYMENT_INTENT','INVALID_LOCAL_INPUT','AUTHENTICATION_REJECTED',
            'READ_PERMISSION_DENIED','TEST_SESSION_NOT_FOUND_OR_WRONG_ACCOUNT','RATE_LIMITED',
            'TEST_PAYMENT_INTENT_NOT_FOUND_OR_WRONG_ACCOUNT',
            'STRIPE_SERVICE_UNAVAILABLE','STRIPE_REQUEST_REJECTED','READ_FAILED_OR_NETWORK_UNAVAILABLE')
        if ($report.classification -notin $allowed) {throw 'Unexpected result classification'}
        $class = [string]$report.classification
        if ($report.audit.storage -eq 'LOCAL_TEST_DURABILITY') {
            if ([string]$report.audit.auditId -cnotmatch '^observation_[A-Za-z0-9-]{36}$') { throw 'Invalid audit identity' }
            if ($report.audit.correlation -notin @('UNCORRELATED_TEST_OBSERVATION','CORRELATED_SYNTHETIC_REVIEW_ONLY','PROVIDER_STATE_CONFLICT')) { throw 'Invalid correlation result' }
            $storage = 'LOCAL TEST DURABILITY - ' + [string]$report.audit.auditId
            Write-Host ('CORRELATION: ' + [string]$report.audit.correlation)
        } elseif ($report.audit.storage -eq 'FAILED_NOT_ACKNOWLEDGED') { $storage = 'FAILED - NO DURABLE ACKNOWLEDGMENT' }
        if ($report.sessionRetrieved -eq $true) {$sessionRead='YES'}
        if ($report.paymentIntentRetrieved -eq $true) {$intentRead='YES'}
        if ($exit -eq 0) {
            if ($sessionRead -eq 'YES' -and $intentRead -eq 'YES') {
                $retrieval = 'ACTUAL_TEST_SESSION_AND_PAYMENTINTENT_RETRIEVED'
            } elseif ($sessionRead -eq 'YES') {
                $retrieval = 'ACTUAL_TEST_SESSION_ONLY'
            } else {
                $retrieval = 'NO_VERIFIED_TEST_RESPONSE'
            }
        } else {
            $retrieval = 'RETRIEVAL_STOPPED'
            $reason = 'Provider comparison is incomplete, inconsistent, or retrieval failed; use classification.'
        }
        if ($sessionRead -eq 'YES') {
            Write-Host ('CHECKOUT STATUS: ' + [string]$report.checkoutStatus)
            Write-Host ('PAYMENT STATUS: ' + [string]$report.paymentStatus)
            Write-Host ('PROVIDER AMOUNT (cents): ' + [string]$report.amountMinor)
            Write-Host ('CURRENCY: ' + [string]$report.currency)
        }
        if ($intentRead -eq 'YES') {Write-Host ('PAYMENTINTENT STATUS: ' + [string]$report.intentStatus)}
    }
} catch {
    $retrieval = 'RETRIEVAL_STOPPED'
    $reason = 'Local setup, identifier, credential, or subprocess verification failed. No details/credentials printed.'
} finally {
    if ($ptr -ne [IntPtr]::Zero) {[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
    $payload = $null
    $plain = $null
    if ($secure) { $secure.Dispose() }
    $secure = $null
    if ($process) {$process.Dispose()}
    Set-Location -LiteralPath $originalLocation
    Write-Host ''
    Write-Host '=================================================='
    Write-Host 'FOOD-COMMERCE-014  READ-ONLY RETRIEVAL RESULT'
    Write-Host '=================================================='
    Write-Host ('STATUS: ' + $retrieval)
    Write-Host ('CLASSIFICATION: ' + $class)
    Write-Host ('ACTUAL TEST SESSION RETRIEVED: ' + $sessionRead)
    Write-Host ('ACTUAL TEST PAYMENTINTENT RETRIEVED: ' + $intentRead)
    if ($reason) { Write-Host ('NOTE: ' + $reason) }
    Write-Host 'REAL STRIPE TEST-MODE E2E: UNVERIFIED'
    Write-Host 'FOOD ORDER CORRELATED: NO'
    Write-Host 'PAYMENT/ORDER AUTHORIZED: NO'
    Write-Host 'CUSTOMER CHECKOUT: DISABLED'
    Write-Host 'STRIPE WRITES: NONE REQUESTED'
    Write-Host 'PRODUCTION D1 ACCESSED: NO'
    Write-Host ('LOCAL STORAGE: ' + $storage)
    Write-Host 'SECRET WRITTEN TO FILE: NO'
    Write-Host 'COMMIT: NO'
    Write-Host 'PUSH: NO'
    Write-Host 'DEPLOYMENT: NO'
    Write-Host '=================================================='
}
if ($retrieval -eq 'RETRIEVAL_STOPPED') { Write-Host 'FINAL STOP'; exit 1 }
Write-Host 'FINAL PASS'
exit 0
