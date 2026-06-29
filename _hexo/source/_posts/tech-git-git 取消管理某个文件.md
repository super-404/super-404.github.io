---
title: 'git 取消管理某个文件'
date: '2025-09-12 18:01'
categories:
  - '技术文档'
  - '工程工具'
  - 'Git'
  - '文件跟踪'
tags:
  - 'git'
---

I'll update the `.gitignore` to ignore the `logs/` directory and then untrack any log files already added to git so they won't be committed going forward.

个[1 tool called]

- `.gitignore` 里已经有 `logs/`，未来新增的日志文件不会再被跟踪。
- 但你当前仓库“已加入暂存区”的日志仍会被提交。执行一次取消跟踪即可：

命令（在项目根目录执行）:
```bash
git rm -r --cached logs
```

然后提交 `.gitignore` 与本次变更：
```bash
git add .gitignore
git commit -m "Ignore logs directory and untrack existing log files"
```

这样 `logs/` 将只保留在本地，不受 Git 管理。
