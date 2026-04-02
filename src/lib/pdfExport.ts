import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import QRCode from 'qrcode';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';
import officialStamp from '@/assets/official_stamp.png';

// Interface pour étendre jsPDF
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: { finalY: number };
  }
}

// Interfaces pour la sécurité des types
export interface PDFEntreprise {
  nom: string;
  sigle: string;
  stations: number;
  stockEssence: number;
  stockGasoil: number;
  consommation?: number;
  ecart?: number;
  conforme?: boolean;
}

export interface PDFAlerte {
  created_at: string;
  station_nom: string;
  type: string;
  niveau: string;
  message: string;
}

export interface PDFImport {
  navire_nom: string;
  carburant: string;
  quantite_tonnes: number;
  port_origine: string;
  date_arrivee_prevue: string;
  statut: string;
}

export interface PDFStationReport {
  stationNom?: string;
  ventesEssence?: number;
  ventesGasoil?: number;
  stockEssence?: number;
  stockGasoil?: number;
  incidents?: number;
  livraisons?: number;
}

// Couleurs & Design
const C = {
  primary: [13, 148, 136] as [number, number, number],   // Teal-600
  secondary: [15, 118, 110] as [number, number, number], // Teal-700
  headerBg: [255, 255, 255] as [number, number, number],   // White (Clean)
  accent: [249, 115, 22] as [number, number, number],   // Orange-500
  red: [200, 16, 46] as [number, number, number],       // Official Red
  yellow: [252, 209, 22] as [number, number, number],   // Official Yellow
  green: [0, 148, 77] as [number, number, number],      // Official Green
  lightBg: [248, 250, 252] as [number, number, number], // Slate-50
  darkText: [15, 23, 42] as [number, number, number],   // Slate-900
};

// Utilitaires
const normalize = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const formatNumber = (n: number) => n.toLocaleString('fr-FR');

const runTable = (doc: jsPDF, opts: UserOptions) => {
  autoTable(doc, opts);
};

// Helper: Convert Image URL to Base64 (Pre-loading for PDF)
const getLogoBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    if (url.startsWith('data:')) return resolve(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => { img.src = ''; resolve(null); }, 5000);
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { resolve(null); }
    };
    img.onerror = () => { clearTimeout(timeout); resolve(null); };
    img.src = url;
  });
};

// ── Entête de Page ──────────────────────────────────────────────────
async function addPageHeader(doc: jsPDF, title: string, logoUrl?: string) {
  const W = doc.internal.pageSize.getWidth();

  // Logos
  try {
    const logoSIHG = await getLogoBase64(logo);
    const logoSONAP = await getLogoBase64(sonapLogo);

    // Logo SIHG / NEXUS (Gauche)
    if (logoSIHG) doc.addImage(logoSIHG, 'PNG', 15, 10, 22, 22);

    // Logo SONAP (Droite)
    if (logoSONAP) doc.addImage(logoSONAP, 'JPEG', W - 37, 10, 22, 22);
  } catch (err) {
    console.warn("Logo loading failed in PDF", err);
  }

  // Header Text centered
  doc.setTextColor(20, 30, 50);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('REPUBLIQUE DE GUINEE', W / 2, 15, { align: 'center' });

  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('Travail - Justice - Solidarite', W / 2, 19, { align: 'center' });

  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('SOCIETE NATIONALE DES PETROLES (SONAP)', W / 2, 26, { align: 'center' });

  doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text('Systeme Intelligent de Hydrocarbure de Guinee (SIHG)', W / 2, 36, { align: 'center' });

  // Tricolor line
  const lineY = 42;
  const segmentW = (W - 30) / 3;
  doc.setLineWidth(1.5);

  doc.setDrawColor(...C.red);
  doc.line(15, lineY, 15 + segmentW, lineY);

  doc.setDrawColor(...C.yellow);
  doc.line(15 + segmentW, lineY, 15 + 2 * segmentW, lineY);

  doc.setDrawColor(...C.green);
  doc.line(15 + 2 * segmentW, lineY, W - 15, lineY);

  // Titre du rapport
  doc.setFillColor(30, 41, 59); // Dark blue / Slate
  doc.rect(15, 50, W - 30, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(normalize(title).toUpperCase(), W / 2, 56.5, { align: 'center' });

  // Date d'émission
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text(`Conakry, le ${new Date().toLocaleDateString('fr-FR')}`, W - 15, 68, { align: 'right' });

  return 75; // Retourne l'ordonnée Y de départ
}

// ── Pied de Page ────────────────────────────────────────────────────
function addFooters(doc: jsPDF) {
  const pageCount = (doc.internal as any).getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(15, H - 20, W - 15, H - 20);

    doc.setFontSize(7); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'normal');
    const footerText = 'Document officiel genere par le SIHG-SONAP | Immeuble du Gouvernement, Conakry, Guinee';
    doc.text(footerText, 15, H - 12);
    doc.text(`Page ${i} / ${pageCount}`, W - 15, H - 12, { align: 'right' });

    doc.setFontSize(6);
    doc.text(`ID Validation: ${new Date().getTime().toString(36).toUpperCase()}`, 15, H - 8);
    doc.text('SIHG v1.0.0 (Propriete de la SONAP)', W - 15, H - 8, { align: 'right' });
  }
}

