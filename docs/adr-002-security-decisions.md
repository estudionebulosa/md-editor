# ADR-002: Decisiones de Seguridad del Módulo File Explorer

**Estado:** 🟡 PROPUESTO - Pendiente de Aprobación  
**Fecha:** 2026-10-01  
**Autor:** Estudio Nebulosa  
**Revisores:** [Pendiente]  
**Aprobado por:** [Pendiente]

---

## Contexto

El módulo File Explorer es un componente crítico que maneja persistencia de datos y se integra con sistemas externos (GitHub API, CMS). Esta ADR documenta las decisiones de seguridad tomadas, los riesgos identificados y las estrategias de mitigación propuestas.

### Problema

El File Explorer opera en múltiples contextos de seguridad:

1. **Modo Local (localStorage)** - Almacenamiento en el navegador del usuario
2. **Modo GitHub API** - Acceso directo a repositorios desde el cliente
3. **Modo Híbrido** - Combinación de ambos con sincronización

Cada modo presenta vectores de ataque únicos que deben ser abordados antes de la producción.

### Requisitos

- Permitir creación, edición y eliminación de archivos
- Integración con GitHub API desde el navegador
- Interoperabilidad con sistemas CMS externos
- Mantener usabilidad sin comprometer seguridad
- Funcionar en GitHub Pages (sin backend propio)

---

## Decisión

### D1: Separación de Responsabilidades por Modo

**Decisión:** Cada modo de persistencia tiene su propio perfil de seguridad y requerimientos.

**Racional:** 
- El modo local es seguro para datos no sensibles
- El modo GitHub requiere autenticación robusta
- El modo híbrido combina riesgos de ambos

**Consecuencias:**
- ✅ Permite elegir el nivel de seguridad según el caso de uso
- ✅ Facilita auditorías específicas por modo
- ⚠️ Requiere documentación clara de limitaciones por modo

---

### D2: Tokens de GitHub en el Cliente (MVP)

**Decisión:** Para el MVP, los tokens de GitHub se manejarán en el cliente con advertencias claras de seguridad.

**Racional:**
- GitHub Pages no tiene backend
- Permite funcionalidad completa sin infraestructura adicional
- Es aceptable para uso personal/desarrollo

**Riesgos Identificados:**
- 🔴 **CRÍTICO:** Exposición del token en el navegador
- 🔴 **CRÍTICO:** Posible robo vía XSS
- 🟡 **ALTO:** Acceso no autorizado si se compromete el token
- 🟡 **ALTO:** Commits maliciosos en nombre del usuario

**Mitigaciones Propuestas:**
1. Advertencias visibles en la UI sobre riesgos
2. Recomendación de tokens con permisos mínimos (solo `public_repo`)
3. Documentación clara de limitaciones
4. Plan para migrar a backend proxy en producción

**Consecuencias:**
- ✅ MVP funcional sin backend
- ✅ Permite validación temprana del concepto
- ⚠️ No apto para producción con datos sensibles
- ❌ Requiere migración antes de uso en producción

---

### D3: Validación y Sanitización de Contenido

**Decisión:** Todo contenido markdown debe ser sanitizado antes de renderizar.

**Racional:**
- Markdown puede contener HTML arbitrario
- XSS es el vector de ataque más común
- markdown-it permite configuración segura

**Implementación:**
```javascript
// Configuración segura de markdown-it
const md = new MarkdownIt({
  html: false, // Deshabilitar HTML raw por defecto
  linkify: true,
  typographer: false
});

// Sanitización adicional
function sanitizeMarkdown(content) {
  // Remover scripts inline
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remover event handlers
  content = content.replace(/\son\w+="[^"]*"/g, '');
  
  // Remover javascript: URLs
  content = content.replace(/javascript:/gi, '');
  
  return content;
}
```

**Consecuencias:**
- ✅ Previene la mayoría de ataques XSS
- ⚠️ Limita funcionalidad de HTML embebido
- ⚠️ Requiere whitelist explícita para HTML permitido

---

### D4: Content Security Policy (CSP)

