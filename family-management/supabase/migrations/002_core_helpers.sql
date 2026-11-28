-- =============================================================================
-- 002_core_helpers.sql — Helper reusable untuk semua modul berikutnya.
-- Idempotent. Prasyarat: 001_initial_schema.sql
-- =============================================================================

-- household_id milik pengguna yang sedang login. Dipakai sebagai DEFAULT kolom
-- household_id, jadi frontend tidak perlu (dan tidak boleh) menentukannya sendiri.
-- Tetap divalidasi oleh RLS WITH CHECK.
create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.household_id
  from public.household_members m
  where m.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.current_household_id() from public, anon;
grant execute on function private.current_household_id() to authenticated;

-- Terapkan RLS standar "anggota household" pada tabel yang punya kolom household_id.
-- Jika tabel punya kolom created_by, INSERT wajib created_by = auth.uid() (anti-spoofing).
create or replace procedure private.apply_household_rls(p_table regclass)
language plpgsql
set search_path = ''
as $$
declare
  v_name        text := (select relname from pg_class where oid = p_table);
  v_has_creator boolean;
  v_insert_chk  text := '(select private.is_household_member(household_id))';
begin
  select exists (
    select 1 from pg_attribute
    where attrelid = p_table and attname = 'created_by' and not attisdropped
  ) into v_has_creator;

  if v_has_creator then
    v_insert_chk := v_insert_chk || ' and created_by = (select auth.uid())';
  end if;

  execute format('alter table %s enable row level security', p_table);
  execute format('revoke all on %s from anon, authenticated', p_table);
  execute format('grant select, insert, update, delete on %s to authenticated', p_table);

  execute format('drop policy if exists %I on %s', v_name || '_select', p_table);
  execute format('drop policy if exists %I on %s', v_name || '_insert', p_table);
  execute format('drop policy if exists %I on %s', v_name || '_update', p_table);
  execute format('drop policy if exists %I on %s', v_name || '_delete', p_table);

  execute format('create policy %I on %s for select to authenticated using ((select private.is_household_member(household_id)))',
                 v_name || '_select', p_table);
  execute format('create policy %I on %s for insert to authenticated with check (%s)',
                 v_name || '_insert', p_table, v_insert_chk);
  execute format('create policy %I on %s for update to authenticated using ((select private.is_household_member(household_id))) with check ((select private.is_household_member(household_id)))',
                 v_name || '_update', p_table);
  execute format('create policy %I on %s for delete to authenticated using ((select private.is_household_member(household_id)))',
                 v_name || '_delete', p_table);
end;
$$;

-- Pasang trigger updated_at standar.
create or replace procedure private.apply_updated_at(p_table regclass)
language plpgsql
set search_path = ''
as $$
begin
  execute format('drop trigger if exists set_updated_at on %s', p_table);
  execute format('create trigger set_updated_at before update on %s for each row execute function public.set_updated_at()', p_table);
end;
$$;

revoke all on procedure private.apply_household_rls(regclass) from public, anon, authenticated;
revoke all on procedure private.apply_updated_at(regclass) from public, anon, authenticated;
