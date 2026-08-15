// Archivo: scripts/build-docs.js

/**
 * @file build-docs.js
 * @description Genera la web estática de documentación (carpeta /docs) a partir
 *              de las páginas Markdown de /wiki. Sin dependencias externas.
 *              Uso: npm run docs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const OUT_DIR = path.join(ROOT, 'docs');

const SITE_TITLE = 'CodeCord';
const REPO_URL = 'https://github.com/aitor1234567899/CodeCord';
const DISCORD_URL = 'https://discord.gg/PzSNTqFCuW';

/** Orden y títulos del menú lateral. La clave es el nombre de la página. */
const NAV = [
    ['Home', '🏠 Inicio'],
    ['Instalacion', '⚙️ Instalación'],
    ['Configuracion', '🔧 Configuración'],
    ['Comandos', '💬 Comandos'],
    ['Panel-Web', '🖥️ Panel web'],
    ['Sistemas', '🧩 Sistemas'],
    ['API-del-Panel', '🔌 API del panel'],
    ['Arquitectura', '🏗️ Arquitectura'],
    ['Almacenamiento-de-Datos', '💾 Datos'],
    ['Solucion-de-Problemas', '🩺 Problemas'],
    ['Contribuir', '🤝 Contribuir']
];

// =====================================================================
// Conversor Markdown → HTML (subconjunto usado por la wiki)
// =====================================================================

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

function pageHref(page) {
    return `${page === 'Home' ? 'index' : page}.html`;
}

/**
 * Convierte el formato en línea: código, negrita, cursiva, enlaces y wikilinks.
 * @param {string} text
 * @returns {string}
 */
function renderInline(text) {
    const codeSpans = [];
    let out = text.replace(/`([^`]+)`/g, (m, code) => {
        codeSpans.push(`<code>${escapeHtml(code)}</code>`);
        return `\u0000${codeSpans.length - 1}\u0000`;
    });

    out = escapeHtml(out);

    out = out.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (m, label, page) => `<a href="${pageHref(page.trim())}">${label.trim()}</a>`);
    out = out.replace(/\[\[([^\]]+)\]\]/g, (m, page) => `<a href="${pageHref(page.trim())}">${page.trim().replace(/-/g, ' ')}</a>`);
    out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');

    return out.replace(/\u0000(\d+)\u0000/g, (m, i) => codeSpans[Number(i)]);
}

/** Detecta un item de lista y captura su indentación y su marcador. */
const LIST_ITEM = /^(\s*)([*-]|\d+\.)\s+/;

/**
 * Construye las listas (anidadas) a partir de los items con su indentación.
 * @param {Array<{indent: number, ordered: boolean, text: string}>} items
 * @param {number} start - Índice del primer item del nivel actual.
 * @returns {{html: string, next: number}}
 */
function renderList(items, start) {
    const level = items[start].indent;
    const tag = items[start].ordered ? 'ol' : 'ul';
    const parts = [];

    let i = start;
    while (i < items.length && items[i].indent >= level) {
        if (items[i].indent > level) {
            const nested = renderList(items, i);
            parts[parts.length - 1] = parts[parts.length - 1].replace(/<\/li>$/, `${nested.html}</li>`);
            i = nested.next;
            continue;
        }
        parts.push(`<li>${renderInline(items[i].text)}</li>`);
        i++;
    }

    return { html: `<${tag}>${parts.join('')}</${tag}>`, next: i };
}

function renderTable(rows) {
    const cells = row => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells);

    const thead = `<thead><tr>${head.map(c => `<th>${renderInline(c)}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    return `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
}

/**
 * Convierte un documento Markdown completo a HTML y devuelve también su índice.
 * @param {string} markdown
 * @returns {{html: string, toc: Array<{level: number, text: string, id: string}>}}
 */
function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const html = [];
    const toc = [];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) { i++; continue; }

        // Bloque de código
        if (line.startsWith('```')) {
            const lang = line.slice(3).trim();
            const buffer = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) buffer.push(lines[i++]);
            i++;
            html.push(`<pre class="lang-${lang || 'text'}"><code>${escapeHtml(buffer.join('\n'))}</code></pre>`);
            continue;
        }

        // Separador
        if (/^---+$/.test(line.trim())) { html.push('<hr>'); i++; continue; }

        // Títulos
        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            const text = heading[2].trim();
            const id = slugify(text);
            if (level >= 2) toc.push({ level, text: text.replace(/[`*]/g, ''), id });
            html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
            i++;
            continue;
        }

        // Tabla
        if (line.includes('|') && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || '')) {
            const rows = [];
            while (i < lines.length && lines[i].includes('|')) rows.push(lines[i++]);
            html.push(renderTable(rows));
            continue;
        }

        // Cita
        if (line.startsWith('>')) {
            const buffer = [];
            while (i < lines.length && lines[i].startsWith('>')) buffer.push(lines[i++].replace(/^>\s?/, ''));
            html.push(`<blockquote>${renderMarkdown(buffer.join('\n')).html}</blockquote>`);
            continue;
        }

        // Listas (con anidamiento por indentación)
        if (LIST_ITEM.test(line)) {
            const items = [];
            while (i < lines.length && LIST_ITEM.test(lines[i])) {
                const [, indent, marker] = lines[i].match(LIST_ITEM);
                items.push({
                    indent: indent.replace(/\t/g, '    ').length,
                    ordered: /\d/.test(marker),
                    text: lines[i].replace(LIST_ITEM, '')
                });
                i++;
                // Continuación de un item en varias líneas
                while (i < lines.length && lines[i].trim() && !LIST_ITEM.test(lines[i]) && !/^(#{1,4}\s|```|>|---)/.test(lines[i])) {
                    items[items.length - 1].text += ' ' + lines[i].trim();
                    i++;
                }
            }
            html.push(renderList(items, 0).html);
            continue;
        }

        // Párrafo
        const paragraph = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*[*-]\s|\s*\d+\.\s|---)/.test(lines[i])) {
            paragraph.push(lines[i++]);
        }
        if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    }

    return { html: html.join('\n'), toc };
}

