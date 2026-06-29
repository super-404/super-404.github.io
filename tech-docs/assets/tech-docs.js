function groupDocs(items) {
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
    const id = heading.id || heading.text.toLowerCase().replace(/\s+/g, '-');
    return '<a class="toc-link level-' + heading.level + '" href="#' + encodeURIComponent(id) + '">' + escapeHtml(heading.text) + '</a>';
  }).join('');
}

function preprocessMarkdown(markdown) {
  return markdown.replace(/\]\(\/Users\/[^)]+\)/g, '](#local-path)');
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
