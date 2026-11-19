-- (S47) 같이 짜기: 기사스케줄 · 품앗이 · 공지가 바뀐 시각(FS_AREAS)이 바뀌면 서버 함수들에 신호 (내용은 안 실림) — 2026-11-19 적용
create or replace function public.sb_live_notify() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.k = 'FS_AREAS' and (tg_op = 'INSERT' or new.v is distinct from old.v) then
    perform pg_notify('sb_live', 'A' || left(coalesce(new.v, ''), 4000));
  end if;
  return null;
end $$;
revoke all on function public.sb_live_notify() from public, anon, authenticated;
drop trigger if exists sb_props_live on public.sb_props;
create trigger sb_props_live after insert or update on public.sb_props for each row execute function public.sb_live_notify();
