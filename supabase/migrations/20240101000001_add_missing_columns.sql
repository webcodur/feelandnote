-- Add missing columns to contents table
ALTER TABLE public.contents 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS publisher text,
ADD COLUMN IF NOT EXISTS release_date text;
