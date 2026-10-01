/**
 * Code Mode - Simple textarea editor for MVP
 * Editor de código simple con textarea
 */

export class CodeMode {
  constructor(container, onChange) {
    this.container = container;
    this.onChange = onChange;
    this.textarea = null;
    this.init();
  }
  
  init() {
    // Crear textarea
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'code-editor-textarea';
    this.textarea.spellcheck = false;
    this.textarea.autocapitalize = 'off';
    this.textarea.autocomplete = 'off';
    
    // Estilos inline para el textarea
    Object.assign(this.textarea.style, {
      width: '100%',
      height: '100%',
      padding: '16px',
      border: 'none',
      outline: 'none',
      resize: 'none',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: '14px',
      lineHeight: '1.6',
      backgroundColor: 'var(--editor-bg, #ffffff)',
      color: 'var(--editor-text, #1a1a1a)',
      tabSize: '2'
    });
    
    // Event listener para cambios
    this.textarea.addEventListener('input', (e) => {
      if (this.onChange) {
        this.onChange(e.target.value);
      }
    });
    
    // Soporte para Tab key
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const value = e.target.value;
        
        e.target.value = value.substring(0, start) + '  ' + value.substring(end);
        e.target.selectionStart = e.target.selectionEnd = start + 2;
        
        if (this.onChange) {
          this.onChange(e.target.value);
        }
      }
    });
    
    // Agregar al contenedor
    this.container.appendChild(this.textarea);
    
    // Enfocar después de un breve delay
    setTimeout(() => {
      this.textarea.focus();
    }, 150);
  }
  
  setContent(content) {
    if (this.textarea) {
      this.textarea.value = content;
    }
  }
  
  getContent() {
    return this.textarea ? this.textarea.value : '';
  }
  
  destroy() {
    if (this.textarea && this.textarea.parentNode) {
      this.textarea.parentNode.removeChild(this.textarea);
    }
  }
}
