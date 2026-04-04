-- ====================================================================
-- MASTER CLEANUP: FINAL BRIDGE BETWEEN FRONTEND TYPES & NEW SCHEMA
-- Author: SIHG Recovery Agent
-- Date: 2026-03-23
-- ====================================================================

-- 0. PRE-REQUISITE: Remove legacy table/view conflict
DROP VIEW IF EXISTS public.dossiers CASCADE;
DROP TABLE IF EXISTS public.dossiers CASCADE;
DROP VIEW IF EXISTS public.importations CASCADE;
DROP TABLE IF EXISTS public.importations CASCADE;

-- 1. VIEW 'importations': Bridges the gap for dashboards and reports
-- Join logic based on import_cargaisons (actual movements) 
-- and import_dossiers (administrative reference)
CREATE OR REPLACE VIEW public.importations AS
SELECT 
    c.id,
    n.nom as navire_nom,
    p.nom as carburant,
    c.quantite_reelle as quantite_tonnes,
    c.statut,
    c.created_at,
    c.created_at as updated_at,
    d.numero_dossier as notes,
    null::date as date_depart,
    null::date as date_arrivee_prevue,
    null::date as date_arrivee_effective,
    null::text as port_origine,
    d.created_by
FROM public.import_cargaisons c
LEFT JOIN public.import_navires n ON c.navire_id = n.id
LEFT JOIN public.import_dossiers d ON c.dossier_id = d.id
LEFT JOIN public.import_produits p ON d.produit_id = p.id;

-- 2. VIEW 'dossiers': Maps 'dossiers_entreprise' to the flat structure in types.ts
-- Dynamically pulls document URLs from the 'dossier_documents' child table
CREATE OR REPLACE VIEW public.dossiers AS
SELECT 
    d.id,
    d.numero_dossier,
    'nouvelle_demande' as type_demande, -- Fallback
    d.entreprise_id as entite_id,
    'entreprise' as entite_type,
    e.nom as entite_nom,
    d.statut::text as statut,
    'normale' as priorite,
    d.description as observations,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object('nom', nom_document, 'url', url_pdf))
        FROM public.dossier_documents 
        WHERE dossier_id = d.id
    ), '[]'::jsonb) as pieces_jointes,
    null::text as qr_code_url,
    d.created_at as date_soumission,
    d.updated_at,
    null::uuid as valide_par_dsa,
    null::uuid as valide_par_da,
    null::uuid as valide_par_djc,
    null::uuid as valide_par_dsi,
    null::uuid as valide_par_dg,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'registre_commerce' LIMIT 1) as rccm_url,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'nif' LIMIT 1) as nif_url,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'statuts' LIMIT 1) as statuts_url,
    (SELECT url_pdf FROM public.dossier_documents WHERE dossier_id = d.id AND type_document = 'demande_signee' LIMIT 1) as autorisation_url
FROM public.dossiers_entreprise d
LEFT JOIN public.entreprises e ON d.entreprise_id = e.id;

-- 3. PERMISSIONS: Ensure frontend can query these views
GRANT SELECT ON public.importations TO authenticated;
GRANT SELECT ON public.dossiers TO authenticated;

DO $$ 
BEGIN 
    RAISE NOTICE 'Compatibility views for importations and dossiers finalized successfully.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
