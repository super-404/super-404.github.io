import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = process.env.TECH_DOCS_SOURCE_DIR ?? path.join(os.homedir(), 'Downloads', '技术文档');
const outputRoot = path.join(repoRoot, 'tech-docs');
const assetsDir = path.join(outputRoot, 'assets');

const sensitiveRules = [
  {
    reason: 'private cloud console or deployment details',
    test: (content) =>
      /ecs\.console\.alibabacloud\.com|cs\.console\.alibabacloud\.com|resourceGroupId=rg-|us-prod-acr|aliyuncs\.com|10\.175\.4\.204/.test(content),
  },
  {
    reason: 'private search-console deep link',
    test: (content) => /search\.google\.com\/u\/0\/search-console/.test(content),
  },
  {
    reason: 'credential update example with email address',
    test: (content) => /api[_-]?key/i.test(content) && /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content),
  },
];

const publishExts = new Set(['.md', '.markdown', '.graphml']);

function posixJoin(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

function relPath(file) {
  return path.relative(sourceRoot, file).split(path.sep).join('/');
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile() && publishExts.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function slugify(text, fallback = 'doc') {
  const slug = text
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}@._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return slug || fallback;
}

function uniqueSlug(base, used) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  const slug = `${base}-${index}`;
  used.add(slug);
  return slug;
}

function titleFromMarkdown(markdown, fallback) {
  const heading = markdown.match(/^\s*#\s+(.+?)\s*$/m);
  if (heading?.[1]) return stripMarkdown(heading[1]).trim() || fallback;
  return fallback;
}

function stripMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerptFrom(markdown) {
  const text = stripMarkdown(
    markdown
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('|'))
      .slice(0, 20)
      .join(' '),
  );
  return text.slice(0, 180);
}

function sanitizeMarkdown(markdown) {
  return markdown.replace(/\]\(\/Users\/[^)]+\)/g, '](#local-path)');
}

function sensitiveReason(content) {
  return sensitiveRules.find((rule) => rule.test(content))?.reason;
}

