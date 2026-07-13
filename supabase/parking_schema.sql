-- ParkMap / Supabase schema and fee calculation functions
-- Time calculations are performed in Asia/Tokyo.
-- Execute this file in a new Supabase project, or review the DROP statements before
-- using it in a project that already contains production data.

create extension if not exists pgcrypto;

-- Recreate RPCs first so tables can be replaced safely during development.
drop function if exists public.search_parkings(timestamptz, timestamptz, text, boolean, numeric, integer);
drop function if exists public.search_parkings(timestamptz, timestamptz, text, boolean, integer, integer, integer, integer, integer, boolean, boolean, boolean, integer);
drop function if exists public.calculate_parking_fee(uuid, timestamptz, timestamptz);
drop function if exists public.calculate_base_parking_fee(uuid, timestamptz, timestamptz);
drop function if exists public.calculate_normal_parking_fee(uuid, timestamptz, timestamptz);
drop function if exists public.generate_fee_segments(uuid, timestamptz, timestamptz);
drop function if exists public.get_next_rate_boundary(time, time, timestamptz, timestamptz);
drop function if exists public.get_rate_at(uuid, timestamptz);

drop table if exists public.parking_max_fees cascade;
drop table if exists public.parking_daily_max_fees cascade;
drop table if exists public.parking_max_fee_rules cascade;
drop table if exists public.parking_rates cascade;
drop table if exists public.parking_limits cascade;
drop table if exists public.parking cascade;

