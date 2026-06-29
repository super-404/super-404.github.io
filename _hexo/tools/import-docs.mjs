import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const hexoRoot = path.resolve(toolDir, '..');
const repoRoot = process.env.PUBLISH_REPO_ROOT ?? path.resolve(hexoRoot, '..');
const sourceRoot = process.env.TECH_DOCS_SOURCE_DIR ?? path.join(os.homedir(), 'Downloads', '技术文档');
const outPosts = path.join(hexoRoot, 'source', '_posts');
const outAssets = path.join(hexoRoot, 'source', 'tech-assets');

const publishExts = new Set(['.md', '.markdown', '.graphml']);
const sensitiveRules = [
  /console\.alibabacloud\.com|resourceGroupId=|prod-acr|ali(?:yun)?cs\.com|\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/i,
  /search\.google\.com\/(?:u\/\d+\/)?search-console/i,
  /api[_-]?key[\s\S]*[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
];

const categoryByTitle = new Map([
  ['输出的网络连接信息含义', 'linux'],
  ['systemctl命令介绍和使用', 'linux'],
  ['Sql窗口函数', 'mysql'],
  ['lombok 的注解', 'lombok'],
  ['linux扩容在centos-root下', 'linux'],
  ['MySQL的锁', 'MySQL'],
  ['redis的使用经验', 'redis'],
  ['risc-v OS学习记录', 'risc-V'],
  ['LockSupport的使用和基本原理', 'juc'],
  ['SpringBoot升级3.2报错Invalid value type for attribute factoryBeanObjectType java.lang.String的解决方案', 'springboot'],
  ['背包问题', '算法笔记'],
  ['983.最低票价', '算法'],
  ['反模式的代码审查', null],
  ['洛谷P3985 不开心的金明', null],
  ['完全背包变形问题', null],
]);

const tagsByTitle = new Map([
  ['输出的网络连接信息含义', ['ip', '计算机网络']],
  ['systemctl命令介绍和使用', ['命令']],
  ['lombok 的注解', ['lombok']],
  ['risc-v OS学习记录', ['risc-v', '汇编']],
  ['redis的使用经验', ['redis']],
  ['MySQL的锁', ['lock']],
  ['LockSupport的使用和基本原理', ['java', 'juc', '多线程']],
  ['SpringBoot升级3.2报错Invalid value type for attribute factoryBeanObjectType java.lang.String的解决方案', ['bug']],
  ['背包问题', ['动态规划']],
  ['983.最低票价', ['动态规划']],
  ['反模式的代码审查', ['译文']],
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && publishExts.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToMarkdown(html) {
  let text = html;
  text = text.replace(/<h([1-6])[^>]*>[\s\S]*?<\/h\1>/gi, (match, level) => {
    const titleMatch = match.match(/title="([^"]+)"/);
    const title = titleMatch?.[1] ?? stripHtml(match);
    return `\n${'#'.repeat(Number(level))} ${title}\n\n`;
  });
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, body) => `\n${stripHtml(body)}\n\n`);
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, body) => {
    return `\n${stripHtml(body).split(/\n+/).map((line) => `> ${line}`).join('\n')}\n\n`;
  });
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, body) => `\n- ${stripHtml(body)}`);
  text = text.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, body) => `\n\`\`\`\n${stripHtml(body)}\n\`\`\`\n\n`);
  text = text.replace(/<figure class="highlight[^"]*">[\s\S]*?<td class="code"><pre><code[^>]*>([\s\S]*?)<\/code><\/pre><\/td>[\s\S]*?<\/figure>/gi, (_, body) => {
    return `\n\`\`\`\n${stripHtml(body).replace(/\s*\n\s*/g, '\n')}\n\`\`\`\n\n`;
  });
  text = text.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, (_, src) => `\n![](${src})\n\n`);
  text = stripHtml(text).replace(/([。！？])\s+/g, '$1\n\n');
  return text.trim() + '\n';
}

function yamlValue(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function frontMatter(meta, body) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${yamlValue(item)}`);
    } else {
      lines.push(`${key}: ${yamlValue(value)}`);
    }
  }
  lines.push('---', '', body);
  return lines.join('\n');
}

function relativePosix(file, root) {
  return path.relative(root, file).split(path.sep).join('/');
}

function titleFromMarkdown(markdown, fallback) {
  const heading = markdown.match(/^\s*#\s+(.+?)\s*$/m);
  return heading?.[1]?.replace(/[`*_#]/g, '').trim() || fallback;
}

function isSensitive(content) {
  return sensitiveRules.some((rule) => rule.test(content));
}

function sanitizeMarkdown(markdown) {
  return markdown
    .replace(/\]\(\/Users\/[^)]+\)/g, '](#local-path)')
    .replace(/^\s*---\s*$/gm, '------');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assetUrl(relDir, asset) {
  return `/${relDir.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(asset)}`;
}

