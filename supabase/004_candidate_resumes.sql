-- Run this in Supabase Dashboard -> SQL Editor for databases created before resume uploads.

alter table public.candidates
  add column if not exists resume_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-resumes',
  'candidate-resumes',
  false,
  2097152,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/rtf',
    'text/plain',
    'application/vnd.oasis.opendocument.text'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
