#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
git pull
source ~/.bashrc  # This enables pnpm and nvm
pnpm install
npm run build
webservice --backend=kubernetes node16 restart
