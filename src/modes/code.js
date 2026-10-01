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
            height: '100%',
            fontSize: '14px'
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
          }
        })
      ]
    });
    
    this.view = new EditorView({
      state,
      parent: this.container
    });
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
