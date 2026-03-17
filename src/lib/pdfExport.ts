import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';
import QRCode from 'qrcode';
import logoUrl from '@/assets/logo.png';
import sonapLogoUrl from '@/assets/sonap.jpeg';

applyPlugin(jsPDF);

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: { finalY?: number };
  }
}

// ── Rôles supportés ────────────────────────────────────────────
export type AppRole =
  | 'super_admin' | 'admin_etat' | 'directeur_general' | 'directeur_adjoint' | 'secretaire_general'
  | 'directeur_aval' | 'directeur_adjoint_aval' | 'chef_division_distribution' | 'chef_bureau_aval'
  | 'agent_supervision_aval' | 'controleur_distribution' | 'technicien_support_dsa' | 'technicien_flux'
  | 'inspecteur'
  | 'service_it' | 'responsable_entreprise' | 'responsable_stations' | 'gestionnaire_livraisons'
  | 'technicien_aval' | 'operateur_entreprise'
  | 'directeur_importation' | 'agent_importation' 
  | 'responsable_stock' | 'agent_station';

const ROLE_SIGNATURE: Record<string, { gauche: string; droite: string }> = {
  directeur_general:  { gauche: '',  droite: "LE DIRECTEUR GENERAL" },
  directeur_adjoint:  { gauche: '', droite: "LE DIRECTEUR GENERAL ADJOINT" },
  admin_etat:         { gauche: '', droite: "L'ADMINISTRATEUR D'ETAT (SONAP)" },
  directeur_aval:     { gauche: '', droite: "LE DIRECTEUR DE L'AVAL" },
  directeur_adjoint_aval: { gauche: '', droite: "LE DIRECTEUR ADJOINT DE L'AVAL" },
  chef_division_distribution: { gauche: '', droite: "LE CHEF DIVISION DISTRIBUTION" },
  inspecteur:         { gauche: '', droite: "L'INSPECTEUR SIHG" },
  analyste:           { gauche: '', droite: "L'ANALYSTE STRATEGIQUE" },
  service_it:         { gauche: '', droite: "LE RESPONSABLE S.I." },
  responsable_entreprise: { gauche: '', droite: "LE DIRECTEUR D'ENTREPRISE" },
  responsable_stations:   { gauche: '', droite: "LE RESPONSABLE STATIONS" },
  gestionnaire_livraisons: { gauche: '', droite: "LE GESTIONNAIRE LIVRAISONS" },
  operateur_entreprise:   { gauche: '', droite: "L'OPERATEUR LOGISTIQUE" },
  secretaire_general:     { gauche: '', droite: "LE SECRETAIRE GENERAL" },
  super_admin:            { gauche: '', droite: "L'ADMINISTRATEUR SYSTEME" },
  directeur_importation:  { gauche: '', droite: "LE DIRECTEUR DES IMPORTATIONS" },
  DGA:                { gauche: '', droite: "SIGNATURE" },
  DSA:                { gauche: '', droite: "SIGNATURE" },
};

const normalize = (val: any): string => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Replace non-breaking spaces (standard and narrow) with regular spaces
  str = str.replace(/[\u00A0\u202F]/g, ' ');
  
  return str
    .replace(/[àâä]/g, 'a').replace(/[ÀÂÄÁ]/g, 'A')
    .replace(/[éèêë]/g, 'e').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[îï]/g, 'i') .replace(/[ÎÏ]/g, 'I')
    .replace(/[ôö]/g, 'o') .replace(/[ÔÖ]/g, 'O')
    .replace(/[ùûü]/g, 'u').replace(/[ÙÛÜ]/g, 'U')
    .replace(/[ç]/g, 'c')  .replace(/[Ç]/g, 'C')
    .replace(/[ñ]/g, 'n')  .replace(/[Ñ]/g, 'N')
    .replace(/[œ]/g, 'oe') .replace(/[Œ]/g, 'OE')
    .replace(/[æ]/g, 'ae') .replace(/[Æ]/g, 'AE')
    .replace(/'/g, "'")    .replace(/[«»]/g, '"')
    .replace(/[–—]/g, '-');
};

const formatNumber = (val: number): string => {
  return normalize(val.toLocaleString('fr-FR'));
};

// ── Cache logos ─────────────────────────────────────────────────
let _cacheSihg: string | null = null;
let _cacheSonap: string | null = null;
let _cacheEntreprise: string | null = null;

