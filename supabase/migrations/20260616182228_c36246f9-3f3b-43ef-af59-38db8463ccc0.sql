
CREATE POLICY "Authenticated can read mercado-anexos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mercado-anexos');

CREATE POLICY "Authenticated can upload mercado-anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mercado-anexos');

CREATE POLICY "Authenticated can update mercado-anexos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mercado-anexos')
WITH CHECK (bucket_id = 'mercado-anexos');

CREATE POLICY "Authenticated can delete mercado-anexos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mercado-anexos');
