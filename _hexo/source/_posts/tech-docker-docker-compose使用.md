---
title: '运行指定的配置文件'
date: '2025-09-22 20:48'
categories:
  - '工程工具'
  - 'Docker'
  - 'Docker Compose'
tags:
  - 'docker'
---

好的，`docker-compose` 提供了灵活的选项来运行指定的配置文件，而不仅仅是默认的 `docker-compose.yml`。这在多环境（开发、测试、生产）配置中非常有用。

## 核心方法：使用 `-f` 或 `--file` 参数

最基本和常用的方法是通过 `-f` 标志指定一个或多个 Compose 文件。

### 1. 使用单个自定义文件

```bash
# 运行指定的配置文件
docker-compose -f docker-compose-light.yml up -d

# 停止指定配置定义的服务
docker-compose -f custom-compose.yml down

# 查看指定配置的服务状态
docker-compose -f custom-compose.yml ps
```

### 2. 组合多个配置文件（常用技巧）

这是最强大的功能，允许你有一个基础文件，然后通过其他文件覆盖或扩展配置。

```bash
# 基础文件 + 开发环境覆盖文件
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 基础文件 + 生产环境覆盖文件  
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**文件加载顺序很重要**：后面的文件会覆盖前面文件中相同的配置项。
------
## 实际应用场景示例

### 场景1：多环境配置

**文件结构：**
```
project/
├── docker-compose.yml          # 基础配置
├── docker-compose.dev.yml      # 开发环境覆盖
└── docker-compose.prod.yml     # 生产环境覆盖
```

**运行命令：**
```bash
# 开发环境（启用调试工具、映射源代码）
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 生产环境（优化配置、使用生产镜像）
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 场景2：特定功能启用

**文件结构：**
```
project/
├── docker-compose.yml          # 核心服务
├── docker-compose.monitoring.yml # 监控工具
└── docker-compose.tools.yml    # 开发工具
```

**运行命令：**
```bash
# 只运行核心服务
docker-compose up -d

# 运行核心服务 + 监控工具
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# 运行所有服务（核心+监控+工具）
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.tools.yml up -d
```
------
## 环境变量替代方案

除了 `-f` 参数，你还可以使用环境变量来指定文件。

### 1. 使用 `COMPOSE_FILE` 环境变量

```bash
# 设置环境变量（当前会话有效）
export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml

# 现在可以直接运行，无需 -f 参数
docker-compose up -d

# 或者一行命令完成
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml docker-compose up -d
```

### 2. 使用 `.env` 文件

创建 `.env` 文件：
```env
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
COMPOSE_PROJECT_NAME=myapp_dev
```

然后直接运行：
```bash
docker-compose up -d  # 会自动读取 .env 文件中的配置
```
------
## 项目名称管理

当使用不同配置文件时，建议使用 `-p` 参数指定项目名称，避免冲突。

```bash
# 为不同环境指定不同的项目名称
docker-compose -f docker-compose.prod.yml -p myapp_prod up -d
docker-compose -f docker-compose.dev.yml -p myapp_dev up -d

# 这样可以在同一台机器上同时运行开发和生产环境而不会冲突
```
------
## 完整工作示例

假设你有以下文件：

**docker-compose.yml (基础):**
```yaml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: mydb
```

**docker-compose.override.yml (开发):**
```yaml
services:
  web:
    volumes:
      - ./src:/usr/share/nginx/html  # 挂载源代码
    ports:
      - "8080:80"  # 修改端口
```

**运行命令：**
```bash
# 方法1：显式指定文件（推荐，更明确）
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 方法2：使用默认覆盖文件（docker-compose.override.yml 会被自动加载）
docker-compose up -d

# 查看最终生效的配置
docker-compose -f docker-compose.yml -f docker-compose.override.yml config
```

## 总结

| 需求               | 命令                                            | 说明                 |
| ------------------ | ----------------------------------------------- | -------------------- |
| **单个自定义文件** | `docker-compose -f custom.yml up`               | 最直接的方法         |
| **多文件组合**     | `docker-compose -f base.yml -f override.yml up` | 多环境配置的推荐方式 |
| **环境变量指定**   | `COMPOSE_FILE=file1:file2 docker-compose up`    | 适合在脚本中使用     |
| **避免项目冲突**   | `docker-compose -f file.yml -p project_name up` | 同一机器多环境运行   |

**最佳实践建议：**
- 使用 `-f` 参数明确指定文件，避免混淆
- 为不同环境创建不同的覆盖文件
- 使用 `-p` 参数管理项目名称
- 使用 `docker-compose config` 验证最终配置是否正确
