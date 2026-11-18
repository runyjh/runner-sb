#!/bin/sh
# 시험 서버를 새로 띄우고 브라우저 시험 실행
cd "$(dirname "$0")"
export SB_OUT=${SB_OUT:-$PWD/dist-e2e} SB_URL=http://127.0.0.1:8765/sbfake
fuser -k 8765/tcp >/dev/null 2>&1; sleep 0.5
node build.js "${REPO:-/home/claude/runyjh/runner-allinone}" 598 S1 >/dev/null || exit 1
(TZ=UTC nohup node e2e-server2.js > server.log 2>&1 &)
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null localhost:8765/runner-sb/ && break; sleep 0.5; done
PLAYWRIGHT=${PLAYWRIGHT:-/opt/npm-tools/node_modules/playwright} CHROME=${CHROME:-/usr/bin/google-chrome} node e2e.js
