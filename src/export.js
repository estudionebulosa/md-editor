/**
 * Export - Funciones de exportación HTML, PDF y MD
 */

export function exportHTML(content, frontmatter = {}) {
  const html = generateHTML(content, frontmatter);
  downloadFile(html, `${frontmatter.slug || 'documento'}.html`, 'text/html');
}

export async function exportPDF(htmlContent, filename = 'documento') {
  // Importar html2pdf desde CDN
  const { default: html2pdf } = await import('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10/+esm');
  
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  element.style.padding = '20px';
  element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';
  element.style.lineHeight = '1.6';
  element.style.color = '#1a1a1a';
  
  document.body.appendChild(element);
  
  const opt = {
    margin: 10,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  await html2pdf().set(opt).from(element).save();
  
  document.body.removeChild(element);
}

export function exportMD(content, filename = 'documento.md') {
  downloadFile(content, filename, 'text/markdown');
}

function generateHTML(content, frontmatter = {}) {
  const title = frontmatter.title || 'Documento';
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    
    h1 { font-size: 2em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3em; }
    
    code {
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 0.9em;
    }
    
    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
    }
    
    pre code {
      background: transparent;
      padding: 0;
    }
    
    blockquote {
      margin: 16px 0;
      padding: 12px 16px;
      border-left: 4px solid #0066cc;
      background: rgba(0, 102, 204, 0.05);
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }
    
    th, td {
      border: 1px solid #e0e0e0;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    a {
      color: #0066cc;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}
