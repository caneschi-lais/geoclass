import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import XLSX from 'xlsx';

export class ExportService {
  /**
   * Exporta dados para Excel (XLSX)
   */
  static async exportToExcel(data: any[], filename: string) {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, `${filename}.xlsx`);
        return;
      }

      const uri = FileSystem.documentDirectory + `${filename}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, wbout, {
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
