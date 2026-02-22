import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Type pour TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable?: {
      finalY?: number;
    };
  }
}

// Helper to add Logo and QR Code
const addHeaderWithLogoAndQR = async (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors (Professional Blue & Orange Scheme)
  const primaryColor = [41, 128, 185]; // Nice Blue
  const secondaryColor = [230, 126, 34]; // Orange for accent
  const darkText = [44, 62, 80];
  const lightText = [127, 140, 141];

  // 0. Add Colored Header Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 25, 'F'); // Top bar

  // 1. Add Logo (Left)
  try {
    doc.addImage(nexusLogo, 'PNG', 10, 2, 20, 20);
  } catch (err) {
    console.warn("Logo Error", err);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("NEXUS", 14, 15);
  }

  // 2. Add QR Code (Right)
  try {
    const qrData = JSON.stringify({
      report: title,
      date: new Date().toISOString(),
      id: Math.random().toString(36).substring(7)
    });
    const qrDataUrl = await QRCode.toDataURL(qrData);
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 25, 2, 20, 20);
  } catch (err) {
    console.error("QR Env Error", err);
  }

  // 3. Center Title (White on Blue Header)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('SIHG - République de Guinée', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Système Intégré de Gestion des Hydrocarbures', pageWidth / 2, 18, { align: 'center' });

  // 4. Report Metadata (Below Header)
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, 35, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, 42, { align: 'center' });

  // 5. Decorative Line
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(1);
  doc.line(20, 48, pageWidth - 20, 48);

  // 6. Add Footer (Page Numbers)
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('NEXUS Petroliom - Document Confidentiel', 20, pageHeight - 10);
  }
};

