-- Run this in the Supabase SQL Editor to update your tables safely without deleting data:

ALTER TABLE public.curriculum_weeks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.curriculum_weeks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.curriculum_weeks ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.study_modules ADD COLUMN IF NOT EXISTS topics_prompt TEXT;
ALTER TABLE public.study_modules ADD COLUMN IF NOT EXISTS structure_context TEXT;
ALTER TABLE public.study_modules ADD COLUMN IF NOT EXISTS exact_content JSONB;

-- Update RLS Policy to allow students to see their assigned curriculum
DROP POLICY IF EXISTS "Students can read active curriculum" ON public.curriculum_weeks;
CREATE POLICY "Students can read active curriculum"
ON public.curriculum_weeks FOR SELECT
TO anon
USING (active = true OR student_id IS NOT NULL);