function headingsFrom(markdown) {
  return [...markdown.matchAll(/^\s{0,3}(#{1,3})\s+(.+?)\s*$/gm)].map((match) => ({
    level: match[1].length,
    text: stripMarkdown(match[2]),
  }));
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function routeFor(relative, usedByDir) {
  const parts = relative.split('/');
  const file = parts.pop();
  const ext = path.extname(file);
  const stem = file.slice(0, -ext.length);
  const dirParts = parts.map((part) => slugify(part, 'section'));
  const dirKey = dirParts.join('/');
  if (!usedByDir.has(dirKey)) usedByDir.set(dirKey, new Set());
  const leaf = uniqueSlug(slugify(stem, 'doc'), usedByDir.get(dirKey));

  return posixJoin('tech-docs', ...dirParts, leaf, 'index.html');
}

function htmlShell({ title, description, bodyClass = '', script = '' }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/img/fluid.png">
  <link rel="stylesheet" href="/tech-docs/assets/tech-docs.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github.min.css">
</head>
<body class="${bodyClass}">
${script}
</body>
</html>
`;
}

function indexHtml(nav, searchIndex) {
  return htmlShell({
    title: '技术文档 - super-404',
    description: '按主题整理的技术文档索引',
    bodyClass: 'index-page',
    script: `<script>
window.TECH_DOCS_NAV = ${safeJson(nav)};
window.TECH_DOCS_SEARCH = ${safeJson(searchIndex)};
</script>
<main class="docs-home">
  <section class="home-hero">
    <a class="home-back" href="/">super-404</a>
    <div>
      <p class="eyebrow">Technical Notes</p>
      <h1>技术文档</h1>
      <p class="home-summary">统一整理后的技术文档入口，保留原目录主题，适合快速检索和连续阅读。</p>
    </div>
    <div class="home-stats" aria-label="文档统计">
      <div><strong>${nav.length}</strong><span>篇文档</span></div>
      <div><strong>${new Set(nav.map((item) => item.group)).size}</strong><span>个主题</span></div>
    </div>
  </section>

  <section class="home-search">
    <label for="doc-search">搜索文档</label>
    <input id="doc-search" type="search" placeholder="输入标题、路径或正文关键词">
  </section>

  <section class="home-layout">
    <aside class="topic-list" id="topic-list"></aside>
    <div class="doc-results" id="doc-results"></div>
  </section>
</main>
<script src="/tech-docs/assets/tech-docs.js"></script>`,
  });
}

function docHtml(doc, nav) {
  return htmlShell({
    title: `${doc.title} - 技术文档`,
    description: doc.excerpt || doc.title,
    bodyClass: 'doc-page',
    script: `<script>
window.TECH_DOC = ${safeJson(doc)};
window.TECH_DOCS_NAV = ${safeJson(nav)};
</script>
<div class="doc-shell">
  <aside class="doc-sidebar" id="doc-sidebar"></aside>
  <main class="doc-main">
    <nav class="doc-topbar">
      <a href="/tech-docs/">技术文档</a>
      <span>${escapeHtml(doc.group)}</span>
    </nav>
    <article class="doc-article">
      <header class="doc-header">
        <p class="doc-path">${escapeHtml(doc.relativePath)}</p>
        <h1>${escapeHtml(doc.title)}</h1>
        <p class="doc-meta">${doc.isEmpty ? '暂无内容' : `${doc.wordCount.toLocaleString('zh-CN')} 字符`} · ${escapeHtml(doc.group)}</p>
      </header>
      <div id="doc-content" class="markdown-body"></div>
    </article>
  </main>
  <aside class="doc-toc" id="doc-toc"></aside>
</div>
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/lib/common.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script src="/tech-docs/assets/tech-docs.js"></script>`,
  });
}

function css() {
  return `:root {
  --bg: #f6f8fb;
  --panel: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --line: #dbe3ee;
  --accent: #2563eb;
  --accent-weak: #eff6ff;
  --code-bg: #f8fafc;
  --sidebar: #111827;
  --sidebar-text: #d1d5db;
  --sidebar-muted: #9ca3af;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--text);
  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  line-height: 1.72;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button, input { font: inherit; }

.docs-home {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}
.home-hero {
  min-height: 220px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: end;
  border-bottom: 1px solid var(--line);
  padding: 12px 0 28px;
}
.home-back {
  grid-column: 1 / -1;
  color: var(--muted);
  width: fit-content;
}
.eyebrow {
  color: var(--accent);
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.home-hero h1 {
  margin: 0;
  font-size: clamp(38px, 8vw, 72px);
  line-height: 1;
  letter-spacing: 0;
}
.home-summary {
  margin: 16px 0 0;
  color: var(--muted);
  max-width: 620px;
}
.home-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(110px, 1fr));
  gap: 12px;
}
.home-stats div {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 8px;
  padding: 16px;
}
.home-stats strong {
  display: block;
  font-size: 28px;
  line-height: 1;
}
.home-stats span {
  color: var(--muted);
  font-size: 13px;
}
.home-search {
  display: grid;
  gap: 8px;
  margin: 24px 0;
}
.home-search label {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
.home-search input {
  width: 100%;
  height: 46px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0 14px;
  background: var(--panel);
}
.home-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 24px;
}
.topic-list {
  position: sticky;
  top: 16px;
  align-self: start;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 8px;
  padding: 10px;
}
.topic-button {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text);
  border-radius: 6px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
}
.topic-button:hover,
.topic-button.active { background: var(--accent-weak); color: var(--accent); }
.topic-button span:last-child { color: var(--muted); font-size: 13px; }
.doc-results {
  display: grid;
  gap: 12px;
}
.result-card {
  display: block;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 8px;
  padding: 18px;
  color: var(--text);
}
.result-card:hover { text-decoration: none; border-color: #93c5fd; }
.result-card h2 {
  margin: 0 0 8px;
  font-size: 20px;
  line-height: 1.35;
  letter-spacing: 0;
}
.result-card p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}
.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
}
.pill {
  background: var(--accent-weak);
  color: var(--accent);
  border-radius: 999px;
  padding: 2px 8px;
}

