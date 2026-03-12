-- Run this in the Supabase SQL Editor to update your tables safely without deleting data:

ALTER TABLE public.curriculum_weeks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.curriculum_weeks ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE public.study_modules ADD COLUMN IF NOT EXISTS topics_prompt TEXT;
ALTER TABLE public.study_modules ADD COLUMN IF NOT EXISTS structure_context TEXT;
ALTER TABLE public.study_modules ADD COLUMN IF NOT EXISTS exact_content JSONB;
