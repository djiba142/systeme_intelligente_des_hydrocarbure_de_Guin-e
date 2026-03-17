import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import logoUrl from '@/assets/logo.png';
import sonapLogoUrl from '@/assets/sonap.jpeg';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  directeur_general:  { gauche: '',  droite: "LE DIRECTEUR GÉNÉRAL" },
  directeur_adjoint:  { gauche: '', droite: "LE DIRECTEUR GÉNÉRAL ADJOINT" },
  admin_etat:         { gauche: '', droite: "L'ADMINISTRATEUR D'ÉTAT" },
  directeur_aval:     { gauche: '', droite: "LE DIRECTEUR DE L'AVAL" },
  directeur_adjoint_aval: { gauche: '', droite: "LE DIRECTEUR ADJOINT DE L'AVAL" },
  chef_division_distribution: { gauche: '', droite: "LE CHEF DIVISION DISTRIBUTION" },
  inspecteur:         { gauche: '', droite: "L'INSPECTEUR SIHG" },
  analyste:           { gauche: '', droite: "L'ANALYSTE STRATÉGIQUE" },
  service_it:         { gauche: '', droite: "LE RESPONSABLE S.I." },
  responsable_entreprise: { gauche: '', droite: "LE DIRECTEUR D'ENTREPRISE" },
  responsable_stations:   { gauche: '', droite: "LE RESPONSABLE STATIONS" },
  gestionnaire_livraisons: { gauche: '', droite: "LE GESTIONNAIRE LIVRAISONS" },
  secretaire_general:     { gauche: '', droite: "LE SECRÉTAIRE GÉNÉRAL" },
  super_admin:            { gauche: '', droite: "L'ADMINISTRATEUR SYSTÈME" },
  directeur_importation:  { gauche: '', droite: "LE DIRECTEUR DES IMPORTATIONS" },
  agent_importation:     { gauche: '', droite: "L'AGENT D'IMPORTATION" },
};

// Helper: Convert Image URL to Base64 with fallback and better error handling
const getLogoBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        if (url.startsWith('data:')) return resolve(url);

        const img = new Image();
        img.crossOrigin = 'anonymous'; 
        
        const timeout = setTimeout(() => {
            img.src = ''; 
            resolve(null);
        }, 8000); // 8 seconds timeout

        img.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                console.error("Excel Logo Error:", e);
                // Fallback attempt without CORS if possible (though unlikely to work if already failed)
                resolve(null);
            }
        };
        img.onerror = () => {
            clearTimeout(timeout);
            resolve(null);
        };
        img.src = url;
    });
};

interface ExcelExportOptions {
    title: string;
    filename: string;
    headers: string[];
    data: any[][];
    signerRole?: string;
    signerName?: string;
    sheetName?: string;
    entrepriseLogo?: string;
}