.doc-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 240px;
  min-height: 100vh;
}
.doc-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  background: var(--sidebar);
  color: var(--sidebar-text);
  padding: 18px 12px;
}
.sidebar-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  font-weight: 800;
  padding: 0 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.sidebar-search {
  width: 100%;
  height: 38px;
  margin: 14px 0;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.08);
  color: #fff;
  border-radius: 8px;
  padding: 0 10px;
}
.sidebar-group {
  color: var(--sidebar-muted);
  font-size: 12px;
  font-weight: 800;
  margin: 18px 8px 6px;
}
.sidebar-link {
  display: block;
  color: var(--sidebar-text);
  border-radius: 6px;
  padding: 8px;
  font-size: 14px;
  line-height: 1.35;
}
.sidebar-link:hover,
.sidebar-link.active {
  background: rgba(255,255,255,.1);
  color: #fff;
  text-decoration: none;
}
.doc-main {
  min-width: 0;
  padding: 0 28px 72px;
}
.doc-topbar {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 56px;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  font-size: 14px;
}
.doc-topbar span::before {
  content: "/";
  margin-right: 10px;
  color: #cbd5e1;
}
.doc-article {
  max-width: 920px;
  margin: 0 auto;
  padding-top: 36px;
}
.doc-header {
  margin-bottom: 28px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 20px;
}
.doc-path,
.doc-meta {
  color: var(--muted);
  font-size: 13px;
  margin: 0 0 8px;
  overflow-wrap: anywhere;
}
.doc-header h1 {
  margin: 0;
  font-size: clamp(28px, 5vw, 44px);
  line-height: 1.18;
  letter-spacing: 0;
}
.doc-toc {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  padding: 78px 18px 24px 0;
}
.toc-title {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 10px;
}
.toc-link {
  display: block;
  color: var(--muted);
  border-left: 2px solid var(--line);
  padding: 5px 0 5px 10px;
  font-size: 13px;
  line-height: 1.35;
}
.toc-link.level-3 { padding-left: 22px; }

.markdown-body {
  font-size: 16px;
  overflow-wrap: anywhere;
}
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
  letter-spacing: 0;
  line-height: 1.35;
  margin: 2em 0 .75em;
}
.markdown-body h1 { font-size: 2em; }
.markdown-body h2 {
  font-size: 1.55em;
  padding-bottom: .35em;
  border-bottom: 1px solid var(--line);
}
.markdown-body h3 { font-size: 1.25em; }
.markdown-body p,
.markdown-body ul,
.markdown-body ol,
.markdown-body blockquote,
.markdown-body table,
.markdown-body pre {
  margin-top: 0;
  margin-bottom: 1.05em;
}
.markdown-body blockquote {
  border-left: 4px solid #bfdbfe;
  color: #4b5563;
  padding: 4px 0 4px 16px;
  background: #f8fafc;
}
.markdown-body pre {
  background: var(--code-bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  overflow: auto;
}
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: .92em;
}
.markdown-body :not(pre) > code {
  background: #eef2ff;
  border-radius: 4px;
  padding: 2px 5px;
}
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  display: block;
  overflow-x: auto;
}
.markdown-body th,
.markdown-body td {
  border: 1px solid var(--line);
  padding: 8px 10px;
}
.markdown-body th { background: #f8fafc; }
.empty-doc {
  border: 1px dashed var(--line);
  border-radius: 8px;
  color: var(--muted);
  padding: 22px;
  background: var(--panel);
}
.raw-download {
  display: inline-flex;
  margin: 0 0 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--panel);
}

