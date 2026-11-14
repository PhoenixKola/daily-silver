#!/bin/sh
set -e
cd "$(dirname "$0")"
node tools/expand-roster.mjs
node tools/download-sprites.mjs
printf '251-species local roster installed. Start with ./PLAY-ON-MAC-LINUX.sh\n'
