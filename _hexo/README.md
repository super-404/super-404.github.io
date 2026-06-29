# Hexo Source

This directory is the Hexo source for the GitHub Pages site in the repository root.

- Hexo: 6.3.0
- Theme: Fluid 1.9.4
- Posts: `source/_posts`

Common commands:

```bash
npm install
npm run generate
npm run publish
```

To add a new article, create a Markdown file in `source/_posts`, then run `npm run publish` from this directory.

中文说明：

- 继续写文章：在 `_hexo/source/_posts` 下新增 Markdown。
- 本地生成：在 `_hexo` 目录运行 `npm run generate`。
- 发布到仓库根目录：在 `_hexo` 目录运行 `npm run publish`，再提交并推送。
- 技术文章分类建议：第一层固定为 `技术文档`，后面按 `领域 / 技术栈 / 主题 / 具体方向` 逐层细分。

示例：

```yaml
categories:
  - '技术文档'
  - 'Spring'
  - 'Spring Boot'
  - 'Web接口'
  - '参数绑定'
```