export async function generateExcelReport({
    title,
    filename,
    headers,
    data,
    signerRole,
    signerName,
    sheetName = 'Rapport SIHG',
    entrepriseLogo
}: ExcelExportOptions) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIHG SONAP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: false }]
    });

    // 1. Configuration des colonnes
    const colWidths = headers.map(h => Math.max(h.length + 5, 15));
    data.forEach(row => {
        row.forEach((cell, i) => {
            const cellLen = cell ? String(cell).length + 2 : 10;
            if (cellLen > colWidths[i]) colWidths[i] = cellLen;
        });
    });

    sheet.columns = [
        { width: 5 }, // Colonne A (Marge)
        ...headers.map((h, i) => ({ width: Math.min(colWidths[i], 45) })),
        { width: 5 }  // Colonne finale
    ];

    // 2. Bande Tricolore (Drapeau)
    const lastColIndex = headers.length + 1;
    
    sheet.getRow(1).height = 10;
    const third = Math.floor(headers.length / 3);
    
    for (let c = 2; c <= lastColIndex; c++) {
        const cell = sheet.getCell(1, c);
        let color = 'FF00944D'; // Vert
        if (c <= 2 + third) color = 'FFCE1126'; // Rouge
        else if (c <= 2 + 2 * third) color = 'FFFCD116'; // Jaune
        
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }

    // 3. Header Spacing - Increased for more "air"
    sheet.getRow(2).height = 100;
    sheet.mergeCells(2, 2, 2, lastColIndex);
    const instCell = sheet.getCell(2, 2);
    instCell.value = "RÉPUBLIQUE DE GUINÉE\nPRÉSIDENCE DE LA RÉPUBLIQUE\nSOCIÉTÉ NATIONALE DES PÉTROLES (SONAP)\n\nSYSTÈME INTÉGRÉ DE GESTION DES HYDROCARBURES (SIHG)";
    instCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    instCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F2937' } };

    // 4. Logo SONAP & SIHG - Better positioning
    const sihgBase64 = await getLogoBase64(logoUrl);
    const sonapBase64 = await getLogoBase64(sonapLogoUrl);

    if (sihgBase64) {
        const id = workbook.addImage({ base64: sihgBase64, extension: 'png' });
        sheet.addImage(id, {
            tl: { col: 1.2, row: 1.1 }, // Column B
            ext: { width: 85, height: 85 }
        });
    }

    if (sonapBase64) {
        const id = workbook.addImage({ base64: sonapBase64, extension: 'png' });
        sheet.addImage(id, {
            tl: { col: lastColIndex - 0.9, row: 1.1 }, // Right side
            ext: { width: 85, height: 85 }
        });
    }

    // Logo Entreprise additionnel
    if (entrepriseLogo) {
        const entBase64 = await getLogoBase64(entrepriseLogo);
        if (entBase64) {
            const id = workbook.addImage({ base64: entBase64, extension: 'png' });
            sheet.addImage(id, {
                tl: { col: lastColIndex - 1.9, row: 1.1 },
                ext: { width: 75, height: 75 }
            });
        }
    }

    // 5. Titre du Rapport
    sheet.getRow(4).height = 35;
    sheet.mergeCells(4, 2, 4, lastColIndex);
    const titleCell = sheet.getCell(4, 2);
    titleCell.value = title.toUpperCase();
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFCE1126' } };
    titleCell.border = { bottom: { style: 'medium', color: { argb: 'FFCE1126' } } };

    sheet.getRow(5).height = 20;
    sheet.mergeCells(5, 2, 5, lastColIndex);
    const dateCell = sheet.getCell(5, 2);
    dateCell.value = `Généré officiellement le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`;
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B7280' } };

    // 6. Tableau - Headers
    const startRow = 7;
    const headerRow = sheet.getRow(startRow);
    headerRow.height = 30;
    
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 2);
        cell.value = h.toUpperCase();
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00944D' } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin'}, right: { style: 'thin'}
        };
    });

    // 7. Tableau - Data
    data.forEach((rowData, rowIndex) => {
        const row = sheet.getRow(startRow + 1 + rowIndex);
        row.height = 25;
        rowData.forEach((val, colIndex) => {
            const cell = row.getCell(colIndex + 2);
            cell.value = val;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { name: 'Arial', size: 10 };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFDEE2E6' } },
                left: { style: 'thin', color: { argb: 'FFDEE2E6' } },
                bottom: { style: 'thin', color: { argb: 'FFDEE2E6' } },
                right: { style: 'thin', color: { argb: 'FFDEE2E6' } }
            };
            
            if (rowIndex % 2 === 0) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
            
            if (typeof val === 'number') {
                cell.numFmt = '#,##0';
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
            }
        });
    });

    // 8. Signature & QR Code - Professional Layout
    let currentY = startRow + data.length + 4;
    sheet.getRow(currentY).height = 100;

    // QR Code on the left (certification)
    try {
        const qrData = JSON.stringify({ 
            doc: title, 
            date: new Date().toISOString(), 
            verify: `https://sihg.sonap.gov.gn/verify/${Math.random().toString(36).substring(7)}`,
            system: 'SIHG-SONAP-CERTIFIED' 
        });
        const qrB64 = await QRCode.toDataURL(qrData, { 
            width: 150, 
            margin: 1,
            color: { dark: '#1F2937', light: '#FFFFFF' }
        });
        const id = workbook.addImage({ base64: qrB64, extension: 'png' });
        sheet.addImage(id, {
            tl: { col: 1.2, row: currentY - 0.5 },
            ext: { width: 100, height: 100 }
        });
        
        sheet.getCell(currentY + 4, 2).value = "CERTIFIÉ PAR SIHG";
        sheet.getCell(currentY + 4, 2).font = { size: 7, bold: true, color: { argb: 'FF9BA3AF' } };
    } catch (e) { console.error('QR Error', e); }

    // Logic de Signature - Official Box on the right
    const role = signerRole || 'directeur_general';
    const sig = ROLE_SIGNATURE[role] || { droite: "SIGNATURE AUTORISÉE" };
    
    // Position for Signature
    const sigCol = lastColIndex - 1; 
    
    const cellRight = sheet.getCell(currentY, sigCol + 1);
    cellRight.value = sig.droite.toUpperCase();
    cellRight.font = { bold: true, size: 10, name: 'Arial' };
    cellRight.alignment = { horizontal: 'center' };

    const nameRight = sheet.getCell(currentY + 1, sigCol + 1);
    nameRight.value = signerName || "Responsable Autorisé";
    nameRight.font = { italic: true, size: 9, name: 'Arial' };
    nameRight.alignment = { horizontal: 'center' };

    // Placeholder line for manual signature
    const lineRow = currentY + 4;
    const sigLineCell = sheet.getCell(lineRow, sigCol + 1);
    sigLineCell.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
    
    // Add "Veuillez signer ci-dessus" text
    const hintCell = sheet.getCell(lineRow + 1, sigCol + 1);
    hintCell.value = "(Signature et Cachet)";
    hintCell.font = { size: 8, italic: true, color: { argb: 'FF6B7280' } };
    hintCell.alignment = { horizontal: 'center' };

    const footerY = currentY + 8;
    sheet.mergeCells(footerY, 2, footerY, lastColIndex);
    const footerCell = sheet.getCell(footerY, 2);
    footerCell.value = "Ce document est généré par le Système Intégré de Gestion des Hydrocarbures (SIHG).";
    footerCell.font = { size: 8, italic: true, color: { argb: 'FF9BA3AF' } };
    footerCell.alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
