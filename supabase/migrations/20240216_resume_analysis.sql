-- Create analyses table
create table public.analyses (
    id uuid primary key,
    user_id uuid references auth.users not null,
    file_path text not null,
    content_json jsonb not null,
    selected_suggestions integer[] default array[]::integer[],
    status text not null check (status in ('processing', 'completed', 'failed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Set up RLS policies
alter table public.analyses enable row level security;

create policy "Users can view their own analyses"
    on analyses for select
    using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
    on analyses for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own analyses"
    on analyses for update
    using (auth.uid() = user_id);

-- Create storage bucket for resumes
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true);

-- Set up storage policies
create policy "Anyone can view resumes"
    on storage.objects for select
    using (bucket_id = 'resumes');

create policy "Authenticated users can upload resumes"
    on storage.objects for insert
    with check (
        bucket_id = 'resumes' and
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

create policy "Users can update their own resumes"
    on storage.objects for update
    using (
        bucket_id = 'resumes' and
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- Create trigger for updated_at
create trigger set_updated_at
    before update on public.analyses
    for each row
    execute function public.handle_updated_at();
