-- Semage des données initiales pour les modules Importation et Logistique
INSERT INTO public.import_produits (nom, description, code_douanier) VALUES
('Essence (PMS)', 'Premium Motor Spirit - Essence super sans plomb', '2710.12.11.00'),
('Gasoil (AGO)', 'Automotive Gas Oil - Diesel', '2710.19.21.00'),
('Kérosène (Jet A1)', 'Aviation Turbine Fuel', '2710.19.11.00'),
('Fuel Oïl', 'Fuel résiduel lourd', '2710.19.31.00')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO public.import_fournisseurs (nom, pays, contact_email, type_produit) VALUES
('VITOL SA', 'Suisse', 'trading@vitol.com', 'Hydrocarbures'),
('TRAFIGURA', 'Singapour', 'supply@trafigura.com', 'Hydrocarbures'),
('SAHARA ENERGY', 'Nigeria', 'ops@sahara-group.com', 'Hydrocarbures'),
('GLENCORE', 'Suisse', 'oil@glencore.com', 'Hydrocarbures')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO public.import_navires (nom, imo_number, pavillon, capacite_mt, statut) VALUES
('MT AFRICA ENERGY', 'IMO 9451234', 'Panama', 45000, 'en_mer'),
('MT ATLANTIC STAR', 'IMO 9283746', 'Liberia', 35000, 'au_port'),
('PETRO NAVIGATOR', 'IMO 9553123', 'Marshall Islands', 55000, 'en_mer')
ON CONFLICT (imo_number) DO NOTHING;

INSERT INTO public.logistique_depots (nom, localisation, capacite_max) VALUES
('Dépôt Kaloum (SGP)', 'Conakry', 1500000),
('Dépôt Kamsar', 'Boké', 800000),
('Dépôt Mamou', 'Mamou', 150000),
('Dépôt Kankan', 'Kankan', 120000)
ON CONFLICT (nom) DO NOTHING;
