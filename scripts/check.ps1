$ErrorActionPreference = 'Stop'

Write-Host 'Checking JavaScript syntax...'
node --check frontend/js/app.js
node --check frontend/js/api.js
node --check netlify/functions/api.mjs
node --check frontend/sw.js

Write-Host 'Running Python endpoint tests...'
python -m unittest discover -s tests -v

Write-Host 'Checking repository whitespace...'
git diff --check

Write-Host 'MiPlata checks passed.'