create table public.parking (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  available integer not null default 0 check (available >= 0),
  capacity integer not null default 0 check (capacity >= 0),
  open_time time not null default time '00:00',
  close_time time not null default time '00:00',
  is_24h boolean not null default false,
  status text not null default 'close' check (status in ('open', 'close', 'full', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available <= capacity or capacity = 0)
);

create table public.parking_limits (
  parking_id uuid primary key references public.parking(id) on delete cascade,
  height_limit_cm integer check (height_limit_cm is null or height_limit_cm > 0),
  width_limit_cm integer check (width_limit_cm is null or width_limit_cm > 0),
  length_limit_cm integer check (length_limit_cm is null or length_limit_cm > 0),
  weight_limit_kg integer check (weight_limit_kg is null or weight_limit_kg > 0),
  minimum_ground_clearance_cm integer check (
    minimum_ground_clearance_cm is null or minimum_ground_clearance_cm >= 0
  ),
  is_light_only boolean not null default false,
  is_ev_available boolean not null default false,
  is_cashless boolean not null default false
);

-- start_time = end_time means the rate applies for the full 24 hours.
-- For an overnight rate, use start_time > end_time (for example 20:00-08:00).
-- period_max_fee caps one occurrence of that rate period. For an overnight rate,
-- the occurrence starts on the date containing start_time and ends the next day.
create table public.parking_rates (
  id uuid primary key default gen_random_uuid(),
  parking_id uuid not null references public.parking(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  unit_minutes integer not null check (unit_minutes > 0),
  fee_unit integer not null check (fee_unit >= 0),
  period_max_fee integer check (period_max_fee is null or period_max_fee >= 0),
  priority integer not null default 0,
  created_at timestamptz not null default now()
);

create index parking_rates_parking_id_idx on public.parking_rates(parking_id);

-- Maximum fee rules are stored in one table.
-- kind = daily: cap each Japan-local calendar day; duration_minutes must be NULL.
-- kind = rolling: cap each duration from entry; NULL max_applications means repeat until exit.
-- Display labels are generated from kind and duration_minutes, so no name/text column is needed.
create table public.parking_max_fees (
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

create index parking_max_fees_parking_id_idx
  on public.parking_max_fees(parking_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger parking_set_updated_at
before update on public.parking
for each row execute function public.set_updated_at();

create or replace function public.get_rate_at(
  p_parking_id uuid,
  p_datetime timestamptz
)
returns public.parking_rates
language plpgsql
stable
set search_path = public
as $$
declare
  v_rate public.parking_rates%rowtype;
  v_time time := (p_datetime at time zone 'Asia/Tokyo')::time;
begin
  select pr.*
    into v_rate
  from public.parking_rates pr
  where pr.parking_id = p_parking_id
    and (
      pr.start_time = pr.end_time
      or (pr.start_time < pr.end_time and v_time >= pr.start_time and v_time < pr.end_time)
      or (pr.start_time > pr.end_time and (v_time >= pr.start_time or v_time < pr.end_time))
    )
  order by pr.priority desc, pr.created_at, pr.id
  limit 1;

  if not found then
    raise exception '料金設定が見つかりません parking_id=% datetime=%', p_parking_id, p_datetime;
  end if;

  return v_rate;
end;
$$;

create or replace function public.get_next_rate_boundary(
  p_start_time time,
  p_end_time time,
  p_current timestamptz,
  p_use_end timestamptz
)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_local_date date := (p_current at time zone 'Asia/Tokyo')::date;
  v_local_time time := (p_current at time zone 'Asia/Tokyo')::time;
  v_rate_end timestamptz;
  v_next_midnight timestamptz := ((v_local_date + 1)::timestamp at time zone 'Asia/Tokyo');
begin
  if p_start_time = p_end_time then
    v_rate_end := v_next_midnight;
  elsif p_start_time < p_end_time then
    v_rate_end := ((v_local_date + p_end_time) at time zone 'Asia/Tokyo');
  elsif v_local_time >= p_start_time then
    v_rate_end := (((v_local_date + 1) + p_end_time) at time zone 'Asia/Tokyo');
  else
    v_rate_end := ((v_local_date + p_end_time) at time zone 'Asia/Tokyo');
  end if;

  return least(v_rate_end, v_next_midnight, p_use_end);
end;
$$;

create or replace function public.generate_fee_segments(
  p_parking_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  parking_id uuid,
  rate_id uuid,
  billing_date date,
  segment_start timestamptz,
  segment_end timestamptz,
  unit_minutes integer,
  fee_unit integer,
  period_max_fee integer,
  minutes numeric
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_current timestamptz := p_start;
  v_boundary timestamptz;
  v_rate public.parking_rates%rowtype;
  v_local_date date;
  v_local_time time;
begin
  if p_start >= p_end then
    return;
  end if;

  while v_current < p_end loop
    v_rate := public.get_rate_at(p_parking_id, v_current);
    v_boundary := public.get_next_rate_boundary(
      v_rate.start_time,
      v_rate.end_time,
      v_current,
      p_end
    );

    if v_boundary <= v_current then
      raise exception '料金境界が不正です current=% boundary=% parking_id=%',
        v_current, v_boundary, p_parking_id;
    end if;

    v_local_date := (v_current at time zone 'Asia/Tokyo')::date;
    v_local_time := (v_current at time zone 'Asia/Tokyo')::time;

    parking_id := p_parking_id;
    rate_id := v_rate.id;
    -- Keep both sides of an overnight period in the same billing occurrence.
    billing_date := case
      when v_rate.start_time > v_rate.end_time and v_local_time < v_rate.end_time
        then v_local_date - 1
      else v_local_date
    end;
    segment_start := v_current;
    segment_end := v_boundary;
    unit_minutes := v_rate.unit_minutes;
    fee_unit := v_rate.fee_unit;
    period_max_fee := v_rate.period_max_fee;
    minutes := extract(epoch from (v_boundary - v_current)) / 60.0;
    return next;

    v_current := v_boundary;
  end loop;
end;
$$;

-- Pure metered fee. Billing rounds up once per occurrence of a rate period,
-- not once per artificial midnight segment and not across separate days.
create or replace function public.calculate_normal_parking_fee(
  p_parking_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when p_start >= p_end then 0
    else coalesce(sum(ceil(x.total_minutes / x.unit_minutes) * x.fee_unit), 0)::integer
  end
  from (
    select rate_id, billing_date, unit_minutes, fee_unit, sum(minutes) total_minutes
    from public.generate_fee_segments(p_parking_id, p_start, p_end)
    group by rate_id, billing_date, unit_minutes, fee_unit
  ) x;
$$;

-- Metered fee capped by each rate period's maximum fee.
create or replace function public.calculate_base_parking_fee(
  p_parking_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when p_start >= p_end then 0
    else coalesce(sum(least(
      ceil(x.total_minutes / x.unit_minutes) * x.fee_unit,
      coalesce(x.period_max_fee, 2147483647)
    )), 0)::integer
  end
  from (
    select
      rate_id,
      billing_date,
      unit_minutes,
      fee_unit,
      period_max_fee,
      sum(minutes) total_minutes
    from public.generate_fee_segments(p_parking_id, p_start, p_end)
    group by rate_id, billing_date, unit_minutes, fee_unit, period_max_fee
  ) x;
$$;

-- Applies calendar-day and entry-based maximum fees and returns the cheapest valid total.
create or replace function public.calculate_parking_fee(
  p_parking_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  v_best integer;
  v_candidate integer;
  v_daily_amount integer;
  v_day date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_block_start timestamptz;
  v_block_end timestamptz;
  v_count integer;
  v_rule record;
begin
  if p_start is null or p_end is null or p_start >= p_end then
    return null;
  end if;

  v_best := public.calculate_base_parking_fee(p_parking_id, p_start, p_end);

  -- A daily maximum is applied independently to every Japan-local calendar day.
  select min(amount) into v_daily_amount
  from public.parking_max_fees
  where parking_id = p_parking_id and kind = 'daily';

  if v_daily_amount is not null then
    v_candidate := 0;
    v_day := (p_start at time zone 'Asia/Tokyo')::date;

    while v_day <= (p_end at time zone 'Asia/Tokyo')::date loop
      v_day_start := (v_day::timestamp at time zone 'Asia/Tokyo');
      v_day_end := ((v_day + 1)::timestamp at time zone 'Asia/Tokyo');

      if greatest(p_start, v_day_start) < least(p_end, v_day_end) then
        v_candidate := v_candidate + least(
          public.calculate_base_parking_fee(
            p_parking_id,
            greatest(p_start, v_day_start),
            least(p_end, v_day_end)
          ),
          v_daily_amount
        );
      end if;

      v_day := v_day + 1;
    end loop;

    v_best := least(v_best, v_candidate);
  end if;

  -- Compare every entry-based rolling maximum rule.
  for v_rule in
    select * from public.parking_max_fees
    where parking_id = p_parking_id and kind = 'rolling'
    order by amount, duration_minutes
  loop
    v_candidate := 0;
    v_block_start := p_start;
    v_count := 0;

    while v_block_start < p_end
      and (v_rule.max_applications is null or v_count < v_rule.max_applications)
    loop
      v_block_end := least(
        v_block_start + make_interval(mins => v_rule.duration_minutes),
        p_end
      );
      v_candidate := v_candidate + least(
        public.calculate_normal_parking_fee(p_parking_id, v_block_start, v_block_end),
        v_rule.amount
      );
      v_block_start := v_block_end;
      v_count := v_count + 1;
    end loop;

    if v_block_start < p_end then
      v_candidate := v_candidate
        + public.calculate_base_parking_fee(p_parking_id, v_block_start, p_end);
    end if;

    v_best := least(v_best, v_candidate);
  end loop;

  return v_best;
end;
$$;

create or replace function public.search_parkings(
  p_start timestamptz,
  p_end timestamptz,
  p_sort_key text default 'fee',
  p_ascending boolean default true,
  p_vehicle_height_cm integer default null,
  p_vehicle_width_cm integer default null,
  p_vehicle_length_cm integer default null,
  p_vehicle_weight_kg integer default null,
  p_ground_clearance_cm integer default null,
  p_requires_ev boolean default false,
  p_requires_cashless boolean default false,
  p_light_vehicle boolean default false,
  p_max_fee integer default null
)
returns table (
  id uuid,
  name text,
  address text,
  lat double precision,
  lng double precision,
  available integer,
  capacity integer,
  open_time time,
  close_time time,
  is_24h boolean,
  status text,
  max_height integer,
  max_width integer,
  max_length integer,
  max_weight integer,
  min_ground_clearance integer,
  is_light_only boolean,
  is_ev_available boolean,
  is_cashless boolean,
  total_fee integer
)
language plpgsql
stable
set search_path = public
as $$
begin
  if p_start is null or p_end is null or p_start >= p_end then
    raise exception '開始日時と終了日時が正しくありません';
  end if;

  if p_sort_key not in ('fee', 'available', 'capacity', 'name') then
    raise exception '未対応のソートキーです: %', p_sort_key;
  end if;

  return query
  select
    p.id, p.name, p.address, p.lat, p.lng, p.available, p.capacity,
    p.open_time, p.close_time, p.is_24h, p.status,
    l.height_limit_cm, l.width_limit_cm, l.length_limit_cm,
    l.weight_limit_kg, l.minimum_ground_clearance_cm,
    coalesce(l.is_light_only, false), coalesce(l.is_ev_available, false),
    coalesce(l.is_cashless, false), fee.total_fee
  from public.parking p
  left join public.parking_limits l on l.parking_id = p.id
  cross join lateral (
    select public.calculate_parking_fee(p.id, p_start, p_end) total_fee
  ) fee
  where fee.total_fee is not null
    and (p_vehicle_height_cm is null or l.height_limit_cm is null or p_vehicle_height_cm <= l.height_limit_cm)
    and (p_vehicle_width_cm is null or l.width_limit_cm is null or p_vehicle_width_cm <= l.width_limit_cm)
    and (p_vehicle_length_cm is null or l.length_limit_cm is null or p_vehicle_length_cm <= l.length_limit_cm)
    and (p_vehicle_weight_kg is null or l.weight_limit_kg is null or p_vehicle_weight_kg <= l.weight_limit_kg)
    and (p_ground_clearance_cm is null or l.minimum_ground_clearance_cm is null or p_ground_clearance_cm >= l.minimum_ground_clearance_cm)
    and (not p_requires_ev or coalesce(l.is_ev_available, false))
    and (not p_requires_cashless or coalesce(l.is_cashless, false))
    and (p_light_vehicle or not coalesce(l.is_light_only, false))
    and (p_max_fee is null or fee.total_fee <= p_max_fee)
  order by
    case when p_sort_key = 'fee' and p_ascending then fee.total_fee end asc,
    case when p_sort_key = 'fee' and not p_ascending then fee.total_fee end desc,
    case when p_sort_key = 'available' and p_ascending then p.available end asc,
    case when p_sort_key = 'available' and not p_ascending then p.available end desc,
    case when p_sort_key = 'capacity' and p_ascending then p.capacity end asc,
    case when p_sort_key = 'capacity' and not p_ascending then p.capacity end desc,
    case when p_sort_key = 'name' and p_ascending then p.name end asc,
    case when p_sort_key = 'name' and not p_ascending then p.name end desc,
    p.id;
end;
$$;

-- Development policies. The backend uses the anon key, so read/RPC access must
-- be allowed. Keep direct table writes disabled and perform writes with a trusted
-- server/service role when you add management features.
alter table public.parking enable row level security;
alter table public.parking_limits enable row level security;
alter table public.parking_rates enable row level security;
alter table public.parking_max_fees enable row level security;

create policy parking_public_read on public.parking for select to anon, authenticated using (true);
create policy parking_limits_public_read on public.parking_limits for select to anon, authenticated using (true);
create policy parking_rates_public_read on public.parking_rates for select to anon, authenticated using (true);
create policy parking_max_fees_public_read on public.parking_max_fees for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select on public.parking, public.parking_limits, public.parking_rates, public.parking_max_fees to anon, authenticated;
grant execute on function public.search_parkings(
  timestamptz, timestamptz, text, boolean, integer, integer, integer,
  integer, integer, boolean, boolean, boolean, integer
) to anon, authenticated;

