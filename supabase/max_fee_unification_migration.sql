-- Migrate v6 maximum-fee tables to the unified parking_max_fees table.
-- Existing daily and rolling rules are preserved; display-only name/text values are discarded.

begin;

create table if not exists public.parking_max_fees (
  id uuid primary key default gen_random_uuid(),
  parking_id uuid not null references public.parking(id) on delete cascade,
  kind text not null check (kind in ('daily', 'rolling')),
  amount integer not null check (amount >= 0),
  duration_minutes integer,
  max_applications integer check (max_applications is null or max_applications > 0),
  created_at timestamptz not null default now(),
  check (
    (kind = 'daily' and duration_minutes is null and max_applications is null)
    or
    (kind = 'rolling' and duration_minutes is not null and duration_minutes > 0)
  )
);

insert into public.parking_max_fees (id, parking_id, kind, amount, duration_minutes, max_applications, created_at)
select id, parking_id, 'rolling', amount, duration_minutes, max_applications, created_at
from public.parking_max_fee_rules
on conflict (id) do nothing;

insert into public.parking_max_fees (id, parking_id, kind, amount, duration_minutes, max_applications, created_at)
select id, parking_id, 'daily', amount, null, null, created_at
from public.parking_daily_max_fees
on conflict (id) do nothing;

-- Ensure the relationship exists even when parking_max_fees had previously been
-- created manually without its foreign-key constraint.
delete from public.parking_max_fees mf
where not exists (select 1 from public.parking p where p.id = mf.parking_id);

alter table public.parking_max_fees
  drop constraint if exists parking_max_fees_parking_id_fkey;
alter table public.parking_max_fees
  add constraint parking_max_fees_parking_id_fkey
  foreign key (parking_id) references public.parking(id) on delete cascade;

create index if not exists parking_max_fees_parking_id_idx
  on public.parking_max_fees(parking_id);

alter table public.parking_max_fees enable row level security;
drop policy if exists parking_max_fees_public_read on public.parking_max_fees;
create policy parking_max_fees_public_read
  on public.parking_max_fees for select to anon, authenticated using (true);
grant select on public.parking_max_fees to anon, authenticated;

-- Recreate the fee function so it reads the unified table and applies daily caps.
create or replace function public.calculate_parking_fee(
  p_parking_id uuid, p_start timestamptz, p_end timestamptz
) returns integer language plpgsql stable set search_path = public as $$
declare
  v_best integer; v_candidate integer; v_daily_amount integer; v_day date;
  v_day_start timestamptz; v_day_end timestamptz; v_block_start timestamptz;
  v_block_end timestamptz; v_count integer; v_rule record;
begin
  if p_start is null or p_end is null or p_start >= p_end then return null; end if;
  v_best := public.calculate_base_parking_fee(p_parking_id, p_start, p_end);
  select min(amount) into v_daily_amount from public.parking_max_fees
   where parking_id = p_parking_id and kind = 'daily';
  if v_daily_amount is not null then
    v_candidate := 0; v_day := (p_start at time zone 'Asia/Tokyo')::date;
    while v_day <= (p_end at time zone 'Asia/Tokyo')::date loop
      v_day_start := v_day::timestamp at time zone 'Asia/Tokyo';
      v_day_end := (v_day + 1)::timestamp at time zone 'Asia/Tokyo';
      if greatest(p_start, v_day_start) < least(p_end, v_day_end) then
        v_candidate := v_candidate + least(public.calculate_base_parking_fee(
          p_parking_id, greatest(p_start, v_day_start), least(p_end, v_day_end)), v_daily_amount);
      end if;
      v_day := v_day + 1;
    end loop;
    v_best := least(v_best, v_candidate);
  end if;
  for v_rule in select * from public.parking_max_fees
    where parking_id = p_parking_id and kind = 'rolling' order by amount, duration_minutes
  loop
    v_candidate := 0; v_block_start := p_start; v_count := 0;
    while v_block_start < p_end and (v_rule.max_applications is null or v_count < v_rule.max_applications) loop
      v_block_end := least(v_block_start + make_interval(mins => v_rule.duration_minutes), p_end);
      v_candidate := v_candidate + least(public.calculate_normal_parking_fee(
        p_parking_id, v_block_start, v_block_end), v_rule.amount);
      v_block_start := v_block_end; v_count := v_count + 1;
    end loop;
    if v_block_start < p_end then
      v_candidate := v_candidate + public.calculate_base_parking_fee(p_parking_id, v_block_start, p_end);
    end if;
    v_best := least(v_best, v_candidate);
  end loop;
  return v_best;
end; $$;

drop table public.parking_daily_max_fees;
drop table public.parking_max_fee_rules;

commit;

notify pgrst, 'reload schema';

-- Examples:
-- insert into public.parking_max_fees(parking_id, kind, amount)
-- select id, 'daily', 1800 from public.parking where name = '駐車場名';
-- insert into public.parking_max_fees(parking_id, kind, amount, duration_minutes, max_applications)
-- select id, 'rolling', 1500, 1440, null from public.parking where name = '駐車場名';