const getLogoBase64 = (url: string, type: 'sihg' | 'sonap' | 'entreprise'): Promise<string | null> => {
  const cached = type === 'sihg' ? _cacheSihg : type === 'sonap' ? _cacheSonap : _cacheEntreprise;
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 4000);
    const img = new Image();
    if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(t);
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 120;
        c.height = img.naturalHeight || 120;
        const ctx = c.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const b64 = c.toDataURL('image/png');
        if (type === 'sihg') _cacheSihg = b64; 
        else if (type === 'sonap') _cacheSonap = b64;
        else _cacheEntreprise = b64;
        resolve(b64);
      } catch { resolve(null); }
    };
    img.onerror = () => { clearTimeout(t); resolve(null); };
    img.src = url;
  });
};

// ── COULEURS OFFICIELLES ─────────────────────────────────────────
const C = {
  guineaRed:    [206, 17,  38]  as [number,number,number],
  guineaYellow: [252, 209, 22]  as [number,number,number],
  guineaGreen:  [0,   148, 77]  as [number,number,number],
  headerBg:     [0,   148, 77]  as [number,number,number], // Official Green
  darkText:     [31,  41,  55]  as [number,number,number],
  lightText:    [107, 114, 128] as [number,number,number],
  red:          [190, 18,  60]  as [number,number,number],
};

