GRANT INSERT ON public.beta_feedback_round2 TO anon, authenticated;
GRANT SELECT, DELETE ON public.beta_feedback_round2 TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;