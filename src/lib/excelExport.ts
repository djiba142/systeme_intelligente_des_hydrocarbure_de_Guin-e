import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import logoUrl from '@/assets/logo.png';
import sonapLogoUrl from '@/assets/sonap.jpeg';
import officialStampUrl from '@/assets/official_stamp.png';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Rôles supportés ────────────────────────────────────────────
export type AppRole =
    | 'super_admin' | 'admin_etat' | 'directeur_general' | 'directeur_adjoint' | 'secretariat_direction'
    | 'directeur_aval' | 'directeur_adjoint_aval' | 'chef_division_distribution' | 'chef_service_aval'
    | 'agent_technique_aval' | 'controleur_distribution' | 'technicien_support_dsa' | 'technicien_flux'
    | 'inspecteur' | 'analyste_regulation'
    | 'service_it' | 'responsable_entreprise' | 'responsable_stations' | 'gestionnaire_livraisons'
    | 'technicien_aval' | 'operateur_entreprise'
    | 'directeur_juridique' | 'juriste' | 'charge_conformite' | 'assistant_juridique'
    | 'directeur_importation' | 'directeur_juridique';

const ROLE_SIGNATURE: Record<string, { gauche: string; droite: string }> = {
    directeur_general: { gauche: '', droite: "LE DIRECTEUR GÉNÉRAL" },
    directeur_adjoint: { gauche: '', droite: "LE DIRECTEUR GÉNÉRAL ADJOINT" },
    admin_etat: { gauche: '', droite: "L'ADMINISTRATEUR D'ÉTAT" },
    directeur_aval: { gauche: '', droite: "LE DIRECTEUR DE L'AVAL" },
    directeur_adjoint_aval: { gauche: '', droite: "LE DIRECTEUR ADJOINT DE L'AVAL" },
    chef_division_distribution: { gauche: '', droite: "LE CHEF DIVISION DISTRIBUTION" },
    inspecteur: { gauche: '', droite: "L'INSPECTEUR SIHG" },
    analyste: { gauche: '', droite: "L'ANALYSTE STRATÉGIQUE" },
    directeur_administratif: { gauche: '', droite: "LE DIRECTEUR ADMINISTRATIF" },
    chef_service_administratif: { gauche: '', droite: "LE CHEF SERVICE ADMINISTRATIF" },
    gestionnaire_documentaire: { gauche: '', droite: "LE GESTIONNAIRE DOCUMENTAIRE" },
    service_it: { gauche: '', droite: "LE RESPONSABLE S.I." },
    responsable_entreprise: { gauche: '', droite: "LE DIRECTEUR D'ENTREPRISE" },
    responsable_stations: { gauche: '', droite: "LE RESPONSABLE STATIONS" },
    gestionnaire_livraisons: { gauche: '', droite: "LE GESTIONNAIRE LIVRAISONS" },
    secretariat_direction: { gauche: '', droite: "LE SECRÉTARIAT DE DIRECTION" },
    super_admin: { gauche: '', droite: "L'ADMINISTRATEUR SYSTÈME" },
    directeur_juridique: { gauche: '', droite: "LE DIRECTEUR JURIDIQUE" },
    directeur_importation: { gauche: '', droite: "LE DIRECTEUR DES IMPORTATIONS" },
    directeur_logistique: { gauche: '', droite: "LE DIRECTEUR LOGISTIQUE" },
    responsable_depots: { gauche: '', droite: "LE RESPONSABLE DES DÉPÔTS" },
    responsable_transport: { gauche: '', droite: "LE RESPONSABLE TRANSPORT" },
    operateur_logistique: { gauche: '', droite: "L'OPÉRATEUR LOGISTIQUE" },
    chef_service_aval: { gauche: '', droite: "LE CHEF DE SERVICE AVAL" },
    agent_technique_aval: { gauche: '', droite: "L'AGENT TECHNIQUE AVAL" },
    agent_importation: { gauche: '', droite: "L'AGENT D'IMPORTATION" },
    juriste: { gauche: '', droite: "LE JURISTE" },
    agent_logistique: { gauche: '', droite: "L'AGENT LOGISTIQUE" },
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

    // 2. Bande Tricolore (Drapeau) - Thicker and more vibrant
    const lastColIndex = headers.length + 1;
    sheet.getRow(1).height = 18;
    const third = Math.floor(headers.length / 3);

    for (let c = 2; c <= lastColIndex; c++) {
        const cell = sheet.getCell(1, c);
        let color = 'FF00944D'; // Vert (Official)
        if (c <= 2 + third) color = 'FFCE1126'; // Rouge (Official)
        else if (c <= 2 + 2 * third) color = 'FFFCD116'; // Jaune (Official)

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }

    // 3. Header Spacing
    sheet.getRow(2).height = 110;
    sheet.mergeCells(2, 2, 2, lastColIndex);
    const instCell = sheet.getCell(2, 2);
    instCell.value = "RÉPUBLIQUE DE GUINÉE\nSOCIÉTÉ NATIONALE DES PÉTROLES (SONAP)\n\nSYSTÈME INTELLIGENTE DES HYDROCARBURES (SIHG)";
    instCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    instCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F2937' } };

    // 4. Logo SONAP & SIHG - Improved positioning and sizing
    const sihgBase64 = await getLogoBase64(logoUrl);
    const sonapBase64 = await getLogoBase64(sonapLogoUrl);

    if (sihgBase64) {
        const base64Data = sihgBase64.includes(',') ? sihgBase64.split(',')[1] : sihgBase64;
        const id = workbook.addImage({ base64: base64Data, extension: 'png' });
        sheet.addImage(id, {
            tl: { col: 1.1, row: 1.1 }, // Top-Left of Column B (col 1 index)
            ext: { width: 90, height: 90 }
        });
    }

    if (sonapBase64) {
        const base64Data = sonapBase64.includes(',') ? sonapBase64.split(',')[1] : sonapBase64;
        const id = workbook.addImage({ base64: base64Data, extension: 'png' }); // canvas always outputs PNG
        sheet.addImage(id, {
            tl: { col: lastColIndex - 0.9, row: 1.1 }, // Right side margin
            ext: { width: 90, height: 90 }
        });
    }

    // Logo Entreprise additionnel (Centered or next to SIHG)
    if (entrepriseLogo) {
        const entBase64 = await getLogoBase64(entrepriseLogo);
        if (entBase64) {
            const base64Data = entBase64.includes(',') ? entBase64.split(',')[1] : entBase64;
            const id = workbook.addImage({ base64: base64Data, extension: 'png' });
            sheet.addImage(id, {
                tl: { col: 2.1, row: 1.1 }, // Column C area
                ext: { width: 80, height: 80 }
            });
        }
    }

    // 5. Titre du Rapport
    sheet.getRow(4).height = 40;
    sheet.mergeCells(4, 2, 4, lastColIndex);
    const titleCell = sheet.getCell(4, 2);
    titleCell.value = title.toUpperCase();
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.border = { bottom: { style: 'medium', color: { argb: 'FF1E293B' } } };

    sheet.getRow(5).height = 25;
    sheet.mergeCells(5, 2, 5, lastColIndex);
    const dateCell = sheet.getCell(5, 2);
    dateCell.value = `Généré officiellement le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`;
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };

    // 6. Tableau - Headers
    const startRow = 8;
    const headerRow = sheet.getRow(startRow);
    headerRow.height = 35;

    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 2);
        cell.value = h.toUpperCase();
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Sleek Dark Header
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };
    });

    // 7. Tableau - Data
    data.forEach((rowData, rowIndex) => {
        const row = sheet.getRow(startRow + 1 + rowIndex);
        row.height = 28;
        rowData.forEach((val, colIndex) => {
            const cell = row.getCell(colIndex + 2);
            cell.value = val;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { name: 'Arial', size: 10 };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };

            if (rowIndex % 2 === 0) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }

            if (typeof val === 'number') {
                cell.numFmt = '#,##0.00';
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
            }
        });
    });

    // 8. Signature & QR Code
    const currentY = startRow + data.length + 4;
    sheet.getRow(currentY).height = 110;

    // QR Code Position - Bottom Left of the data area
    try {
        const qrData = `SIHG-SONAP-OFFICIAL-VALIDA-${Date.now()}-${signerName || 'USER'}`;
        const qrB64 = await QRCode.toDataURL(qrData, {
            width: 140,
            margin: 1,
            color: { dark: '#1E293B', light: '#FFFFFF' }
        });
        const base64Data = qrB64.includes(',') ? qrB64.split(',')[1] : qrB64;
        const id = workbook.addImage({ base64: base64Data, extension: 'png' });
        sheet.addImage(id, {
            tl: { col: 1.2, row: currentY - 0.2 },
            ext: { width: 95, height: 95 }
        });

        const qrHint = sheet.getCell(currentY + 4, 2);
        qrHint.value = "SCANNER POUR VÉRIFIER";
        qrHint.font = { size: 7, bold: true, color: { argb: 'FF94A3B8' } };
        qrHint.alignment = { horizontal: 'center' };

    } catch (e) { console.error('QR Error', e); }

    // Official Signature Block (Right Side)
    const roleLabel = signerRole ? (ROLE_SIGNATURE[signerRole]?.droite || "SIGNATURE AUTORISÉE") : "SIGNATURE AUTORISÉE";
    const sigColStart = Math.max(2, lastColIndex - 2);

    sheet.mergeCells(currentY, sigColStart, currentY, lastColIndex);
    const sigHeader = sheet.getCell(currentY, sigColStart);
    sigHeader.value = "POUR VALOIR CE QUE DE DROIT,";
    sigHeader.font = { bold: true, size: 9, name: 'Arial' };
    sigHeader.alignment = { horizontal: 'center' };

    sheet.mergeCells(currentY + 1, sigColStart, currentY + 1, lastColIndex);
    const sigRole = sheet.getCell(currentY + 1, sigColStart);
    sigRole.value = roleLabel.toUpperCase();
    sigRole.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF1E293B' } };
    sigRole.alignment = { horizontal: 'center' };

    sheet.mergeCells(currentY + 2, sigColStart, currentY + 2, lastColIndex);
    const sigName = sheet.getCell(currentY + 2, sigColStart);
    sigName.value = signerName || "DIRECTION GÉNÉRALE SIHG";
    sigName.font = { italic: true, size: 10, name: 'Arial' };
    sigName.alignment = { horizontal: 'center' };

    // Placeholder line
    const lineRow = currentY + 4;
    for (let c = sigColStart; c <= lastColIndex; c++) {
        sheet.getCell(lineRow, c).border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
    }

    sheet.mergeCells(lineRow + 1, sigColStart, lineRow + 1, lastColIndex);
    const stampCell = sheet.getCell(lineRow + 1, sigColStart);
    stampCell.value = "(Signature et Cachet Officiel)";
    stampCell.font = { size: 8, italic: true, color: { argb: 'FF64748B' } };
    stampCell.alignment = { horizontal: 'center' };

    const footerY = currentY + 8;
    sheet.mergeCells(footerY, 2, footerY, lastColIndex);
    const footerCell = sheet.getCell(footerY, 2);
    footerCell.value = "Document généré par le Système Intégré de Gestion des Hydrocarbures (SIHG) - Propriété exclusive de la SONAP";
    footerCell.font = { size: 8, italic: true, color: { argb: 'FF94A3B8' } };
    footerCell.alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
