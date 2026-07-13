-- Execute after parking_schema.sql and seed.sql.
-- These SELECTs are intended for manual verification in Supabase SQL Editor.

-- Expected: 1200 (61 minutes => three 30-minute units at 400 yen)
select public.calculate_parking_fee(
  (select id from public.parking where name = '横浜中華街パーキング'),
  '2026-07-13 10:00+09'::timestamptz,
  '2026-07-13 11:01+09'::timestamptz
) as expected_1200;

-- Expected: 2800 (period maximum fee)
select public.calculate_parking_fee(
  (select id from public.parking where name = '横浜中華街パーキング'),
  '2026-07-13 10:00+09'::timestamptz,
  '2026-07-13 18:00+09'::timestamptz
) as expected_2800;

-- Expected: 300 (day rate 200 + night rate 100)
select public.calculate_parking_fee(
  (select id from public.parking where name = 'ル・パルク横浜山下第一駐車場'),
  '2026-07-13 19:30+09'::timestamptz,
  '2026-07-13 20:30+09'::timestamptz
) as expected_300;

-- Expected: 300. The overnight period is one billing occurrence even though
-- it crosses midnight, so its maximum is not applied twice.
select public.calculate_parking_fee(
  (select id from public.parking where name = 'ル・パルク横浜山下第一駐車場'),
  '2026-07-13 20:00+09'::timestamptz,
  '2026-07-14 08:00+09'::timestamptz
) as expected_300_overnight;

-- Inspect segment boundaries and billing dates.
select *
from public.generate_fee_segments(
  (select id from public.parking where name = 'ル・パルク横浜山下第一駐車場'),
  '2026-07-13 19:30+09'::timestamptz,
  '2026-07-14 08:30+09'::timestamptz
);
