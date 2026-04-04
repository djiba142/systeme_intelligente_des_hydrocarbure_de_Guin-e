
BEGIN;

-- Add any missing roles to the app_role ENUM safely.
DO \$\$
DECLARE
    roles text[] := ARRAY[
        'super_admin',
        'admin_etat',
        'directeur_general',
        'directeur_adjoint',
        'secretariat_direction',
        'directeur_aval',
        'directeur_adjoint_aval',
        'chef_division_distribution',
        'chef_service_aval',
        'agent_technique_aval',
        'controleur_distribution',
        'technicien_support_dsa',
        'technicien_flux',
        'inspecteur',
        'analyste',
        'service_it',
        'directeur_juridique',
        'juriste',
        'charge_conformite',
        'assistant_juridique',
        'directeur_importation',
        'agent_importation',
        'directeur_administratif',
        'chef_service_administratif',
        'gestionnaire_documentaire',
        'directeur_logistique',
        'agent_logistique',
        'responsable_depots',
        'responsable_transport',
        'operateur_logistique',
        'technicien_aval',
        'responsable_entreprise',
        'gestionnaire_station'
    ];
    r text;
BEGIN
    FOR r IN SELECT unnest(roles) LOOP
        BEGIN
            EXECUTE 'ALTER TYPE app_role ADD VALUE IF NOT EXISTS ''' || r || '''';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
    END LOOP;
END \$\$;

COMMIT;

