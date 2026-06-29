---
title: '🌱 一、是什么'
date: '2025-10-22 13:21'
categories:
  - '技术文档'
  - 'springboot'
tags:
  - 'springboot'
  - '类的注册'
---

`ImportBeanDefinitionRegistrar` 是 Spring 框架中一个非常强大、但也容易被忽略的 **底层扩展机制**。
 它让你能在 **Spring 容器刷新阶段** 手动注册 Bean 定义，而不需要依赖注解（@Component、@Bean）等常规扫描方式。

下面我给你讲清楚这几个核心点 👇：

------

# 🌱 一、是什么

`ImportBeanDefinitionRegistrar` 是一个接口，定义如下：

```java
public interface ImportBeanDefinitionRegistrar {
    void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, 
                                 BeanDefinitionRegistry registry);
}
```

意思是：

> 当你通过 `@Import` 把这个类导入到 Spring 容器中时，Spring 会在容器启动阶段回调这个方法，你可以在这里**手动往容器中注册 BeanDefinition**。

也就是说，它是一个“编程式注册 Bean” 的入口。

------

# 🧩 二、它在 Spring 生命周期中的位置

在 Spring 启动（refresh）过程中：

1. 解析配置类（@Configuration）
2. 解析 @Import
3. **如果发现有 ImportBeanDefinitionRegistrar 类型的类**
    → 调用其 `registerBeanDefinitions()` 方法
4. 把这些注册的 BeanDefinition 一并加入 BeanFactory
5. 后续由 BeanFactory 实例化、依赖注入

因此，它的时机 **早于 Bean 创建**，属于 Bean 定义阶段。

------

# ⚙️ 三、使用方式（核心步骤）

### ✅ Step 1：编写 Registrar

```java
package com.example.demo.config;

import org.springframework.beans.factory.support.BeanDefinitionBuilder;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.annotation.ImportBeanDefinitionRegistrar;
import org.springframework.core.type.AnnotationMetadata;

public class MyRegistrar implements ImportBeanDefinitionRegistrar {
    @Override
    public void registerBeanDefinitions(AnnotationMetadata metadata, BeanDefinitionRegistry registry) {
        System.out.println("MyRegistrar invoked!");

        // 手动注册一个 Bean
        BeanDefinitionBuilder builder = BeanDefinitionBuilder
                .genericBeanDefinition(MyService.class);
        registry.registerBeanDefinition("myService", builder.getBeanDefinition());
    }
}
```

### ✅ Step 2：创建要注册的 Bean

```java
package com.example.demo.config;

public class MyService {
    public void hello() {
        System.out.println("Hello from MyService!");
    }
}
```

### ✅ Step 3：在配置类上导入

```java
package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import(MyRegistrar.class)
public class MyConfig {
}
```

### ✅ Step 4：运行测试

```java
package com.example.demo;

import com.example.demo.config.MyService;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import com.example.demo.config.MyConfig;

public class TestApp {
    public static void main(String[] args) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(MyConfig.class);
        MyService service = context.getBean(MyService.class);
        service.hello();
    }
}
```

运行输出：

```
MyRegistrar invoked!
Hello from MyService!
```

------

# 🧠 四、`ImportBeanDefinitionRegistrar` 和其他机制的区别

| 机制                            | 说明                                   | 典型用途                                       |
| ------------------------------- | -------------------------------------- | ---------------------------------------------- |
| `@Component` / `@Bean`          | 声明式注册 Bean                        | 普通 Bean                                      |
| `@Import(普通类)`               | 直接导入现成 Bean                      | 简单导入配置                                   |
| `ImportSelector`                | 动态选择要导入的配置类名（返回字符串） | 按条件加载配置                                 |
| `ImportBeanDefinitionRegistrar` | **直接注册 BeanDefinition（更底层）**  | 框架级扩展，如 Mapper 扫描、FeignClient 注册等 |

👉 **总结一句：**

- `ImportSelector` 负责“告诉 Spring 要导入谁”
- `ImportBeanDefinitionRegistrar` 负责“亲自把 Bean 注册进去”

------

# 🧩 五、真实应用场景（在框架源码中的使用）

很多知名框架都用了这个机制：

| 框架                       | 类名                               | 作用                       |
| -------------------------- | ---------------------------------- | -------------------------- |
| **Spring Boot**            | `AutoConfigurationImportRegistrar` | 自动配置导入               |
| **MyBatis-Spring**         | `MapperScannerRegistrar`           | 扫描并注册所有 Mapper 接口 |
| **Spring Cloud OpenFeign** | `FeignClientsRegistrar`            | 注册所有 Feign 客户端      |
| **Spring Data JPA**        | `RepositoryRegistrarSupport`       | 注册 Repository 接口代理   |

也就是说，很多“自动扫描”“自动代理”的魔法，其实就是在这里做的。

------

# 🧩 六、进阶：基于注解驱动的注册

有时你不想硬编码，而希望用注解参数来动态决定注册逻辑，比如：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@Import(MyRegistrar.class)
public @interface EnableMyService {
    String name() default "defaultService";
}
```

然后：

```java
public class MyRegistrar implements ImportBeanDefinitionRegistrar {
    @Override
    public void registerBeanDefinitions(AnnotationMetadata metadata, BeanDefinitionRegistry registry) {
        // 读取注解属性
        Map<String, Object> attrs = metadata.getAnnotationAttributes(EnableMyService.class.getName());
        String name = (String) attrs.get("name");

        BeanDefinitionBuilder builder = BeanDefinitionBuilder.genericBeanDefinition(MyService.class);
        registry.registerBeanDefinition(name, builder.getBeanDefinition());
    }
}
```

使用：

```java
@Configuration
@EnableMyService(name = "customService")
public class MyConfig {}
```

然后容器中会注册一个 `customService` Bean。

------

# ⚡ 七、执行顺序（和其他 Import 类型的顺序）

Spring 在解析配置类时，`@Import` 的处理顺序为：

1️⃣ 导入普通类（直接注册为 BeanDefinition）
 2️⃣ 执行 `ImportSelector`（先拿到要导入的类名）
 3️⃣ 执行 `ImportBeanDefinitionRegistrar`（真正注册 Bean）

执行完这些后，Spring 才进入 BeanFactory 阶段去实例化 Bean。

------

# 🧩 八、总结

| 特性     | 内容                             |
| -------- | -------------------------------- |
| 接口     | `ImportBeanDefinitionRegistrar`  |
| 触发时机 | Spring 解析配置类阶段            |
| 核心功能 | 手动注册 BeanDefinition          |
| 优势     | 灵活、可编程、无侵入性           |
| 常见用途 | 自动扫描、远程代理注册、框架扩展 |

------

# 🎯 一句话总结

> **`ImportBeanDefinitionRegistrar` 是 Spring 的“手工 Bean 注册入口”，框架作者的神器，应用开发者的底层钩子。**

------

如果你愿意，我可以帮你写一个完整可运行的 **自定义注解 + Registrar 实现 Demo**（例如模仿 MyBatis 的 Mapper 扫描器）。
 是否想要我帮你生成一个这样的 Maven Demo？
