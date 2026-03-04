-- Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    homework TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    event_type TEXT NOT NULL CHECK (event_type IN ('class', 'exam', 'meeting', 'holiday', 'general')),
    color TEXT DEFAULT '#3b82f6',
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on calendar_events" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.calendar_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.calendar_events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.calendar_events FOR DELETE USING (auth.role() = 'authenticated');

-- Event Attachments Table
CREATE TABLE IF NOT EXISTS public.event_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on event_attachments" ON public.event_attachments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.event_attachments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.event_attachments FOR DELETE USING (auth.role() = 'authenticated');

-- Storage Bucket (You may need to run this part in the Storage UI or SQL Editor)
INSERT INTO storage.buckets (id, name, public) VALUES ('calendar_attachments', 'calendar_attachments', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Calendar Public Access" ON storage.objects;
CREATE POLICY "Calendar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'calendar_attachments');

DROP POLICY IF EXISTS "Calendar Authenticated users can upload" ON storage.objects;
CREATE POLICY "Calendar Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'calendar_attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Calendar Authenticated users can delete" ON storage.objects;
CREATE POLICY "Calendar Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = 'calendar_attachments' AND auth.role() = 'authenticated');