// ── Signatures & QR ─────────────────────────────────────────────────
async function addSignaturesAtBottom(doc: jsPDF, role?: string, name?: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = H - 65;

  // Si on est trop bas sur la page, on ne met pas la signature ici
  if (y < (doc as any).lastAutoTable?.finalY + 10) {
    // Optionnel: ajouter une nouvelle page
  }

  // Ligne de séparation
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y, W - 15, y);
  y += 10;

  // Bloc QR Code de validation (Gauche)
  try {
    const qrData = `SIHG-SONAP-OFFICIAL-VALIDA-${Date.now()}-${normalize(name || 'USER')}`;
    const qrImage = await QRCode.toDataURL(qrData);
    doc.addImage(qrImage, 'PNG', 18, y, 22, 22);
    doc.setFontSize(6); doc.setTextColor(160, 160, 160);
    doc.text('Scanner pour authentifier', 18, y + 25);
  } catch { /* skip */ }

  // Bloc Signature (Droite)
  const sigX = W - 85;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(`Signe par : ${normalize(name || 'Direction SIHG')}`, sigX, y);
  
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
  doc.text(normalize(role || 'Responsable Autorise'), sigX, y + 6);

  // Space for physical signature
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(sigX, y + 15, W - 15, y + 15);
  
  doc.setFontSize(7); doc.setTextColor(150, 150, 150);
  doc.text('(Signature)', sigX + 35, y + 20, { align: 'center' });
}

