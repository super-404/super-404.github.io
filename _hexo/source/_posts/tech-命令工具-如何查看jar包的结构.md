---
title: '查看JAR包目录结构（不提取文件）'
date: '2025-09-26 19:51'
categories:
  - '技术文档'
  - '命令工具'
tags:
  - '命令工具'
---

查看JAR包的结构有多种方法，以下是几种常用的方式：

## 1. 使用 jar 命令（JDK自带）

```bash
# 查看JAR包目录结构（不提取文件）
jar tf yourfile.jar

# 查看详细的目录结构（包含文件大小和日期）
jar tvf yourfile.jar

# 查看特定路径的内容
jar tf yourfile.jar | grep "com/example"
```

## 2. 使用 unzip 命令（Linux/Mac）

```bash
# 查看目录结构
unzip -l yourfile.jar

# 查看并过滤特定文件
unzip -l yourfile.jar | grep ".class"
```

## 3. 使用 GUI 工具

### JD-GUI
- 开源Java反编译器，可以直观查看JAR包结构
- 支持直接浏览.class文件的源代码

### IntelliJ IDEA
- 直接将JAR包作为库添加到项目中
- 在Project视图中展开External Libraries即可查看

### Eclipse
- 导入JAR包后，在Package Explorer中查看

## 4. 使用命令行工具（Windows）

```cmd
# 使用jar命令
jar tf yourfile.jar

# 使用WinRAR或7-Zip
# 直接右键JAR文件，用压缩软件打开查看
```

## 5. 编程方式查看（Java代码）

```java
import java.util.jar.JarFile;
import java.util.Enumeration;
import java.util.jar.JarEntry;

public class JarViewer {
    public static void main(String[] args) throws Exception {
        JarFile jarFile = new JarFile("yourfile.jar");
        Enumeration<JarEntry> entries = jarFile.entries();
        
        while (entries.hasMoreElements()) {
            JarEntry entry = entries.nextElement();
            System.out.println(entry.getName());
        }
        jarFile.close();
    }
}
```

## 实用技巧

```bash
# 查看JAR包并排序
jar tf yourfile.jar | sort

# 统计文件数量
jar tf yourfile.jar | wc -l

# 只查看.class文件
jar tf yourfile.jar | grep "\.class$"

# 查看MANIFEST.MF文件
unzip -p yourfile.jar META-INF/MANIFEST.MF
```

**推荐使用**：对于简单查看，使用 `jar tf` 命令最方便；如果需要详细分析，建议使用JD-GUI等图形化工具。
