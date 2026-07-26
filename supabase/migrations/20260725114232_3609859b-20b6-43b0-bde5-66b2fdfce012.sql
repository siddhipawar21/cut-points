
CREATE POLICY "audio own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'episode-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "audio own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'episode-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "audio own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'episode-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "audio own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'episode-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
