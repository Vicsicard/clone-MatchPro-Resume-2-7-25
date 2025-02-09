-- Create storage buckets if they don't exist
insert into storage.buckets (id, name)
values ('resumes', 'resumes')
on conflict (id) do nothing;

insert into storage.buckets (id, name)
values ('jobs', 'jobs')
on conflict (id) do nothing;

-- Enable RLS on buckets
create policy "Allow authenticated users to upload resumes"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resumes' 
  and auth.role() = 'authenticated'
);

create policy "Allow authenticated users to upload jobs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'jobs' 
  and auth.role() = 'authenticated'
);

-- Create analyses table
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

-- Create policies for analyses table
create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can create their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_updated_at
  before update on public.analyses
  for each row
  execute function public.handle_updated_at();

-- Create index for better query performance
create index if not exists idx_analyses_user_id 
  on public.analyses(user_id);
