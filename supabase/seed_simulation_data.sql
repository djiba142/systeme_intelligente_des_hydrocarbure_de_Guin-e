-- ============================================
-- SIHG - Données fictives de simulation
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- ────────────────────────────────────────────
-- 1. ENTREPRISES (5 distributeurs)
-- ────────────────────────────────────────────
INSERT INTO public.entreprises (id, nom, sigle, type, numero_agrement, region, statut, contact_nom, contact_telephone, contact_email)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'TotalEnergies Guinée', 'TOTAL', 'compagnie', 'AGR-2024-001', 'Conakry', 'actif', 'Mamadou Diallo', '+224 622 11 22 33', 'contact@total-guinee.gn'),
  ('e1000000-0000-0000-0000-000000000002', 'Vivo Energy Guinée (Shell)', 'SHELL', 'compagnie', 'AGR-2024-002', 'Conakry', 'actif', 'Aissatou Barry', '+224 623 44 55 66', 'contact@shell-guinee.gn'),
  ('e1000000-0000-0000-0000-000000000003', 'TMI Énergie', 'TMI', 'distributeur', 'AGR-2024-003', 'Kindia', 'actif', 'Ibrahim Camara', '+224 624 77 88 99', 'contact@tmi-guinee.gn'),
  ('e1000000-0000-0000-0000-000000000004', 'Kamsar Petroleum', 'KP', 'distributeur', 'AGR-2024-004', 'Boké', 'actif', 'Ousmane Bah', '+224 625 00 11 22', 'contact@kamsar-petroleum.gn'),
  ('e1000000-0000-0000-0000-000000000005', 'Star Oil Guinea', 'SOG', 'distributeur', 'AGR-2024-005', 'Labé', 'actif', 'Fatoumata Sylla', '+224 626 33 44 55', 'contact@staroil-guinee.gn')
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  sigle = EXCLUDED.sigle,
  type = EXCLUDED.type,
  region = EXCLUDED.region,
  statut = EXCLUDED.statut,
  contact_nom = EXCLUDED.contact_nom,
  contact_telephone = EXCLUDED.contact_telephone,
  contact_email = EXCLUDED.contact_email;

-- ────────────────────────────────────────────
-- 2. STATIONS (20 stations réparties)
-- ────────────────────────────────────────────
INSERT INTO public.stations (id, code, nom, entreprise_id, adresse, ville, region, type, statut, nombre_pompes,
  stock_essence, stock_gasoil, stock_gpl, stock_lubrifiants,
  capacite_essence, capacite_gasoil, capacite_gpl, capacite_lubrifiants,
  latitude, longitude, gestionnaire_nom, gestionnaire_email, gestionnaire_telephone)
