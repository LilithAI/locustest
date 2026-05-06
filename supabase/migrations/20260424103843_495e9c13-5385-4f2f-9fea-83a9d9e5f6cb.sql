DROP VIEW IF EXISTS public.bar_challenges_student;

CREATE VIEW public.bar_challenges_student AS
SELECT
  id,
  source_id,
  source_page,
  source_citation,
  question_type,
  area_of_law,
  difficulty,
  title,
  prompt,
  explanation,
  status,
  points_base,
  created_by,
  approved_by,
  approved_at,
  created_at,
  updated_at,
  ai_generation_id,
  CASE question_type
    WHEN 'mcq'::bar_question_type THEN
      jsonb_build_object('options', payload->'options')
    WHEN 'issue_spotter'::bar_question_type THEN
      jsonb_build_object('issue_options', payload->'issue_options')
    WHEN 'speed_round'::bar_question_type THEN
      jsonb_build_object(
        'time_limit_seconds', payload->'time_limit_seconds',
        'questions', COALESCE(
          (SELECT jsonb_agg(jsonb_build_object('id', q.value->'id', 'prompt', q.value->'prompt'))
           FROM jsonb_array_elements(payload->'questions') q),
          '[]'::jsonb
        )
      )
    WHEN 'jurisdiction'::bar_question_type THEN
      jsonb_build_object('options', payload->'options')
    WHEN 'document_review'::bar_question_type THEN
      jsonb_build_object(
        'document_html', payload->'document_html',
        'spans', COALESCE(payload->'spans', '[]'::jsonb),
        'categories', COALESCE(payload->'categories', '[]'::jsonb)
      )
    WHEN 'brief_builder'::bar_question_type THEN
      jsonb_build_object(
        'fact_pattern', payload->'fact_pattern',
        'citation', COALESCE(payload->'citation', '""'::jsonb),
        'steps', COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'kind', s.value->'kind',
              'label', s.value->'label',
              'prompt', s.value->'prompt',
              'options', COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                  'id', o.value->'id',
                  'letter', o.value->'letter',
                  'title', o.value->'title',
                  'desc', COALESCE(o.value->'desc', '""'::jsonb),
                  'meta', COALESCE(o.value->'meta', '""'::jsonb)
                ))
                 FROM jsonb_array_elements(COALESCE(s.value->'options', '[]'::jsonb)) o),
                '[]'::jsonb
              ),
              'blocks', COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('id', b.value->'id', 'text', b.value->'text'))
                 FROM jsonb_array_elements(COALESCE(s.value->'blocks', '[]'::jsonb)) b),
                '[]'::jsonb
              )
            )
          )
           FROM jsonb_array_elements(COALESCE(payload->'steps', '[]'::jsonb)) s),
          '[]'::jsonb
        )
      )
    WHEN 'ethics'::bar_question_type THEN
      jsonb_build_object(
        'scenario', payload->'scenario',
        'decision_options', COALESCE(payload->'decision_options', '[]'::jsonb),
        'consequence_text', payload->'consequence_text',
        'followup_options', COALESCE(payload->'followup_options', '[]'::jsonb)
      )
    WHEN 'client_counseling'::bar_question_type THEN
      jsonb_build_object(
        'matter', payload->'matter',
        'transcript', COALESCE(payload->'transcript', '[]'::jsonb),
        'decision_turns', COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'turn', t.value->'turn',
              'prompt', t.value->'prompt',
              'options', COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                  'id', o.value->'id',
                  'letter', o.value->'letter',
                  'text', o.value->'text'
                ))
                 FROM jsonb_array_elements(COALESCE(t.value->'options', '[]'::jsonb)) o),
                '[]'::jsonb
              )
            )
          )
           FROM jsonb_array_elements(COALESCE(payload->'decision_turns', '[]'::jsonb)) t),
          '[]'::jsonb
        )
      )
    ELSE '{}'::jsonb
  END AS payload
FROM bar_challenges
WHERE status = 'approved';

GRANT SELECT ON public.bar_challenges_student TO authenticated, anon;