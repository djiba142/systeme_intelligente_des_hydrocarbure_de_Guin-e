import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import logoUrl from '@/assets/logo.png';
import sonapLogoUrl from '@/assets/sonap.jpeg';

interface OfficialDocData {
  type: 'autorisation' | 'licence' | 'conformite';
  numero: string;
  entite: string;
  adresse?: string;
  region?: string;
  valideJusquau?: string;
  details?: Record<string, any>;
  signatureRole: string;
}

// Helper to load images in PDF
const getLogoBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 3000);
    const img = new Image();
    img.onload = () => {
      clearTimeout(t);
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => { clearTimeout(t); resolve(null); };
    img.src = url;
  });
};

export const generateOfficialSONAPDocument = async (data: OfficialDocData) => {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  
  // 1. En-tête (Drapeau et Logos)
  // Bande drapeau national
  doc.setFillColor(206, 17, 38); doc.rect(0, 0, W/3, 2, 'F');
  doc.setFillColor(252, 209, 22); doc.rect(W/3, 0, W/3, 2, 'F');
  doc.setFillColor(0, 148, 77); doc.rect((W/3)*2, 0, W/3, 2, 'F');

  // Logos
  try {
    const logoSIHG = await getLogoBase64(logoUrl);
    if (logoSIHG) doc.addImage(logoSIHG, 'PNG', 15, 8, 20, 20);
    
    const logoSONAP = await getLogoBase64(sonapLogoUrl);
    if (logoSONAP) doc.addImage(logoSONAP, 'PNG', W - 35, 8, 20, 20);
  } catch (e) { console.error("Logo load error", e); }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("RÉPUBLIQUE DE GUINEE", W / 2, 12, { align: "center" });
  doc.setFontSize(7);
  doc.text("Travail - Justice - Solidarité", W / 2, 16, { align: "center" });
  
  doc.setFontSize(14);
  doc.setTextColor(206, 17, 38); // Rouge
  doc.text("------------------------------------------------", W / 2, 25, { align: "center" });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("SOCIÉTÉ NATIONALE DES PÉTROLES", W / 2, 32, { align: "center" });
  doc.setFontSize(11);
  doc.text("(SONAP)", W / 2, 38, { align: "center" });

  // 2. Type de document et Numéro
  doc.setDrawColor(0, 148, 77); // Vert SONAP
  doc.setLineWidth(1);
  doc.line(20, 48, W - 20, 48);
  
  const title = data.type === 'autorisation' ? "AUTORISATION D'EXPLOITATION" : 
                data.type === 'licence' ? "LICENCE D'EXPLOITATION" : "CERTIFICAT DE CONFORMITÉ";
  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(title, W / 2, 65, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text(`N° RÉFÉRENCE : ${data.numero}`, W / 2, 75, { align: "center" });
  doc.setTextColor(0);

  // 3. Corps du document
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`La Société Nationale des Pétroles (SONAP) certifie par la présente que l'entité :`, 20, 95);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0, 148, 77); // Vert
  doc.text(data.entite.toUpperCase(), 20, 110);
  doc.setTextColor(0);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  if (data.adresse) doc.text(`Sise à : ${data.adresse} (${data.region || ''})`, 20, 122);
  
  doc.text("Est officiellement autorisée et certifiée conforme pour exercer ses activités", 20, 138);
  doc.text("dans le secteur des hydrocarbures en République de Guinée, sous réserve", 20, 146);
  doc.text("du respect des normes techniques et environnementales en vigueur.", 20, 154);

  // 4. Détails Techniques (Tableau)
  let lastY = 165;
  if (data.details) {
    const tableData = Object.entries(data.details).map(([key, value]) => [key, value]);
    (doc as any).autoTable({
      startY: 165,
      head: [['Paramètre de Contrôle', 'Valeur / État']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 148, 77], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 }
    });
    lastY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 5. Validité
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Délivré à Conakry, le : ${format(new Date(), 'dd/MM/yyyy')}`, 20, lastY);
  if (data.valideJusquau) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(206, 17, 38);
    doc.text(`VALIDE JUSQU'AU : ${data.valideJusquau}`, 20, lastY + 8);
    doc.setTextColor(0);
  }

  // 6. QR Code de Sécurité
  const qrData = `SIHG-SONAP|${data.type}|${data.numero}|${data.entite}|${new Date().toISOString()}`;
  const qrBase64 = await QRCode.toDataURL(qrData);
  doc.addImage(qrBase64, 'PNG', 155, lastY - 10, 40, 40);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Sécurité SIHG-QR", 175, lastY + 35, { align: "center" });

  // 7. Signature Block
  const sigY = H - 60;
  doc.setDrawColor(200);
  doc.line(W - 90, sigY + 25, W - 15, sigY + 25); // Signature line
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Le Directeur de la", W - 52, sigY, { align: "center" });
  doc.text(data.signatureRole.toUpperCase(), W - 52, sigY + 6, { align: "center" });
  
  // Seal placeholder
  doc.setDrawColor(0, 148, 77);
  doc.setLineWidth(0.5);
  doc.circle(W - 120, sigY + 10, 12);
  doc.setFontSize(6);
  doc.text("SCEAU", W - 120, sigY + 9, { align: "center" });
  doc.text("OFFICIEL", W - 120, sigY + 13, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("(Signé numériquement et certifié par blockchain SIHG)", W - 52, sigY + 35, { align: "center" });

  // 8. Pied de page
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  doc.text("SOCIÉTÉ NATIONALE DES PÉTROLES - KM 4, Commune de Matam, Conakry, République de Guinée", W / 2, H - 15, { align: "center" });
  doc.text("Ce document est infalsifiable et fait foi de droit pour les autorités compétentes.", W / 2, H - 10, { align: "center" });

  doc.save(`SONAP_${data.type}_${data.numero}.pdf`);
};
