#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then echo 'Node.js 18+ required: https://nodejs.org/'; exit 1; fi
echo 'Verifying genuine Generation II sprites (first run needs an internet connection)...'
node tools/download-sprites.mjs || { echo 'Sprites could not be installed; connect to the internet and retry.'; exit 1; }
printf '%s\n' 'All sprite art is installed locally. Open http://localhost:4182 in your browser.'
node tools/server.mjs
