-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela de Avaliações
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'bimonthly', 'yearly')),
    assessment_date DATE NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Critérios de Avaliação
CREATE TABLE IF NOT EXISTS public.assessment_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Notas
CREATE TABLE IF NOT EXISTS public.assessment_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    criteria_id UUID NOT NULL REFERENCES public.assessment_criteria(id) ON DELETE CASCADE,
    grade NUMERIC(4,2) NOT NULL CHECK (grade >= 0 AND grade <= 10),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id, criteria_id)
);

-- Habilitar RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_grades ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público (para o demo)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for assessments') THEN
        CREATE POLICY "Enable all for assessments" ON public.assessments FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for assessment_criteria') THEN
        CREATE POLICY "Enable all for assessment_criteria" ON public.assessment_criteria FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for assessment_grades') THEN
        CREATE POLICY "Enable all for assessment_grades" ON public.assessment_grades FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
