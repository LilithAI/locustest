
-- Restrict avatars SELECT to direct file access patterns by requiring a name path
-- (object name must contain a folder, preventing bucket-wide listing being meaningful).
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);
