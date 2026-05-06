
DELETE FROM public.vacancies WHERE id = '00000000-0000-0000-0000-000000000000';

UPDATE public.vacancies
  SET notified_at = NULL
  WHERE id IN (
    '52c22c2a-c906-4ccb-acf8-c7d9e031fe00',
    '2318b5e6-3152-4eb2-835f-4b91796f04b5',
    '098c7c4c-b79c-44fb-b629-921763954967'
  );
