/**
 * Markdown Editor - Web Component
 * Un editor de Markdown plugable y mobile-first
 */

import { CodeMode } from './modes/code.js';
import { PreviewMode } from './modes/preview.js';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.js';
import { exportHTML, exportPDF, exportMD } from './export.js';
import { getTheme, setTheme, toggleTheme } from './themes.js';
import './file-explorer.js'; // Importar el componente file-explorer

class MarkdownEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Estado interno
    this._mode = 'code'; // 'code' | 'preview'
    this._theme = 'light'; // 'light' | 'dark'
    this._content = '';
    this._frontmatter = {};
    this._path = '';
    this._dirty = false;
    this._sidebarOpen = false;
    
    // Instancias de modos
    this.codeMode = null;
    this.previewMode = null;
    this.fileExplorer = null;
  }
  
  static get observedAttributes() {
    return ['theme', 'mode', 'storage-mode', 'github-repo'];
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.detectSystemTheme();
    this.initializeFileExplorer();
  }
  
  disconnectedCallback() {
    this.cleanupEventListeners();
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'theme':
        this.setTheme(newValue);
        break;
      case 'mode':
        this.setMode(newValue);
        break;
      case 'storage-mode':
        if (this.fileExplorer) {
          this.fileExplorer.setAttribute('storage-mode', newValue);
        }
        break;
      case 'github-repo':
        if (this.fileExplorer) {
          this.fileExplorer.setAttribute('github-repo', newValue);
        }
        break;
    }
  }
  
  // API pública
  load({ content = '', path = '', frontmatter = {} }) {
    this._content = content;
    this._path = path;
    this._frontmatter = frontmatter;
    this._dirty = false;
    
    if (this.codeMode) {
      this.codeMode.setContent(content);
    }
    if (this.previewMode) {
      this.previewMode.render(content, frontmatter);
    }
    
    this.updateMetadataUI();
  }
  
  save() {
    return {
      content: this._content,
      frontmatter: this._frontmatter,
      path: this._path
    };
  }
  
  get mode() {
    return this._mode;
  }
  
  set mode(value) {
    this.setMode(value);
  }
  
  get theme() {
    return this._theme;
  }
  
  set theme(value) {
    this.setTheme(value);
  }
  
  // Métodos privados
  initializeFileExplorer() {
    this.fileExplorer = this.shadowRoot.querySelector('file-explorer');
    
    if (this.fileExplorer) {
      // Pasar configuración inicial
      const storageMode = this.getAttribute('storage-mode') || 'local';
      const githubRepo = this.getAttribute('github-repo');
      
      if (githubRepo) {
        this.fileExplorer.setAttribute('github-repo', githubRepo);
      }
      
      // Escuchar eventos del file-explorer
      this.fileExplorer.addEventListener('file-selected', async (e) => {
        const file = e.detail.file;
        await this.handleFileSelected(file);
      });
      
      this.fileExplorer.addEventListener('file-created', (e) => {
        const file = e.detail.file;
        this.dispatchEvent(new CustomEvent('file-created', {
          detail: { file }
        }));
      });
      
      this.fileExplorer.addEventListener('file-updated', (e) => {
        const file = e.detail.file;
        this.dispatchEvent(new CustomEvent('file-updated', {
          detail: { file }
        }));
      });
      
      this.fileExplorer.addEventListener('file-deleted', (e) => {
        const file = e.detail.file;
        this.dispatchEvent(new CustomEvent('file-deleted', {
          detail: { file }
        }));
      });
      
      this.fileExplorer.addEventListener('error', (e) => {
        this.dispatchEvent(new CustomEvent('error', {
          detail: e.detail
        }));
      });
    }
  }
  
  async handleFileSelected(file) {
    try {
      // Si el archivo no tiene contenido, cargarlo
      if (!file.content && this.fileExplorer) {
        if (this.fileExplorer.loadFileContent) {
          await this.fileExplorer.loadFileContent(file);
        }
      }
      
      // Parsear frontmatter si existe
      const { frontmatter, content } = parseFrontmatter(file.content || '');
      
      // Cargar en el editor
      this.load({
        content,
        path: file.name,
        frontmatter
      });
      
      this.dispatchEvent(new CustomEvent('file-loaded', {
        detail: { file, path: file.name }
      }));
    } catch (error) {
      console.error('Error loading file:', error);
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: error.message }
      }));
    }
  }
  
  async saveCurrentFile() {
    if (!this._path || !this.fileExplorer) {
      throw new Error('No file is currently loaded');
    }
    
    const fullContent = serializeFrontmatter(this._frontmatter) + this._content;
    
    try {
      await this.fileExplorer.updateFile(this._path, fullContent, this._frontmatter);
      this._dirty = false;
      
      this.dispatchEvent(new CustomEvent('file-saved', {
        detail: { path: this._path }
      }));
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }
  
  render() {
    const styles = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          --editor-bg: #ffffff;
          --editor-text: #1a1a1a;
          --editor-accent: #0066cc;
          --editor-border: #e0e0e0;
          --editor-toolbar-bg: #f8f9fa;
          --editor-button-hover: #e9ecef;
          --sidebar-width: 300px;
        }
        
        :host([theme="dark"]) {
          --editor-bg: #1e1e1e;
          --editor-text: #d4d4d4;
          --editor-accent: #4a9eff;
          --editor-border: #3e3e3e;
          --editor-toolbar-bg: #2d2d2d;
          --editor-button-hover: #3e3e3e;
        }
        
        .editor-wrapper {
          display: flex;
          height: 100%;
          min-height: 600px;
          position: relative;
        }
        
        .sidebar {
          width: 0;
          overflow: hidden;
          transition: width 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        
        .sidebar.open {
          width: var(--sidebar-width);
        }
        
        .editor-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--editor-bg);
          color: var(--editor-text);
          overflow: hidden;
        }
        
        .toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--editor-toolbar-bg);
          border-bottom: 1px solid var(--editor-border);
          flex-wrap: wrap;
        }
        
        .toolbar-group {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        
        .toolbar-group + .toolbar-group {
          margin-left: 8px;
          padding-left: 8px;
          border-left: 1px solid var(--editor-border);
        }
        
        .toolbar button {
          padding: 6px 12px;
          border: none;
          background: transparent;
          color: var(--editor-text);
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .toolbar button:hover {
          background: var(--editor-button-hover);
        }
        
        .toolbar button.active {
          background: var(--editor-accent);
          color: white;
        }
        
        .metadata {
          padding: 12px 16px;
          background: var(--editor-toolbar-bg);
          border-bottom: 1px solid var(--editor-border);
          font-size: 13px;
        }
        
        .metadata-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .metadata-item {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .metadata-label {
          font-weight: 600;
          opacity: 0.7;
        }
        
        .tags-container {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: var(--editor-accent);
          color: white;
          border-radius: 12px;
          font-size: 12px;
        }
        
        .tag-remove {
          cursor: pointer;
          opacity: 0.7;
          font-size: 14px;
        }
        
        .tag-remove:hover {
          opacity: 1;
        }
        
        .editor-content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        
        .mode-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: none;
          overflow: hidden;
        }
        
        .mode-container.active {
          display: block;
        }
        
        #code-mode {
          display: none;
        }
        
        #code-mode.active {
          display: flex;
          flex-direction: column;
        }
        
        #code-mode :focus {
          outline: none;
        }
        
        .hidden-input {
          display: none;
        }
        
        @media (max-width: 768px) {
          .sidebar.open {
            position: absolute;
            z-index: 10;
            height: 100%;
          }
          
          .toolbar {
            padding: 8px 12px;
          }
          
          .toolbar button {
            padding: 8px 12px;
            font-size: 13px;
          }
        }
      </style>
    `;
    
    const template = `
      <div class="editor-wrapper">
        <aside class="sidebar ${this._sidebarOpen ? 'open' : ''}" id="sidebar">
          <file-explorer 
            storage-mode="${this.getAttribute('storage-mode') || 'local'}"
            ${this.getAttribute('github-repo') ? `github-repo="${this.getAttribute('github-repo')}"` : ''}
          ></file-explorer>
        </aside>
        
        <div class="editor-container">
          <div class="toolbar">
            <div class="toolbar-group">
              <button data-action="toggle-sidebar" title="Mostrar/ocultar archivos">
                📁
              </button>
            </div>
            
            <div class="toolbar-group">
              <button data-mode="code" class="${this._mode === 'code' ? 'active' : ''}">
                ✏️ Código
              </button>
              <button data-mode="preview" class="${this._mode === 'preview' ? 'active' : ''}">
                👁️ Vista Previa
              </button>
            </div>
            
            <div class="toolbar-group">
              <button data-action="theme-toggle" title="Cambiar tema">
                🌓 Tema
              </button>
            </div>
            
            <div class="toolbar-group">
              <button data-action="save-file" title="Guardar archivo">
                💾 Guardar
              </button>
            </div>
            
            <div class="toolbar-group">
              <button data-action="export-html" title="Exportar como HTML">
                📄 HTML
              </button>
              <button data-action="export-pdf" title="Exportar como PDF">
                📋 PDF
              </button>
              <button data-action="export-md" title="Descargar como Markdown">
                ⬇️ MD
              </button>
            </div>
          </div>
          
          <div class="metadata">
            <div class="metadata-row">
              <div class="metadata-item">
                <span class="metadata-label">Ruta:</span>
                <span class="metadata-value" id="path-display">${this._path || 'Sin archivo'}</span>
              </div>
              <div class="metadata-item">
                <span class="metadata-label">Tags:</span>
                <div class="tags-container" id="tags-display">
                  ${this.renderTags()}
                </div>
              </div>
            </div>
          </div>
          
          <div class="editor-content">
            <div class="mode-container ${this._mode === 'code' ? 'active' : ''}" id="code-mode"></div>
            <div class="mode-container ${this._mode === 'preview' ? 'active' : ''}" id="preview-mode"></div>
          </div>
        </div>
      </div>
      
      <input type="file" class="hidden-input" id="file-input" accept=".md,.markdown,.txt" />
    `;
    
    this.shadowRoot.innerHTML = styles + template;
    
    // Inicializar modos
    const codeContainer = this.shadowRoot.getElementById('code-mode');
    const previewContainer = this.shadowRoot.getElementById('preview-mode');
    
    // Inicializar CodeMode con delay para asegurar que el contenedor sea visible
    setTimeout(() => {
      this.codeMode = new CodeMode(codeContainer, (content) => {
        this._content = content;
        this._dirty = true;
        this.dispatchEvent(new CustomEvent('change', { 
          detail: { content, dirty: true } 
        }));
      });
      
      // Renderizar contenido inicial si existe
      if (this._content) {
        setTimeout(() => {
          this.codeMode.setContent(this._content);
        }, 200);
      }
    }, 100);
    
    this.previewMode = new PreviewMode(previewContainer);
    
    // Renderizar preview inicial
    if (this._content) {
      this.previewMode.render(this._content, this._frontmatter);
    }
  }
  
  renderTags() {
    const tags = this._frontmatter.tags || [];
    if (tags.length === 0) {
      return '<span style="opacity: 0.5;">Sin tags</span>';
    }
    
    return tags.map((tag, index) => `
      <span class="tag">
        ${tag}
        <span class="tag-remove" data-tag-index="${index}">×</span>
      </span>
    `).join('');
  }
  
  updateMetadataUI() {
    const pathDisplay = this.shadowRoot.getElementById('path-display');
    const tagsDisplay = this.shadowRoot.getElementById('tags-display');
    
    if (pathDisplay) {
      pathDisplay.textContent = this._path || 'Sin archivo';
    }
    
    if (tagsDisplay) {
      tagsDisplay.innerHTML = this.renderTags();
    }
  }
  
  setupEventListeners() {
    // Click handler principal
    this.shadowRoot.addEventListener('click', (e) => {
      // Toggle sidebar
      if (e.target.closest('[data-action="toggle-sidebar"]')) {
        this.toggleSidebar();
        return;
      }
      
      // Modo de edición
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) {
        this.setMode(modeBtn.dataset.mode);
        return;
      }
      
      // Toggle de tema
      if (e.target.closest('[data-action="theme-toggle"]')) {
        this.toggleTheme();
        return;
      }
      
      // Guardar archivo
      if (e.target.closest('[data-action="save-file"]')) {
        this.saveCurrentFile().catch(error => {
          alert('Error al guardar: ' + error.message);
        });
        return;
      }
      
      // Exportar
      if (e.target.closest('[data-action="export-html"]')) {
        const previewHTML = this.previewMode.getHTML();
        exportHTML(previewHTML, this._frontmatter);
        return;
      }
      
      if (e.target.closest('[data-action="export-pdf"]')) {
        const previewHTML = this.previewMode.getHTML();
        exportPDF(previewHTML, this._frontmatter.title || 'documento');
        return;
      }
      
      if (e.target.closest('[data-action="export-md"]')) {
        const fullContent = serializeFrontmatter(this._frontmatter) + this._content;
        const filename = this._path || 'documento.md';
        exportMD(fullContent, filename);
        return;
      }
      
      // Eliminar tag
      const tagRemove = e.target.closest('.tag-remove');
      if (tagRemove) {
        const index = parseInt(tagRemove.dataset.tagIndex);
        this.removeTag(index);
        return;
      }
    });
  }
  
  cleanupEventListeners() {
    // Limpieza si es necesaria
  }
  
  toggleSidebar() {
    this._sidebarOpen = !this._sidebarOpen;
    const sidebar = this.shadowRoot.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open', this._sidebarOpen);
    }
  }
  
  setMode(mode) {
    if (this._mode === mode) return;
    
    this._mode = mode;
    
    // Actualizar botones
    const buttons = this.shadowRoot.querySelectorAll('[data-mode]');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Actualizar contenedores
    const codeContainer = this.shadowRoot.getElementById('code-mode');
    const previewContainer = this.shadowRoot.getElementById('preview-mode');
    
    codeContainer.classList.toggle('active', mode === 'code');
    previewContainer.classList.toggle('active', mode === 'preview');
    
    // Renderizar preview si es necesario
    if (mode === 'preview') {
      this.previewMode.render(this._content, this._frontmatter);
    }
    
    this.dispatchEvent(new CustomEvent('mode-change', { 
      detail: { mode } 
    }));
  }
  
  setTheme(theme) {
    this._theme = theme;
    this.setAttribute('theme', theme);
    setTheme(theme);
    
    // Pasar tema al file-explorer
    if (this.fileExplorer) {
      this.fileExplorer.setAttribute('theme', theme);
    }
    
    this.dispatchEvent(new CustomEvent('theme-change', { 
      detail: { theme } 
    }));
  }
  
  toggleTheme() {
    const newTheme = this._theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
  
  detectSystemTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(prefersDark ? 'dark' : 'light');
    
    // Escuchar cambios en el tema del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.setTheme(e.matches ? 'dark' : 'light');
    });
  }
  
  addTag(tag) {
    if (!this._frontmatter.tags) {
      this._frontmatter.tags = [];
    }
    if (!this._frontmatter.tags.includes(tag)) {
      this._frontmatter.tags.push(tag);
      this.updateMetadataUI();
      this._dirty = true;
      this.dispatchEvent(new CustomEvent('change', { 
        detail: { frontmatter: this._frontmatter, dirty: true } 
      }));
    }
  }
  
  removeTag(index) {
    if (this._frontmatter.tags && this._frontmatter.tags[index]) {
      this._frontmatter.tags.splice(index, 1);
      this.updateMetadataUI();
      this._dirty = true;
      this.dispatchEvent(new CustomEvent('change', { 
        detail: { frontmatter: this._frontmatter, dirty: true } 
      }));
    }
  }
}

// Registrar el custom element
customElements.define('markdown-editor', MarkdownEditor);

export default MarkdownEditor;
