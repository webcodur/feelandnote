-- Create a new storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Policy: Avatar images are publicly accessible
create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

-- Policy: Anyone can upload an avatar (authenticated)
create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Policy: Users can update their own avatar
create policy "Users can update their own avatar." on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() = owner)
  with check (bucket_id = 'avatars' and auth.uid() = owner);

-- Policy: Users can delete their own avatar
create policy "Users can delete their own avatar." on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid() = owner);