VALUES
  -- TotalEnergies (5 stations)
  ('s1000000-0000-0000-0000-000000000001', 'TOTAL-CKY-001', 'Total Hamdallaye', 'e1000000-0000-0000-0000-000000000001',
   'Carrefour Hamdallaye', 'Conakry', 'Conakry', 'urbaine', 'active', 6,
   45000, 38000, 2500, 800, 80000, 60000, 5000, 2000,
   9.5370, -13.6785, 'Amadou Sow', 'a.sow@total-gn.com', '+224 620 00 01'),

  ('s1000000-0000-0000-0000-000000000002', 'TOTAL-CKY-002', 'Total Kaloum', 'e1000000-0000-0000-0000-000000000001',
   'Boulevard du Commerce', 'Conakry', 'Conakry', 'urbaine', 'active', 4,
   32000, 28000, 1800, 600, 60000, 50000, 4000, 1500,
   9.5091, -13.7122, 'Mariama Balde', 'm.balde@total-gn.com', '+224 620 00 02'),

  ('s1000000-0000-0000-0000-000000000003', 'TOTAL-KND-001', 'Total Kindia Centre', 'e1000000-0000-0000-0000-000000000001',
   'Route Nationale 1', 'Kindia', 'Kindia', 'urbaine', 'active', 4,
   22000, 18000, 1200, 400, 50000, 40000, 3000, 1000,
   10.0603, -12.8658, 'Sékou Touré', 's.toure@total-gn.com', '+224 620 00 03'),

  ('s1000000-0000-0000-0000-000000000004', 'TOTAL-LAB-001', 'Total Labé', 'e1000000-0000-0000-0000-000000000001',
   'Avenue principale', 'Labé', 'Labé', 'urbaine', 'active', 3,
   15000, 12000, 800, 300, 40000, 35000, 2000, 800,
   11.3181, -12.2859, 'Alpha Bah', 'a.bah@total-gn.com', '+224 620 00 04'),

  ('s1000000-0000-0000-0000-000000000005', 'TOTAL-NZE-001', 'Total Nzérékoré', 'e1000000-0000-0000-0000-000000000001',
   'Centre-ville', 'Nzérékoré', 'Nzérékoré', 'urbaine', 'active', 3,
   8000, 6000, 500, 200, 35000, 30000, 2000, 500,
   7.7560, -8.8180, 'Fanta Keita', 'f.keita@total-gn.com', '+224 620 00 05'),

  -- Shell / Vivo (4 stations)
  ('s1000000-0000-0000-0000-000000000006', 'SHELL-CKY-001', 'Shell Coléah', 'e1000000-0000-0000-0000-000000000002',
   'Carrefour Coléah', 'Conakry', 'Conakry', 'urbaine', 'active', 5,
   50000, 42000, 3000, 900, 80000, 65000, 6000, 2000,
   9.5352, -13.6512, 'Boubacar Diallo', 'b.diallo@shell-gn.com', '+224 621 00 01'),

  ('s1000000-0000-0000-0000-000000000007', 'SHELL-CKY-002', 'Shell Matam', 'e1000000-0000-0000-0000-000000000002',
   'Route de Matam', 'Conakry', 'Conakry', 'urbaine', 'active', 4,
   35000, 30000, 2000, 700, 70000, 55000, 5000, 1500,
   9.5150, -13.6300, 'Kadiatou Sow', 'k.sow@shell-gn.com', '+224 621 00 02'),

  ('s1000000-0000-0000-0000-000000000008', 'SHELL-MAM-001', 'Shell Mamou', 'e1000000-0000-0000-0000-000000000002',
   'Route nationale', 'Mamou', 'Mamou', 'semi_urbaine', 'active', 3,
   18000, 15000, 1000, 400, 45000, 40000, 3000, 1000,
   10.3756, -12.0863, 'Thierno Barry', 't.barry@shell-gn.com', '+224 621 00 03'),

  ('s1000000-0000-0000-0000-000000000009', 'SHELL-KAN-001', 'Shell Kankan', 'e1000000-0000-0000-0000-000000000002',
   'Boulevard central', 'Kankan', 'Kankan', 'urbaine', 'active', 3,
   12000, 10000, 600, 250, 40000, 35000, 2500, 800,
   10.3855, -9.3055, 'Moussa Condé', 'm.conde@shell-gn.com', '+224 621 00 04'),

  -- TMI (4 stations)
  ('s1000000-0000-0000-0000-000000000010', 'TMI-CKY-001', 'TMI Ratoma', 'e1000000-0000-0000-0000-000000000003',
   'Carrefour Ratoma', 'Conakry', 'Conakry', 'urbaine', 'active', 4,
   28000, 24000, 1500, 500, 55000, 45000, 4000, 1200,
   9.5800, -13.6200, 'Lansana Kouyaté', 'l.kouyate@tmi.gn', '+224 622 00 01'),

  ('s1000000-0000-0000-0000-000000000011', 'TMI-CKY-002', 'TMI Dixinn', 'e1000000-0000-0000-0000-000000000003',
   'Corniche de Dixinn', 'Conakry', 'Conakry', 'urbaine', 'active', 3,
   20000, 17000, 1000, 350, 50000, 40000, 3000, 1000,
   9.5400, -13.6800, 'Aïssatou Camara', 'a.camara@tmi.gn', '+224 622 00 02'),

  ('s1000000-0000-0000-0000-000000000012', 'TMI-KND-001', 'TMI Kindia Nord', 'e1000000-0000-0000-0000-000000000003',
   'Sortie nord', 'Kindia', 'Kindia', 'semi_urbaine', 'active', 3,
   16000, 13000, 800, 300, 40000, 35000, 2500, 800,
   10.0700, -12.8500, 'Mohamed Sylla', 'm.sylla@tmi.gn', '+224 622 00 03'),

  ('s1000000-0000-0000-0000-000000000013', 'TMI-FAR-001', 'TMI Faranah', 'e1000000-0000-0000-0000-000000000003',
   'Centre', 'Faranah', 'Faranah', 'urbaine', 'active', 2,
   5000, 4000, 300, 150, 30000, 25000, 1500, 500,
   10.0350, -10.7400, 'Ibrahima Diallo', 'i.diallo@tmi.gn', '+224 622 00 04'),

  -- Kamsar Petroleum (4 stations)
  ('s1000000-0000-0000-0000-000000000014', 'KP-BOK-001', 'KP Boké Centre', 'e1000000-0000-0000-0000-000000000004',
   'Avenue principale', 'Boké', 'Boké', 'urbaine', 'active', 4,
   25000, 22000, 1500, 500, 50000, 45000, 4000, 1200,
   10.9345, -14.2910, 'Abdoulaye Bah', 'a.bah@kp.gn', '+224 623 00 01'),

  ('s1000000-0000-0000-0000-000000000015', 'KP-KAM-001', 'KP Kamsar Port', 'e1000000-0000-0000-0000-000000000004',
   'Zone portuaire', 'Kamsar', 'Boké', 'portuaire', 'active', 5,
   40000, 35000, 2000, 800, 70000, 60000, 5000, 2000,
   10.6540, -14.6100, 'Oumar Sow', 'o.sow@kp.gn', '+224 623 00 02'),

  ('s1000000-0000-0000-0000-000000000016', 'KP-CKY-001', 'KP Conakry Sud', 'e1000000-0000-0000-0000-000000000004',
   'Route du Prince', 'Conakry', 'Conakry', 'urbaine', 'active', 3,
   18000, 15000, 1000, 400, 45000, 40000, 3000, 1000,
   9.5100, -13.7000, 'Mamady Kourouma', 'm.kourouma@kp.gn', '+224 623 00 03'),

  ('s1000000-0000-0000-0000-000000000017', 'KP-BOK-002', 'KP Sangarédi', 'e1000000-0000-0000-0000-000000000004',
   'Route minière', 'Sangarédi', 'Boké', 'rurale', 'active', 2,
   10000, 8000, 500, 200, 30000, 25000, 2000, 600,
   11.0833, -13.8000, 'Moussa Diallo', 'mu.diallo@kp.gn', '+224 623 00 04'),

  -- Star Oil Guinea (3 stations)
  ('s1000000-0000-0000-0000-000000000018', 'SOG-LAB-001', 'Star Oil Labé', 'e1000000-0000-0000-0000-000000000005',
   'Rond-point central', 'Labé', 'Labé', 'urbaine', 'active', 3,
   20000, 17000, 1200, 400, 45000, 40000, 3000, 1000,
   11.3200, -12.2800, 'Daouda Diallo', 'd.diallo@staroil.gn', '+224 624 00 01'),

  ('s1000000-0000-0000-0000-000000000019', 'SOG-DAL-001', 'Star Oil Dalaba', 'e1000000-0000-0000-0000-000000000005',
   'Route principale', 'Dalaba', 'Mamou', 'semi_urbaine', 'active', 2,
   12000, 10000, 600, 250, 35000, 30000, 2000, 700,
   10.6940, -12.2500, 'Salimatou Bah', 's.bah@staroil.gn', '+224 624 00 02'),

  ('s1000000-0000-0000-0000-000000000020', 'SOG-PIT-001', 'Star Oil Pita', 'e1000000-0000-0000-0000-000000000005',
   'Centre-ville', 'Pita', 'Mamou', 'semi_urbaine', 'maintenance', 2,
   3000, 2000, 200, 100, 30000, 25000, 1500, 500,
   11.0730, -12.3900, 'Younoussa Barry', 'y.barry@staroil.gn', '+224 624 00 03')

ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  stock_essence = EXCLUDED.stock_essence,
  stock_gasoil = EXCLUDED.stock_gasoil,
  stock_gpl = EXCLUDED.stock_gpl,
  stock_lubrifiants = EXCLUDED.stock_lubrifiants,
  statut = EXCLUDED.statut,
  gestionnaire_nom = EXCLUDED.gestionnaire_nom;

