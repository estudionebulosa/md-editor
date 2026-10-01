/**
 * Frontmatter - YAML frontmatter parser and serializer
 */

export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  
  if (!match) {
    return {
      frontmatter: {},
      content: content
    };
  }
  
  const yamlStr = match[1];
  const markdownContent = match[2];
  
  // Parse YAML simple (sin dependencias para MVP)
  const frontmatter = parseSimpleYAML(yamlStr);
  
  return {
    frontmatter,
    content: markdownContent
  };
}

export function serializeFrontmatter(frontmatter) {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return '';
  }
  
  const yaml = serializeSimpleYAML(frontmatter);
  return `---\n${yaml}\n---\n`;
}

// Parser YAML simple para MVP
function parseSimpleYAML(yamlStr) {
  const result = {};
  const lines = yamlStr.split('\n');
  
  let currentKey = null;
  let currentArray = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Array item
    if (trimmed.startsWith('- ') && currentKey) {
      if (!currentArray) {
        currentArray = [];
        result[currentKey] = currentArray;
      }
      currentArray.push(trimmed.slice(2).trim().replace(/^['"](.*)['"]$/, '$1'));
      continue;
    }
    
    // Key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      currentKey = key;
      currentArray = null;
      
      if (value === '' || value === '[]') {
        // Array vacío o inicio de array
        result[key] = value === '[]' ? [] : null;
      } else {
        // Valor simple
        result[key] = value.replace(/^['"](.*)['"]$/, '$1');
      }
    }
  }
  
  return result;
}

// Serializer YAML simple para MVP
function serializeSimpleYAML(obj, indent = 0) {
  const lines = [];
  const spaces = '  '.repeat(indent);
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      for (const item of value) {
        lines.push(`${spaces}  - ${item}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${spaces}${key}:`);
      lines.push(serializeSimpleYAML(value, indent + 1));
    } else {
      lines.push(`${spaces}${key}: ${value}`);
    }
  }
  
  return lines.join('\n');
}
