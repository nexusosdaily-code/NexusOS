#!/bin/bash
set -e

npm install --legacy-peer-deps

if [ -f requirements.txt ]; then
  pip install -r requirements.txt --quiet
fi

npm run db:push
