-- Supabase Schema for Hovatter Study Bee

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students Table
CREATE TABLE public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    pin_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Curriculum Weeks Table
CREATE TABLE public.curriculum_weeks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL, -- e.g., "Week 3 - Ecosystems"
    start_date DATE,
    end_date DATE,
    active BOOLEAN DEFAULT false,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE, -- NULL means it applies to all students for this parent (optional)
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Study Modules Table
CREATE TABLE public.study_modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    week_id UUID REFERENCES public.curriculum_weeks(id) ON DELETE CASCADE,
    subject TEXT NOT NULL, -- e.g., 'vocab', 'spelling', 'math'
    topics_prompt TEXT, -- General instructions for the AI on topics for this module
    structure_context TEXT, -- String extracted from PDF showing the AI exactly how a question should look structurally
    exact_content JSONB, -- Hardcoded baseline questions/words if the PDF is just a list
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_modules ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies

-- Students: Only the parent who created them can select/insert/update/delete
CREATE POLICY "Parents can manage their students" 
ON public.students FOR ALL 
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

-- Students: Allow public read access (temporarily) so students can log in via username/PIN
-- In a production app, we would use a pure custom token or Edge Function, but for simplicity:
CREATE POLICY "Public can view students for login"
ON public.students FOR SELECT
TO anon
USING (true);

-- Curriculum: Parents can manage their own curriculum
CREATE POLICY "Parents can manage curriculum"
ON public.curriculum_weeks FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Curriculum: Students (anon) can read active curriculum OR curriculum assigned to them specifically
-- Note: Assuming student ID context is managed by frontend query filters for now due to anonymous generic login
CREATE POLICY "Students can read active curriculum"
ON public.curriculum_weeks FOR SELECT
TO anon
USING (active = true OR student_id IS NOT NULL);

-- Modules: Parents can manage modules
CREATE POLICY "Parents can manage modules"
ON public.study_modules FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.curriculum_weeks 
    WHERE public.curriculum_weeks.id = public.study_modules.week_id
    AND public.curriculum_weeks.created_by = auth.uid()
));

-- Modules: Students (anon) can read modules for active curriculum
CREATE POLICY "Students can read active modules"
ON public.study_modules FOR SELECT
TO anon
USING (EXISTS (
    SELECT 1 FROM public.curriculum_weeks 
    WHERE public.curriculum_weeks.id = public.study_modules.week_id
    AND public.curriculum_weeks.active = true
));