**Decisión:** Implementar CSP estricta para prevenir inyección de código.

**Política Propuesta:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://esm.sh;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.github.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Racional:**
- Previene ejecución de scripts no autorizados
- Limita fuentes de recursos externos
- Mitiga ataques XSS incluso si hay vulnerabilidades

**Consecuencias:**
- ✅ Previene la mayoría de ataques XSS
- ✅ Limita vectores de ataque
- ⚠️ Requiere whitelist explícita de CDNs
- ⚠️ Puede romper funcionalidad si no se configura correctamente

---

### D5: Validación de Entradas

**Decisión:** Validar todos los inputs del usuario antes de procesar.

**Reglas de Validación:**

1. **Nombres de archivo:**
   - Solo caracteres alfanuméricos, guiones, guiones bajos
   - Máximo 255 caracteres
   - Debe terminar en `.md`
   - No permitir `..` o paths absolutos

2. **Contenido:**
   - Límite de tamaño (1MB por archivo)
   - Sanitización de HTML
   - Validación de frontmatter

3. **Metadatos:**
   - Validación de tipos
   - Límites de longitud
   - Sanitización de strings

**Implementación:**
```javascript
function validateFileName(name) {
  const regex = /^[a-zA-Z0-9_-]+\.md$/;
  if (!regex.test(name)) {
    throw new Error('Nombre de archivo inválido');
  }
  if (name.includes('..') || name.startsWith('/')) {
    throw new Error('Path traversal detectado');
  }
  if (name.length > 255) {
    throw new Error('Nombre demasiado largo');
  }
}

function validateContent(content) {
  if (content.length > 1024 * 1024) { // 1MB
    throw new Error('Contenido excede límite de 1MB');
  }
  return sanitizeMarkdown(content);
}
```

**Consecuencias:**
- ✅ Previene inyección de paths maliciosos
- ✅ Previene DoS por contenido grande
- ⚠️ Limita nombres de archivo (no permite espacios, acentos)
- ⚠️ Requiere validación en múltiples capas

---

### D6: Rate Limiting y Quotas

**Decisión:** Implementar límites de operaciones para prevenir abuso.

**Límites Propuestos:**

| Operación | Límite | Ventana |
|-----------|--------|---------|
| Crear archivos | 10 | por minuto |
| Editar archivos | 30 | por minuto |
| Eliminar archivos | 5 | por minuto |
| GitHub API calls | 60 | por hora (GitHub limit) |
| localStorage | 5MB | total |

**Implementación:**
```javascript
class RateLimiter {
  constructor(maxOperations, windowMs) {
    this.maxOperations = maxOperations;
    this.windowMs = windowMs;
    this.operations = [];
  }
  
  canPerform() {
    const now = Date.now();
    this.operations = this.operations.filter(
      time => now - time < this.windowMs
    );
    
    if (this.operations.length >= this.maxOperations) {
      return false;
    }
    
    this.operations.push(now);
    return true;
  }
}

const createLimiter = new RateLimiter(10, 60000); // 10 por minuto
```

**Consecuencias:**
- ✅ Previene abuso y DoS
- ✅ Respeta límites de GitHub API
- ⚠️ Puede frustrar a usuarios legítimos
- ⚠️ Requiere manejo de errores claro

---

### D7: Logging y Auditoría

**Decisión:** Registrar todas las operaciones críticas para auditoría.

**Eventos a Registrar:**
- Creación de archivos
- Edición de archivos
- Eliminación de archivos
- Cambios de configuración
- Errores de seguridad
- Intentos de operaciones no autorizadas

**Implementación:**
```javascript
class SecurityLogger {
  constructor() {
    this.logs = [];
  }
  
  log(event, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.logs.push(entry);
    
    // Enviar a servicio externo si está configurado
    if (this.remoteEndpoint) {
      this.sendToRemote(entry);
    }
    
    // Mantener solo últimos 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }
  
  getLogs() {
    return this.logs;
  }
}

const logger = new SecurityLogger();

// Uso
logger.log('file-created', { fileName: 'nuevo.md' });
logger.log('security-violation', { type: 'xss-attempt', content: '...' });
```

