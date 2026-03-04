-- Migration for Leads CRM Module

-- 1. Create lead_interactions table
CREATE TABLE IF NOT EXISTS public.lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'note', -- 'note', 'status_change', 'conversion'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add new columns to leads table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'loss_reason') THEN
        ALTER TABLE public.leads ADD COLUMN loss_reason TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'converted_at') THEN
        ALTER TABLE public.leads ADD COLUMN converted_at TIMESTAMPTZ;
    END IF;

    -- Ensure status has expected values
    -- Note: If status column already exists, we might need to handle existing data
    -- For this implementation, we will assume standard status updates via UI
END $$;

-- 3. Enable RLS
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for leads on lead_interactions') THEN
        CREATE POLICY "Enable all for leads on lead_interactions" ON public.lead_interactions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
