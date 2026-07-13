-- Repair the foreign key used by parking_max_fees and refresh PostgREST's schema cache.
-- Safe to run after max_fee_unification_migration.sql.

begin;

-- Remove orphaned rows first, if an earlier manually-created table had no FK.
delete from public.parking_max_fees mf
where not exists (
  select 1 from public.parking p where p.id = mf.parking_id
);

alter table public.parking_max_fees
  drop constraint if exists parking_max_fees_parking_id_fkey;

alter table public.parking_max_fees
  add constraint parking_max_fees_parking_id_fkey
  foreign key (parking_id)
  references public.parking(id)
  on delete cascade;

create index if not exists parking_max_fees_parking_id_idx
  on public.parking_max_fees(parking_id);

commit;

-- Ask Supabase/PostgREST to reload table relationships immediately.
notify pgrst, 'reload schema';