**Consecuencias:**
- ✅ Permite detección de ataques
- ✅ Facilita debugging
- ⚠️ Consume almacenamiento
- ⚠️ Requiere gestión de logs

---

### D8: Migración a Backend Proxy (Post-MVP)

**Decisión:** Para producción, migrar las llamadas a GitHub API a un backend proxy.

**Arquitectura Propuesta:**
```
┌─────────────┐
│   Cliente   │
│  (Browser)  │
└──────┬──────┘
       │
       │ HTTPS
       │
┌──────▼──────┐
│   Backend   │
│   Proxy     │ ← Maneja tokens de forma segura
│  (Node.js)  │
└──────┬──────┘
       │
       │ HTTPS + Token
       │
┌──────▼──────┐
│ GitHub API  │
└─────────────┘
```

**Ventajas:**
- Tokens nunca salen del servidor
- Validación centralizada
- Rate limiting server-side
- Logging centralizado
- Cache de respuestas

**Consecuencias:**
- ✅ Seguridad robusta para producción
- ✅ Control centralizado
- ⚠️ Requiere infraestructura adicional
- ⚠️ Latencia adicional

---

## Análisis de Riesgos

### Riesgos Críticos 🔴

#### R1: Exposición de Tokens de GitHub

**Descripción:** Los tokens de GitHub se almacenan en el navegador y pueden ser robados vía XSS o acceso físico.

**Probabilidad:** Alta  
**Impacto:** Crítico  
**Score:** 9/10

**Escenarios de Ataque:**
1. **XSS Attack:** Inyección de script que roba el token de localStorage
2. **Physical Access:** Acceso al dispositivo del usuario
3. **Browser Extension:** Extensiones maliciosas que acceden a localStorage
4. **Shoulder Surfing:** Token visible en la UI

**Mitigación:**
- MVP: Advertencias claras, tokens con permisos mínimos
- Producción: Backend proxy (D8)
- Usuario: Usar tokens de un solo uso, rotación regular

**Estado:** ⚠️ Aceptado para MVP, requiere mitigación antes de producción

---

#### R2: Cross-Site Scripting (XSS)

**Descripción:** Inyección de código malicioso en contenido markdown que se ejecuta en el navegador.

**Probabilidad:** Alta  
**Impacto:** Alto  
**Score:** 8/10

**Vectores de Ataque:**
1. **Stored XSS:** Código malicioso en contenido markdown guardado
2. **Reflected XSS:** Código en parámetros URL
3. **DOM XSS:** Manipulación directa del DOM

**Mitigación:**
- Sanitización de contenido (D3)
- CSP estricta (D4)
- Validación de entradas (D5)
- markdown-it con HTML deshabilitado

**Estado:** ✅ Mitigado parcialmente, requiere testing continuo

---

### Riesgos Altos 🟡

#### R3: Path Traversal

**Descripción:** Manipulación de nombres de archivo para acceder a directorios fuera del scope permitido.

**Probabilidad:** Media  
**Impacto:** Alto  
**Score:** 6/10

**Ejemplo:**
```javascript
// Ataque
fileName = "../../etc/passwd.md"
```

**Mitigación:**
- Validación de nombres (D5)
- Sanitización de paths
- Whitelist de caracteres permitidos

**Estado:** ✅ Mitigado

---

#### R4: Denial of Service (DoS)

**Descripción:** Creación masiva de archivos o contenido grande para agotar recursos.

**Probabilidad:** Media  
**Impacto:** Medio  
**Score:** 5/10

**Vectores:**
1. Crear miles de archivos
2. Contenido extremadamente grande
3. Spam de operaciones API

**Mitigación:**
- Rate limiting (D6)
- Límites de tamaño
- Quotas por usuario

**Estado:** ✅ Mitigado

---

### Riesgos Medios 🟠

#### R5: Data Leakage

**Descripción:** Exposición accidental de datos sensibles en logs o errores.

