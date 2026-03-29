-- ============================================================
-- Ajout de la colonne `active_device_id` pour la limitation de session
-- Date: 2026-03-29
-- ============================================================

-- Ajout de la colonne pour stocker l'identifiant unique de la session/appareil actif
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS active_device_id UUID;

-- Commentaire de la colonne
COMMENT ON COLUMN public.profiles.active_device_id IS 'Identifiant unique de la dernière session active pour empêcher les connexions simultanées multiples.';
