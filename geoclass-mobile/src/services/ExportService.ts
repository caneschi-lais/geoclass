import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import ExcelJS from 'exceljs';

export interface ExcelExportOptions {
  title?: string;
  subtitle?: string;
  chartData?: { label: string; value: number }[];
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    base64 += chars[b0 >> 2];
    base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return base64;
}

function createVisualBar(percentage: number): string {
  const totalBars = 20;
  const clamped = Math.min(100, Math.max(0, percentage));
  const filledBars = Math.round((clamped / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return `${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}  ${clamped.toFixed(1)}%`;
}

export class ExportService {
  /**
   * Exporta dados para Excel (XLSX) utilizando ExcelJS com formatação rica,
   * gráficos visuais, resumo executivo (KPIs) e estilos idênticos ao padrão do PDF.
   */
  static async exportToExcel(data: any[], filename: string, options?: ExcelExportOptions) {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GeoClass';
      workbook.lastModifiedBy = 'GeoClass - Coordenação';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet('Relatório Analítico', {
        views: [{ showGridLines: true }]
      });

      const reportTitle = options?.title || filename.replace(/_/g, ' ');
      const subTitle = options?.subtitle || 'GeoClass - Sistema Inteligente de Presença • Coordenação Acadêmica';
      const generationDate = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      // Determina quantidade de colunas da planilha
      let columnCount = 5;
      if (data && data.length > 0 && typeof data[0] === 'object') {
        columnCount = Math.max(columnCount, Object.keys(data[0]).length);
      }
      const lastColLetter = String.fromCharCode(64 + Math.min(columnCount, 26));

      // 1. BANNER DO TÍTULO PRINCIPAL (Dark Slate #0F172A)
      const titleRow = worksheet.addRow([reportTitle]);
      titleRow.height = 36;
      titleRow.getCell(1).font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.mergeCells(`A1:${lastColLetter}1`);

      // 2. SUBTÍTULO (Slate #1E293B)
      const subRow = worksheet.addRow([subTitle]);
      subRow.height = 20;
      subRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFE2E8F0' } };
      subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      subRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.mergeCells(`A2:${lastColLetter}2`);

      // 3. DATA E HORA DE GERAÇÃO
      const dateRow = worksheet.addRow([generationDate]);
      dateRow.height = 20;
      dateRow.getCell(1).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF64748B' } };
      dateRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      dateRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.mergeCells(`A3:${lastColLetter}3`);

      worksheet.addRow([]); // Espaçamento

      // 4. RESUMO EXECUTIVO (KPIs)
      if (data && data.length > 0) {
        let totalCount = 0;
        let sumPresence = 0;
        let riskCount = 0;

        data.forEach(item => {
          let pVal: number | null = null;
          for (const key of Object.keys(item)) {
            if (key.includes('Presença') || key.includes('%')) {
              const raw = item[key];
              const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw).replace('%', ''));
              if (!isNaN(parsed)) {
                pVal = parsed;
                break;
              }
            }
          }

          if (pVal !== null) {
            totalCount++;
            sumPresence += pVal;
            if (pVal < 75) riskCount++;
          }
        });

        const kpiSection = worksheet.addRow(['RESUMO EXECUTIVO']);
        kpiSection.height = 22;
        kpiSection.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF334155' } };
        worksheet.mergeCells(`A${kpiSection.number}:${lastColLetter}${kpiSection.number}`);

        const avgPresence = totalCount > 0 ? (sumPresence / totalCount).toFixed(1) : '100.0';
        const kpiRow = worksheet.addRow([
          `Total de Registros: ${data.length}`,
          `Média de Presença: ${avgPresence}%`,
          `Casos em Risco (<75%): ${riskCount}`,
          `Status Geral: ${riskCount > 0 ? 'Atenção Necessária' : 'Frequência Regular'}`
        ]);
        kpiRow.height = 26;
        kpiRow.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        });

        worksheet.addRow([]); // Espaçamento
      }

      // 5. SEÇÃO DE GRÁFICO VISUAL (se houver chartData)
      if (options?.chartData && options.chartData.length > 0) {
        const chartTitleRow = worksheet.addRow(['ESTATÍSTICAS & INDICADORES VISUAIS DE FREQUÊNCIA (GRÁFICO)']);
        chartTitleRow.height = 22;
        chartTitleRow.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
        worksheet.mergeCells(`A${chartTitleRow.number}:${lastColLetter}${chartTitleRow.number}`);

        const chartHeaderRow = worksheet.addRow(['Item / Referência', 'Presença (%)', 'Gráfico Visual', 'Classificação', 'Situação']);
        chartHeaderRow.height = 24;
        chartHeaderRow.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF1E293B' } },
            bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
          };
        });

        options.chartData.forEach(item => {
          const val = Number(item.value);
          const isRisk = val < 75;
          const isWarning = val >= 75 && val < 85;
          const barStr = createVisualBar(val);
          const statusText = isRisk ? '🔴 Crítico (< 75%)' : isWarning ? '🟡 Atenção (75%-84%)' : '🟢 Regular (>= 85%)';
          const sitText = isRisk ? 'Alto Risco de Reprovação' : isWarning ? 'Acompanhamento Sugerido' : 'Frequência Adequada';

          const r = worksheet.addRow([item.label, `${val}%`, barStr, statusText, sitText]);
          r.height = 22;
          r.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
          r.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

          r.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: isRisk ? 'FFB91C1C' : isWarning ? 'FFB45309' : 'FF15803D' } };
          r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

          r.getCell(3).font = { name: 'Consolas', size: 9, bold: true, color: { argb: isRisk ? 'FFDC2626' : isWarning ? 'FFD97706' : 'FF16A34A' } };
          r.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

          r.getCell(4).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isRisk ? 'FFB91C1C' : isWarning ? 'FFB45309' : 'FF15803D' } };
          r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

          r.getCell(5).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
          r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

          const rowBg = isRisk ? 'FFFEE2E2' : isWarning ? 'FFFFFBEB' : 'FFF0FDF4';
          r.eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            c.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        });

        worksheet.addRow([]); // Espaçamento
      }

      // 6. TABELA PRINCIPAL DE DADOS (Detalhamento)
      if (data && data.length > 0) {
        const tableTitleRow = worksheet.addRow(['DETALHAMENTO DOS REGISTROS']);
        tableTitleRow.height = 22;
        tableTitleRow.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
        worksheet.mergeCells(`A${tableTitleRow.number}:${lastColLetter}${tableTitleRow.number}`);

        const headers = Object.keys(data[0]);
        const tableHeaderRow = worksheet.addRow(headers);
        tableHeaderRow.height = 26;
        tableHeaderRow.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Royal Blue
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
            bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
            left: { style: 'thin', color: { argb: 'FF3B82F6' } },
            right: { style: 'thin', color: { argb: 'FF3B82F6' } }
          };
        });

        data.forEach((rowObj, index) => {
          const rowValues = headers.map(h => rowObj[h]);
          const row = worksheet.addRow(rowValues);
          row.height = 22;

          const isEven = index % 2 === 0;
          const defaultBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

          row.eachCell((cell, colIndex) => {
            const headerName = headers[colIndex - 1] || '';
            cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };

            // Formatação condicional para Presença
            if (headerName.includes('Presença') || headerName.includes('%')) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              const numVal = parseFloat(String(cell.value).replace('%', ''));
              if (!isNaN(numVal)) {
                if (numVal < 75) {
                  cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                } else if (numVal < 85) {
                  cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFB45309' } };
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                } else {
                  cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
                }
              }
            } else if (['RA', 'Semestre', 'Sala', 'Aulas Previstas', 'Status'].includes(headerName)) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            }
          });
        });
      }

      worksheet.addRow([]); // Espaçamento

      // 7. RODAPÉ INSTITUCIONAL
      const footerRow = worksheet.addRow(['GeoClass • Sistema Inteligente de Presença • Coordenação Acadêmica • Uso Restrito']);
      footerRow.height = 20;
      footerRow.getCell(1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
      footerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.mergeCells(`A${footerRow.number}:${lastColLetter}${footerRow.number}`);

      // 8. AUTO-AJUSTE DAS LARGURAS DAS COLUNAS
      worksheet.columns.forEach(column => {
        if (!column) return;
        let maxLen = 16;
        if (typeof column.eachCell === 'function') {
          column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
            // Ignora linhas mescladas (título, subtítulo, rodapé, etc.) para o cálculo de largura
            if (rowNumber > 4 && cell.value) {
              const s = String(cell.value);
              if (s.length > maxLen) {
                maxLen = s.length;
              }
            }
          });
        }
        column.width = Math.min(48, maxLen + 4);
      });

      // 9. GERAÇÃO DO BUFFER
      const buffer = await workbook.xlsx.writeBuffer();

      // Exportação para WEB
      if (Platform.OS === 'web') {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${filename}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
        return;
      }

      // Exportação para MOBILE (Android / iOS)
      const base64Data = uint8ArrayToBase64(new Uint8Array(buffer));
      const uri = FileSystem.documentDirectory + `${filename}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar Relatório Excel',
        UTI: 'com.microsoft.excel.xls'
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      throw error;
    }
  }

  /**
   * Exporta dados para PDF gerando um HTML dinâmico
   */
  static async exportToPDF(htmlContent: string, filename: string) {
    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '', 'width=900,height=700');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          // Espera as fontes carregarem
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        } else {
          alert('Por favor, permita pop-ups no seu navegador para gerar o PDF.');
        }
        return;
      }

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      const newUri = FileSystem.documentDirectory + `${filename}.pdf`;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri
      });

      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar Relatório PDF',
        UTI: 'com.adobe.pdf'
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      throw error;
    }
  }

  /**
   * Helper para montar HTML de tabela com design Premium e Gráficos CSS opcionais
   */
  static generateHTMLTable(title: string, headers: string[], rows: any[][], chartData?: {label: string, value: number}[]) {
    const tableHeaders = headers.map(h => `<th>${h}</th>`).join('');
    
    const tableRows = rows.map(row => {
      const cols = row.map(col => {
        if (typeof col === 'string' && col.includes('%') && !col.includes('<span') && !col.includes('<strong')) {
          const val = parseInt(col);
          if (!isNaN(val)) {
            if (val >= 25) {
              return `<td><span class="badge badge-danger">${col}</span></td>`;
            } else if (val >= 15) {
              return `<td><span class="badge badge-warning">${col}</span></td>`;
            } else {
              return `<td><span class="badge badge-success">${col}</span></td>`;
            }
          }
        }
        return `<td>${col}</td>`;
      }).join('');
      return `<tr>${cols}</tr>`;
    }).join('');

    let chartHTML = '';
    if (chartData && chartData.length > 0) {
      const rowsHTML = chartData.map(item => `
        <div class="chart-row">
          <div class="chart-label">${item.label}</div>
          <div class="chart-bar-container">
            <div class="chart-bar ${item.value >= 25 ? 'bg-danger' : item.value >= 15 ? 'bg-warning' : 'bg-success'}" style="width: ${item.value}%"></div>
          </div>
          <div class="chart-value">${item.value}%</div>
        </div>
      `).join('');

      chartHTML = `
        <div class="chart-container">
          <h3>Estatísticas de Faltas</h3>
          <div class="chart">${rowsHTML}</div>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1e293b; 
              background-color: #f8fafc;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
            }
            .header-titles h1 { 
              color: #0f172a; 
              margin: 0 0 8px 0;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: -0.025em;
            }
            .header-titles p {
              margin: 0;
              color: #64748b;
              font-size: 15px;
            }
            .date-badge {
              color: #475569;
              font-size: 13px;
              font-weight: 600;
              background: #f1f5f9;
              padding: 10px 16px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            
            /* Chart Styles */
            .chart-container {
              background: #f8fafc;
              padding: 24px;
              border-radius: 12px;
              margin-bottom: 30px;
              border: 1px solid #e2e8f0;
            }
            .chart-container h3 {
              margin-top: 0;
              color: #334155;
              font-size: 16px;
              margin-bottom: 20px;
            }
            .chart-row {
              display: flex;
              align-items: center;
              margin-bottom: 12px;
            }
            .chart-row:last-child { margin-bottom: 0; }
            .chart-label {
              width: 180px;
              font-size: 13px;
              color: #475569;
              font-weight: 500;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .chart-bar-container {
              flex: 1;
              background: #e2e8f0;
              height: 12px;
              border-radius: 6px;
              margin: 0 16px;
              overflow: hidden;
            }
            .chart-bar {
              height: 100%;
              border-radius: 6px;
            }
            .bg-danger { background-color: #ef4444; }
            .bg-warning { background-color: #f59e0b; }
            .bg-success { background-color: #10b981; }
            .chart-value {
              width: 40px;
              font-size: 13px;
              font-weight: 600;
              color: #334155;
              text-align: right;
            }
            
            table { 
              width: 100%; 
              border-collapse: separate; 
              border-spacing: 0;
            }
            th { 
              background-color: #f8fafc; 
              color: #64748b; 
              padding: 16px; 
              text-align: left; 
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: 2px solid #e2e8f0;
            }
            th:first-child { border-top-left-radius: 8px; }
            th:last-child { border-top-right-radius: 8px; }
            td { 
              padding: 16px; 
              border-bottom: 1px solid #f1f5f9;
              font-size: 14px;
              color: #334155;
              vertical-align: middle;
            }
            tr:hover td { background-color: #f8fafc; }
            tr:last-child td { border-bottom: none; }
            
            .badge {
              padding: 6px 12px;
              border-radius: 9999px;
              font-weight: 700;
              font-size: 12px;
              display: inline-block;
            }
            .badge-danger { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
            .badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
            .badge-success { background: #f0fdf4; color: #10b981; border: 1px solid #dcfce3; }
            .high-absence { color: #ef4444; font-weight: bold; background: #fef2f2; padding: 4px 8px; border-radius: 6px;}
            
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
            }
            
            @media print {
              body { background-color: white; padding: 0; }
              .container { box-shadow: none; padding: 0; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-titles">
                <h1>${title}</h1>
                <p>Relatório Analítico de Frequência</p>
              </div>
              <div class="date-badge">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            ${chartHTML}

            <table>
              <thead><tr>${tableHeaders}</tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="footer">
              <span>GeoClass - Sistema Inteligente de Presença</span>
              <span>Uso restrito da coordenação acadêmica</span>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
