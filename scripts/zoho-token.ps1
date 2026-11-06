<#
.SYNOPSIS
    Exchange a Zoho self-client grant code for a refresh token and store it as
    the encrypted production secret ZOHO_REFRESH_TOKEN on Cloudflare Pages.

.DESCRIPTION
    No secret is written into this file, printed to the console, or left in
    PowerShell history: the client secret and the grant code are read with
    Read-Host -AsSecureString, held as plain text only for the moment of the
    HTTP call, and the refresh token is handed to wrangler through stdin
    rather than the command line, where other processes could read it.

    Everything that can be checked without spending the grant code is checked
    first. A Zoho grant code is valid for a few minutes and dies on first use,
    so finding out afterwards that wrangler was not logged in would cost a
    second trip through the Zoho console.

.EXAMPLE
    .\scripts\zoho-token.ps1
#>
[CmdletBinding()]
param(
    [string]$ProjectName = 'hydrovolta',
    [string]$ClientId    = '1000.8M6D0PSD7IV02VWZZ56Y56E6B19MBU',
    [string]$SecretName  = 'ZOHO_REFRESH_TOKEN',
    [string]$TokenUrl    = 'https://accounts.zoho.com/oauth/v2/token'
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Fail([string]$Message) {
    Write-Host $Message -ForegroundColor Red
    exit 1
}

# Plain text for the length of one call, then wiped. ConvertFrom-SecureString
# -AsPlainText does not exist in Windows PowerShell 5.1, hence the marshal.
function Reveal([System.Security.SecureString]$Secure) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try   { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

# ── checks that cost nothing, before the code is spent ─────────────────────
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Fail "wrangler is not on PATH. Install it with:  npm install -g wrangler"
}

Write-Host "Checking Cloudflare login..." -ForegroundColor DarkGray
$who = wrangler whoami 2>&1 | Out-String
if ($LASTEXITCODE -ne 0 -or $who -match 'not authenticated') {
    Fail "Not logged in to Cloudflare. Run:  wrangler login    then run this script again."
}
$account = ($who -split "`n" | Where-Object { $_ -match '\S' } | Select-Object -Last 1).Trim()
Write-Host "Cloudflare: logged in." -ForegroundColor DarkGray

Write-Host "Checking the Pages project..." -ForegroundColor DarkGray
$projects = wrangler pages project list 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Fail "Could not list Pages projects. Run:  wrangler login" }
if ($projects -notmatch [regex]::Escape($ProjectName)) {
    Fail "Pages project '$ProjectName' not found on this account. Projects listed above."
}
Write-Host "Pages project: $ProjectName" -ForegroundColor DarkGray
Write-Host ""

# ── the two secrets, never echoed ──────────────────────────────────────────
Write-Host "Zoho self-client, client id $ClientId"
$secureSecret = Read-Host "Client secret" -AsSecureString
$secureCode   = Read-Host "Grant code"    -AsSecureString
if ($secureSecret.Length -eq 0) { Fail "No client secret entered." }
if ($secureCode.Length   -eq 0) { Fail "No grant code entered." }

Write-Host ""
Write-Host "Exchanging the code with Zoho..." -ForegroundColor DarkGray

$refresh = $null
try {
    $body = @{
        grant_type    = 'authorization_code'
        client_id     = $ClientId
        client_secret = (Reveal $secureSecret)
        code          = (Reveal $secureCode)
    }
    $resp = Invoke-RestMethod -Method Post -Uri $TokenUrl -Body $body -TimeoutSec 30
} catch {
    # Zoho usually answers 200 with an error field, but cover the other case.
    $name = 'request_failed'
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $text   = (New-Object IO.StreamReader($stream)).ReadToEnd()
        $parsed = $text | ConvertFrom-Json
        if ($parsed.error) { $name = $parsed.error }
    } catch { }
    Fail $name
} finally {
    $body = $null
    [GC]::Collect()
}

if ($resp.error)         { Fail $resp.error }
if (-not $resp.refresh_token) {
    # An access_token with no refresh_token means the code was already used.
    Fail 'no_refresh_token_in_response'
}
if ($resp.api_domain -and $resp.api_domain -notmatch 'zohoapis\.com') {
    Fail "wrong_data_centre ($($resp.api_domain))"
}

$refresh = $resp.refresh_token
$resp    = $null

# ── store it, through stdin so it never appears in a command line ──────────
Write-Host "Writing $SecretName to Pages project $ProjectName..." -ForegroundColor DarkGray
$refresh | wrangler pages secret put $SecretName --project-name $ProjectName | Out-Null
$code = $LASTEXITCODE
$refresh = $null
[GC]::Collect()

if ($code -ne 0) { Fail "wrangler_failed (exit $code). The grant code is spent; generate a new one." }

Write-Host ""
Write-Host "Saved. Next: redeploy." -ForegroundColor Green
