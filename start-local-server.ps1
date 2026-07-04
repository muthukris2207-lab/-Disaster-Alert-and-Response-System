# Self-contained PowerShell local web server to serve the Disaster Response website locally.
# Bypasses Vercel deployment limits. Requires no Node or Python.
# Emulates Vercel's /api/config endpoint to load authentic Firebase credentials.

$ErrorActionPreference = "Continue"
$port = 8888
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Failed to start listener on port ${port}: $_" -ForegroundColor Red
    Write-Host "Please close any other apps using port $port and try again." -ForegroundColor Yellow
    exit
}

Write-Host "`n===============================================" -ForegroundColor Green
Write-Host "   DISASTER RESPONSE SYSTEM LOCAL DEV SERVER   " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "Server is running at: http://localhost:$port/login.html" -ForegroundColor Cyan
Write-Host "All changes you make locally are live here immediately." -ForegroundColor White
Write-Host "Press Ctrl+C in this console to stop the server." -ForegroundColor Yellow
Write-Host "===============================================`n" -ForegroundColor Green

# Open in browser automatically
Start-Process "http://localhost:$port/login.html"

$publicDir = Join-Path $PSScriptRoot "public"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath
        
        # 1. Emulate the backend API config endpoint
        if ($rawPath -eq "/api/config") {
            $configJson = '{
              "apiKey": "AIzaSyBjAk5KLI2TvulYQ-k8Aq6xmRAB8pjRGv4",
              "authDomain": "disaster-response-system-35547.firebaseapp.com",
              "projectId": "disaster-response-system-35547",
              "storageBucket": "disaster-response-system-35547.firebasestorage.app",
              "messagingSenderId": "750898085918",
              "appId": "1:750898085918:web:f84b9964092f2ea75d6e0f"
            }'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($configJson)
            $response.ContentType = "application/json"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # 2. Serve static files
        if ($rawPath -eq "/") { $rawPath = "/index.html" }
        
        $filePath = Join-Path $publicDir $rawPath.Replace("/", "\")
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Identify MIME types
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "text/html"
            if ($ext -eq ".js") { $contentType = "application/javascript" }
            elseif ($ext -eq ".css") { $contentType = "text/css" }
            elseif ($ext -eq ".png") { $contentType = "image/png" }
            elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
            elseif ($ext -eq ".json") { $contentType = "application/json" }
            elseif ($ext -eq ".svg") { $contentType = "image/svg+xml" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        # Catch connection resets or stop actions silently
    }
}