**Probabilidad:** Media  
**Impacto:** Medio  
**Score:** 4/10

**Mitigación:**
- Sanitización de logs
- No loguear contenido completo
- Manejo seguro de errores

**Estado:** ⚠️ Requiere implementación

---

#### R6: Insecure Direct Object References (IDOR)

**Descripción:** Acceso a archivos de otros usuarios mediante manipulación de IDs.

**Probabilidad:** Baja (modo local)  
**Impacto:** Alto  
**Score:** 4/10

**Mitigación:**
- Namespacing por usuario
- Validación de permisos
- Autenticación robusta

**Estado:** ⚠️ No aplica para MVP (single-user)

---

## Consecuencias

### Positivas ✅

1. **MVP Funcional:** Permite lanzamiento rápido sin infraestructura compleja
2. **Flexibilidad:** Múltiples modos según caso de uso
3. **Transparencia:** Riesgos documentados y comunicados
4. **Roadmap Claro:** Path definido hacia producción segura
5. **Educación:** Usuarios informados sobre riesgos

### Negativas ❌

1. **Deuda Técnica:** Requiere migración antes de producción
2. **Riesgo Aceptado:** Tokens expuestos en MVP
3. **Complejidad:** Múltiples modos con diferentes perfiles de seguridad
4. **Limitaciones:** No apto para datos sensibles en MVP
5. **Mantenimiento:** Requiere auditorías continuas

### Neutrales ⚖️

1. **Trade-off:** Seguridad vs. Usabilidad balanceado para MVP
2. **Evolución:** Arquitectura permite mejora incremental
3. **Documentación:** Requiere documentación extensa

---

## Alternativas Consideradas

### A1: Solo Backend desde el Inicio

**Descripción:** Implementar backend proxy desde el MVP.

**Pros:**
- Seguridad robusta desde el inicio
- Tokens nunca en el cliente

**Contras:**
- Requiere infraestructura adicional
- Mayor complejidad inicial
- Costo de hosting
- Retrasa lanzamiento

**Decisión:** ❌ Rechazada para MVP, considerada para producción

---

### A2: Solo Modo Local

**Descripción:** Eliminar integración con GitHub API.

**Pros:**
- Sin riesgos de tokens
- Más simple
- Sin dependencias externas

**Contras:**
- Pierde funcionalidad clave
- No sincroniza con repositorios
- Limita casos de uso

**Decisión:** ❌ Rechazada, funcionalidad de GitHub es requerimiento

---

### A3: OAuth App de GitHub

**Descripción:** Usar OAuth en lugar de Personal Access Tokens.

**Pros:**
- Tokens más seguros
- Permisos granulares
- Revocación fácil

**Contras:**
- Requiere backend para OAuth flow
- Complejidad adicional
- No funciona en GitHub Pages puro

**Decisión:** ⚠️ Considerada para producción

---

## Roadmap de Seguridad

### Fase 1: MVP (Actual) ✅

- [x] Documentación de riesgos
- [x] Advertencias en UI
- [x] Tokens en cliente (aceptado)
- [x] Modo local como default
- [x] Validación básica

**Criterio de Éxito:** MVP funcional con riesgos documentados

---

### Fase 2: Seguridad Básica (Post-MVP)

- [ ] Sanitización robusta de markdown
- [ ] CSP implementada
- [ ] Rate limiting client-side
- [ ] Logging de operaciones
- [ ] Validación completa de inputs
- [ ] Tests de seguridad automatizados

**Criterio de Éxito:** Sin vulnerabilidades críticas conocidas

---

### Fase 3: Autenticación Robusta

- [ ] Backend proxy implementado
- [ ] Tokens en servidor
- [ ] OAuth con GitHub
- [ ] Autenticación de usuarios
- [ ] Permisos granulares
- [ ] Auditoría completa

**Criterio de Éxito:** Tokens nunca en cliente

---

### Fase 4: Producción Segura

