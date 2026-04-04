-- 1. Add document_url to dossiers and regulation tables if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'document_url') THEN
        ALTER TABLE dossiers ADD COLUMN document_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regulation_quotas' AND column_name = 'document_url') THEN
        ALTER TABLE regulation_quotas ADD COLUMN document_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regulation_agrements' AND column_name = 'document_url') THEN
        ALTER TABLE regulation_agrements ADD COLUMN document_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regulation_licences' AND column_name = 'document_url') THEN
        ALTER TABLE regulation_licences ADD COLUMN document_url TEXT;
    END IF;
END $$;

-- 2. Create Storage Bucket for Dossiers (if not exists via Dashboard, usually easier via SQL)
-- Note: Supabase Storage configuration via SQL is slightly different depending on the version, 
-- but we can insert into storage.buckets.
INSERT INTO storage.buckets (id, name, public)
SELECT 'dossiers', 'dossiers', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'dossiers');

-- 3. Set up RLS for Storage (simplified for this context)
-- Allow all authenticated users to upload and read from the dossiers bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'dossiers');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dossiers' AND auth.role() = 'authenticated');
