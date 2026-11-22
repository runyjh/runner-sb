-- (S162) 자동 백업: 매일 새벽 3시 17분(한국) 전체 표를 DB 안 백업 칸(backup 스키마)에 통째로 복사 · 35일 보관 — 2026-11-22 적용
--  - 수파베이스 자체 백업(7일)보다 길게: 일주일 넘게 지나 발견한 실수도 그날 상태로 되돌릴 수 있게
--  - 바깥(화면 · API)에서는 보이지도 닿지도 않음 (backup 스키마는 API 에 안 열림 · 함수 실행 권한도 막음)
--  - 로그인 기록(sessions)은 빼고(되돌리면 오히려 위험) · 임시 기억(sb_cache) · 속도 기록(sb_perf)도 뺌
--  - 되돌리기는 자동으로 하지 않는다: 대표 요청이 있을 때만 그날 · 그 표를 골라서
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;

create table if not exists backup.snap (
  day date not null,
  book text not null,
  tab text not null,
  uid uuid not null,
  ord int, max_rows int, max_cols int,
  n int not null,
  rows jsonb not null,           -- [[pos, cells], ...] 줄 순서대로
  primary key (day, uid)
);
create table if not exists backup.props (
  day date primary key,
  props jsonb not null,          -- { k: v } (__ 로 시작하는 열쇠 지문은 뺌)
  files jsonb not null,          -- 파일 목록 (내용은 저장소에 그대로)
  at timestamptz not null default now(),
  tabs int, rows int, ms int
);
revoke all on all tables in schema backup from public, anon, authenticated;

create or replace function backup.take(keep_days int default 35) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'Asia/Seoul')::date; t0 timestamptz := clock_timestamp(); nt int; nr int;
begin
  delete from backup.snap where day = d;
  delete from backup.props where day = d;
  insert into backup.snap (day, book, tab, uid, ord, max_rows, max_cols, n, rows)
  select d, t.book, t.tab, t.uid, t.ord, t.max_rows, t.max_cols,
         count(r.pos)::int,
         coalesce(jsonb_agg(jsonb_build_array(r.pos, r.cells) order by r.pos) filter (where r.pos is not null), '[]'::jsonb)
  from public.sb_tabs t left join public.sb_rows r on r.tab_uid = t.uid
  where t.tab <> 'sessions'
  group by t.book, t.tab, t.uid, t.ord, t.max_rows, t.max_cols;
  select count(*), coalesce(sum(n), 0) into nt, nr from backup.snap where day = d;
  insert into backup.props (day, props, files, tabs, rows, ms)
  values (d,
    coalesce((select jsonb_object_agg(k, v) from public.sb_props where k not like '\_\_%'), '{}'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(f)) from public.sb_files f), '[]'::jsonb),
    nt, nr, (extract(epoch from clock_timestamp() - t0) * 1000)::int);
  delete from backup.snap where day < d - keep_days;
  delete from backup.props where day < d - keep_days;
  return jsonb_build_object('day', d, 'tabs', nt, 'rows', nr, 'ms', (extract(epoch from clock_timestamp() - t0) * 1000)::int);
end $$;
revoke all on function backup.take(int) from public, anon, authenticated;

-- 매일 18:17 UTC = 한국 새벽 3:17 (세션 정리 4:03 · DB 정리 4:33 보다 먼저)
select cron.unschedule(jobid) from cron.job where jobname = 'runner-auto-backup';
select cron.schedule('runner-auto-backup', '17 18 * * *', $$select backup.take(35)$$);
