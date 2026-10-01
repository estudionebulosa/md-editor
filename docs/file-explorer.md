# File Explorer - Módulo Interoperable

## Arquitectura

El **File Explorer** es un Web Component independiente (`<file-explorer>`) que se comunica con el editor mediante eventos personalizados y una API pública.

```
┌─────────────────────────────────────────────────────────┐
│                    Markdown Editor                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │              File Explorer (Componente)           │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  • Crear archivos                          │  │  │
│  │  │  • Editar archivos                         │  │  │
│  │  │  • Eliminar archivos                       │  │  │
│  │  │  • Persistencia (local/GitHub/hybrid)      │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                     ↕ Eventos                    │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  • file-selected                           │  │  │
│  │  │  • file-created                            │  │  │
│  │  │  • file-updated                            │  │  │
│  │  │  • file-deleted                            │  │  │
│  │  │  • error                                   │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↕                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Editor Core                          │  │
│  │  • Code Mode (textarea)                          │  │
│  │  • Preview Mode (markdown-it)                    │  │
│  │  • Frontmatter parser                            │  │
│  │  • Export (HTML/PDF/MD)                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Comunicación entre Componentes

### 1. Eventos Personalizados (CustomEvent)

El File Explorer emite eventos que el Editor escucha:

```javascript
// File Explorer emite
fileExplorer.dispatchEvent(new CustomEvent('file-selected', {
  detail: { file: { name, content, metadata } }
}));

// Editor escucha
fileExplorer.addEventListener('file-selected', (e) => {
  const file = e.detail.file;
  editor.load({ content: file.content, path: file.name });
});
```

### 2. API Pública

El File Explorer expone métodos para manipular archivos:

```javascript
const explorer = document.querySelector('file-explorer');

// Crear archivo
await explorer.createFile('nuevo.md', '# Contenido', { title: 'Nuevo' });

// Actualizar archivo
await explorer.updateFile('nuevo.md', '# Contenido actualizado', { title: 'Actualizado' });

// Eliminar archivo
await explorer.deleteFile('nuevo.md');

// Obtener archivo
const file = explorer.getFile('nuevo.md');

// Obtener todos los archivos
const allFiles = explorer.getAllFiles();

// Recargar archivos
await explorer.loadFiles();
```

### 3. Atributos Observables

Configuración vía atributos HTML:

```html
<file-explorer 
  storage-mode="github" 
  github-repo="usuario/repo"
  theme="dark">
</file-explorer>
```

## Modos de Persistencia

### 1. Local (localStorage)

**Uso:** Almacenamiento local en el navegador, sin backend.

```javascript
<file-explorer storage-mode="local"></file-explorer>
```

**Características:**
- ✅ Funciona offline
- ✅ Sin configuración adicional
- ✅ Persistencia entre sesiones
- ❌ Solo local (no sincroniza)
- ❌ Limitado por tamaño del localStorage (~5-10MB)

### 2. GitHub API

**Uso:** Sincronización directa con repositorio de GitHub.

```javascript
<file-explorer 
  storage-mode="github" 
  github-repo="usuario/repo">
</file-explorer>

<script>
  const explorer = document.querySelector('file-explorer');
  explorer.setGitHubToken('ghp_xxxxxxxxxxxx');
</script>
```

**Características:**
- ✅ Sincroniza con repo real
- ✅ Commits automáticos
- ✅ Historial de versiones (git)
- ❌ Requiere token de acceso
- ❌ Necesita conexión a internet
- ❌ Latencia en operaciones

**Requisitos:**
- Personal Access Token con permisos `repo`
- Repositorio con carpeta `content/` para archivos markdown

### 3. Híbrido (GitHub + Local)

**Uso:** Combinación de ambos sistemas con fallback.

```javascript
<file-explorer 
  storage-mode="hybrid" 
  github-repo="usuario/repo">
</file-explorer>
```

**Características:**
- ✅ Sincroniza con GitHub cuando hay conexión
- ✅ Fallback a localStorage si falla GitHub
- ✅ Funciona offline
- ✅ Persistencia local como backup
- ⚠️ Puede haber conflictos de sincronización

## Crear, Editar y Eliminar Archivos

### Crear Archivo

```javascript
const explorer = document.querySelector('file-explorer');

// Crear archivo básico
await explorer.createFile('nuevo-articulo.md', '# Título\n\nContenido...');

// Crear con metadata
await explorer.createFile(
  'nuevo-articulo.md',
  '---\ntitle: Mi Artículo\ntags:\n  - tutorial\n---\n\n# Mi Artículo\n\nContenido...',
  {
    title: 'Mi Artículo',
    tags: ['tutorial'],
    author: 'Estudio Nebulosa'
  }
);
```

### Editar Archivo

```javascript
// Actualizar contenido
await explorer.updateFile(
  'nuevo-articulo.md',
  '# Título Actualizado\n\nNuevo contenido...',
  {
    title: 'Título Actualizado',
    tags: ['tutorial', 'actualizado']
  }
);
```

### Eliminar Archivo

```javascript
await explorer.deleteFile('nuevo-articulo.md');
```

## Integración con CMS

### Ejemplo: Integración con CMS personalizado

```javascript
class CMSIntegration {
  constructor(editor) {
    this.editor = editor;
    this.explorer = editor.shadowRoot.querySelector('file-explorer');
    
    // Escuchar eventos del editor
    this.editor.addEventListener('file-saved', (e) => {
      this.syncToCMS(e.detail.path);
    });
    
    // Escuchar eventos del explorador
    this.explorer.addEventListener('file-created', (e) => {
      this.createInCMS(e.detail.file);
    });
    
    this.explorer.addEventListener('file-updated', (e) => {
      this.updateInCMS(e.detail.file);
    });
    
    this.explorer.addEventListener('file-deleted', (e) => {
      this.deleteFromCMS(e.detail.file.name);
    });
  }
  
