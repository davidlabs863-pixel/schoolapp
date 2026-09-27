-- OPTA X EDU profile and shared lesson foundation.
-- Run this in the Supabase SQL Editor, then configure Google OAuth in Authentication.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  requested_role text check (requested_role in ('student', 'teacher', 'parent', 'principal')),
  grade_id smallint check (grade_id between 1 and 12),
  role text not null default 'student' check (role in ('student', 'teacher', 'parent', 'principal', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id text primary key,
  owner_uid uuid references auth.users(id) on delete set null,
  title text,
  description text,
  topic text,
  subject text,
  grade integer,
  teacher text,
  duration text,
  difficulty text,
  video_type text default 'youtube',
  video_id text,
  video_url text,
  thumbnail text,
  shared boolean not null default true,
  featured boolean not null default false,
  status text default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  ) on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can create their own onboarding profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update onboarding fields only"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Everyone can read shared lessons"
on public.lessons for select
using (shared = true or auth.uid() = owner_uid);

create policy "Authenticated users can create lessons"
on public.lessons for insert
to authenticated
with check (auth.uid() = owner_uid or shared = true);

create policy "Owners can update their lessons"
on public.lessons for update
to authenticated
using (auth.uid() = owner_uid)
with check (auth.uid() = owner_uid);

revoke update (role) on public.profiles from authenticated;
revoke update (role) on public.profiles from anon;
