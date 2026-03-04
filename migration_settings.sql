-- Create school_settings table
CREATE TABLE IF NOT EXISTS school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'Minha Escola SaaS',
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    facebook TEXT,
    instagram TEXT,
    operating_hours TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#10b981',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert initial settings
INSERT INTO school_settings (name) 
SELECT 'Minha Escola' WHERE NOT EXISTS (SELECT 1 FROM school_settings);

-- Create course_types table
CREATE TABLE IF NOT EXISTS course_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create course_levels table
CREATE TABLE IF NOT EXISTS course_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_levels ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for demo: anyone can read/write)
CREATE POLICY "Allow public read settings" ON school_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update settings" ON school_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public all courses" ON course_types FOR ALL USING (true);
CREATE POLICY "Allow public all levels" ON course_levels FOR ALL USING (true);