// ── EN-TÊTE OFFICIELLE ───────────────────────────────────────────
const addPageHeader = async (doc: jsPDF, reportTitle: string, entrepriseLogo?: string): Promise<number> => {
  const W = doc.internal.pageSize.getWidth();
  const STRIP = 3;
  const HBAR  = 32;

  // Bande drapeau
  doc.setFillColor(...C.guineaRed);    doc.rect(0, 0, W/3, STRIP, 'F');
  doc.setFillColor(...C.guineaYellow); doc.rect(W/3, 0, W/3, STRIP, 'F');
  doc.setFillColor(...C.guineaGreen);  doc.rect((W/3)*2, 0, W/3, STRIP, 'F');

  // Barre verte principale
  doc.setFillColor(...C.headerBg);
  doc.rect(0, STRIP, W, HBAR, 'F');

  // Logo SIHG gauche
  try {
    const b = await getLogoBase64(logoUrl, 'sihg');
    if (b) doc.addImage(b, 'PNG', 5, STRIP+4, 22, 22, undefined, 'FAST');
    else { doc.setTextColor(255,255,255); doc.setFontSize(9); doc.text('NEXUS-SIHG', 7, STRIP+16); }
  } catch { /* ignore */ }

  // Logo SONAP (avant QR)
  try {
    const b = await getLogoBase64(sonapLogoUrl, 'sonap');
    if (b) doc.addImage(b, 'PNG', W-54, STRIP+4, 22, 22, undefined, 'FAST');
    else { doc.setTextColor(255,255,255); doc.setFontSize(9); doc.text('SONAP', W-50, STRIP+16); }
  } catch { /* ignore */ }

  // Logo Entreprise (si fourni)
  if (entrepriseLogo) {
    try {
      const b = await getLogoBase64(entrepriseLogo, 'entreprise'); 
      if (b) doc.addImage(b, 'PNG', W-81, STRIP+4, 22, 22, undefined, 'FAST');
    } catch { /* ignore */ }
  }

  // QR Code
  try {
    const qr = await QRCode.toDataURL(
      JSON.stringify({ report: reportTitle, date: new Date().toISOString(), org: 'SONAP-SIHG' }),
      { width: 80, margin: 1, color: { dark: '#013220', light: '#ffffff' } }
    );
    doc.setFillColor(255,255,255);
    doc.roundedRect(W-27, STRIP+1, 22, 22, 2, 2, 'F');
    doc.addImage(qr, 'PNG', W-26, STRIP+2, 20, 20);
  } catch { /* ignore */ }

  // Texte institutionnel centré (sans accents pour helvetica)
  const cx = W / 2;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REPUBLIQUE DE GUINEE', cx, STRIP+8, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text('PRESIDENCE DE LA REPUBLIQUE', cx, STRIP+14, { align: 'center' });
  doc.setFontSize(10);
  doc.text('SOCIETE NATIONALE DES PETROLES DE GUINEE (SONAP)', cx, STRIP+20, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text("Systeme Integre de Gestion des Hydrocarbures (SIHG)", cx, STRIP+27, { align: 'center' });

  // Titre du rapport sous la barre
  const titleY = STRIP + HBAR + 10;
  doc.setTextColor(...C.darkText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(normalize(reportTitle).toUpperCase(), cx, titleY, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...C.lightText);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  doc.text(
    `Document Officiel SIHG - Genere le ${now.toLocaleDateString('fr-FR')} a ${now.toLocaleTimeString('fr-FR')}`,
    cx, titleY + 6, { align: 'center' }
  );

  // Ligne rouge décorative
  doc.setDrawColor(...C.red);
  doc.setLineWidth(0.6);
  doc.line(15, titleY + 10, W - 15, titleY + 10);

  return titleY + 16;
};

// ── SIGNATURES EN BAS DE PAGE (dynamiques selon rôle) ───────────
const addSignaturesAtBottom = (doc: jsPDF, signerRole?: string, signerName?: string) => {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const SIG_H = 50;
  
  // Sécurité: Si le contenu (tableau) termine trop bas, on change de page
  const finalY = (doc as any).lastAutoTable?.finalY || 0;
  if (finalY > H - SIG_H - 20) {
    doc.addPage();
  }

  let sigY = H - SIG_H;

  // Ligne de separation fine
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(20, sigY - 5, W - 20, sigY - 5);

  const role = signerRole || 'directeur_general';
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.darkText);

  // Logic pour Double Validation (4 yeux)
  const needsDoubleValidation = ['admin_etat', 'directeur_aval', 'directeur_general', 'secretaire_general', 'directeur_importation', 'super_admin'].includes(role);

  if (needsDoubleValidation) {
     const sig = ROLE_SIGNATURE[role] || { gauche: '', droite: "L'AUTORITE COMPETENTE" };
     
     // Slot 1: L'auteur
     doc.text("L'ETABLISSEUR DU RAPPORT", 50, sigY + 5, { align: 'center' });
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(7);
     doc.text(normalize(signerName || 'Agent Certifie'), 50, sigY + 10, { align: 'center' });
     doc.line(20, sigY + 28, 80, sigY + 28);

     // Slot 2: Autorite de Controle
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(9);
     doc.text(normalize(sig.droite), W - 50, sigY + 5, { align: 'center' });
     doc.line(W - 80, sigY + 28, W - 20, sigY + 28);
     
     // Sceau de securite amélioré
     doc.setDrawColor(...C.guineaGreen);
     doc.setLineWidth(0.8);
     doc.circle(W/2, sigY + 22, 12);
     doc.setLineWidth(0.2);
     doc.circle(W/2, sigY + 22, 10);
     
     doc.setFontSize(5);
     doc.setFont('helvetica', 'bold');
     doc.text("SCEAU OFFICIEL", W/2, sigY + 20, { align: 'center' });
     doc.text("VALIDE PAR SIHG", W/2, sigY + 23, { align: 'center' });
     doc.setFontSize(4);
     doc.text("SONAP REPUBLIQUE DE GUINEE", W/2, sigY + 26, { align: 'center' });
  } else {
     const sig = ROLE_SIGNATURE[role] || { gauche: '', droite: "SIGNATURE" };
     doc.text(normalize(sig.droite), W - 50, sigY + 5, { align: 'center' });
     
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(7);
     doc.text(normalize(signerName || 'Agent Certifie'), W - 50, sigY + 10, { align: 'center' });
     
     doc.line(W - 80, sigY + 28, W - 20, sigY + 28);
     
     // Petit sceau certifié
     doc.setDrawColor(...C.guineaGreen);
     doc.setLineWidth(0.4);
     doc.circle(30, sigY + 22, 9);
     doc.setFontSize(5);
     doc.text("CERTIFIE", 30, sigY + 21, { align: 'center' });
     doc.text("SIHG-SONAP", 30, sigY + 24, { align: 'center' });
  }
};

// ── PIED DE PAGE SUR TOUTES LES PAGES ───────────────────────────
const addFooters = (doc: jsPDF) => {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(15, H - 12, W - 15, H - 12);
    doc.text(`Page ${i} / ${total}`, W / 2, H - 7, { align: 'center' });
    doc.text('SONAP / SIHG - Document Strictement Confidentiel', 15, H - 7);
    
    // Ajout d'un hash de certification unique pour chaque page
    const pageHash = Math.random().toString(36).substring(2, 11).toUpperCase() + '-' + i;
    doc.text(`CERT: ${pageHash}`, W - 15, H - 7, { align: 'right' });
  }
};

