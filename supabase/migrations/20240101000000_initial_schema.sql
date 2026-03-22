-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create work_logs table
create table public.work_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Each user can have only one work log per date
  unique(user_id, date)
);

-- Enable Row Level Security
alter table public.work_logs enable row level security;

-- Create policies
-- Users can view their own work logs
create policy "Users can view own work logs"
  on public.work_logs for select
  using (auth.uid() = user_id);

-- Users can insert their own work logs
create policy "Users can insert own work logs"
  on public.work_logs for insert
  with check (auth.uid() = user_id);

-- Users can update their own work logs
create policy "Users can update own work logs"
  on public.work_logs for update
  using (auth.uid() = user_id);

-- Users can delete their own work logs
create policy "Users can delete own work logs"
  on public.work_logs for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index work_logs_user_id_idx on public.work_logs(user_id);
create index work_logs_date_idx on public.work_logs(date);
create index work_logs_user_id_date_idx on public.work_logs(user_id, date);

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger set_updated_at
  before update on public.work_logs
  for each row
  execute function public.handle_updated_at();