-- ────────────────────────────────────────────
-- 3. ALERTES (15 alertes variées)
-- ────────────────────────────────────────────
INSERT INTO public.alertes (id, type, niveau, message, station_id, entreprise_id, resolu, created_at)
VALUES
  -- Critiques (stocks très bas)
  ('a1000000-0000-0000-0000-000000000001', 'Stock Critique', 'critique',
   'Stock essence en dessous de 10% - Risque de rupture imminent',
   's1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', false, NOW() - INTERVAL '2 hours'),

  ('a1000000-0000-0000-0000-000000000002', 'Rupture de Stock', 'critique',
   'Rupture GPL confirmée - Station fermée temporairement',
   's1000000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000003', false, NOW() - INTERVAL '6 hours'),

  ('a1000000-0000-0000-0000-000000000003', 'Stock Critique', 'critique',
   'Stock gasoil inférieur à 8% de la capacité',
   's1000000-0000-0000-0000-000000000020', 'e1000000-0000-0000-0000-000000000005', false, NOW() - INTERVAL '1 day'),

  -- Alertes (seuils d'alerte)
  ('a1000000-0000-0000-0000-000000000004', 'Seuil Alerte', 'alerte',
   'Stock essence atteint 25% - Commande recommandée',
   's1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000002', false, NOW() - INTERVAL '12 hours'),

  ('a1000000-0000-0000-0000-000000000005', 'Seuil Alerte', 'alerte',
   'Stock gasoil à 22% - Livraison planifiée demain',
   's1000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000003', false, NOW() - INTERVAL '1 day'),

  ('a1000000-0000-0000-0000-000000000006', 'Consommation Anormale', 'alerte',
   'Consommation essence +45% par rapport à la moyenne - Vérification requise',
   's1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', false, NOW() - INTERVAL '2 days'),

  ('a1000000-0000-0000-0000-000000000007', 'Seuil Alerte', 'alerte',
   'Stock lubrifiants à 20% - Réapprovisionnement nécessaire',
   's1000000-0000-0000-0000-000000000015', 'e1000000-0000-0000-0000-000000000004', false, NOW() - INTERVAL '3 days'),

  -- Info (maintenances, fermetures planifiées)
  ('a1000000-0000-0000-0000-000000000008', 'Maintenance', 'info',
   'Maintenance préventive planifiée pour le 25/02/2026',
   's1000000-0000-0000-0000-000000000020', 'e1000000-0000-0000-0000-000000000005', false, NOW() - INTERVAL '1 day'),

  ('a1000000-0000-0000-0000-000000000009', 'Livraison Reçue', 'info',
   'Livraison de 15000L essence reçue et vérifiée',
   's1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000002', true, NOW() - INTERVAL '3 days'),

  ('a1000000-0000-0000-0000-000000000010', 'Prix Conforme', 'info',
   'Vérification des prix terminée - Conformité 100%',
   's1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000003', true, NOW() - INTERVAL '5 days'),

  -- Alertes résolues
  ('a1000000-0000-0000-0000-000000000011', 'Stock Critique', 'critique',
   'Stock essence était à 5% - Livraison urgente effectuée',
   's1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', true, NOW() - INTERVAL '7 days'),

  ('a1000000-0000-0000-0000-000000000012', 'Seuil Alerte', 'alerte',
   'Stock gasoil était à 18% - Réapprovisionné',
   's1000000-0000-0000-0000-000000000014', 'e1000000-0000-0000-0000-000000000004', true, NOW() - INTERVAL '10 days'),

  ('a1000000-0000-0000-0000-000000000013', 'Consommation Anormale', 'alerte',
   'Pic de consommation détecté pendant les fêtes - Normal',
   's1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000002', true, NOW() - INTERVAL '14 days'),

  ('a1000000-0000-0000-0000-000000000014', 'Maintenance', 'info',
   'Maintenance des pompes terminée avec succès',
   's1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000003', true, NOW() - INTERVAL '20 days'),

  ('a1000000-0000-0000-0000-000000000015', 'Stock Critique', 'critique',
   'Stock GPL épuisé - Livraison d urgence en cours',
   's1000000-0000-0000-0000-000000000017', 'e1000000-0000-0000-0000-000000000004', true, NOW() - INTERVAL '25 days')

ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  niveau = EXCLUDED.niveau,
  message = EXCLUDED.message,
  resolu = EXCLUDED.resolu;

-- ────────────────────────────────────────────
-- 4. IMPORTATIONS (8 cargaisons)
-- ────────────────────────────────────────────
INSERT INTO public.importations (id, navire_nom, carburant, quantite_tonnes, statut, date_depart, date_arrivee_prevue, date_arrivee_effective, port_origine, notes)
VALUES
  ('i1000000-0000-0000-0000-000000000001', 'MT Atlantic Star', 'Essence', 25000, 'dechargé',
   '2026-02-01', '2026-02-10', '2026-02-09', 'Rotterdam, Pays-Bas',
   'Cargaison complète déchargée au port de Conakry. Qualité conforme.'),

  ('i1000000-0000-0000-0000-000000000002', 'MV Gulf Pioneer', 'Gasoil', 18000, 'dechargé',
   '2026-02-05', '2026-02-14', '2026-02-15', 'Lagos, Nigeria',
   'Livraison effectuée avec 1 jour de retard dû aux conditions météo.'),

  ('i1000000-0000-0000-0000-000000000003', 'MT Sahara Express', 'GPL', 5000, 'dechargé',
   '2026-02-08', '2026-02-16', '2026-02-16', 'Abidjan, Côte d Ivoire',
   'GPL de haute qualité. Stockage au dépôt portuaire OK.'),

  ('i1000000-0000-0000-0000-000000000004', 'MV Mediterranean Queen', 'Essence', 30000, 'en_transit',
   '2026-02-18', '2026-02-27', NULL, 'Marseille, France',
   'En route. Arrivée prévue le 27 février. Conditions navales favorables.'),

  ('i1000000-0000-0000-0000-000000000005', 'MT West Africa Spirit', 'Gasoil', 22000, 'en_transit',
   '2026-02-20', '2026-03-01', NULL, 'Dakar, Sénégal',
   'Transit normal. Position actuelle : large du Cap-Vert.'),

  ('i1000000-0000-0000-0000-000000000006', 'MV Conakry Bay', 'Lubrifiants', 3000, 'planifié',
   NULL, '2026-03-05', NULL, 'Amsterdam, Pays-Bas',
   'Commande confirmée. Départ prévu le 25/02.'),

  ('i1000000-0000-0000-0000-000000000007', 'MT Guinea Star', 'Essence', 20000, 'planifié',
   NULL, '2026-03-10', NULL, 'Houston, USA',
   'Contrat signé. Préparation en cours.'),

  ('i1000000-0000-0000-0000-000000000008', 'MV Tropical Wave', 'GPL', 8000, 'planifié',
   NULL, '2026-03-15', NULL, 'Douala, Cameroun',
   'Commande en attente de confirmation finale.')

ON CONFLICT (id) DO UPDATE SET
  statut = EXCLUDED.statut,
  date_arrivee_effective = EXCLUDED.date_arrivee_effective,
  notes = EXCLUDED.notes;

-- ────────────────────────────────────────────
-- 5. LIVRAISONS (12 livraisons récentes)
-- ────────────────────────────────────────────
INSERT INTO public.livraisons (id, station_id, carburant, quantite, date_livraison, statut, bon_livraison, camion_immatriculation, chauffeur_nom, source)
VALUES
  ('l1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', 'essence', 15000, '2026-02-22', 'livré', 'BL-2026-0201', 'RC 4521 AB', 'Mamadou Bah', 'Dépôt Kaloum'),
  ('l1000000-0000-0000-0000-000000000002', 's1000000-0000-0000-0000-000000000002', 'gasoil', 12000, '2026-02-22', 'livré', 'BL-2026-0202', 'RC 3398 CD', 'Ibrahima Sow', 'Dépôt Kaloum'),
  ('l1000000-0000-0000-0000-000000000003', 's1000000-0000-0000-0000-000000000006', 'essence', 18000, '2026-02-21', 'livré', 'BL-2026-0203', 'RC 7712 EF', 'Boubacar Keita', 'Dépôt Port'),
  ('l1000000-0000-0000-0000-000000000004', 's1000000-0000-0000-0000-000000000010', 'gasoil', 10000, '2026-02-21', 'livré', 'BL-2026-0204', 'RC 5543 GH', 'Alpha Diallo', 'Dépôt Kaloum'),
  ('l1000000-0000-0000-0000-000000000005', 's1000000-0000-0000-0000-000000000014', 'essence', 14000, '2026-02-20', 'livré', 'BL-2026-0205', 'RC 8876 IJ', 'Ousmane Camara', 'Dépôt Kamsar'),
  ('l1000000-0000-0000-0000-000000000006', 's1000000-0000-0000-0000-000000000015', 'gasoil', 20000, '2026-02-20', 'livré', 'BL-2026-0206', 'RC 2234 KL', 'Sékou Barry', 'Dépôt Kamsar'),
  ('l1000000-0000-0000-0000-000000000007', 's1000000-0000-0000-0000-000000000018', 'essence', 12000, '2026-02-19', 'livré', 'BL-2026-0207', 'RC 6654 MN', 'Thierno Diallo', 'Dépôt Labé'),
  ('l1000000-0000-0000-0000-000000000008', 's1000000-0000-0000-0000-000000000003', 'gasoil', 8000, '2026-02-23', 'en_route', 'BL-2026-0208', 'RC 9987 OP', 'Moussa Touré', 'Dépôt Kaloum'),
  ('l1000000-0000-0000-0000-000000000009', 's1000000-0000-0000-0000-000000000005', 'essence', 20000, '2026-02-23', 'en_route', 'BL-2026-0209', 'RC 1123 QR', 'Lansana Condé', 'Dépôt Port'),
  ('l1000000-0000-0000-0000-000000000010', 's1000000-0000-0000-0000-000000000009', 'gasoil', 15000, '2026-02-24', 'planifié', 'BL-2026-0210', NULL, NULL, 'Dépôt Kankan'),
  ('l1000000-0000-0000-0000-000000000011', 's1000000-0000-0000-0000-000000000013', 'gpl', 3000, '2026-02-24', 'planifié', 'BL-2026-0211', NULL, NULL, 'Dépôt Port'),
  ('l1000000-0000-0000-0000-000000000012', 's1000000-0000-0000-0000-000000000020', 'essence', 25000, '2026-02-24', 'planifié', 'BL-2026-0212', NULL, NULL, 'Dépôt Labé')
ON CONFLICT (id) DO UPDATE SET
  statut = EXCLUDED.statut,
  quantite = EXCLUDED.quantite;

-- ────────────────────────────────────────────
-- 6. PRIX OFFICIELS (tarifs actuels)
-- ────────────────────────────────────────────
INSERT INTO public.prix_officiels (id, carburant, prix_litre, date_effet)
VALUES
  ('p1000000-0000-0000-0000-000000000001', 'Essence', 12000, '2026-01-01'),
  ('p1000000-0000-0000-0000-000000000002', 'Gasoil', 11500, '2026-01-01'),
  ('p1000000-0000-0000-0000-000000000003', 'GPL', 8500, '2026-01-01'),
  ('p1000000-0000-0000-0000-000000000004', 'Lubrifiants', 25000, '2026-01-01'),
  ('p1000000-0000-0000-0000-000000000005', 'Essence', 11500, '2025-07-01'),
  ('p1000000-0000-0000-0000-000000000006', 'Gasoil', 11000, '2025-07-01')
ON CONFLICT (id) DO UPDATE SET
  prix_litre = EXCLUDED.prix_litre;

-- ────────────────────────────────────────────
-- 7. HISTORIQUE STOCKS (30 jours pour 5 stations)
-- ────────────────────────────────────────────
INSERT INTO public.historique_stocks (id, station_id, date_releve, stock_essence, stock_gasoil, stock_gpl, stock_lubrifiants)
SELECT
  gen_random_uuid(),
  s.id,
  d::date,
  GREATEST(5000, FLOOR(40000 + (random() * 30000) - (EXTRACT(DOY FROM d) * 200))::int),
  GREATEST(3000, FLOOR(35000 + (random() * 25000) - (EXTRACT(DOY FROM d) * 180))::int),
  GREATEST(200, FLOOR(2000 + (random() * 2000))::int),
  GREATEST(100, FLOOR(500 + (random() * 800))::int)
FROM
  (SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day') AS d) dates
CROSS JOIN
  (SELECT id FROM public.stations WHERE id IN (
    's1000000-0000-0000-0000-000000000001',
    's1000000-0000-0000-0000-000000000006',
    's1000000-0000-0000-0000-000000000010',
    's1000000-0000-0000-0000-000000000014',
    's1000000-0000-0000-0000-000000000018'
  )) s
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────
-- 8. ORDRES DE LIVRAISON (commandes)
-- ────────────────────────────────────────────
INSERT INTO public.ordres_livraison (id, station_id, carburant, quantite_demandee, priorite, statut, date_demande, notes)
VALUES
  ('o1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000005', 'essence', 25000, 'urgente', 'approuvé',
   '2026-02-22', 'Stock critique - livraison urgente requise'),
  ('o1000000-0000-0000-0000-000000000002', 's1000000-0000-0000-0000-000000000013', 'gpl', 5000, 'urgente', 'en_traitement',
   '2026-02-22', 'Rupture GPL - station fermée'),
  ('o1000000-0000-0000-0000-000000000003', 's1000000-0000-0000-0000-000000000009', 'gasoil', 15000, 'haute', 'approuvé',
   '2026-02-21', 'Stock en dessous du seuil d alerte'),
  ('o1000000-0000-0000-0000-000000000004', 's1000000-0000-0000-0000-000000000012', 'gasoil', 12000, 'normale', 'en_attente',
   '2026-02-21', 'Réapprovisionnement de routine'),
  ('o1000000-0000-0000-0000-000000000005', 's1000000-0000-0000-0000-000000000020', 'essence', 20000, 'urgente', 'approuvé',
   '2026-02-23', 'Station en maintenance - stock à reconstituer'),
  ('o1000000-0000-0000-0000-000000000006', 's1000000-0000-0000-0000-000000000003', 'essence', 18000, 'normale', 'livré',
   '2026-02-18', 'Commande régulière - livraison effectuée'),
  ('o1000000-0000-0000-0000-000000000007', 's1000000-0000-0000-0000-000000000007', 'gasoil', 10000, 'haute', 'livré',
   '2026-02-15', 'Livraison prioritaire effectuée'),
  ('o1000000-0000-0000-0000-000000000008', 's1000000-0000-0000-0000-000000000015', 'lubrifiants', 1500, 'basse', 'en_attente',
   '2026-02-23', 'Stock lubrifiants bas - commande de routine')
ON CONFLICT (id) DO UPDATE SET
  statut = EXCLUDED.statut,
  priorite = EXCLUDED.priorite;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Entreprises' AS table_name, COUNT(*) AS count FROM public.entreprises
UNION ALL SELECT 'Stations', COUNT(*) FROM public.stations
UNION ALL SELECT 'Alertes', COUNT(*) FROM public.alertes
UNION ALL SELECT 'Importations', COUNT(*) FROM public.importations
UNION ALL SELECT 'Livraisons', COUNT(*) FROM public.livraisons
UNION ALL SELECT 'Prix Officiels', COUNT(*) FROM public.prix_officiels
UNION ALL SELECT 'Historique Stocks', COUNT(*) FROM public.historique_stocks
UNION ALL SELECT 'Ordres Livraison', COUNT(*) FROM public.ordres_livraison;