@media (max-width: 1100px) {
  .doc-shell { grid-template-columns: 250px minmax(0, 1fr); }
  .doc-toc { display: none; }
}
@media (max-width: 780px) {
  .home-hero,
  .home-layout {
    grid-template-columns: 1fr;
  }
  .topic-list {
    position: static;
  }
  .doc-shell {
    display: block;
  }
  .doc-sidebar {
    position: static;
    height: auto;
    max-height: 50vh;
  }
  .doc-main {
    padding: 0 16px 48px;
  }
}
`;
}

function js() {
  return `function groupDocs(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHome() {
  const docs = window.TECH_DOCS_SEARCH || [];
  const nav = window.TECH_DOCS_NAV || [];
  const topicEl = document.getElementById('topic-list');
  const resultsEl = document.getElementById('doc-results');
  const input = document.getElementById('doc-search');
  if (!topicEl || !resultsEl || !input) return;

  let activeGroup = '全部';
  const groups = groupDocs(nav);
  const topicRows = [['全部', nav.length], ...Object.entries(groups).map(([name, items]) => [name, items.length])];

  function renderTopics() {
    topicEl.innerHTML = topicRows.map(([name, count]) => (
      '<button class="topic-button ' + (activeGroup === name ? 'active' : '') + '" data-topic="' + escapeHtml(name) + '">' +
        '<span>' + escapeHtml(name) + '</span><span>' + count + '</span>' +
      '</button>'
    )).join('');
  }

  function renderResults() {
    const q = input.value.trim().toLowerCase();
    const filtered = docs.filter((doc) => {
      const inGroup = activeGroup === '全部' || doc.group === activeGroup;
      if (!inGroup) return false;
      if (!q) return true;
      return (doc.title + ' ' + doc.group + ' ' + doc.relativePath + ' ' + doc.excerpt + ' ' + doc.headings.join(' ')).toLowerCase().includes(q);
    });

    resultsEl.innerHTML = filtered.map((doc) => (
      '<a class="result-card" href="' + doc.url + '">' +
        '<h2>' + escapeHtml(doc.title) + '</h2>' +
        '<p>' + escapeHtml(doc.excerpt || (doc.isEmpty ? '暂无内容' : doc.relativePath)) + '</p>' +
        '<div class="result-meta"><span class="pill">' + escapeHtml(doc.group) + '</span><span>' + escapeHtml(doc.relativePath) + '</span></div>' +
      '</a>'
    )).join('') || '<div class="empty-doc">没有匹配的文档。</div>';
  }

  topicEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-topic]');
    if (!button) return;
    activeGroup = button.dataset.topic;
    renderTopics();
    renderResults();
  });
  input.addEventListener('input', renderResults);
  renderTopics();
  renderResults();
}

function renderSidebar() {
  const sidebar = document.getElementById('doc-sidebar');
  const nav = window.TECH_DOCS_NAV || [];
  const current = window.TECH_DOC?.url;
  if (!sidebar) return;

  sidebar.innerHTML = '<div class="sidebar-title"><a href="/tech-docs/">技术文档</a><span>' + nav.length + '</span></div>' +
    '<input class="sidebar-search" id="sidebar-search" type="search" placeholder="筛选文档">' +
    '<div id="sidebar-links"></div>';

  const links = document.getElementById('sidebar-links');
  const input = document.getElementById('sidebar-search');

  function draw() {
    const q = input.value.trim().toLowerCase();
    const filtered = nav.filter((doc) => !q || (doc.title + ' ' + doc.group + ' ' + doc.relativePath).toLowerCase().includes(q));
    const groups = groupDocs(filtered);
    links.innerHTML = Object.entries(groups).map(([group, docs]) => (
      '<div class="sidebar-group">' + escapeHtml(group) + '</div>' +
      docs.map((doc) => '<a class="sidebar-link ' + (doc.url === current ? 'active' : '') + '" href="' + doc.url + '">' + escapeHtml(doc.title) + '</a>').join('')
    )).join('');
  }

  input.addEventListener('input', draw);
  draw();
}

function renderToc() {
  const toc = document.getElementById('doc-toc');
  const doc = window.TECH_DOC;
  if (!toc || !doc || !doc.headings?.length) return;
  toc.innerHTML = '<div class="toc-title">目录</div>' + doc.headings.slice(0, 40).map((heading) => {
    const id = heading.id || heading.text.toLowerCase().replace(/\\s+/g, '-');
    return '<a class="toc-link level-' + heading.level + '" href="#' + encodeURIComponent(id) + '">' + escapeHtml(heading.text) + '</a>';
  }).join('');
}

function preprocessMarkdown(markdown) {
  return markdown.replace(/\\]\\(\\/Users\\/[^)]+\\)/g, '](#local-path)');
}

