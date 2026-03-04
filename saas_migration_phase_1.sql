-- SAAS MULTI-TENANT ARCHITECTURE MIGRATION
-- This script creates the foundational `schools` table and injects `school_id` across the entire application.

-- 1. Create Schools Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    plan_tier TEXT NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 2. Insert Default School for existing data to prevent constraint errors
INSERT INTO public.schools (id, name, status, plan_tier) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Escola Padrão (Migração)', 'active', 'pro')
ON CONFLICT (id) DO NOTHING;

-- 3. Modify `user_role` enum to include 'super_admin' if it doesn't exist
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 4. Injetar school_id in ALL tables
-- We add it with a DEFAULT of the default school to cascade to existing rows, then drop the DEFAULT and make it NOT NULL.

DO $$
DECLARE
    t_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'financial_transactions', 'assessment_criteria', 'calendar_events', 
        'assessment_grades', 'assessments', 'enrollments', 'students', 
        'school_settings', 'event_attachments', 'teachers', 'announcements', 
        'announcement_status', 'leads', 'lead_interactions', 'course_types', 
        'attendance', 'contract_templates', 'generated_contracts', 'suppliers', 
        'evaluations', 'course_levels', 'classes', 'class_lessons'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_update
    LOOP
        EXECUTE format('
            ALTER TABLE public.%I 
            ADD COLUMN IF NOT EXISTS school_id UUID DEFAULT ''00000000-0000-0000-0000-000000000000'' REFERENCES public.schools(id) ON DELETE CASCADE;
            
            ALTER TABLE public.%I ALTER COLUMN school_id DROP DEFAULT;
            ALTER TABLE public.%I ALTER COLUMN school_id SET NOT NULL;
        ', t_name, t_name, t_name);
    END LOOP;
END $$;

-- 5. Special logic for PROFILES
-- Profiles can belong to a school, OR be NULL if they are a 'super_admin' who spans the whole platform.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Update existing profiles to belong to the default school
UPDATE public.profiles SET school_id = '00000000-0000-0000-0000-000000000000' WHERE school_id IS NULL AND role != 'super_admin';

-- Constraint: If role is not super_admin, school_id MUST NOT BE NULL
ALTER TABLE public.profiles ADD CONSTRAINT check_school_id_for_roles 
CHECK (
    (role = 'super_admin' AND school_id IS NULL) OR 
    (role != 'super_admin' AND school_id IS NOT NULL)
);

-- 6. Re-create all standard policies later. For now, just ensure RLS is enabled on all tables.
DO $$
DECLARE
    t_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'financial_transactions', 'assessment_criteria', 'calendar_events', 
        'assessment_grades', 'assessments', 'enrollments', 'students', 
        'school_settings', 'event_attachments', 'teachers', 'announcements', 
        'announcement_status', 'leads', 'lead_interactions', 'course_types', 
        'attendance', 'contract_templates', 'generated_contracts', 'suppliers', 
        'evaluations', 'course_levels', 'classes', 'class_lessons'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_update
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
    END LOOP;
END $$;
