-- Migration: Add expiry dates to announcements
-- Description: Adds start_date and end_date to control when announcements are visible to students and teachers.

ALTER TABLE public.announcements 
ADD COLUMN start_date timestamp with time zone,
ADD COLUMN end_date timestamp with time zone;

-- Optional: Update existing announcements to be visible indefinitely or set a default start date
UPDATE public.announcements 
SET start_date = created_at, 
    end_date = created_at + interval '30 days'
WHERE start_date IS NULL;
