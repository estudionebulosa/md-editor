/**
 * Preview Mode - markdown-it renderer
 * Renderiza Markdown a HTML con plugins extendidos
 */

export class PreviewMode {
  constructor(container) {
    this.container = container;
    this.md = null;
    this.init();
  }
  
  async init() {
    // Importar markdown-it y plugins desde CDN
    const [
      { default: MarkdownIt },
      { default: markdownItFootnote }
    ] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/markdown-it@14/+esm'),
      import('https://cdn.jsdelivr.net/npm/markdown-it-footnote@4/+esm')
    ]);
    
    // Configurar markdown-it
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: false
    });
    
    // Agregar plugins
    this.md.use(markdownItFootnote);
    
    // Plugin para callouts (blockquotes especiales)
    this.md.use(this.calloutPlugin.bind(this));
    
    // Plugin para contenedores FAQ
    this.md.use(this.faqPlugin.bind(this));
    
    // Renderizar contenido inicial
    this.render('', {});
  }
  
  calloutPlugin(md) {
    const defaultRender = md.renderer.rules.blockquote_open || 
      function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };
    
    md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
      const nextToken = tokens[idx + 2];
      if (nextToken && nextToken.type === 'inline') {
        const content = nextToken.content;
        const match = content.match(/^\[!(tip|warning|note|info|error)\]/i);
        
        if (match) {
          const type = match[1].toLowerCase();
          tokens[idx].attrSet('class', `callout callout-${type}`);
          
          // Remover el [!type] del contenido
          nextToken.content = content.replace(/^\[!(tip|warning|note|info|error)\]\s*/i, '');
        }
      }
      
      return defaultRender(tokens, idx, options, env, self);
    };
  }
  
  faqPlugin(md) {
    const originalRender = md.render.bind(md);
    
    md.render = (src, env) => {
      // Procesar contenedores ::: faq
      src = src.replace(/:::\s*faq\n([\s\S]*?):::/g, (match, content) => {
        const items = content.trim().split(/\n###\s+/).filter(Boolean);
        
        const faqHTML = items.map(item => {
          const [question, ...answerParts] = item.split('\n');
          const answer = answerParts.join('\n').trim();
          
          return `
            <details class="faq-item">
              <summary class="faq-question">${question.trim()}</summary>
              <div class="faq-answer">${md.render(answer)}</div>
            </details>
          `;
        }).join('');
        
        return `<div class="faq-container">${faqHTML}</div>`;
      });
      
      return originalRender(src, env);
    };
  }
  
  render(content, frontmatter = {}) {
    if (!this.md) return;
    
    // Renderizar markdown
    let html = this.md.render(content);
    
    // Agregar estilos para callouts y FAQs
    const styles = `
      <style>
        .preview-content {
          padding: 24px;
          line-height: 1.6;
          color: var(--editor-text, #1a1a1a);
        }
        
        .preview-content h1,
        .preview-content h2,
        .preview-content h3,
        .preview-content h4,
        .preview-content h5,
        .preview-content h6 {
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
          line-height: 1.25;
        }
        
        .preview-content h1 { font-size: 2em; border-bottom: 1px solid var(--editor-border, #e0e0e0); padding-bottom: 0.3em; }
        .preview-content h2 { font-size: 1.5em; border-bottom: 1px solid var(--editor-border, #e0e0e0); padding-bottom: 0.3em; }
        .preview-content h3 { font-size: 1.25em; }
        
        .preview-content p {
          margin-bottom: 16px;
        }
        
        .preview-content code {
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 0.9em;
        }
        
        .preview-content pre {
          background: #f6f8fa;
          padding: 16px;
          border-radius: 6px;
          overflow: auto;
          margin-bottom: 16px;
        }
        
        .preview-content pre code {
          background: transparent;
          padding: 0;
        }
        
        .preview-content blockquote {
          margin: 16px 0;
          padding: 12px 16px;
          border-left: 4px solid var(--editor-accent, #0066cc);
          background: rgba(0, 102, 204, 0.05);
        }
        
        .preview-content .callout {
          border-radius: 6px;
          padding: 16px;
          margin: 16px 0;
        }
        
        .preview-content .callout-tip {
          background: #d4edda;
          border-left-color: #28a745;
        }
        
        .preview-content .callout-warning {
          background: #fff3cd;
          border-left-color: #ffc107;
        }
        
        .preview-content .callout-note {
          background: #d1ecf1;
          border-left-color: #17a2b8;
        }
        
        .preview-content .callout-info {
          background: #cce5ff;
          border-left-color: #007bff;
        }
        
        .preview-content .callout-error {
          background: #f8d7da;
          border-left-color: #dc3545;
        }
        
        .preview-content .faq-container {
          margin: 24px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
        }
        
        .preview-content .faq-item {
          margin-bottom: 12px;
          border: 1px solid var(--editor-border, #e0e0e0);
          border-radius: 6px;
          overflow: hidden;
        }
        
        .preview-content .faq-question {
          padding: 12px 16px;
          background: var(--editor-toolbar-bg, #f8f9fa);
          cursor: pointer;
          font-weight: 600;
          user-select: none;
        }
        
        .preview-content .faq-question:hover {
          background: var(--editor-button-hover, #e9ecef);
        }
        
        .preview-content .faq-answer {
          padding: 16px;
        }
        
        .preview-content table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 16px;
        }
        
        .preview-content table th,
        .preview-content table td {
          border: 1px solid var(--editor-border, #e0e0e0);
          padding: 8px 12px;
          text-align: left;
        }
        
        .preview-content table th {
          background: var(--editor-toolbar-bg, #f8f9fa);
          font-weight: 600;
        }
        
        .preview-content a {
          color: var(--editor-accent, #0066cc);
          text-decoration: none;
        }
        
        .preview-content a:hover {
          text-decoration: underline;
        }
        
        .preview-content ul,
        .preview-content ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }
        
        .preview-content li {
          margin-bottom: 4px;
        }
        
        .preview-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        
        .preview-content hr {
          border: none;
          border-top: 2px solid var(--editor-border, #e0e0e0);
          margin: 24px 0;
        }
        
        /* Dark mode adjustments */
        :host([theme="dark"]) .preview-content code {
          background: rgba(255, 255, 255, 0.1);
        }
        
        :host([theme="dark"]) .preview-content pre {
          background: #2d2d2d;
        }
        
        :host([theme="dark"]) .preview-content .faq-container {
          background: rgba(255, 255, 255, 0.02);
        }
      </style>
    `;
    
    this.container.innerHTML = `
      ${styles}
      <div class="preview-content">
        ${html}
      </div>
    `;
  }
  
  getHTML() {
    const previewContent = this.container.querySelector('.preview-content');
    return previewContent ? previewContent.innerHTML : '';
  }
}