// =====================================================================
// Plantilla HTML
// =====================================================================

function renderNav(currentPage) {
    return NAV.map(([page, label]) => {
        const active = page === currentPage ? ' class="active"' : '';
        return `<li><a href="${pageHref(page)}"${active}>${label}</a></li>`;
    }).join('\n                    ');
}

function renderToc(toc) {
    if (toc.length < 2) return '';
    const items = toc
        .filter(h => h.level === 2)
        .map(h => `<li><a href="#${h.id}">${h.text}</a></li>`)
        .join('');
    if (!items) return '';
    return `<aside class="toc"><p class="toc-title">En esta página</p><ul>${items}</ul></aside>`;
}

function renderPage({ page, title, content, toc }) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · ${SITE_TITLE}</title>
<meta name="description" content="Documentación de CodeCord: bot multifuncional de Discord con panel web administrativo.">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="topbar">
    <button class="menu-toggle" aria-label="Abrir menú">☰</button>
    <a class="brand" href="index.html">🤖 <span>CodeCord</span> <em>docs</em></a>
    <nav class="topbar-links">
        <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>
        <a href="${DISCORD_URL}" target="_blank" rel="noopener">Discord</a>
    </nav>
</header>
<div class="layout">
    <nav class="sidebar">
        <ul>
            ${renderNav(page)}
        </ul>
    </nav>
    <main>
        <article class="content">
${content}
        </article>
        ${renderToc(toc)}
    </main>
</div>
<footer class="site-footer">
    <p>CodeCord — bot de Discord + panel web administrativo · <a href="${REPO_URL}" target="_blank" rel="noopener">Repositorio</a> · <a href="${DISCORD_URL}" target="_blank" rel="noopener">Servidor de soporte</a></p>
    <p class="generated">Generado automáticamente desde <code>/wiki</code> con <code>npm run docs</code>.</p>
</footer>
<script>
document.querySelector('.menu-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
});
</script>
</body>
</html>
`;
}

// =====================================================================
// Generación
// =====================================================================

function build() {
    if (!fs.existsSync(WIKI_DIR)) {
        console.error('❌ No se encuentra la carpeta /wiki');
        process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    let count = 0;
    for (const [page, label] of NAV) {
        const source = path.join(WIKI_DIR, `${page}.md`);
        if (!fs.existsSync(source)) {
            console.warn(`⚠️  Falta la página ${page}.md`);
            continue;
        }

        const markdown = fs.readFileSync(source, 'utf8');
        const { html, toc } = renderMarkdown(markdown);
        const titleMatch = markdown.match(/^#\s+(.*)$/m);
        const title = titleMatch ? titleMatch[1].replace(/[#*`]/g, '').trim() : label;

        const output = renderPage({ page, title, content: html, toc });
        fs.writeFileSync(path.join(OUT_DIR, pageHref(page)), output, 'utf8');
        count++;
    }

    fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '', 'utf8');
    fs.copyFileSync(path.join(__dirname, 'docs-style.css'), path.join(OUT_DIR, 'style.css'));

    console.log(`✅ Documentación generada en /docs (${count} páginas).`);
}

build();
