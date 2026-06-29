---
title: 'spring-boot-2.x.x.jar!/META-INF/spring.factories'
date: '2025-09-27 17:17'
categories:
  - '技术文档'
  - 'springboot'
tags:
  - 'springboot'
  - 'spring源码阅读'
---

好的，这是 Spring Boot 事件发布机制中的关键方法，用于获取和封装所有的运行监听器。让我们深入解析这个方法。

## 方法概览

**作用**：加载并封装所有 `SpringApplicationRunListener` 实现，用于在应用启动的生命周期不同阶段发布事件。

**返回值**：`SpringApplicationRunListeners` - 运行监听器的组合对象，提供批量操作能力。
------
## 代码逐行深度解析

### 1. 定义构造函数参数类型
```java
Class<?>[] types = new Class<?>[] { SpringApplication.class, String[].class };
```

这里定义了实例化 `SpringApplicationRunListener` 时需要的构造函数参数类型：
- `SpringApplication.class`：当前 SpringApplication 实例
- `String[].class`：命令行参数数组

### 2. 加载和实例化监听器
```java
getSpringFactoriesInstances(SpringApplicationRunListener.class, types, this, args)
```

这是最核心的部分，调用我们之前分析过的 `getSpringFactoriesInstances` 方法：

**参数解析：**
- `SpringApplicationRunListener.class`：要加载的接口类型
- `types`：构造函数参数类型数组
- `this`：当前 SpringApplication 实例（第一个参数）
- `args`：命令行参数（第二个参数）

**内部执行流程：**
1. 从 `META-INF/spring.factories` 加载所有 `SpringApplicationRunListener` 实现类名
2. 通过反射实例化这些类，传入 `this`（SpringApplication）和 `args` 参数
3. 对实例进行排序（支持 `@Order` 注解等）

### 3. 创建监听器组合对象
```java
return new SpringApplicationRunListeners(logger,
        getSpringFactoriesInstances(SpringApplicationRunListener.class, types, this, args));
```

创建 `SpringApplicationRunListeners` 对象，这是一个**组合模式**的实现。
------
## SpringApplicationRunListeners 类的作用

`SpringApplicationRunListeners` 是一个包装类，它的主要作用是：

### 1. 批量操作多个监听器
```java
public class SpringApplicationRunListeners {
    private final Log log;
    private final List<SpringApplicationRunListener> listeners;
    
    // 批量调用所有监听器的 starting() 方法
    public void starting() {
        for (SpringApplicationRunListener listener : this.listeners) {
            listener.starting();
        }
    }
    
    // 批量调用所有监听器的 environmentPrepared() 方法
    public void environmentPrepared(ConfigurableEnvironment environment) {
        for (SpringApplicationRunListener listener : this.listeners) {
            listener.environmentPrepared(environment);
        }
    }
    // ... 其他方法
}
```

### 2. 提供统一的日志记录
```java
public void starting() {
    for (SpringApplicationRunListener listener : this.listeners) {
        // 统一的日志处理
        listener.starting();
    }
}
```

### 3. 异常处理
确保一个监听器的失败不会影响其他监听器的执行。
------
## 实际加载的监听器示例

在 Spring Boot 中，默认会加载以下监听器（来自 `spring-boot.jar` 中的 `META-INF/spring.factories`）：

```properties
# spring-boot-2.x.x.jar!/META-INF/spring.factories
org.springframework.boot.SpringApplicationRunListener=\
org.springframework.boot.context.event.EventPublishingRunListener
```

**主要实现：`EventPublishingRunListener`**
这是最重要的运行监听器，它负责将生命周期事件转换为 Spring 的 `ApplicationEvent`。
------
## 完整的工作流程

### 1. 加载阶段
```mermaid
graph LR
    A[getRunListeners调用] --> B[定义参数类型 SpringApplication.class, String[].class]
    B --> C[调用getSpringFactoriesInstances]
    C --> D[扫描META-INF/spring.factories]
    D --> E[找到EventPublishingRunListener等实现]
    E --> F[实例化监听器传入this和args参数]
    F --> G[创建SpringApplicationRunListeners包装对象]
    G --> H[返回组合监听器]
```

### 2. 在启动流程中的使用
```java
public ConfigurableApplicationContext run(String... args) {
    // 获取监听器
    SpringApplicationRunListeners listeners = getRunListeners(args);
    
    // 发布启动事件
    listeners.starting();
    
    // 准备环境
    ConfigurableEnvironment environment = prepareEnvironment(listeners, applicationArguments);
    
    // 发布上下文准备事件
    listeners.contextPrepared(context);
    
    // ... 其他生命周期事件
}
```
------
## 设计模式分析

### 1. **组合模式（Composite Pattern）**
`SpringApplicationRunListeners` 作为组合对象，统一管理多个 `SpringApplicationRunListener`。

**优点：**
- 客户端代码可以统一处理单个或多个监听器
- 简化了批量操作逻辑
- 隐藏了内部的多监听器管理复杂性

### 2. **观察者模式（Observer Pattern）**
`SpringApplicationRunListener` 本身就是观察者模式的实现，监听应用启动的生命周期事件。

### 3. **工厂方法模式（Factory Method Pattern）**
`getSpringFactoriesInstances` 是典型的工厂方法，负责创建对象实例。
------
## 实际应用场景

### 自定义运行监听器
```java
public class CustomRunListener implements SpringApplicationRunListener {
    
    public CustomRunListener(SpringApplication application, String[] args) {
        // 构造函数接收 SpringApplication 和命令行参数
    }
    
    @Override
    public void starting() {
        System.out.println("应用开始启动...");
    }
    
    @Override
    public void environmentPrepared(ConfigurableEnvironment environment) {
        System.out.println("环境准备完成: " + environment);
    }
    
    // ... 实现其他方法
}
```

### 注册自定义监听器
在 `META-INF/spring.factories` 中注册：
```properties
org.springframework.boot.SpringApplicationRunListener=\
com.example.CustomRunListener,\
org.springframework.boot.context.event.EventPublishingRunListener
```
------
## 异常处理机制

`SpringApplicationRunListeners` 内部会有完善的异常处理：

```java
public void starting() {
    for (SpringApplicationRunListener listener : this.listeners) {
        try {
            listener.starting();
        } catch (Throwable ex) {
            // 记录错误但继续执行其他监听器
            this.log.error("RunListener starting failed", ex);
        }
    }
}
```

## 总结

`getRunListeners` 方法体现了 Spring Boot 的**事件驱动架构**和**扩展性设计**：

### 核心价值：
1. **统一加载机制**：通过 `spring.factories` 自动发现和加载监听器
2. **生命周期管理**：在应用启动的关键节点发布事件
3. **批量操作封装**：通过组合模式简化多监听器管理
4. **扩展性强**：允许用户自定义监听器介入启动流程

### 在启动流程中的作用：
- **事件发布桥梁**：连接 SpringApplication 和具体的事件监听器
- **解耦设计**：将启动逻辑与事件处理分离
- **可观测性**：通过监听器可以监控和跟踪启动过程

这个方法是 Spring Boot **"开箱即用"但"高度可扩展"** 设计哲学的典型体现。
