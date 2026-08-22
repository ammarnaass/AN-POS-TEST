Stop-Process -Name ninja -Force -ErrorAction SilentlyContinue
Stop-Process -Name cmake -Force -ErrorAction SilentlyContinue

$cxx = "G:\project progamming\AN-POS-TEST-main\mobile-rn\android\app\.cxx"
$build = "G:\project progamming\AN-POS-TEST-main\mobile-rn\android\app\build"

if (Test-Path $cxx) {
    Remove-Item -LiteralPath $cxx -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ".cxx deleted"
} else {
    Write-Host ".cxx already gone"
}

if (Test-Path $build) {
    Remove-Item -LiteralPath $build -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "build deleted"
} else {
    Write-Host "build already gone"
}

Write-Host "Clean done"
