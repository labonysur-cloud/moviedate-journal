
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view individual avatars"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars' AND auth.role() IS NOT NULL OR bucket_id = 'avatars');