export async function generateNationalStockPDF(stats: {
  entreprises: { nom: string; sigle: string; stockEssence: number; stockGasoil: number; stations: number }[];
  totals: { essence: number; gasoil: number; stations: number };
  autonomieEssence: number;
  autonomieGasoil: number;
  isPrinting?: boolean;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(33, 37, 41);
      doc.text('SIHG - République de Guinée', 105, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(16);
      doc.text('Rapport Stock National', 105, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 105, yPosition, { align: 'center' });
      yPosition += 7;

      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;

      // Summary Section
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.text('RÉSUMÉ EXÉCUTIF', 20, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      const summary = [
        `Total Stations: ${stats.totals.stations}`,
        `Stock Essence: ${stats.totals.essence.toLocaleString('fr-GN')} L`,
        `Stock Gasoil: ${stats.totals.gasoil.toLocaleString('fr-GN')} L`,
        `Autonomie Essence: ${stats.autonomieEssence} jours`,
        `Autonomie Gasoil: ${stats.autonomieGasoil} jours`,
      ];

      summary.forEach((line) => {
        doc.text(line, 25, yPosition);
        yPosition += 6;
      });

      yPosition += 5;

      // Tableau détaillé
      doc.setFontSize(11);
      doc.setTextColor(33, 37, 41);
      doc.text('DÉTAIL PAR ENTREPRISE', 20, yPosition);
      yPosition += 8;

      const tableData = stats.entreprises.map(e => [
        e.nom,
        e.sigle,
        e.stations.toString(),
        e.stockEssence.toLocaleString('fr-GN'),
        e.stockGasoil.toLocaleString('fr-GN'),
        (e.stockEssence + e.stockGasoil).toLocaleString('fr-GN'),
      ]);

      autoTable(doc as any, {
        startY: yPosition,
        head: [['Entreprise', 'Sigle', 'Stations', 'Essence (L)', 'Gasoil (L)', 'Total (L)']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 15 },
          2: { cellWidth: 15 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
        },
      });

      // Footer
      const pageCount = (doc as any).internal.pages.length - 1;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page 1 of ${pageCount}`, 105, 285, { align: 'center' });

      // ────────────────────────────────────────────────
      // PARTIE CRITIQUE : Téléchargement / Impression
      // ────────────────────────────────────────────────
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      if (stats.isPrinting) {
        // Impression
        const printWindow = window.open(pdfUrl, '_blank');
        if (!printWindow) {
          throw new Error("Pop-up bloqué ! Autorisez les pop-ups pour ce site.");
        }

        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
            resolve();
          } catch (e) {
            console.warn("Impossible d'imprimer auto", e);
            resolve();
          }
        }, 1000);
      } else {
        // Téléchargement normal
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Rapport_Stock_National_${new Date().toISOString().split('T')[0]}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);

        try {
          link.click();
          resolve();
        } catch (e) {
          reject(e);
        } finally {
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 200);
        }
      }
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateCustomReportPDF(options: {
  type: string;
  title?: string;
  dateDebut?: string;
  dateFin?: string;
  data?: any;
  isPrinting?: boolean;
}): Promise<void> {
  const doc = new jsPDF();
  const title = options.title || 'Rapport SIHG';

  await addHeaderWithLogoAndQR(doc, title);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  let currentY = 55;
  doc.text('Type : ' + options.type.toUpperCase(), 20, currentY);
  currentY += 7;

  if (options.dateDebut && options.dateFin) {
    doc.text(`Période: ${options.dateDebut} à ${options.dateFin}`, 105, yPosition, { align: 'center' });
    yPosition += 7;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;

  // Contenu selon type
  doc.setFontSize(11);
  doc.setTextColor(33, 37, 41);

  if (options.type === 'stock' || options.type === 'stock-national') {
    // Stock Report
    doc.text('RÉSUMÉ DES STOCKS NATIONAUX', 20, yPosition);
    yPosition += 8;

    const stockData = [
      ['Carburant', 'Stock Actuel (L)', 'Capacité (L)', 'Taux Occupation (%)'],
      ['Essence', '250,000', '350,000', '71%'],
      ['Gasoil', '180,000', '280,000', '64%'],
      ['GPL', '45,000', '100,000', '45%'],
      ['Lubrifiants', '12,000', '50,000', '24%'],
    ];

    autoTable(doc as any, {
      startY: yPosition,
      head: [stockData[0]],
      body: stockData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable?.finalY || yPosition + 40;
    yPosition += 10;

    doc.setFontSize(11);
    doc.text('PAR ENTREPRISE', 20, yPosition);
    yPosition += 8;

    const entrepriseData = [
      ['Entreprise', 'Essence', 'Gasoil', 'Total Stations'],
      ['TotalEnergies Guinée', '120,000 L', '95,000 L', '15'],
      ['Shell Guinée', '85,000 L', '72,000 L', '12'],
      ['Kamsar Petroleum', '45,000 L', '38,000 L', '8'],
    ];

    autoTable(doc as any, {
      startY: yPosition,
      head: [entrepriseData[0]],
      body: entrepriseData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    });
  } else if (options.type === 'alertes') {
    // Alerts Report
    doc.text('ALERTES ET INCIDENTS', 20, yPosition);
    yPosition += 8;

    const alertData = [
      ['Date', 'Station', 'Type', 'Niveau', 'Description'],
      ['01/02/2026', 'TotalEnergies Hamdallaye', 'Stock Critique', 'Critique', 'Essence < 10%'],
      ['31/01/2026', 'Shell Coléah', 'Stock Alerte', 'Alerte', 'Gasoil < 25%'],
      ['30/01/2026', 'TMI Ratoma', 'Fermeture', 'Info', 'Maintenance prévue'],
      ['29/01/2026', 'KP Conakry', 'Stock Critique', 'Critique', 'GPL rupture stock'],
    ];

    autoTable(doc as any, {
      startY: yPosition,
      head: [alertData[0]],
      body: alertData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 50 },
      },
    });

    yPosition = (doc as any).lastAutoTable?.finalY || yPosition + 50;
    yPosition += 10;

    doc.setFontSize(10);
    doc.text('STATISTIQUES', 20, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    doc.text('• Alertes Critiques: 2', 25, yPosition);
    yPosition += 5;
    doc.text('• Alertes Standard: 1', 25, yPosition);
    yPosition += 5;
    doc.text('• Stations Affectées: 4', 25, yPosition);
  } else if (options.type === 'consommation') {
    // Consumption Report
    doc.text('ANALYSE DE CONSOMMATION', 20, yPosition);
    yPosition += 8;

    const consumptionData = [
      ['Carburant', 'Semaine 1', 'Semaine 2', 'Semaine 3', 'Total Période'],
      ['Essence', '15,200 L', '16,800 L', '14,500 L', '46,500 L'],
      ['Gasoil', '12,500 L', '13,200 L', '12,800 L', '38,500 L'],
      ['GPL', '2,100 L', '2,400 L', '2,200 L', '6,700 L'],
    ];

    autoTable(doc as any, {
      startY: yPosition,
      head: [consumptionData[0]],
      body: consumptionData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [40, 167, 69], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
      },
    });

    yPosition = (doc as any).lastAutoTable?.finalY || yPosition + 40;
    yPosition += 10;

    doc.setFontSize(10);
    doc.text('TENDANCES', 20, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    doc.text('• Consommation totale: 91,700 L', 25, yPosition);
    yPosition += 5;
    doc.text('• Variation semaine 1-2: +5.2%', 25, yPosition);
    yPosition += 5;
    doc.text('• Variation semaine 2-3: -10.8%', 25, yPosition);
  } else if (options.type === 'importations') {
    // Imports Report
    doc.text('SUIVI DES IMPORTATIONS', 20, yPosition);
    yPosition += 8;

    const importData = [
      ['Date', 'Cargaison', 'Fournisseur', 'Volume', 'Statut'],
      ['01/02/2026', 'IMPORT-001', 'SGPG', '100,000 L', 'Déchargé'],
      ['28/01/2026', 'IMPORT-002', 'SGPG', '80,000 L', 'En transit'],
      ['25/01/2026', 'IMPORT-003', 'SGPG', '120,000 L', 'Déchargé'],
    ];

    autoTable(doc as any, {
      startY: yPosition,
      head: [importData[0]],
      body: importData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [255, 193, 7], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
      },
    });

    yPosition = (doc as any).lastAutoTable?.finalY || yPosition + 35;
    yPosition += 10;

    doc.setFontSize(10);
    doc.text('RÉSUMÉ', 20, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    doc.text('• Total importé: 300,000 L', 25, yPosition);
    yPosition += 5;
    doc.text('• Cargaisons en cours: 1', 25, yPosition);
    yPosition += 5;
    doc.text('• Taux déchargement: 67%', 25, yPosition);
  } else {
    // Generic Report
    doc.setFontSize(10);
    doc.text(`Rapport de type: ${options.type}`, 20, yPosition);
    yPosition += 10;
    doc.text('Ce rapport affiche les données pour la période spécifiée.', 20, yPosition);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Page 1 - Rapport confidentiel`, 105, 285, { align: 'center' });

  // Sauvegarde avec méthode fiable
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  if (options.isPrinting) {
    const printWindow = window.open(pdfUrl, '_blank');
    if (!printWindow) {
      throw new Error('Pop-up bloqué ! Autorisez les pop-ups pour ce site.');
    }

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch (e) {
        console.warn('Impossible d\'imprimer auto', e);
        resolve();
      }
    }, 1000);
  } else {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);

    try {
      link.click();
      resolve();
    } catch (e) {
      reject(e);
    } finally {
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 200);
    }
  }
} catch (error) {
  reject(error);
}
  });
}