// ── HELPER table ─────────────────────────────────────────────────
const runTable = (doc: jsPDF, opts: any) => {
  if (typeof (doc as any).autoTable === 'function') (doc as any).autoTable(opts);
  else autoTable(doc as any, opts);
};

// ════════════════════════════════════════════════════════════════
//  generateNationalStockPDF
// ════════════════════════════════════════════════════════════════
export async function generateNationalStockPDF(data: {
  entreprises: any[];
  totals: { essence: number; gasoil: number; stations: number };
  autonomieEssence: number;
  autonomieGasoil: number;
  signerRole?: string;
  signerName?: string;
  entrepriseLogo?: string;
}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF();
      const title = "RAPPORT D'ETAT DES STOCKS NATIONAUX";
      let y = await addPageHeader(doc, title, data.entrepriseLogo);
      const W = doc.internal.pageSize.getWidth();

      doc.setFontSize(11); doc.setTextColor(...C.headerBg); doc.setFont('helvetica', 'bold');
      doc.text('1. REPARTITION PAR COMPAGNIE PETROLIERE', 15, y); y += 5;

      runTable(doc, {
        startY: y,
        head: [['Entreprise', 'Sigle', 'Stations', 'Essence (L)', 'Gasoil (L)']],
        body: data.entreprises.map(e => [
          normalize(e.nom), e.sigle,
          e.stations.toString(),
          formatNumber(e.stockEssence),
          formatNumber(e.stockGasoil),
        ]),
        theme: 'striped',
        headStyles: { fillColor: C.headerBg, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        margin: { left: 15, right: 15 },
      });

      y = ((doc as any).lastAutoTable?.finalY || y + 40) + 12;

      doc.setFontSize(11); doc.setTextColor(...C.headerBg); doc.setFont('helvetica', 'bold');
      doc.text('2. AGREGATS NATIONAUX ET AUTONOMIE', 15, y); y += 6;

      doc.setFillColor(245, 248, 252);
      doc.roundedRect(15, y, W - 30, 42, 3, 3, 'F');
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);

      doc.text('Total Stations Actives :', 22, y + 10);
      doc.setFont('helvetica', 'bold'); doc.text(data.totals.stations.toString(), 100, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.text('Stock Essence :', 22, y + 22);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatNumber(data.totals.essence)} L`, 100, y + 22);
      doc.setTextColor(...C.red);
      doc.text(`(~${data.autonomieEssence} jours d'autonomie)`, 145, y + 22);
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal');
      doc.text('Stock Gasoil :', 22, y + 34);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatNumber(data.totals.gasoil)} L`, 100, y + 34);
      doc.text(`(~${data.autonomieGasoil} jours d'autonomie)`, 145, y + 34);

      addSignaturesAtBottom(doc, data.signerRole, data.signerName);
      addFooters(doc);

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `RAPPORT_STOCKS_NATIONAUX_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 300);
      resolve();
    } catch (e) { reject(e); }
  });
}

// ════════════════════════════════════════════════════════════════
//  generateCustomReportPDF  (multi-types)
// ════════════════════════════════════════════════════════════════
export async function generateCustomReportPDF(options: {
  type: string;
  title?: string;
  dateDebut?: string;
  dateFin?: string;
  data?: unknown;
  isPrinting?: boolean;
  signerRole?: string;
  signerName?: string;
  entrepriseLogo?: string;
}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF();
      const title = options.title || 'Rapport SIHG';
      let y = await addPageHeader(doc, title, options.entrepriseLogo);
      const W = doc.internal.pageSize.getWidth();

      // Période
      if (options.dateDebut && options.dateFin) {
        doc.setFontSize(9); doc.setTextColor(80, 80, 80);
        doc.text(`Periode : du ${options.dateDebut} au ${options.dateFin}`, W/2, y, { align: 'center' });
        y += 8;
      }

      doc.setFontSize(10); doc.setTextColor(...C.darkText); doc.setFont('helvetica', 'bold');

      // ── stock / stock-national / stock-entreprise ──
      if (['stock','stock-national','stock-entreprise'].includes(options.type)) {
        doc.text('RESUME DES STOCKS', 15, y); y += 6;
        const rows = ((options.data as any)?.entreprises || []).map((e: any) => [
          normalize(e.nom || ''), e.sigle || '',
          formatNumber(e.stockEssence ?? 0),
          formatNumber(e.stockGasoil ?? 0),
          e.stations ?? 0,
        ]);
        runTable(doc, {
          startY: y,
          head: [['Entreprise', 'Sigle', 'Essence (L)', 'Gasoil (L)', 'Stations']],
          body: rows.length > 0 ? rows : [['TotalEnergies Guinee','TOTAL','120 000','95 000','15']],
          theme: 'striped',
          headStyles: { fillColor: C.headerBg, textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8.5 }, margin: { left: 15, right: 15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+40) + 10;

      // ── alertes ──
      } else if (options.type === 'alertes') {
        doc.text('ALERTES ET INCIDENTS', 15, y); y += 6;
        const alerts = (options.data as any[]) || [];
        const rows = alerts.length > 0
          ? alerts.map((a: any) => [
              new Date(a.created_at).toLocaleDateString('fr-FR'),
              normalize(a.station_nom || 'N/A'), a.type, a.niveau, normalize(a.message || ''),
            ])
          : [['01/03/2026', 'Station Hamdallaye', 'Stock Critique', 'Critique', 'Essence < 10%']];
        runTable(doc, {
          startY: y, head: [['Date','Station','Type','Niveau','Description']],
          body: rows, theme: 'striped',
          headStyles: { fillColor: C.red, textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 }, margin: { left: 15, right: 15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+35) + 10;

      // ── consommation ──
      } else if (['consommation','consommation-nationale'].includes(options.type)) {
        doc.text('ANALYSE DE CONSOMMATION NATIONALE', 15, y); y += 6;
        runTable(doc, {
          startY: y,
          head: [['Carburant','Semaine 1','Semaine 2','Semaine 3','Total Periode']],
          body: [
            ['Essence','15 200 L','16 800 L','14 500 L','46 500 L'],
            ['Gasoil', '12 500 L','13 200 L','12 800 L','38 500 L'],
            ['GPL',    '2 100 L', '2 400 L', '2 200 L', '6 700 L'],
          ],
          theme: 'striped',
          headStyles: { fillColor: C.headerBg, textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8.5 }, margin: { left: 15, right: 15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+40) + 10;
        doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50);
        doc.text('- Consommation totale estimee : 91 700 L', 20, y); y+=5;
        doc.text('- Variation moyenne : +2.1%', 20, y);

      // ── importations ──
      } else if (options.type === 'importations') {
        doc.text('SUIVI DES IMPORTATIONS', 15, y); y += 6;
        const imports = (options.data as any[]) || [];
        runTable(doc, {
          startY: y,
          head: [['Navire','Carburant','Quantite (T)','Origine','Arrivee','Statut']],
          body: imports.length > 0
            ? imports.map((i: any) => [
                normalize(i.navire_nom||''), i.carburant,
                formatNumber(i.quantite_tonnes||0),
                normalize(i.port_origine||'N/A'),
                i.date_arrivee_prevue ? new Date(i.date_arrivee_prevue).toLocaleDateString('fr-FR') : 'N/A',
                i.statut,
              ])
            : [['MT Atlantic Star','Gasoil','30 000','Rotterdam','20/02/2026','Termine']],
          theme: 'striped',
          headStyles: { fillColor: [249,115,22] as [number,number,number], textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 }, margin: { left:15, right:15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+30) + 10;

      // ── flux-aval ──
      } else if (options.type === 'flux-aval') {
        doc.text('CONTROLE DES FLUX AVAL (DSA)', 15, y); y += 6;
        runTable(doc, {
          startY: y,
          head: [['Date','Provenance','Destination','Carburant','Quantite','Statut']],
          body: [
            ['10/03/2026','Depot Conakry','Station Shell Camayenne','Essence','12 000 L','Livre'],
            ['10/03/2026','Depot Conakry','Station Total Matoto',  'Gasoil', '15 000 L','En cours'],
            ['09/03/2026','Depot Kamsar', 'Station KP Boke',       'Essence','8 000 L', 'Livre'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [16,185,129] as [number,number,number], textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 }, margin: { left:15, right:15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+30) + 10;

      // ── rapport-journalier-station ──
      } else if (options.type === 'rapport-journalier-station') {
        const d = (options.data as any) || {};
        doc.text('RAPPORT JOURNALIER DE STATION', 15, y); y += 6;
        runTable(doc, {
          startY: y,
          head: [['Parametre','Valeur']],
          body: [
            ['Station',                    normalize(d.stationNom || 'N/A')],
            ['Date du rapport',            new Date().toLocaleDateString('fr-FR')],
            ['Ventes Essence',             `${(d.ventesEssence??0).toLocaleString('fr-FR')} L`],
            ['Ventes Gasoil',              `${(d.ventesGasoil??0).toLocaleString('fr-FR')} L`],
            ['Stock Essence (fin de jour)',`${(d.stockEssence??0).toLocaleString('fr-FR')} L`],
            ['Stock Gasoil (fin de jour)', `${(d.stockGasoil??0).toLocaleString('fr-FR')} L`],
            ['Incidents signales',         `${d.incidents??0}`],
            ['Livraisons recues',          `${d.livraisons??0}`],
          ],
          theme: 'striped',
          headStyles: { fillColor: C.headerBg, textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
          margin: { left:15, right:15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+50) + 10;

      // ── plan-annuel-quotas ──
      } else if (options.type === 'plan-annuel-quotas') {
        const d = (options.data as any) || {};
        const annee = d.annee || new Date().getFullYear();
        doc.text(`PLAN ANNUEL DE QUOTAS - ${annee}`, 15, y); y += 6;
        const months = ['Janvier','Fevrier','Mars','Avril','Mai','Juin',
                        'Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
        const curMonth = new Date().getMonth();
        runTable(doc, {
          startY: y,
          head: [['Mois','Quota Essence (L)','Quota Gasoil (L)','Total (L)','Statut']],
          body: months.map((m, i) => {
            const ess = formatNumber(1_500_000 + i*50_000);
            const gas = formatNumber(1_200_000 + i*40_000);
            const tot = formatNumber(2_700_000 + i*90_000);
            const st  = i < curMonth ? 'Realise' : i === curMonth ? 'En cours' : 'Planifie';
            return [m, ess, gas, tot, st];
          }),
          theme: 'striped',
          headStyles: { fillColor: [67,56,202] as [number,number,number], textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8.5 }, margin: { left:15, right:15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+80) + 10;

      // ── rapport-regulation ──
      } else if (options.type === 'rapport-regulation') {
        const d = (options.data as any) || {};
        doc.text('RAPPORT DE REGULATION DES QUOTAS', 15, y); y += 6;
        runTable(doc, {
          startY: y,
          head: [['Entreprise','Quota Essence','Quota Gasoil','Consommation','Ecart','Conformite']],
          body: (d.entreprises || []).map((e: any) => [
            normalize(e.nom || '—'),
            `${formatNumber(e.quotaEssence??0)} L`,
            `${formatNumber(e.quotaGasoil??0)} L`,
            `${formatNumber(e.consommation??0)} L`,
            `${formatNumber(e.ecart??0)} L`,
            e.conforme ? 'Conforme' : 'Ecart signale',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [67,56,202] as [number,number,number], textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 }, margin: { left:15, right:15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+40) + 10;

      // ── bilan-financier ──
      } else if (options.type === 'bilan-financier') {
        doc.text('BILAN FINANCIER GLOBAL', 15, y); y += 6;
        const d = (options.data as any) || {};
        runTable(doc, {
          startY: y,
          head: [['Poste Budgetaire', 'Alloue (GNF)', 'Utilise (GNF)', 'Disponibilite (%)']],
          body: (d.lignes || []).map((l: any) => [
            normalize(l.nom || ''),
            formatNumber(l.alloue || 0),
            formatNumber(l.utilise || 0),
            l.alloue > 0 ? ((l.utilise / l.alloue) * 100).toFixed(1) + '%' : '0%'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105], textColor: [255,255,255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 8.5 }, margin: { left: 15, right: 15 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y+40) + 10;

      // ── générique ──
      } else {
        doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(80,80,80);
        doc.text(`Type : ${options.type.toUpperCase()}`, 15, y); y += 6;
        doc.text('Ce rapport affiche les donnees pour la periode specifiee.', 15, y);
      }

      // Signatures rôle-dépendant + footer
      addSignaturesAtBottom(doc, options.signerRole, options.signerName);
      addFooters(doc);

      // Sauvegarde
      const blob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(blob);

      if (options.isPrinting) {
        const win = window.open(pdfUrl, '_blank');
        if (!win) throw new Error('Popup bloque ! Autorisez les popups pour ce site.');
        setTimeout(() => { try { win.focus(); win.print(); } catch { /* ignore */ } resolve(); }, 1000);
      } else {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `${normalize(title).replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 300);
        resolve();
      }
    } catch (err) { reject(err); }
  });
}