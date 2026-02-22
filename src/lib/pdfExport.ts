import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import nexusLogoUrl from '@/assets/sonap.jpeg';

// Type pour TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF; // Simplified for easier use
    lastAutoTable?: {
      finalY?: number;
    };
  }
}

// Helper: Convert image URL to base64 data URI (needed for jsPDF)
let _cachedLogoBase64: string | null = null;
const getLogoBase64 = (): Promise<string | null> => {
  if (_cachedLogoBase64) return Promise.resolve(_cachedLogoBase64);
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            _cachedLogoBase64 = canvas.toDataURL('image/jpeg');
            resolve(_cachedLogoBase64);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.warn('Canvas logo conversion failed', e);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn('Logo image failed to load');
        resolve(null);
      };
      img.src = nexusLogoUrl;
    } catch (e) {
      console.warn('Logo loading error', e);
      resolve(null);
    }
  });
};

// Helper to add Logo and QR Code
const addHeaderWithLogoAndQR = async (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors (SONAP / Guinea Scheme)
  const primaryColor = [22, 101, 52]; // Dark Green
  const secondaryColor = [190, 18, 60]; // Deep Red
  const darkText = [31, 41, 55];
  const lightText = [107, 114, 128];

  // 0. Add Colored Header Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 25, 'F'); // Top bar

  // 1. Add Logo (Left) - Using SONAP Logo (base64)
  try {
    const logoBase64 = await getLogoBase64();
    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', 10, 2, 20, 20);
    } else {
      // Fallback text if logo fails
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SONAP', 14, 15);
    }
  } catch (err) {
    console.warn("Logo Error", err);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("SONAP", 14, 15);
  }

  // 2. Add QR Code (Right)
  try {
    const qrData = JSON.stringify({
      report: title,
      date: new Date().toISOString(),
      id: Math.random().toString(36).substring(7)
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 80, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 25, 2, 20, 20);
  } catch (err) {
    console.warn("QR Code generation skipped", err);
  }

  // 3. Center Title (White on Header)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SIHG - RÉPUBLIQUE DE GUINÉE', pageWidth / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Système Intégré de Gestion des Hydrocarbures', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SOCIÉTÉ NATIONALE DES PÉTROLES (SONAP)', pageWidth / 2, 21, { align: 'center' });

  // 4. Report Metadata (Below Header)
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.text(`Document généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, 47, { align: 'center' });

  // 5. Decorative Line
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(20, 52, pageWidth - 20, 52);
};

export async function generateNationalStockPDF(stats: {
  entreprises: { nom: string; sigle: string; stockEssence: number; stockGasoil: number; stations: number }[];
  totals: { essence: number; gasoil: number; stations: number };
  autonomieEssence: number;
  autonomieGasoil: number;
  isPrinting?: boolean;
}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF();
      const title = 'Rapport Stock National';

      await addHeaderWithLogoAndQR(doc, title);

      let yPosition = 65;

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
          fillColor: [22, 101, 52],
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

      // Update footer for all pages after content generation
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} sur ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('SONAP / SIHG - Document Strictement Confidentiel', 20, pageHeight - 15);
      }

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
  data?: unknown;
  isPrinting?: boolean;
}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF();
      const title = options.title || 'Rapport SIHG';

      await addHeaderWithLogoAndQR(doc, title);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

      let currentY = 55;
      doc.text('Type : ' + options.type.toUpperCase(), 20, currentY);
      currentY += 7;

      if (options.dateDebut && options.dateFin) {
        doc.text(`Période: ${options.dateDebut} à ${options.dateFin}`, 105, currentY, { align: 'center' });
        currentY += 7;
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(20, currentY, 190, currentY);
      currentY += 10;

      // Contenu selon type
      doc.setFontSize(11);
      doc.setTextColor(33, 37, 41);

      if (options.type === 'stock' || options.type === 'stock-national') {
        // Stock Report
        doc.text('RÉSUMÉ DES STOCKS NATIONAUX', 20, currentY);
        currentY += 8;

        const stockData = [
          ['Carburant', 'Stock Actuel (L)', 'Capacité (L)', 'Taux Occupation (%)'],
          ['Essence', '250,000', '350,000', '71%'],
          ['Gasoil', '180,000', '280,000', '64%'],
          ['GPL', '45,000', '100,000', '45%'],
          ['Lubrifiants', '12,000', '50,000', '24%'],
        ];

        autoTable(doc as any, {
          startY: currentY,
          head: [stockData[0]],
          body: stockData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
        });

        currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
        currentY += 10;

        doc.setFontSize(11);
        doc.text('PAR ENTREPRISE', 20, currentY);
        currentY += 8;

        const entrepriseData = [
          ['Entreprise', 'Essence', 'Gasoil', 'Total Stations'],
          ['TotalEnergies Guinée', '120,000 L', '95,000 L', '15'],
          ['Shell Guinée', '85,000 L', '72,000 L', '12'],
          ['Kamsar Petroleum', '45,000 L', '38,000 L', '8'],
        ];

        autoTable(doc as any, {
          startY: currentY,
          head: [entrepriseData[0]],
          body: entrepriseData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        });
      } else if (options.type === 'alertes') {
        // Alerts Report
        doc.text('ALERTES ET INCIDENTS', 20, currentY);
        currentY += 8;

        const alertData = [
          ['Date', 'Station', 'Type', 'Niveau', 'Description'],
          ['01/02/2026', 'TotalEnergies Hamdallaye', 'Stock Critique', 'Critique', 'Essence < 10%'],
          ['31/01/2026', 'Shell Coléah', 'Stock Alerte', 'Alerte', 'Gasoil < 25%'],
          ['30/01/2026', 'TMI Ratoma', 'Fermeture', 'Info', 'Maintenance prévue'],
          ['29/01/2026', 'KP Conakry', 'Stock Critique', 'Critique', 'GPL rupture stock'],
        ];

        autoTable(doc as any, {
          startY: currentY,
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

        currentY = (doc as any).lastAutoTable?.finalY || currentY + 50;
        currentY += 10;

        doc.setFontSize(10);
        doc.text('STATISTIQUES', 20, currentY);
        currentY += 6;
        doc.setFontSize(9);
        doc.text('• Alertes Critiques: 2', 25, currentY);
        currentY += 5;
        doc.text('• Alertes Standard: 1', 25, currentY);
        currentY += 5;
        doc.text('• Stations Affectées: 4', 25, currentY);
      } else if (options.type === 'consommation') {
        // Consumption Report
        doc.text('ANALYSE DE CONSOMMATION', 20, currentY);
        currentY += 8;

        const consumptionData = [
          ['Carburant', 'Semaine 1', 'Semaine 2', 'Semaine 3', 'Total Période'],
          ['Essence', '15,200 L', '16,800 L', '14,500 L', '46,500 L'],
          ['Gasoil', '12,500 L', '13,200 L', '12,800 L', '38,500 L'],
          ['GPL', '2,100 L', '2,400 L', '2,200 L', '6,700 L'],
        ];

        autoTable(doc as any, {
          startY: currentY,
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

        currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
        currentY += 10;

        doc.setFontSize(10);
        doc.text('TENDANCES', 20, currentY);
        currentY += 6;
        doc.setFontSize(9);
        doc.text('• Consommation totale: 91,700 L', 25, currentY);
        currentY += 5;
        doc.text('• Variation semaine 1-2: +5.2%', 25, currentY);
        currentY += 5;
        doc.text('• Variation semaine 2-3: -10.8%', 25, currentY);
      } else if (options.type === 'importations') {
        // Imports Report
        doc.text('SUIVI DES IMPORTATIONS', 20, currentY);
        currentY += 8;

        const importData = [
          ['Date', 'Cargaison', 'Fournisseur', 'Volume', 'Statut'],
          ['01/02/2026', 'IMPORT-001', 'SGPG', '100,000 L', 'Déchargé'],
          ['28/01/2026', 'IMPORT-002', 'SGPG', '80,000 L', 'En transit'],
          ['25/01/2026', 'IMPORT-003', 'SGPG', '120,000 L', 'Déchargé'],
        ];

        autoTable(doc as any, {
          startY: currentY,
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

        currentY = (doc as any).lastAutoTable?.finalY || currentY + 35;
        currentY += 10;

        doc.setFontSize(10);
        doc.text('RÉSUMÉ', 20, currentY);
        currentY += 6;
        doc.setFontSize(9);
        doc.text('• Total importé: 300,000 L', 25, currentY);
        currentY += 5;
        doc.text('• Cargaisons en cours: 1', 25, currentY);
        currentY += 5;
        doc.text('• Taux déchargement: 67%', 25, currentY);
      } else {
        // Generic Report
        doc.setFontSize(10);
        doc.text(`Rapport de type: ${options.type}`, 20, currentY);
        currentY += 10;
        doc.text('Ce rapport affiche les données pour la période spécifiée.', 20, currentY);
      }

      // Footer - Add page numbers to all pages
      const totalPages = doc.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} sur ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('SONAP / SIHG - Document Strictement Confidentiel', 20, pageHeight - 15);
      }

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