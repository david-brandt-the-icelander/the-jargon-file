#!/usr/bin/env bash
# What the legacy runner's ci.sh does for each commit: npm ci, npm test, npm run build (offline and deterministic), and
# LINKS.md and FIXES.md exactly as committed. Leaves the built File (dist/) as a tarball. The weekly outside-link check
# (links.sh) is a scheduled job for zeecron, not part of this pipeline.
set -euo pipefail
export HOME=/tmp npm_config_cache=/tmp/.npm npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false
export CI=true LANG=C.UTF-8
srcs=(/zazzle/input/repos/*/the-jargon-file); src=${srcs[0]}
commit=${ZAZZLE_COMMIT:-$(git -C "$src" rev-parse HEAD)}
# A clone, not a copy, so `git diff` below compares with the commit; it shares the checkout's objects.
git clone -q --shared --no-checkout "$src" /tmp/the-jargon-file
git -C /tmp/the-jargon-file checkout -q --detach "$commit"
cd /tmp/the-jargon-file
node --version
npm ci
npm test
npm run build
# The build rewrites LINKS.md and FIXES.md; a commit must carry them as written.
git diff --exit-code -- LINKS.md FIXES.md
tar -czf /zazzle/output/the-jargon-file-dist.tar.gz dist
echo "check: passed; left the-jargon-file-dist.tar.gz ($(du -h /zazzle/output/the-jargon-file-dist.tar.gz | cut -f1))"
