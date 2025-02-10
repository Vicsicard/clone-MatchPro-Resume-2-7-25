-- First, verify if the handle_updated_at function exists, if not create it
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Verify storage buckets exist and are properly configured
do $$ 
begin
  -- Create resumes bucket if it doesn't exist
  insert into storage.buckets (id, name, public)
  values ('resumes', 'resumes', false)
  on conflict (id) do nothing;

  -- Create jobs bucket if it doesn't exist
  insert into storage.buckets (id, name, public)
  values ('jobs', 'jobs', false)
  on conflict (id) do nothing;
end $$;

-- Enable RLS on storage objects if not already enabled
alter table storage.objects enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Allow authenticated users to upload resumes" on storage.objects;
drop policy if exists "Allow users to read their own resumes" on storage.objects;
drop policy if exists "Allow authenticated users to upload jobs" on storage.objects;
drop policy if exists "Allow users to read their own jobs" on storage.objects;

-- Recreate storage policies
create policy "Allow authenticated users to upload resumes"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resumes' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow users to read their own resumes"
on storage.objects for select
to authenticated
using (
  bucket_id = 'resumes'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow authenticated users to upload jobs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'jobs' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow users to read their own jobs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'jobs'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify analyses table exists with correct structure
create table if not exists public.analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  resume_url text not null,
  job_description_url text not null,
  status text not null check (status in ('pending', 'completed', 'failed')),
  results jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on analyses table
alter table public.analyses enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can view their own analyses" on public.analyses;
drop policy if exists "Users can create their own analyses" on public.analyses;
drop policy if exists "Users can update their own analyses" on public.analyses;

-- Recreate analyses policies
create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can create their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own analyses"
  on public.analyses for update
  using (auth.uid() = user_id);

-- Create or replace updated_at trigger
drop trigger if exists handle_updated_at on public.analyses;
create trigger handle_updated_at
  before update on public.analyses
  for each row
  execute function public.handle_updated_at();

-- Create or replace index for better query performance
drop index if exists idx_analyses_user_id;
create index idx_analyses_user_id 
  on public.analyses(user_id);

-- Verify the structure
do $$ 
begin
  -- Verify columns exist
  if not exists (
    select from information_schema.columns 
    where table_name = 'analyses' 
    and column_name = 'results'
  ) then
    alter table public.analyses add column results jsonb;
  end if;
end $$;

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.analyses to authenticated;
grant usage on sequence public.analyses_id_seq to authenticated;
