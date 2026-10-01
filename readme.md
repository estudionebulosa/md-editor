# 📝 Markdown Editor

A plugable, mobile-first Markdown editor built as a Web Component. Edit in code or preview mode, export to HTML/PDF/MD, and integrate seamlessly with any CMS or system.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![GitHub Pages](https://img.shields.io/badge/deployed-GitHub%20Pages-success)

---

## 📋 Abstract

**The Problem:** Content creators need a lightweight, embeddable Markdown editor that works anywhere—GitHub Pages, CMS platforms, or custom applications—without heavy dependencies or complex setup.

**The Solution:** A zero-dependency Web Component (`<markdown-editor>`) that delivers professional editing with dual modes, theme switching, inline images, and seamless CMS integration via a clean event-driven API.

---

## 🎯 Summary

A framework-agnostic Markdown editor designed for the modern web:

- **Dual Mode** — Switch between code (CodeMirror 6) and preview (rendered HTML)
- **Theme Aware** — Light/dark themes with `prefers-color-scheme` support
- **Export Anywhere** — HTML, PDF, or Markdown download
- **Rich Metadata** — Tags (chip UI + autocomplete), slugs, and YAML frontmatter
- **Extended Markdown** — Tables, footnotes, callout blockquotes, FAQ containers with schema
- **Inline Images** — Drag, drop, paste → base64 embedded (no server required)
- **Plugable** — Drop-in `<script>` tag or npm import, event-driven API for CMS integration
- **Mobile First** — Responsive design that scales beautifully to large screens

---

## 🏗️ Architectural Decisions (ADRs)

### 1. Web Component over Framework
**Decision:** Custom Elements + Shadow DOM  
**Rationale:** Zero dependencies, works in any framework or plain HTML, future-proof, and maximizes portability across CMS platforms.

### 2. Client-Side Only
**Decision:** No backend, inline images as base64  
**Rationale:** Enables GitHub Pages deployment, self-contained files, and zero infrastructure requirements for MVP.

### 3. CodeMirror 6 for Code Mode
**Decision:** Modular editor over monolithic alternatives  
**Rationale:** Lightweight, mobile-friendly, extensible, and tree-shakeable for optimal bundle size.

### 4. markdown-it for Rendering
**Decision:** Extensible parser over CommonMark-only  
**Rationale:** Plugin ecosystem for footnotes, tables, and custom containers (FAQs, callouts) without reinventing the wheel.

### 5. Event-Driven CMS Integration
**Decision:** Custom events + `load()`/`save()` API  
**Rationale:** Framework-agnostic, works with any CMS, and keeps the component decoupled from specific backend implementations.

### 6. YAML Frontmatter
**Decision:** Standard frontmatter over custom metadata format  
**Rationale:** Industry standard, CMS-compatible, and familiar to developers and content creators.

---

## 🛠️ Tech Stack

### Core Dependencies

| Module | Purpose | CDN |
|--------|---------|-----|
| **markdown-it** | Markdown parser | [jsDelivr](https://cdn.jsdelivr.net/npm/markdown-it/) |
| **markdown-it-footnote** | Footnote support | [jsDelivr](https://cdn.jsdelivr.net/npm/markdown-it-footnote/) |
| **CodeMirror 6** | Code editor | [esm.sh](https://esm.sh/@codemirror/view) |
| **highlight.js** | Syntax highlighting | [jsDelivr](https://cdn.jsdelivr.net/npm/highlight.js/) |
| **html2pdf.js** | PDF export | [jsDelivr](https://cdn.jsdelivr.net/npm/html2pdf.js/) |
| **js-yaml** | Frontmatter parsing | [jsDelivr](https://cdn.jsdelivr.net/npm/js-yaml/) |

### File Structure

```
editor/
├── index.html              # GitHub Pages entry + demo
├── src/
│   ├── editor.js           # <markdown-editor> Web Component
│   ├── modes/
│   │   ├── code.js         # CodeMirror 6 wrapper
│   │   └── preview.js      # markdown-it renderer
│   ├── frontmatter.js      # YAML frontmatter parser
│   ├── tags.js             # Tag chip + autocomplete UI
│   ├── faq.js              # FAQ container plugin
│   ├── callouts.js         # Blockquote callout plugin
│   ├── export.js           # HTML, PDF, MD export
│   └── themes.js           # Light/dark theme definitions
├── styles/
│   └── editor.css          # Shadow DOM styles
└── readme.md
```

---

## 🗺️ Roadmap

### v0.1.0 — MVP (Current)
- [x] Dual mode (code/preview)
- [x] Light/dark themes
- [x] Export to HTML, PDF, MD
- [x] Tags with chip UI + autocomplete
- [x] Auto-generated slugs
- [x] Tables, footnotes, callouts
- [x] FAQ containers with JSON-LD schema
- [x] Inline images (base64)
- [x] CMS integration API

### v0.2.0 — Enhanced UX
- [ ] Split view (code + preview side-by-side)
- [ ] Keyboard shortcuts (Ctrl+S, Ctrl+P, etc.)
- [ ] Undo/redo history
- [ ] Word count + reading time
- [ ] Spellcheck integration

### v0.3.0 — Advanced Features
- [ ] Image upload endpoint (replace base64 with URLs)
- [ ] Custom CSS injection
- [ ] Plugin system for markdown-it extensions
- [ ] Collaborative editing (WebSocket)
- [ ] Version history

### v1.0.0 — Stable Release
- [ ] Full test coverage
- [ ] TypeScript migration
- [ ] npm package publication
- [ ] Documentation site
- [ ] CMS integration examples (WordPress, Ghost, Contentful)

---

## 📜 Changelog

### [0.1.0] - 2026-01-XX
**Initial Release**
- Web Component architecture with Shadow DOM
- Dual mode: code (CodeMirror 6) and preview (markdown-it)
- Light/dark theme toggle with system preference detection
- Export to HTML, PDF, and Markdown
- YAML frontmatter support with tags and slugs
- Tag chip UI with autocomplete suggestions
- Extended markdown: tables, footnotes, callout blockquotes
- FAQ containers with JSON-LD schema for SEO
- Inline image support via drag/drop/paste (base64)
- Event-driven API for CMS integration
- Mobile-first responsive design

---

## 📖 How To

### Installation

**Option 1: Script Tag (GitHub Pages)**
```html
<script type="module" src="https://yourusername.github.io/editor/src/editor.js"></script>
<markdown-editor></markdown-editor>
```

**Option 2: npm Package (Future)**
```bash
npm install markdown-editor-component
```

```javascript
import 'markdown-editor-component';
```

### Basic Usage

```html
<markdown-editor id="editor"></markdown-editor>

<script>
  const editor = document.getElementById('editor');

  // Load content
  editor.load({
    content: '# Hello World\n\nThis is **markdown**.',
    path: 'post.md',
    frontmatter: {
      title: 'My Post',
      tags: ['javascript', 'web'],
      slug: 'my-post'
    }
  });

  // Listen for save events
  editor.addEventListener('save', (e) => {
    console.log('Content:', e.detail.content);
    console.log('Frontmatter:', e.detail.frontmatter);
    // Save to your CMS
  });

  // Configure
  editor.theme = 'dark';
  editor.mode = 'preview';
</script>
```

### CMS Integration

```javascript
// Load from API
fetch('/api/posts/123')
  .then(res => res.json())
  .then(post => {
    editor.load({
      content: post.body,
      frontmatter: {
        title: post.title,
        tags: post.tags,
        slug: post.slug
      }
    });
  });

// Save to API
editor.addEventListener('save', (e) => {
  fetch('/api/posts/123', {
    method: 'PUT',
    body: JSON.stringify(e.detail)
  });
});
```

### Theming

```css
markdown-editor {
  --editor-bg: #ffffff;
  --editor-text: #1a1a1a;
  --editor-accent: #0066cc;
  --editor-border: #e0e0e0;
}
```

### Extended Markdown

**Callout Blockquotes**
```markdown
> [!tip]
> This is a helpful tip.

> [!warning]
> Be careful here.
```

**FAQ Containers**
````markdown
::: faq
### What is this?
A markdown editor.

### How do I use it?
Drop it in any page.
:::
````

**Footnotes**
```markdown
This has a footnote[^1].

[^1]: Footnote content here.
```

---

## 🤝 Contributing

Contributions welcome! Open an issue or submit a PR.

## 📄 License

MIT © Your Name

---

**Built with ❤️ for the web**