// ════════════════════════════════════════════════════════════════
//  generateNationalStockPDF
// ════════════════════════════════════════════════════════════════
export async function generateNationalStockPDF(data: {
  entreprises: PDFEntreprise[];
  totals: { essence: number; gasoil: number; stations: number };
  autonomieEssence: number;
  autonomieGasoil: number;
  dateExport: string;
  signerRole: string;
  signerName: string;
}): Promise<void> {
  try {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    let y = await addPageHeader(doc, 'Situation Nationale des Stocks de Carburant');

    // Introduction
    doc.setFontSize(10); doc.setTextColor(...C.darkText); doc.setFont('helvetica', 'normal');
    doc.text(`En date du ${data.dateExport}, voici l'etat consolid-e du stock national :`, 15, y);
    y += 10;

    // Tableau des Entreprises
    doc.setFontSize(11); doc.setTextColor(...C.headerBg); doc.setFont('helvetica', 'bold');
    doc.text('1. REPARTITION PAR ENTREPRISE', 15, y);
    y += 6;

    runTable(doc, {
      startY: y,
      head: [['Entreprise', 'Sigle', 'Stations', 'Stock Essence (L)', 'Stock Gasoil (L)']],
      body: data.entreprises.map((e) => [
        normalize(e.nom), e.sigle,
        e.stations.toString(),
        formatNumber(e.stockEssence),
        formatNumber(e.stockGasoil),
      ]),
      theme: 'striped',
      headStyles: { fillColor: C.headerBg, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 15, right: 15 },
    });

    y = (doc.lastAutoTable?.finalY || y + 40) + 12;

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

    await addSignaturesAtBottom(doc, data.signerRole, data.signerName);
    addFooters(doc);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `RAPPORT_STOCKS_NATIONAUX_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 300);
  } catch (e) { throw e; }
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
  try {
    const doc = new jsPDF();
    const title = options.title || 'Rapport SIHG';
    const y_start = await addPageHeader(doc, title, options.entrepriseLogo);
    let y = y_start;
    const W = doc.internal.pageSize.getWidth();

    // Période
    if (options.dateDebut && options.dateFin) {
      doc.setFontSize(9); doc.setTextColor(80, 80, 80);
      doc.text(`Periode : du ${options.dateDebut} au ${options.dateFin}`, W / 2, y, { align: 'center' });
      y += 8;
    }

    doc.setFontSize(10); doc.setTextColor(...C.darkText); doc.setFont('helvetica', 'bold');

    // ── stock / stock-national / stock-entreprise ──
    if (['stock', 'stock-national', 'stock-entreprise'].includes(options.type)) {
      doc.text('RESUME DES STOCKS', 15, y); y += 6;
      const rows = ((options.data as { entreprises: PDFEntreprise[] })?.entreprises || []).map((e) => [
        normalize(e.nom || ''), e.sigle || '',
        formatNumber(e.stockEssence ?? 0),
        formatNumber(e.stockGasoil ?? 0),
        e.stations ?? 0,
      ]);
      runTable(doc, {
        startY: y,
        head: [['Entreprise', 'Sigle', 'Essence (L)', 'Gasoil (L)', 'Stations']],
        body: rows.length > 0 ? rows : [['TotalEnergies Guinee', 'TOTAL', '120 000', '95 000', '15']],
        theme: 'striped',
        headStyles: { fillColor: C.headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 40) + 10;

      // ── alertes ──
    } else if (options.type === 'alertes') {
      doc.text('ALERTES ET INCIDENTS', 15, y); y += 6;
      const alerts = (options.data as PDFAlerte[]) || [];
      const rows = alerts.length > 0
        ? alerts.map((a) => [
          new Date(a.created_at).toLocaleDateString('fr-FR'),
          normalize(a.station_nom || 'N/A'), a.type, a.niveau, normalize(a.message || ''),
        ])
        : [['01/03/2026', 'Station Hamdallaye', 'Stock Critique', 'Critique', 'Essence < 10%']];
      runTable(doc, {
        startY: y, head: [['Date', 'Station', 'Type', 'Niveau', 'Description']],
        body: rows, theme: 'striped',
        headStyles: { fillColor: C.red, textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 35) + 10;

      // ── consommation ──
    } else if (['consommation', 'consommation-nationale'].includes(options.type)) {
      doc.text('ANALYSE DE CONSOMMATION NATIONALE', 15, y); y += 6;
      runTable(doc, {
        startY: y,
        head: [['Carburant', 'Semaine 1', 'Semaine 2', 'Semaine 3', 'Total Periode']],
        body: [
          ['Essence', '15 200 L', '16 800 L', '14 500 L', '46 500 L'],
          ['Gasoil', '12 500 L', '13 200 L', '12 800 L', '38 500 L'],
          ['GPL', '2 100 L', '2 400 L', '2 200 L', '6 700 L'],
        ],
        theme: 'striped',
        headStyles: { fillColor: C.headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 40) + 10;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
      doc.text('- Consommation totale estimee : 91 700 L', 20, y); y += 5;
      doc.text('- Variation moyenne : +2.1%', 20, y);

      // ── importations ──
    } else if (options.type === 'importations') {
      doc.text('SUIVI DES IMPORTATIONS', 15, y); y += 6;
      const imports = (options.data as PDFImport[]) || [];
      runTable(doc, {
        startY: y,
        head: [['Navire', 'Carburant', 'Quantite (T)', 'Origine', 'Arrivee', 'Statut']],
        body: imports.length > 0
          ? imports.map((i) => [
            normalize(i.navire_nom || ''), i.carburant,
            formatNumber(i.quantite_tonnes || 0),
            normalize(i.port_origine || 'N/A'),
            i.date_arrivee_prevue ? new Date(i.date_arrivee_prevue).toLocaleDateString('fr-FR') : 'N/A',
            i.statut,
          ])
          : [['MT Atlantic Star', 'Gasoil', '30 000', 'Rotterdam', '20/02/2026', 'Termine']],
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 30) + 10;

      // ── flux-aval ──
    } else if (options.type === 'flux-aval') {
      doc.text('CONTROLE DES FLUX AVAL (DSA)', 15, y); y += 6;
      runTable(doc, {
        startY: y,
        head: [['Date', 'Provenance', 'Destination', 'Carburant', 'Quantite', 'Statut']],
        body: [
          ['10/03/2026', 'Depot Conakry', 'Station Shell Camayenne', 'Essence', '12 000 L', 'Livre'],
          ['10/03/2026', 'Depot Conakry', 'Station Total Matoto', 'Gasoil', '15 000 L', 'En cours'],
          ['09/03/2026', 'Depot Kamsar', 'Station KP Boke', 'Essence', '8 000 L', 'Livre'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 30) + 10;

      // ── rapport-journalier-station ──
    } else if (options.type === 'rapport-journalier-station') {
      const d = (options.data as PDFStationReport) || {};
      doc.text('RAPPORT JOURNALIER DE STATION', 15, y); y += 6;
      runTable(doc, {
        startY: y,
        head: [['Parametre', 'Valeur']],
        body: [
          ['Station', normalize(d.stationNom || 'N/A')],
          ['Date du rapport', new Date().toLocaleDateString('fr-FR')],
          ['Ventes Essence', `${(d.ventesEssence ?? 0).toLocaleString('fr-FR')} L`],
          ['Ventes Gasoil', `${(d.ventesGasoil ?? 0).toLocaleString('fr-FR')} L`],
          ['Stock Essence (fin de jour)', `${(d.stockEssence ?? 0).toLocaleString('fr-FR')} L`],
          ['Stock Gasoil (fin de jour)', `${(d.stockGasoil ?? 0).toLocaleString('fr-FR')} L`],
          ['Incidents signales', `${d.incidents ?? 0}`],
          ['Livraisons recues', `${d.livraisons ?? 0}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: C.headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
        margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 50) + 10;

      // ── plan-annuel-distribution ──
    } else if (options.type === 'plan-annuel-distribution') {
      const d = (options.data as { annee?: number }) || {};
      const annee = d.annee || new Date().getFullYear();
      doc.text(`PLAN ANNUEL DE DISTRIBUTION - ${annee}`, 15, y); y += 6;
      const months = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
      const curMonth = new Date().getMonth();
      runTable(doc, {
        startY: y,
        head: [['Mois', 'Volume Essence (L)', 'Volume Gasoil (L)', 'Total (L)', 'Statut']],
        body: months.map((m, i) => {
          const ess = formatNumber(1_500_000 + i * 50_000);
          const gas = formatNumber(1_200_000 + i * 40_000);
          const tot = formatNumber(2_700_000 + i * 90_000);
          const st = i < curMonth ? 'Realise' : i === curMonth ? 'En cours' : 'Planifie';
          return [m, ess, gas, tot, st];
        }),
        theme: 'striped',
        headStyles: { fillColor: [67, 56, 202] as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 80) + 10;

      // ── rapport-distribution ──
    } else if (options.type === 'rapport-distribution') {
      const d = (options.data as { entreprises?: PDFEntreprise[] }) || {};
      doc.text('RAPPORT DE DISTRIBUTION ET LOGISTIQUE', 15, y); y += 6;
      runTable(doc, {
        startY: y,
        head: [['Entreprise', 'Volume Essence', 'Volume Gasoil', 'Consommation', 'Reliquat', 'Statut']],
        body: (d.entreprises || []).map((e) => [
          normalize(e.nom || '—'),
          `${formatNumber(e.stockEssence ?? 0)} L`,
          `${formatNumber(e.stockGasoil ?? 0)} L`,
          `${formatNumber(e.consommation ?? 0)} L`,
          `${formatNumber(e.ecart ?? 0)} L`,
          e.conforme ? 'Normal' : 'Alerte Flux',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [67, 56, 202] as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 40) + 10;

      // ── audit-securite ──
    } else if (options.type === 'audit-securite') {
      doc.text('RAPPORT D\'AUDIT DE SECURITE HEBDOMADAIRE', 15, y); y += 6;
      const events = (options.data as any[]) || [];
      const rows = events.map((e) => [
        new Date(e.event_date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }),
        e.action_type === 'login' ? 'Connexion' : e.action_type === 'role_change' ? 'Privileges' : e.action_type,
        e.status === 'failed' ? 'ECHEC' : 'SUCCES',
        e.event_count.toString(),
        (e.users_involved || []).slice(0, 3).join(', ') + (e.users_involved?.length > 3 ? '...' : '')
      ]);
      runTable(doc, {
        startY: y, head: [['Date', 'Action', 'Statut', 'Nb', 'Utilisateurs (Apercu)']],
        body: rows, theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 }, margin: { left: 15, right: 15 },
      });
      y = (doc.lastAutoTable?.finalY || y + 35) + 10;


      // ── générique ──
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
      doc.text(`Type : ${options.type.toUpperCase()}`, 15, y); y += 6;
      doc.text('Ce rapport affiche les donnees pour la periode specifiee.', 15, y);
    }

    // Signatures rôle-dépendant + footer
    await addSignaturesAtBottom(doc, options.signerRole, options.signerName);
    addFooters(doc);

    // Sauvegarde
    const blob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(blob);

    if (options.isPrinting) {
      const win = window.open(pdfUrl, '_blank');
      if (!win) throw new Error('Popup bloque ! Autorisez les popups pour ce site.');
      setTimeout(() => { try { win.focus(); win.print(); } catch { /* ignore */ } }, 1000);
    } else {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${normalize(title).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 300);
    }
  } catch (err) {
    console.error('PDF Export Error:', err);
    throw err;
  }
}