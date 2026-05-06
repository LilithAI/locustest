-- Beta testers table
CREATE TABLE public.beta_testers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_number INTEGER NOT NULL UNIQUE CHECK (slot_number BETWEEN 1 AND 7),
  display_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  personal_note TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  feedback_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + auth) can look up a tester by code — needed to personalize /beta?code=...
CREATE POLICY "Anyone can read beta testers"
ON public.beta_testers FOR SELECT
USING (true);

-- Anyone can mark a tester as submitted (one-time only — guarded by WITH CHECK)
CREATE POLICY "Anyone can mark tester submitted"
ON public.beta_testers FOR UPDATE
USING (submitted_at IS NULL)
WITH CHECK (submitted_at IS NOT NULL);

-- Admins full control
CREATE POLICY "Admins manage beta testers"
ON public.beta_testers FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add tester linkage to feedback (optional, nullable to keep public form working)
ALTER TABLE public.beta_feedback
  ADD COLUMN IF NOT EXISTS tester_id UUID REFERENCES public.beta_testers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tester_code TEXT;

-- Seed the 7 testers
INSERT INTO public.beta_testers (slot_number, display_name, code) VALUES
  (1, 'Abhishek Rana',         'ABHISHEK-7K2X'),
  (2, 'Aditi Sharma',          'ADITI-9M4P'),
  (3, 'Anam',                  'ANAM-3R8L'),
  (4, 'Asmi',                  'ASMI-5J6Q'),
  (5, 'Khushbu Bhagchandani',  'KHUSHBU-2N9V'),
  (6, 'Reshad',                'RESHAD-8H4D'),
  (7, 'Indrajeet Singh',       'INDRAJEET-1F7Z');