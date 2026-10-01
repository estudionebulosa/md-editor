/**
 * Code Mode - CodeMirror 6 wrapper
 * Editor de código con resaltado de sintaxis para Markdown
 */

export class CodeMode {
  constructor(container, onChange) {
    this.container = container;
    this.onChange = onChange;
    this.view = null;
    this.init();
  }
  
  async init() {
    // Importar CodeMirror 6 desde CDN
    const [
      { EditorView, basicSetup },
      { EditorState },
      { markdown },
      { oneDark }
    ] = await Promise.all([
      import('https://esm.sh/@codemirror/view@6'),
      import('https://esm.sh/@codemirror/state@6'),
      import('https://esm.sh/@codemirror/lang-markdown@6'),
      import('https://esm.sh/@codemirror/theme-one-dark@6')
    ]);
    
    // Asegurar que el contenedor tenga dimensiones
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.position = 'relative';
    
    const startDoc = '';
    
    const state = EditorState.create({
      doc: startDoc,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            if (this.onChange) {
              this.onChange(content);
            }
          }
        }),
        EditorView.theme({
          '&': {
            height: '100% !important',
            width: '100% !important',
            fontSize: '14px'
          },
          '.cm-scroller': {
            overflow: 'auto !important',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            height: '100% !important'
          },
          '.cm-content': {
            minHeight: '100%',
            cursor: 'text !important'
          },
          '.cm-editor': {
            outline: 'none !important'
          },
          '.cm-editor.cm-focused': {
            outline: 'none !important'
          }
        })
      ]
    });
    
    this.view = new EditorView({
      state,
      parent: this.container
    });
    
    // Enfocar el editor después de montarlo
    setTimeout(() => {
      if (this.view) {
        this.view.focus();
      }
    }, 100);
  }
  
  setContent(content) {
    if (!this.view) return;
    
    const transaction = this.view.state.update({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    });
    
    this.view.dispatch(transaction);
  }
  
  getContent() {
    if (!this.view) return '';
    return this.view.state.doc.toString();
  }
  
  destroy() {
    if (this.view) {
      this.view.destroy();
    }
  }
}