  async syncToCMS(path) {
    const file = this.explorer.getFile(path);
    
    // Enviar al CMS
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: file.metadata.title,
        content: file.content,
        tags: file.metadata.tags
      })
    });
  }
  
  async createInCMS(file) {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: file.metadata.title,
        content: file.content,
        tags: file.metadata.tags
      })
    });
  }
  
  async updateInCMS(file) {
    await fetch(`/api/posts/${file.name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: file.metadata.title,
        content: file.content,
        tags: file.metadata.tags
      })
    });
  }
  
  async deleteFromCMS(name) {
    await fetch(`/api/posts/${name}`, {
      method: 'DELETE'
    });
  }
  
  // Cargar desde CMS al explorador
  async loadFromCMS() {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    
    for (const post of posts) {
      await this.explorer.createFile(
        `${post.slug}.md`,
        post.content,
        {
          title: post.title,
          tags: post.tags
        }
      );
    }
  }
}

// Uso
const editor = document.querySelector('markdown-editor');
const cms = new CMSIntegration(editor);
await cms.loadFromCMS();
```

### Ejemplo: Integración con WordPress REST API

```javascript
class WordPressIntegration {
  constructor(editor, siteUrl, authToken) {
    this.editor = editor;
    this.siteUrl = siteUrl;
    this.authToken = authToken;
    this.explorer = editor.shadowRoot.querySelector('file-explorer');
    
    this.setupListeners();
  }
  
  setupListeners() {
    this.explorer.addEventListener('file-saved', (e) => {
      this.syncToWordPress(e.detail.path);
    });
  }
  
  async syncToWordPress(path) {
    const file = this.explorer.getFile(path);
    
    await fetch(`${this.siteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        title: file.metadata.title,
        content: file.content,
        status: 'draft',
        tags: file.metadata.tags
      })
    });
  }
  
  async loadFromWordPress() {
    const response = await fetch(
      `${this.siteUrl}/wp-json/wp/v2/posts?per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );
    
    const posts = await response.json();
    
    for (const post of posts) {
      await this.explorer.createFile(
        `${post.slug}.md`,
        post.content.raw,
        {
          title: post.title.raw,
          tags: post.tags,
          wpId: post.id
        }
      );
    }
  }
}

// Uso
const editor = document.querySelector('markdown-editor');
const wp = new WordPressIntegration(
  editor,
  'https://mi-sitio.com',
  'wp_auth_token'
);
await wp.loadFromWordPress();
```

## Extensibilidad

### Crear tu propio sistema de persistencia

```javascript
class CustomStorage {
  constructor() {
    this.files = new Map();
  }
  
  async save(name, content, metadata) {
    // Tu lógica de persistencia
    await myCustomAPI.save(name, content, metadata);
    this.files.set(name, { content, metadata });
  }
  
  async load(name) {
    // Tu lógica de carga
    const data = await myCustomAPI.load(name);
    this.files.set(name, data);
    return data;
  }
  
  async delete(name) {
    await myCustomAPI.delete(name);
    this.files.delete(name);
  }
  
  async list() {
    return await myCustomAPI.list();
  }
}

// Integrar con File Explorer
const explorer = document.querySelector('file-explorer');
explorer.setCustomStorage(new CustomStorage());
```

## Seguridad

### Tokens de GitHub

⚠️ **Importante:** Los tokens de GitHub son sensibles. En producción:

1. **Nunca hardcodear tokens en el código**
2. **Usar un backend proxy** para manejar las credenciales
3. **Limitar permisos del token** al mínimo necesario
4. **Considerar usar GitHub App** en lugar de Personal Access Token

### Ejemplo con backend proxy

```javascript
// En lugar de llamar directamente a GitHub API
// Tu backend actúa como proxy y maneja el token

class GitHubProxy {
  constructor(editor) {
    this.editor = editor;
    this.explorer = editor.shadowRoot.querySelector('file-explorer');
  }
  
  async loadFiles() {
    const response = await fetch('/api/github/files');
    const files = await response.json();
    
    for (const file of files) {
      await this.explorer.createFile(file.name, file.content, file.metadata);
    }
  }
  
  async saveFile(name, content, metadata) {
    await fetch('/api/github/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, metadata })
    });
  }
}
```

## Resumen

El **File Explorer** es un módulo completamente interoperable que:

✅ Se comunica mediante eventos personalizados  
✅ Expone una API pública para manipulación de archivos  
✅ Soporta múltiples modos de persistencia  
✅ Es extensible para integrarse con cualquier CMS  
✅ Funciona como componente independiente  
✅ Permite crear, editar y eliminar archivos  

**Limitaciones:**
- GitHub API requiere autenticación
- localStorage tiene límites de tamaño
- Operaciones remotas dependen de la conexión

**Recomendaciones:**
- MVP: usar `local` para desarrollo
- Producción: usar backend proxy para GitHub
- CMS: implementar adaptador específico