function fixLegacyAssetLinks(html, relDir, assets) {
  let fixed = html;
  for (const asset of assets) {
    const encoded = encodeURIComponent(asset);
    const candidates = [asset, encoded].map(escapeRegExp).join('|');
    fixed = fixed.replace(
      new RegExp(`(src|href)="[^"]*(?:${candidates})"`, 'g'),
      (_, attr) => `${attr}="${assetUrl(relDir, asset)}"`,
    );
  }
  return fixed;
}

function copyTree(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function importLegacyPosts() {
  const postFiles = [];
  for (const year of ['2020', '2022', '2023', '2024']) {
    const dir = path.join(repoRoot, year);
    if (fs.existsSync(dir)) postFiles.push(...walkLegacy(dir));
  }

  for (const htmlFile of postFiles.sort()) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const title = html.match(/<h1 style="display: none">([\s\S]*?)<\/h1>/)?.[1]?.trim()
      || html.match(/<span id="subtitle" data-typed-text="([^"]*)"/)?.[1]?.trim()
      || html.match(/<title>(.*?) - Hexo<\/title>/)?.[1]?.trim()
      || path.basename(path.dirname(htmlFile));
    const datetime = html.match(/<time datetime="([^"]+)"/)?.[1]?.replace(' ', 'T') || dateFromPath(htmlFile);
    const relDir = path.relative(repoRoot, path.dirname(htmlFile)).split(path.sep).join('/');
    const slug = relDir.split('/').slice(3).join('-') || path.basename(path.dirname(htmlFile));
    const assetDir = path.dirname(htmlFile);
    const assets = fs.readdirSync(assetDir).filter((name) => !['index.html'].includes(name));
    const bodyHtml = html.match(/<div class="markdown-body">\s*([\s\S]*?)\s*<\/div>\s*<hr\/>/)?.[1] || '';
    const body = fixLegacyAssetLinks(bodyHtml, relDir, assets).trim() + '\n';
    const meta = {
      title,
      date: datetime.replace('T', ' '),
      categories: categoryByTitle.get(title),
      tags: tagsByTitle.get(title),
      abbrlink: undefined,
    };
    fs.writeFileSync(path.join(outPosts, `${slug}.md`), frontMatter(meta, body));

    if (assets.length) {
      const target = path.join(hexoRoot, 'source', relDir);
      ensureDir(target);
      for (const asset of assets) {
        const source = path.join(assetDir, asset);
        if (fs.statSync(source).isFile()) fs.copyFileSync(source, path.join(target, asset));
      }
    }
  }
}

function walkLegacy(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkLegacy(full));
    else if (entry.isFile() && entry.name === 'index.html' && /\/\d{4}\/\d{2}\/\d{2}\//.test(full)) result.push(full);
  }
  return result;
}

function dateFromPath(file) {
  const rel = path.relative(repoRoot, file).split(path.sep);
  return `${rel[0]}-${rel[1]}-${rel[2]} 00:00`;
}

function importTechDocs() {
  let imported = 0;
  let skipped = 0;
  for (const file of walk(sourceRoot).sort((a, b) => relativePosix(a, sourceRoot).localeCompare(relativePosix(b, sourceRoot), 'zh-CN'))) {
    const raw = fs.readFileSync(file, 'utf8');
    if (isSensitive(raw)) {
      skipped += 1;
      continue;
    }

    const relative = relativePosix(file, sourceRoot);
    const ext = path.extname(file).toLowerCase();
    const stem = path.basename(file, ext);
    const group = relative.includes('/') ? relative.split('/')[0] : '基础文档';
    let body;
    let title;
    const assetNames = [];

    if (ext === '.graphml') {
      ensureDir(outAssets);
      const assetName = `graphml-${imported + 1}.graphml`;
      fs.copyFileSync(file, path.join(outAssets, assetName));
      title = stem;
      body = `GraphML 原文件：[/tech-assets/${assetName}](/tech-assets/${assetName})\n`;
      assetNames.push(assetName);
    } else {
      body = sanitizeMarkdown(raw.trim() ? raw : '暂无内容。');
      title = titleFromMarkdown(body, stem);
    }

    const postName = `tech-${relative.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '-')}.md`;
    const date = new Date(fs.statSync(file).mtime);
    const dateText = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-') + ' ' + [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
    ].join(':');

    fs.writeFileSync(
      path.join(outPosts, postName),
      frontMatter(
        {
          title,
          date: dateText,
          categories: ['技术文档', group],
          tags: relative.split('/').slice(0, -1),
        },
        body + '\n',
      ),
    );
    imported += 1;
  }
  console.log(`Imported ${imported} tech docs, skipped ${skipped} sensitive docs`);
}

ensureDir(outPosts);
copyTree(path.join(repoRoot, 'img'), path.join(hexoRoot, 'source', 'img'));
importLegacyPosts();
importTechDocs();