function renderDocument() {
  const target = document.getElementById('doc-content');
  const doc = window.TECH_DOC;
  if (!target || !doc) return;

  if (doc.isEmpty) {
    target.innerHTML = '<div class="empty-doc">这篇文档当前为空，已保留入口，后续补内容后可重新生成。</div>';
    return;
  }

  if (doc.kind === 'graphml') {
    target.innerHTML = '<a class="raw-download" href="' + doc.assetUrl + '" download>下载 GraphML 原文件</a>' +
      '<pre><code class="language-xml">' + escapeHtml(doc.markdown) + '</code></pre>';
    if (window.hljs) hljs.highlightAll();
    return;
  }

  const markdown = preprocessMarkdown(doc.markdown);
  if (!window.marked) {
    target.innerHTML = '<pre><code>' + escapeHtml(markdown) + '</code></pre>';
    return;
  }

  marked.setOptions({
    breaks: false,
    gfm: true,
    headerIds: true,
    mangle: false,
    highlight(code, lang) {
      if (!window.hljs) return code;
      const valid = lang && hljs.getLanguage(lang);
      return valid ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
    }
  });

  target.innerHTML = marked.parse(markdown);
  target.querySelectorAll('a[href="#local-path"]').forEach((link) => {
    link.removeAttribute('href');
    link.title = '本地路径链接未发布';
  });
  target.querySelectorAll('pre code.language-mermaid').forEach((code) => {
    const pre = code.parentElement;
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = code.textContent;
    pre.replaceWith(div);
  });
  if (window.hljs) hljs.highlightAll();
  if (window.mermaid) {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
    mermaid.run({ querySelector: '.mermaid' }).catch(() => {});
  }
}

renderHome();
renderSidebar();
renderDocument();
renderToc();
`;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function build() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source directory does not exist: ${sourceRoot}`);
  }

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const usedByDir = new Map();
  const skipped = [];
  const docs = [];

  for (const file of walk(sourceRoot).sort((a, b) => relPath(a).localeCompare(relPath(b), 'zh-CN'))) {
    const relative = relPath(file);
    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);
    const originalRaw = fs.readFileSync(file, 'utf8');
    const skipReason = sensitiveReason(originalRaw);
    if (skipReason) {
      skipped.push(skipReason);
      continue;
    }
    const raw = sanitizeMarkdown(originalRaw);
    const isEmpty = raw.trim().length === 0;
    const fallbackTitle = path.basename(file, ext);
    const group = relative.includes('/') ? relative.split('/')[0] : '基础文档';
    const route = routeFor(relative, usedByDir);
    const url = '/' + route.replace(/index\.html$/, '');
    const headings = headingsFrom(raw).map((heading) => ({
      ...heading,
      id: slugify(heading.text, 'heading'),
    }));
    const hash = crypto.createHash('sha1').update(relative).digest('hex').slice(0, 8);

    const doc = {
      id: hash,
      title: isEmpty ? fallbackTitle : titleFromMarkdown(raw, fallbackTitle),
      group,
      relativePath: relative,
      url,
      kind: ext === '.graphml' ? 'graphml' : 'markdown',
      markdown: raw,
      headings,
      excerpt: isEmpty ? '' : excerptFrom(raw),
      isEmpty,
      wordCount: raw.length,
      updatedAt: stat.mtime.toISOString(),
    };

    if (ext === '.graphml') {
      const assetName = `${hash}-${path.basename(file)}`;
      const assetPath = path.join(assetsDir, 'files', assetName);
      fs.mkdirSync(path.dirname(assetPath), { recursive: true });
      fs.copyFileSync(file, assetPath);
      doc.assetUrl = `/tech-docs/assets/files/${assetName}`;
      doc.title = fallbackTitle;
      doc.excerpt = 'GraphML 图文件，可下载原文件查看。';
    }

    docs.push({ doc, route });
  }

  const nav = docs.map(({ doc }) => ({
    id: doc.id,
    title: doc.title,
    group: doc.group,
    relativePath: doc.relativePath,
    url: doc.url,
    isEmpty: doc.isEmpty,
  }));

  const searchIndex = docs.map(({ doc }) => ({
    id: doc.id,
    title: doc.title,
    group: doc.group,
    relativePath: doc.relativePath,
    url: doc.url,
    excerpt: doc.excerpt,
    headings: doc.headings.map((heading) => heading.text),
    isEmpty: doc.isEmpty,
  }));

  writeFile(path.join(outputRoot, 'index.html'), indexHtml(nav, searchIndex));
  writeFile(path.join(assetsDir, 'tech-docs.css'), css());
  writeFile(path.join(assetsDir, 'tech-docs.js'), js());
  writeFile(path.join(assetsDir, 'search.json'), JSON.stringify(searchIndex, null, 2));

  for (const { doc, route } of docs) {
    writeFile(path.join(repoRoot, route), docHtml(doc, nav));
  }

  console.log(`Generated ${docs.length} documents in ${outputRoot}`);
  console.log(`Skipped ${skipped.length} sensitive documents`);
}

build();
