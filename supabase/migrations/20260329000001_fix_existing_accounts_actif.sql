-- ============================================================
-- MIGRATION CORRECTIVE : Activer les comptes existants
-- Date: 2026-03-29
-- 
-- La migration précédente a mis tous les profils en 'inactif'
-- car DEFAULT 'inactif' s'applique aux lignes existantes lors
-- d'un ALTER TABLE ADD COLUMN sur PostgreSQL.
-- 
-- On active tous les comptes EXISTANTS (créés avant l'ajout
-- de la colonne). Seuls les NOUVEAUX comptes (via createUser)
-- seront créés avec statut 'inactif' explicitement.
-- ============================================================

UPDATE public.profiles
SET statut = 'actif'
WHERE statut = 'inactif'
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Vérification (optionnel pour debug - ne retourne rien si tout va bien)
-- SELECT COUNT(*) FROM public.profiles WHERE statut = 'inactif';
