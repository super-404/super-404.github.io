---
title: '排除依赖'
date: '2025-09-24 11:04'
categories:
  - '工程工具'
  - 'Maven'
  - '依赖管理'
tags:
  - 'maven'
---

好的，我们来详细讲解 Maven 中 **`<exclusions>`** 标签的用法、作用和原理。

### 1. 核心概念：什么是依赖传递？

Maven 的一个强大功能是**依赖传递**。当你项目 A 依赖了库 B，而库 B 本身又依赖了库 C，那么 Maven 会自动将库 B 和库 C 都引入到你的项目 A 中。

例如：
- 你的项目 `MyProject` 引入了 `spring-boot-starter-web`。
- `spring-boot-starter-web` 内部又依赖了 `spring-boot-starter-json`。
- `spring-boot-starter-json` 内部又依赖了 `jackson-databind`。

Maven 会自动帮你把这一整条依赖链都引入进来，非常方便。

### 2. 问题所在：依赖传递带来的冲突

但依赖传递也会带来问题，最常见的就是**依赖冲突**。想象以下场景：

- 你的项目 `MyProject` 依赖了库 `A (v2.0)` 和库 `B (v1.0)`。
- 库 `A (v2.0)` 内部依赖了库 `C (v2.0)`。
- 库 `B (v1.0)` 内部也依赖了库 `C (v1.0)`。

现在，你的项目里出现了同一个库 `C` 的两个版本：**v1.0** 和 **v2.0**。这被称为 **“依赖冲突”**。

Maven 会使用 **“最近原则”** 来解决这个冲突：
- **路径最近者优先**：哪个版本的依赖在依赖树中的路径最短，就使用哪个版本。
- 如果路径长度相同，则 **“先声明者优先”**：在 `pom.xml` 文件中先声明的依赖其传递依赖优先。

虽然 Maven 有解决机制，但有时它自动选择的版本并不是我们想要的。比如：
1.  **版本不兼容**：自动选择的版本（比如 `C v2.0`）可能与你的另一个依赖 `B` 不兼容，导致 `NoSuchMethodError` 或 `ClassNotFoundException`。
2.  **不需要的依赖**：某个传递依赖可能包含安全漏洞，你需要排除它。
3.  **避免重复**：两个依赖可能引入了不同版本但功能相同的库（如 `log4j` 和 `slf4j-log4j`），你需要排除一个以避免冲突。
------
### 3. 解决方案：使用 `<exclusions>` 标签

`<exclusions>` 标签的作用就是**手动中断某个依赖的传递**，告诉 Maven：“请不要引入这个特定依赖及其传递过来的某个子依赖”。

**位置**：`<exclusions>` 标签必须放在 `<dependency>` 标签内部。

**语法结构**：
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <!-- 这里可以列出多个要排除的依赖 -->
        <exclusion>
            <groupId>要排除的依赖的 groupId</groupId>
            <artifactId>要排除的依赖的 artifactId</artifactId>
            <!-- 注意：这里不需要写 version -->
        </exclusion>
    </exclusions>
</dependency>
```
------
### 4. 实战示例

**场景**：Spring Boot 的 Web 起步依赖默认会传递引入 Tomcat 作为内嵌服务器。但你想改用 Jetty 服务器。

**步骤**：
1.  **排除掉 `spring-boot-starter-web` 中的 Tomcat 依赖。**
2.  **显式引入 `spring-boot-starter-jetty` 依赖。**

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <exclusions>
            <!-- 排除 Tomcat -->
            <exclusion>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-tomcat</artifactId>
            </exclusion>
        </exclusions>
    </dependency>

    <!-- 引入 Jetty -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-jetty</artifactId>
    </dependency>
</dependencies>
```

**另一个常见例子：排除冲突的 Logging 库**
不同的库可能会引入不同的日志实现（如 Log4j, Commons Logging），导致冲突。你可以统一排除它们，然后引入一个你想要的版本。

```xml
<dependency>
    <groupId>some.problematic.dependency</groupId>
    <artifactId>some-artifact</artifactId>
    <exclusions>
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
        <exclusion>
            <groupId>log4j</groupId>
            <artifactId>log4j</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```
------
### 5. 如何找到需要排除的依赖？

1.  **使用 Maven 命令查看依赖树**：
    在项目根目录下执行：
    ```bash
    mvn dependency:tree
    ```
    这会打印出整个项目的依赖关系树，你可以清晰地看到哪个依赖是通过哪个路径传递进来的。

2.  **在 IDE 中查看**：
    现代 IDE（如 IntelliJ IDEA, Eclipse with m2eclipse）都提供了图形化的 Maven 依赖管理工具，可以非常方便地查看和排除依赖。

例如，执行 `mvn dependency:tree` 后，你可能会看到：
```
[INFO] com.example:my-project:jar:1.0.0
[INFO] +- org.springframework.boot:spring-boot-starter-web:jar:2.7.0:compile
[INFO] |  +- org.springframework.boot:spring-boot-starter-tomcat:jar:2.7.0:compile  <-- 这个就是我们要排除的
[INFO] |  |  +- ...
```
从输出中，你就能准确地找到需要排除的依赖的 `groupId` 和 `artifactId`。

### 总结

| 要点         | 说明                                                         |
| :----------- | :----------------------------------------------------------- |
| **作用**     | 手动中断依赖传递，排除特定的、不需要的或冲突的子依赖。       |
| **位置**     | 在 `<dependency>` 标签内部使用。                             |
| **语法**     | 使用 `<exclusion>` 标签指定要排除依赖的 `groupId` 和 `artifactId`（**不指定版本**）。 |
| **使用时机** | 解决依赖冲突、替换实现、排除有安全漏洞的库时。               |
| **诊断工具** | `mvn dependency:tree` 命令或 IDE 的 Maven 插件。             |

简单来说，**`<exclusions>` 就是你告诉 Maven 的“停止清单”，明确禁止某些不受欢迎的依赖进入你的项目。**
