---
title: '一、@Import 是什么'
date: '2025-10-22 13:18'
categories:
  - '技术文档'
  - 'springboot'
tags:
  - 'springboot'
  - '类的注册'
---

好的，我们来系统讲解一下 Spring 中的 `@Import` 注解，它是 **Spring 配置类扩展与模块化的重要机制**，理解它对于掌握框架原理非常关键。

------

# 一、@Import 是什么

`@Import` 是 Spring Framework 提供的一个 **注解驱动的配置类扩展机制**，用于在 **配置类上**声明额外的 Bean 或配置类，Spring 会在容器启动时处理这些导入。

**核心作用**：

> 告诉 Spring “除了当前配置类定义的 Bean，还要加载/注册这些类的 Bean”。

------

# 二、@Import 的基本用法

### 1️⃣ 导入普通类（Class）

```java
@Configuration
@Import(OtherService.class)
public class AppConfig {
}
```

效果：

- `OtherService` 会被 Spring 注册为一个 Bean，Bean 名默认是 **类名首字母小写**（`otherService`）。
- 无需在 `OtherService` 上添加 `@Component`。

------

### 2️⃣ 导入多个类

```java
@Import({ServiceA.class, ServiceB.class})
public class AppConfig {}
```

Spring 会把数组中的类依次注册为 Bean。

------

### 3️⃣ 与配置类配合

你也可以导入其他配置类：

```java
@Configuration
@Import(OtherConfig.class)
public class AppConfig {}
```

效果：

- 等同于把 `@Configuration` 的内容合并进当前容器。
- 所以可以实现模块化配置，拆分功能区。

------

# 三、@Import 支持的类型（四类主要形式）

| 类型                              | 示例                                         | 说明                                                      |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| **普通类（Class）**               | `@Import(MyService.class)`                   | Spring 会直接注册为 Bean                                  |
| **配置类（@Configuration）**      | `@Import(OtherConfig.class)`                 | 等价于把配置类的 Bean 一并加载                            |
| **ImportSelector**                | 自定义类实现 `ImportSelector` 接口           | 可以动态决定导入哪些类（返回类全名数组）                  |
| **ImportBeanDefinitionRegistrar** | 自定义类实现 `ImportBeanDefinitionRegistrar` | 可编程式注册 BeanDefinition，比 ImportSelector 更底层灵活 |

------

### 3.1 ImportSelector

用法示例：

```java
public class MyImportSelector implements ImportSelector {
    @Override
    public String[] selectImports(AnnotationMetadata importingClassMetadata) {
        // 可以根据条件动态返回要导入的类
        return new String[]{ServiceA.class.getName(), ServiceB.class.getName()};
    }
}

@Configuration
@Import(MyImportSelector.class)
public class AppConfig {}
```

------

### 3.2 ImportBeanDefinitionRegistrar

用法示例：

```java
public class MyRegistrar implements ImportBeanDefinitionRegistrar {
    @Override
    public void registerBeanDefinitions(AnnotationMetadata metadata, BeanDefinitionRegistry registry) {
        registry.registerBeanDefinition("myService",
            BeanDefinitionBuilder.genericBeanDefinition(MyService.class).getBeanDefinition());
    }
}

@Configuration
@Import(MyRegistrar.class)
public class AppConfig {}
```

- 与 ImportSelector 不同，它直接操作 BeanDefinition 注册，几乎可以做任意扩展。

------

# 四、@Import 的执行顺序

Spring 在解析配置类时：

1. 解析普通 Bean（`@Bean`、`@Component`）
2. 处理 `@Import`：
   - 普通类 → 注册为 Bean
   - 配置类 → 合并配置
   - ImportSelector → 返回类名，继续注册
   - ImportBeanDefinitionRegistrar → 调用注册方法
3. 容器刷新，实例化所有 Bean

> 所以 ImportBeanDefinitionRegistrar 是最底层、最晚注册 BeanDefinition 的机制。

------

# 五、@Import 的典型应用场景

1. **模块化配置**

```java
@Configuration
@Import({DataSourceConfig.class, MyBatisConfig.class})
public class AppConfig {}
```

1. **条件性 Bean 注册**

- 框架中常用 ImportSelector 根据条件注册不同实现：
  - Spring Boot 自动配置 (`AutoConfigurationImportSelector`)
  - Spring Data JPA Repositories 扫描 (`RepositoryRegistrarSupport`)

1. **框架级 Bean 自动注册**

- MyBatis Mapper 扫描器 (`MapperScannerRegistrar`)
- Feign Client 自动注册 (`FeignClientsRegistrar`)
- Spring Boot actuator 自动配置

1. **自定义注解 + @Import**

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Import(MyRegistrar.class)
public @interface EnableMyFeature {}
```

- 用户只要加 `@EnableMyFeature`，即可触发 Registrar 注册 Bean，实现类似 “Spring Boot Starter” 的效果。

------

# 六、总结

| 特性     | 说明                                                         |
| -------- | ------------------------------------------------------------ |
| 注解     | `@Import`                                                    |
| 作用     | 告诉 Spring 容器导入额外类或配置类                           |
| 可以导入 | 普通类、配置类、ImportSelector、ImportBeanDefinitionRegistrar |
| 核心用途 | 模块化配置、条件注册、框架级自动 Bean 注册                   |
| 关键点   | 可以与自定义注解配合，实现“注解开启功能”的模式               |

------

✅ **一句话理解**

> `@Import` 就是 Spring 的“配置类扩展器”，可以把任何类、配置类或者动态注册逻辑导入容器，实现模块化和可编程注册 Bean。

------

我可以帮你画一张 **@Import + ImportSelector + ImportBeanDefinitionRegistrar 流程图**，让整个 Bean 注册流程一目了然。

你希望我画吗？
