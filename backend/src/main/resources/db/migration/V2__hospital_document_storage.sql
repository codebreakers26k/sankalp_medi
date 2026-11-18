-- The Java backend is the only writer to this bucket. Its server-side Supabase
-- secret/service-role key bypasses storage RLS, so no anonymous upload policy is needed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'hospital-documents',
    'hospital-documents',
    true,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
