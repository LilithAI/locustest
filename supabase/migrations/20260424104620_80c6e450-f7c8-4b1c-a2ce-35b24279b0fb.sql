
DROP VIEW IF EXISTS public.bar_challenges_student CASCADE;

CREATE VIEW public.bar_challenges_student
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  c.id,
  c.title,
  c.prompt,
  c.area_of_law,
  c.difficulty,
  c.question_type,
  c.points_base,
  c.source_citation,
  c.source_page,
  c.status,
  c.created_at,
  c.updated_at,
  CASE c.question_type::text
    WHEN 'mcq' THEN jsonb_build_object(
      'options', COALESCE(c.payload->'options', '[]'::jsonb)
    )
    WHEN 'issue_spotter' THEN jsonb_build_object(
      'issue_options', COALESCE(c.payload->'issue_options', '[]'::jsonb)
    )
    WHEN 'speed_round' THEN jsonb_build_object(
      'time_limit_seconds', COALESCE(c.payload->'time_limit_seconds', '60'::jsonb),
      'questions', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', q->>'id', 'prompt', q->>'prompt'))
           FROM jsonb_array_elements(COALESCE(c.payload->'questions','[]'::jsonb)) q),
        '[]'::jsonb)
    )
    WHEN 'jurisdiction' THEN jsonb_build_object(
      'options', COALESCE(c.payload->'options', '[]'::jsonb)
    )
    WHEN 'document_review' THEN jsonb_build_object(
      'document_html', COALESCE(c.payload->>'document_html', ''),
      'spans',        COALESCE(c.payload->'spans', '[]'::jsonb),
      'categories',   COALESCE(c.payload->'categories', '[]'::jsonb),
      'doc_id',       c.payload->>'doc_id',
      'doc_title',    c.payload->>'doc_title',
      'doc_subtitle', c.payload->>'doc_subtitle',
      'doc_date',     c.payload->>'doc_date'
    )
    WHEN 'brief_builder' THEN jsonb_build_object(
      'fact_pattern', COALESCE(c.payload->>'fact_pattern', ''),
      'citation',     COALESCE(c.payload->>'citation', ''),
      'matter_tag',   c.payload->>'matter_tag',
      'steps', COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'kind',   s->>'kind',
            'label',  s->>'label',
            'prompt', s->>'prompt',
            'options', COALESCE(
              (SELECT jsonb_agg(jsonb_build_object(
                'id',     o->>'id',
                'letter', o->>'letter',
                'title',  o->>'title',
                'desc',   o->>'desc',
                'meta',   o->>'meta'
              )) FROM jsonb_array_elements(COALESCE(s->'options','[]'::jsonb)) o),
              '[]'::jsonb),
            'blocks', COALESCE(
              (SELECT jsonb_agg(jsonb_build_object('id', b->>'id', 'text', b->>'text'))
                 FROM jsonb_array_elements(COALESCE(s->'blocks','[]'::jsonb)) b),
              '[]'::jsonb)
          )
        ) FROM jsonb_array_elements(COALESCE(c.payload->'steps','[]'::jsonb)) s),
        '[]'::jsonb)
    )
    WHEN 'ethics' THEN jsonb_build_object(
      'scenario',          COALESCE(c.payload->>'scenario', ''),
      'decision_options',  COALESCE(c.payload->'decision_options', '[]'::jsonb),
      'consequence_text',  COALESCE(c.payload->>'consequence_text', ''),
      'followup_options',  COALESCE(c.payload->'followup_options', '[]'::jsonb)
    )
    WHEN 'client_counseling' THEN jsonb_build_object(
      'matter',      COALESCE(c.payload->>'matter', ''),
      'client_name', c.payload->>'client_name',
      'transcript',  COALESCE(c.payload->'transcript', '[]'::jsonb),
      'decision_turns', COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'turn',    (t->>'turn')::int,
            'prompt',  t->>'prompt',
            'options', COALESCE(t->'options', '[]'::jsonb)
          )
        ) FROM jsonb_array_elements(COALESCE(c.payload->'decision_turns','[]'::jsonb)) t),
        '[]'::jsonb)
    )
    ELSE '{}'::jsonb
  END AS payload
FROM public.bar_challenges c
WHERE c.status = 'approved';

GRANT SELECT ON public.bar_challenges_student TO authenticated, anon;
