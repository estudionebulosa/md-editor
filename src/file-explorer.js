/**
 * File Explorer - Web Component independiente
 * Explorador de archivos interoperable con sistema de persistencia
 */

export class FileExplorer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Estado interno
    this._files = [];
    this._currentFile = null;
    this._storageKey = 'md-editor-files';
    this._githubToken = null;
    this._githubRepo = null;
    
    // Modo de persistencia: 'local' | 'github' | 'hybrid'
    this._storageMode = 'local';
  }
  
  static get observedAttributes() {
    return ['storage-mode', 'github-repo'];
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadFiles();
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'storage-mode':
        this._storageMode = newValue;
        this.loadFiles();
        break;
      case 'github-repo':
        this._githubRepo = newValue;
        break;
    }
  }
  
  // API pública
  setGitHubToken(token) {
    this._githubToken = token;
    if (this._storageMode === 'github' || this._storageMode === 'hybrid') {
      this.loadFiles();
    }
  }
  
  async loadFiles() {
    try {
      switch (this._storageMode) {
        case 'github':
          await this.loadFromGitHub();
          break;
        case 'hybrid':
          await this.loadHybrid();
          break;
        case 'local':
        default:
          this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading files:', error);
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: error.message }
      }));
    }
  }
  
  async createFile(name, content = '', metadata = {}) {
    const file = {
      name,
      content,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      switch (this._storageMode) {
        case 'github':
          await this.createFileInGitHub(file);
          break;
        case 'hybrid':
          await this.createFileInGitHub(file);
          this.saveToLocalStorage();
          break;
        case 'local':
        default:
          this._files.push(file);
          this.saveToLocalStorage();
      }
      
      this.updateFileListUI();
      this.dispatchEvent(new CustomEvent('file-created', {
        detail: { file }
      }));
      
      return file;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }
  
  async updateFile(name, content, metadata = {}) {
    const fileIndex = this._files.findIndex(f => f.name === name);
    
    if (fileIndex === -1) {
      throw new Error(`File not found: ${name}`);
    }
    
    const file = this._files[fileIndex];
    file.content = content;
    file.metadata = metadata;
    file.updatedAt = new Date().toISOString();
    
    try {
      switch (this._storageMode) {
        case 'github':
          await this.updateFileInGitHub(file);
          break;
        case 'hybrid':
          await this.updateFileInGitHub(file);
          this.saveToLocalStorage();
          break;
        case 'local':
        default:
          this.saveToLocalStorage();
      }
      
      this.updateFileListUI();
      this.dispatchEvent(new CustomEvent('file-updated', {
        detail: { file }
      }));
      
      return file;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }
  
  async deleteFile(name) {
    const fileIndex = this._files.findIndex(f => f.name === name);
    
    if (fileIndex === -1) {
      throw new Error(`File not found: ${name}`);
    }
    
    const file = this._files[fileIndex];
    
    try {
      switch (this._storageMode) {
        case 'github':
          await this.deleteFileFromGitHub(file);
          break;
        case 'hybrid':
          await this.deleteFileFromGitHub(file);
          this.saveToLocalStorage();
          break;
        case 'local':
        default:
          this._files.splice(fileIndex, 1);
          this.saveToLocalStorage();
      }
      
      this.updateFileListUI();
      this.dispatchEvent(new CustomEvent('file-deleted', {
        detail: { file }
      }));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
  
  getFile(name) {
    return this._files.find(f => f.name === name);
  }
  
  getAllFiles() {
    return [...this._files];
  }
  
  // Métodos privados - localStorage
  loadFromLocalStorage() {
    const stored = localStorage.getItem(this._storageKey);
    if (stored) {
      try {
        this._files = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored files:', error);
        this._files = [];
      }
    } else {
      // Inicializar con archivo de ejemplo
      this._files = [
        {
          name: 'ejemplo-completo.md',
          content: '# Ejemplo\n\nEste es un archivo de ejemplo.',
          metadata: {
            title: 'Ejemplo',
            tags: ['ejemplo']
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      this.saveToLocalStorage();
    }
    
    this.updateFileListUI();
  }
  
  saveToLocalStorage() {
    localStorage.setItem(this._storageKey, JSON.stringify(this._files));
  }
  
  // Métodos privados - GitHub API
  async loadFromGitHub() {
    if (!this._githubToken || !this._githubRepo) {
      throw new Error('GitHub token and repo are required for GitHub storage mode');
    }
    
    const [owner, repo] = this._githubRepo.split('/');
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/content`,
      {
        headers: {
          'Authorization': `token ${this._githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const files = await response.json();
    this._files = files
      .filter(f => f.name.endsWith('.md'))
      .map(f => ({
        name: f.name,
        path: f.path,
        sha: f.sha,
        content: '', // Se carga bajo demanda
        metadata: {},
        createdAt: f.created_at,
        updatedAt: f.updated_at
      }));
    
    this.updateFileListUI();
  }
  
  async loadFileContent(file) {
    if (file.content) return file.content;
    
    if (this._storageMode === 'github' || this._storageMode === 'hybrid') {
      const [owner, repo] = this._githubRepo.split('/');
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          headers: {
            'Authorization': `token ${this._githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      file.content = atob(data.content);
      file.sha = data.sha;
    }
    
    return file.content;
  }
  
  async createFileInGitHub(file) {
    if (!this._githubToken || !this._githubRepo) {
      throw new Error('GitHub token and repo are required');
    }
    
    const [owner, repo] = this._githubRepo.split('/');
    const path = `content/${file.name}`;
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this._githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Create ${file.name}`,
          content: btoa(file.content),
          branch: 'main'
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    file.sha = data.content.sha;
    file.path = data.content.path;
  }
  
  async updateFileInGitHub(file) {
    if (!this._githubToken || !this._githubRepo || !file.sha) {
      throw new Error('GitHub token, repo, and file SHA are required');
    }
    
    const [owner, repo] = this._githubRepo.split('/');
    const path = file.path || `content/${file.name}`;
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this._githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update ${file.name}`,
          content: btoa(file.content),
          sha: file.sha,
          branch: 'main'
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    file.sha = data.content.sha;
  }
  
  async deleteFileFromGitHub(file) {
    if (!this._githubToken || !this._githubRepo || !file.sha) {
      throw new Error('GitHub token, repo, and file SHA are required');
    }
    
    const [owner, repo] = this._githubRepo.split('/');
    const path = file.path || `content/${file.name}`;
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${this._githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Delete ${file.name}`,
          sha: file.sha,
          branch: 'main'
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
  }
  
  async loadHybrid() {
    // Cargar de localStorage primero
    this.loadFromLocalStorage();
    
    // Si hay GitHub config, intentar cargar de GitHub también
    if (this._githubToken && this._githubRepo) {
      try {
        await this.loadFromGitHub();
        // Merge: GitHub tiene prioridad
        this.saveToLocalStorage();
      } catch (error) {
        console.warn('Could not load from GitHub, using local files:', error);
      }
    }
  }
  
  // Renderizado
  render() {
    const styles = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          --explorer-bg: #f8f9fa;
          --explorer-text: #1a1a1a;
          --explorer-accent: #0066cc;
          --explorer-border: #e0e0e0;
          --explorer-hover: #e9ecef;
          --explorer-active: #0066cc;
        }
        
        :host([theme="dark"]) {
          --explorer-bg: #2d2d2d;
          --explorer-text: #d4d4d4;
          --explorer-accent: #4a9eff;
          --explorer-border: #3e3e3e;
          --explorer-hover: #3e3e3e;
        }
        
        .explorer-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--explorer-bg);
          color: var(--explorer-text);
          border: 1px solid var(--explorer-border);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .explorer-header {
          padding: 16px;
          border-bottom: 1px solid var(--explorer-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .explorer-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .explorer-actions {
          display: flex;
          gap: 8px;
        }
        
        .explorer-actions button {
          padding: 6px 10px;
          border: 1px solid var(--explorer-border);
          background: var(--explorer-bg);
          color: var(--explorer-text);
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .explorer-actions button:hover {
          background: var(--explorer-hover);
          border-color: var(--explorer-accent);
        }
        
        .file-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        
        .file-item {
          padding: 12px;
          margin-bottom: 8px;
          background: var(--explorer-bg);
          border: 1px solid var(--explorer-border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        .file-item:hover {
          border-color: var(--explorer-accent);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .file-item.active {
          border-color: var(--explorer-accent);
          background: var(--explorer-hover);
        }
        
        .file-item-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 4px;
        }
        
        .file-item-name {
          font-weight: 600;
          font-size: 14px;
          word-break: break-word;
        }
        
        .file-item-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .file-item:hover .file-item-actions {
          opacity: 1;
        }
        
        .file-item-actions button {
          padding: 4px 8px;
          border: none;
          background: transparent;
          color: var(--explorer-text);
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }
        
        .file-item-actions button:hover {
          background: var(--explorer-hover);
        }
        
        .file-item-actions button.delete:hover {
          background: #dc3545;
          color: white;
        }
        
        .file-item-meta {
          font-size: 11px;
          opacity: 0.6;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          opacity: 0.5;
        }
        
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        
        .modal.active {
          display: flex;
        }
        
        .modal-content {
          background: var(--explorer-bg);
          border-radius: 8px;
          padding: 24px;
          min-width: 300px;
          max-width: 500px;
        }
        
        .modal-header {
          margin-bottom: 16px;
          font-size: 18px;
          font-weight: 600;
        }
        
        .modal-body {
          margin-bottom: 20px;
        }
        
        .modal-body input {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--explorer-border);
          border-radius: 4px;
          background: var(--explorer-bg);
          color: var(--explorer-text);
          font-size: 14px;
        }
        
        .modal-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .modal-footer button {
          padding: 8px 16px;
          border: 1px solid var(--explorer-border);
          background: var(--explorer-bg);
          color: var(--explorer-text);
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .modal-footer button.primary {
          background: var(--explorer-accent);
          color: white;
          border-color: var(--explorer-accent);
        }
      </style>
    `;
    
    const template = `
      <div class="explorer-container">
        <div class="explorer-header">
          <h3>📁 Archivos</h3>
          <div class="explorer-actions">
            <button data-action="create-file" title="Crear nuevo archivo">
              ➕ Nuevo
            </button>
            <button data-action="refresh" title="Recargar archivos">
              🔄
            </button>
          </div>
        </div>
        <div class="file-list" id="file-list">
          ${this.renderFileList()}
        </div>
      </div>
      
      <div class="modal" id="create-modal">
        <div class="modal-content">
          <div class="modal-header">Crear nuevo archivo</div>
          <div class="modal-body">
            <input type="text" id="new-file-name" placeholder="nombre-del-archivo.md" />
          </div>
          <div class="modal-footer">
            <button data-action="cancel-create">Cancelar</button>
            <button class="primary" data-action="confirm-create">Crear</button>
          </div>
        </div>
      </div>
      
      <div class="modal" id="delete-modal">
        <div class="modal-content">
          <div class="modal-header">Eliminar archivo</div>
          <div class="modal-body">
            <p>¿Estás seguro de que deseas eliminar <strong id="delete-file-name"></strong>?</p>
          </div>
          <div class="modal-footer">
            <button data-action="cancel-delete">Cancelar</button>
            <button class="primary" data-action="confirm-delete" style="background: #dc3545;">Eliminar</button>
          </div>
        </div>
      </div>
    `;
    
    this.shadowRoot.innerHTML = styles + template;
  }
  
  renderFileList() {
    if (this._files.length === 0) {
      return '<div class="empty-state">No hay archivos disponibles</div>';
    }
    
    return this._files.map(file => `
      <div class="file-item ${this._currentFile === file.name ? 'active' : ''}" data-file-name="${file.name}">
        <div class="file-item-header">
          <div class="file-item-name">${file.name}</div>
          <div class="file-item-actions">
            <button data-action="edit" data-file-name="${file.name}" title="Editar">✏️</button>
            <button class="delete" data-action="delete" data-file-name="${file.name}" title="Eliminar">🗑️</button>
          </div>
        </div>
        <div class="file-item-meta">
          Actualizado: ${new Date(file.updatedAt).toLocaleDateString()}
        </div>
      </div>
    `).join('');
  }
  
  updateFileListUI() {
    const fileList = this.shadowRoot.getElementById('file-list');
    if (fileList) {
      fileList.innerHTML = this.renderFileList();
    }
  }
  
  setupEventListeners() {
    this.shadowRoot.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      
      const actionType = action.dataset.action;
      const fileName = action.dataset.fileName;
      
      switch (actionType) {
        case 'create-file':
          this.showCreateModal();
          break;
          
        case 'refresh':
          await this.loadFiles();
          break;
          
        case 'cancel-create':
          this.hideCreateModal();
          break;
          
        case 'confirm-create':
          await this.handleCreateFile();
          break;
          
        case 'edit':
          await this.handleEditFile(fileName);
          break;
          
        case 'delete':
          this.showDeleteModal(fileName);
          break;
          
        case 'cancel-delete':
          this.hideDeleteModal();
          break;
          
        case 'confirm-delete':
          await this.handleDeleteFile();
          break;
      }
      
      // Click en archivo para seleccionarlo
      const fileItem = e.target.closest('.file-item');
      if (fileItem && !e.target.closest('.file-item-actions')) {
        const name = fileItem.dataset.fileName;
        this.selectFile(name);
      }
    });
  }
  
  selectFile(name) {
    this._currentFile = name;
    this.updateFileListUI();
    
    const file = this.getFile(name);
    if (file) {
      this.dispatchEvent(new CustomEvent('file-selected', {
        detail: { file }
      }));
    }
  }
  
  showCreateModal() {
    const modal = this.shadowRoot.getElementById('create-modal');
    modal.classList.add('active');
    const input = this.shadowRoot.getElementById('new-file-name');
    input.value = '';
    input.focus();
  }
  
  hideCreateModal() {
    const modal = this.shadowRoot.getElementById('create-modal');
    modal.classList.remove('active');
  }
  
  async handleCreateFile() {
    const input = this.shadowRoot.getElementById('new-file-name');
    const name = input.value.trim();
    
    if (!name) {
      alert('Por favor ingresa un nombre de archivo');
      return;
    }
    
    if (!name.endsWith('.md')) {
      alert('El nombre del archivo debe terminar en .md');
      return;
    }
    
    try {
      await this.createFile(name, '# Nuevo archivo\n\nContenido aquí...');
      this.hideCreateModal();
    } catch (error) {
      alert('Error al crear el archivo: ' + error.message);
    }
  }
  
  async handleEditFile(name) {
    const file = this.getFile(name);
    if (file) {
      // Cargar contenido si es necesario
      if (this._storageMode === 'github' || this._storageMode === 'hybrid') {
        await this.loadFileContent(file);
      }
      
      this.dispatchEvent(new CustomEvent('file-selected', {
        detail: { file }
      }));
    }
  }
  
  showDeleteModal(name) {
    const modal = this.shadowRoot.getElementById('delete-modal');
    const fileNameDisplay = this.shadowRoot.getElementById('delete-file-name');
    fileNameDisplay.textContent = name;
    modal.classList.add('active');
    modal.dataset.fileName = name;
  }
  
  hideDeleteModal() {
    const modal = this.shadowRoot.getElementById('delete-modal');
    modal.classList.remove('active');
  }
  
  async handleDeleteFile() {
    const modal = this.shadowRoot.getElementById('delete-modal');
    const name = modal.dataset.fileName;
    
    try {
      await this.deleteFile(name);
      this.hideDeleteModal();
    } catch (error) {
      alert('Error al eliminar el archivo: ' + error.message);
    }
  }
}

// Registrar el custom element
customElements.define('file-explorer', FileExplorer);

export default FileExplorer;
