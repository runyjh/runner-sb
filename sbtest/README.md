# 러너 올인원 수파베이스판 — 만드는 도구

이 저장소(runner-sb)의 화면 파일은 이 도구로 만든다: 기사앱 `index.html` · `app.js` (…/runner-sb/), 관리자 `admin/` (…/runner-sb/admin/), 서버 묶음 `engine.js`, 앱 아이콘 `icons/`. 원본(runner-allinone 의 src/)은 읽기만 한다.

| 파일 | 하는 일 |
|---|---|
| `build.js` | `index.html` · `boot.js` · `xlsx.js` · `engine.js` 만들기 (`node sbtest/build.js <runner-allinone 폴더> <기준 업데이트> <S번호>`) |
| `engine-build.js` | 서버 코드(src/*.gs)를 고치지 않고 이어 붙인다 |
| `gas.js` · `store.js` · `kdate.js` | 구글 서비스 대역 · 메모리 표 · 한국 시각 날짜 |
| `server-core.js` | 서버 실행기: 필요한 탭만 받기 → 엔진 실행 → 바뀐 줄 한 번에 저장 (먼저 저장한 곳이 있으면 다시 계산) |
| `api-handler.js` · `index.template.ts` · `make-index.js` | 수파베이스 서버 함수 `api` (engine.js 지문을 넣어 만든다 → `index.ts`) |
| `boot.js` | 관리자 화면: 수파베이스 로그인 · 서버 호출을 서버 함수로 · 가져오기 · 속도 |
| `app.js` | 기사앱 화면: 서버 호출을 서버 함수로 (로그인은 원래대로 기사 아이디·비밀번호) |
| `ts1.js` · `ts2.js` · `run-e2e.sh` | 시험: 서버 실행기 · 동시 저장 · 브라우저 전체 흐름 (`TZ=UTC` 로 수파베이스 서버와 같은 조건) |

engine.js 를 바꾸면 서버 함수(index.ts)의 지문도 같이 바꿔 올려야 한다 (맞지 않으면 서버 함수가 돌리지 않는다).

## 서버 코드(src) 고친 것 — `src-patches/` (2026-11-18 · S12부터)
수파베이스로 옮긴 뒤 서버 코드를 고칠 때, 원래 저장소(runner-allinone)는 그대로 두고 고친 내용을 여기 patch 로 남긴다.
만들 때: runner-allinone(업데이트 598, `1679b48`)을 받아 `git apply sbtest/src-patches/*.patch` (번호 순) → `node sbtest/build.js <그 폴더> 598+S12 S번호`.

| patch | 내용 |
|---|---|
| `S12-rcmove-backups.patch` | 노선 이관: 옛 캠프 백업 기사를 골라 같이 옮기기(칸의 옛 캠프 노선은 '옛캠프 노선'으로) · 이관 취소 때 이관이 만든 노선 정지 · 시험 `ts8.js` |
