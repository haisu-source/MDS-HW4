#!/usr/bin/env bash
# Run from the hw4 folder: `bash push-to-github.sh`
# This clones the prebuilt commit history from mds-hw4.bundle and pushes to
# https://github.com/haisu-source/MDS-HW4.git
set -euo pipefail

REMOTE="https://github.com/haisu-source/MDS-HW4.git"
BUNDLE="$(pwd)/mds-hw4.bundle"

if [ ! -f "$BUNDLE" ]; then
  echo "Error: $BUNDLE not found. Run this script from the hw4 folder."
  exit 1
fi

if [ -d .git ]; then
  echo "Removing the stale .git directory (the sandbox left a broken one)..."
  rm -rf .git
fi

echo "Pulling commit history out of the bundle..."
git init -b main
git remote add bundle "$BUNDLE"
git fetch bundle
git reset --hard bundle/main
git remote remove bundle

# Re-sync the working tree to whatever's on disk (newer than the bundle wins
# for files the user has edited locally).
git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore: sync local working tree"
fi

echo "Setting origin to $REMOTE ..."
git remote add origin "$REMOTE" 2>/dev/null || git remote set-url origin "$REMOTE"

echo "Pushing to $REMOTE main ..."
git push -u origin main

echo
echo "Done. Check https://github.com/haisu-source/MDS-HW4"
