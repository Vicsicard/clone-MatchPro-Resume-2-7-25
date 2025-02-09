create table if not exists public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subscription_type text not null check (subscription_type in ('trial', 'paid', 'free')),
  trial_end timestamp with time zone,
  subscription_end timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create RLS policies
alter table public.user_subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update their own subscription"
  on public.user_subscriptions for update
  using (auth.uid() = user_id);

-- Add insert policy
create policy "Users can create their own subscription"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id);

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger handle_updated_at
  before update on public.user_subscriptions
  for each row
  execute procedure public.handle_updated_at();