- [ ] Encriptación de datos en reposo
- [ ] Firma de commits
- [ ] Zero-trust architecture
- [ ] Monitoreo continuo
- [ ] Pentesting regular
- [ ] Bug bounty program

**Criterio de Éxito:** Apto para datos sensibles

---

## Recomendaciones

### Para el MVP

1. **Comunicar Riesgos:**
   - Advertencias claras en la UI
   - Documentación de limitaciones
   - Ejemplos de uso seguro

2. **Limitar Scope:**
   - Solo para uso personal/desarrollo
   - No datos sensibles
   - Tokens con permisos mínimos

3. **Testing:**
   - Tests de XSS
   - Tests de validación
   - Tests de rate limiting

4. **Monitoreo:**
   - Logs de errores
   - Reportes de usuarios
   - Revisión regular

### Para Producción

1. **Migrar a Backend:**
   - Implementar proxy
   - Mover tokens al servidor
   - Centralizar autenticación

2. **Auditoría:**
   - Pentesting externo
   - Code review de seguridad
   - Revisión de dependencias

3. **Cumplimiento:**
   - GDPR si aplica
   - Políticas de privacidad
   - Términos de servicio

---

## Criterios de Aprobación

Esta ADR será aprobada cuando:

- [ ] Todos los revisores hayan revisado el documento
- [ ] Se hayan resuelto todas las preguntas pendientes
- [ ] Se haya definido el timeline de migración a backend
- [ ] Se hayan asignado responsables para cada fase
- [ ] Se haya definido el criterio de "listo para producción"

---

## Preguntas Pendientes

1. **¿Cuál es el timeline para migrar a backend proxy?**
   - Opción A: Inmediatamente después del MVP
   - Opción B: Después de validar concepto (3-6 meses)
   - Opción C: Solo si hay demanda de producción

2. **¿Qué nivel de seguridad es aceptable para el MVP?**
   - Opción A: Solo modo local (sin GitHub)
   - Opción B: GitHub con advertencias (actual)
   - Opción C: GitHub con backend desde el inicio

3. **¿Quién es responsable de la seguridad en producción?**
   - Opción A: Equipo interno
   - Opción B: Auditor externo
   - Opción C: Comunidad (open source)

4. **¿Hay requisitos de cumplimiento específicos?**
   - GDPR, HIPAA, SOC2, etc.

5. **¿Cuál es el presupuesto para infraestructura de seguridad?**
   - Backend hosting
   - Auditorías
   - Herramientas de monitoreo

---

## Anexos

### A. Recursos de Seguridad

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Web Component Security](https://developer.mozilla.org/en-US/docs/Web/Web_Components)

### B. Herramientas Recomendadas

**Testing:**
- OWASP ZAP (penetration testing)
- ESLint security plugins
- npm audit

**Monitoreo:**
- Sentry (error tracking)
- GitHub Security Alerts
- Dependabot

**Documentación:**
- Threat Dragon (threat modeling)
- Security headers scanner

### C. Contacto

Para reportar vulnerabilidades de seguridad:
- Email: security@estudionebulosa.com (pendiente de crear)
- GitHub Security Advisory (pendiente de habilitar)

---

## Historial de Cambios

| Fecha | Versión | Cambios | Autor |
|-------|---------|---------|-------|
| 2026-10-01 | 1.0 | Versión inicial | Estudio Nebulosa |

---

## Estado de Aprobación

**Estado Actual:** 🟡 PROPUESTO

**Revisores:**
- [ ] Revisor 1: [Nombre] - [Estado]
- [ ] Revisor 2: [Nombre] - [Estado]
- [ ] Revisor 3: [Nombre] - [Estado]

**Comentarios:**
- [Espacio para comentarios de revisores]

**Decisión Final:**
- [ ] Aprobado
- [ ] Aprobado con cambios
- [ ] Rechazado
- [ ] Diferido

**Fecha de Decisión:** [Pendiente]  
**Aprobado por:** [Pendiente]

---

**Nota:** Este documento está pendiente de aprobación. No implementar decisiones críticas hasta que sea revisado y aprobado por los stakeholders de seguridad.
