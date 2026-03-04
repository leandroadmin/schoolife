-- Execute este script no SQL Editor do seu projeto Supabase

-- Adicionar campo de assinatura na tabela de configurações da escola
ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS school_signature_url TEXT;

-- 1. Tabela de Modelos de Contrato (Templates)
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Conteúdo em HTML/JSON do editor rich text
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Contratos Gerados para Alunos
CREATE TABLE IF NOT EXISTS public.generated_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- Título do contrato no momento da geração
    final_content TEXT NOT NULL, -- Conteúdo final com variáveis processadas
    pdf_url TEXT, -- Link para o PDF no Storage
    status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'signed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for contract_templates') THEN
        CREATE POLICY "Enable all for contract_templates" ON public.contract_templates FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for generated_contracts') THEN
        CREATE POLICY "Enable all for generated_contracts" ON public.generated_contracts FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- NOTA: Você precisará criar um bucket chamado 'contracts' no Supabase Storage
-- com acesso público de leitura para armazenar os PDFs gerados.
