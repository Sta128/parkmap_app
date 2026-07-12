-- Run after parking_schema.sql.

insert into public.parking (
  name, address, lat, lng, available, capacity,
  open_time, close_time, is_24h, status
) values
('横浜中華街パーキング', '神奈川県横浜市中区山下町94', 35.4438, 139.6453, 365, 400, '00:00', '00:00', true, 'open'),
('ル・パルク横浜山下第一駐車場', '神奈川県横浜市中区山下町174', 35.4426, 139.6474, 84, 200, '00:00', '00:00', true, 'open'),
('横浜市山下町地下駐車場', '神奈川県横浜市中区山下町60', 35.4445, 139.6448, 222, 300, '00:00', '00:00', true, 'open'),
('TNS横浜中華街駐車場', '神奈川県横浜市中区山下町168', 35.4428, 139.6468, 88, 200, '00:00', '00:00', true, 'open'),
('カノープス中華街', '神奈川県横浜市中区山下町192-3', 35.4422, 139.6478, 12, 200, '00:00', '00:00', true, 'open'),
('タイムズ横浜山下町', '神奈川県横浜市中区山下町28', 35.4449, 139.6440, 150, 330, '00:00', '00:00', true, 'open'),
('ショウワパーク中華街', '神奈川県横浜市中区山下町166', 35.4429, 139.6466, 20, 200, '00:00', '22:00', false, 'open'),
('ダイレクトパーク横浜元町中華街', '神奈川県横浜市中区山下町274-1', 35.4410, 139.6493, 550, 600, '00:00', '00:00', true, 'open'),
('PARK340', '神奈川県横浜市中区山下町90-2', 35.4439, 139.6450, 340, 340, '00:00', '00:00', true, 'full'),
('NPC24H中華街第3パーキング', '神奈川県横浜市中区山下町97-3', 35.4437, 139.6455, 23, 220, '00:00', '00:00', true, 'open');

insert into public.parking_limits (
  parking_id, height_limit_cm, width_limit_cm, length_limit_cm,
  weight_limit_kg, minimum_ground_clearance_cm,
  is_light_only, is_ev_available, is_cashless
)
select id, 210, 190, 500, 2000, null, false, false, true
from public.parking;

with rates(name, start_time, end_time, unit_minutes, fee_unit, period_max_fee) as (
  values
  ('横浜中華街パーキング', '00:00'::time, '00:00'::time, 30, 400, 2800),
  ('ル・パルク横浜山下第一駐車場', '08:00'::time, '20:00'::time, 30, 200, 1600),
  ('ル・パルク横浜山下第一駐車場', '20:00'::time, '08:00'::time, 60, 100, 300),
  ('横浜市山下町地下駐車場', '08:00'::time, '22:00'::time, 30, 300, 2000),
  ('横浜市山下町地下駐車場', '22:00'::time, '08:00'::time, 60, 150, 500),
  ('TNS横浜中華街駐車場', '06:00'::time, '01:00'::time, 20, 200, 1400),
  ('TNS横浜中華街駐車場', '01:00'::time, '06:00'::time, 60, 100, 500),
  ('カノープス中華街', '08:00'::time, '23:00'::time, 20, 200, 1200),
  ('カノープス中華街', '23:00'::time, '08:00'::time, 60, 100, 300),
  ('タイムズ横浜山下町', '08:00'::time, '22:00'::time, 30, 330, 2500),
  ('タイムズ横浜山下町', '22:00'::time, '08:00'::time, 60, 110, 550),
  ('ショウワパーク中華街', '08:00'::time, '22:00'::time, 30, 200, 1600),
  ('ショウワパーク中華街', '22:00'::time, '08:00'::time, 60, 100, 400),
  ('ダイレクトパーク横浜元町中華街', '00:00'::time, '00:00'::time, 45, 100, 1000),
  ('PARK340', '06:00'::time, '00:00'::time, 30, 300, 2400),
  ('PARK340', '00:00'::time, '06:00'::time, 60, 100, 500),
  ('NPC24H中華街第3パーキング', '00:00'::time, '00:00'::time, 30, 220, 1800)
)
insert into public.parking_rates (
  parking_id, start_time, end_time, unit_minutes, fee_unit, period_max_fee
)
select p.id, r.start_time, r.end_time, r.unit_minutes, r.fee_unit, r.period_max_fee
from rates r
join public.parking p on p.name = r.name;

-- Example of an entry-based repeating maximum fee. Uncomment and adjust when needed.
-- insert into public.parking_max_fee_rules(parking_id, name, amount, duration_minutes, max_applications)
-- select id, '入庫から24時間最大', 1800, 1440, null
-- from public.parking where name = 'NPC24H中華街第3パーキング';
