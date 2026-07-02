---
title: 'Auto Configure'
date: '2025-09-11 21:03'
categories:
  - '中间件'
  - 'RPC'
  - '自动配置'
tags:
  - '中间件'
  - 'RPC'
---

好的，将 RPC 中间件与 Spring Boot 集成是标准的做法，可以让框架的启动和配置变得非常简单。下面是完整的步骤和代码实现。

## 1. 添加 Spring Boot 依赖

首先，在你的 `pom.xml` 中添加 Spring Boot  starter 依赖：

```xml
<!-- Spring Boot Starter -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
    <version>2.7.0</version> <!-- 或更高版本 -->
</dependency>

<!-- 如果需要web功能（如提供HTTP接口） -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <version>2.7.0</version>
</dependency>

<!-- Spring Boot 配置处理器（可选，用于提示配置） -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-configuration-processor</artifactId>
    <version>2.7.0</version>
    <optional>true</optional>
</dependency>
```

## 2. 创建主启动类

创建一个标准的 Spring Boot 主启动类：

```java
package com.yourcompany.rpc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * RPC 框架主启动类
 * 使用 @SpringBootApplication 注解开启自动配置和组件扫描
 */
@SpringBootApplication(scanBasePackages = "com.yourcompany.rpc")
public class RpcApplication {

    public static void main(String[] args) {
        SpringApplication.run(RpcApplication.class, args);
        System.out.println("RPC Application started successfully!");
    }
}
```

## 3. 创建配置属性类

为了让用户可以通过 `application.yml` 或 `application.properties` 配置 RPC 参数：

```java
package com.yourcompany.rpc.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * RPC 配置属性类
 * 允许在 application.yml 中配置 rpc 相关参数
 */
@ConfigurationProperties(prefix = "rpc")
public class RpcProperties {

    private String registryAddress = "localhost:2181";
    private int serverPort = 8088;
    private String serializer = "protobuf"; // protobuf, json, hessian
    private long timeout = 5000;

    // getters and setters
    public String getRegistryAddress() { return registryAddress; }
    public void setRegistryAddress(String registryAddress) { this.registryAddress = registryAddress; }
    
    public int getServerPort() { return serverPort; }
    public void setServerPort(int serverPort) { this.serverPort = serverPort; }
    
    public String getSerializer() { return serializer; }
    public void setSerializer(String serializer) { this.serializer = serializer; }
    
    public long getTimeout() { return timeout; }
    public void setTimeout(long timeout) { this.timeout = timeout; }
}
```

## 4. 创建自动配置类

这是集成 Spring Boot 的核心，使用 `@EnableConfigurationProperties` 和 `@Configuration`：

```java
package com.yourcompany.rpc.config;

import com.yourcompany.rpc.core.registry.ServiceDiscovery;
import com.yourcompany.rpc.core.registry.ServiceRegistry;
import com.yourcompany.rpc.core.registry.ZookeeperServiceDiscovery;
import com.yourcompany.rpc.core.registry.ZookeeperServiceRegistry;
import org.apache.curator.framework.CuratorFramework;
import org.apache.curator.framework.CuratorFrameworkFactory;
import org.apache.curator.retry.ExponentialBackoffRetry;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RPC 自动配置类
 * Spring Boot 会自动扫描并加载这个配置
 */
@Configuration
@EnableConfigurationProperties(RpcProperties.class) // 启用配置属性
public class RpcAutoConfiguration {

    private final RpcProperties rpcProperties;

    // 通过构造函数注入配置
    public RpcAutoConfiguration(RpcProperties rpcProperties) {
        this.rpcProperties = rpcProperties;
    }

    @Bean
    public CuratorFramework curatorFramework() {
        CuratorFramework client = CuratorFrameworkFactory.builder()
                .connectString(rpcProperties.getRegistryAddress())
                .retryPolicy(new ExponentialBackoffRetry(1000, 3))
                .build();
        client.start();
        return client;
    }

    @Bean
    public ServiceRegistry serviceRegistry(CuratorFramework curatorFramework) {
        return new ZookeeperServiceRegistry(curatorFramework, rpcProperties);
    }

    @Bean
    public ServiceDiscovery serviceDiscovery(CuratorFramework curatorFramework) {
        return new ZookeeperServiceDiscovery(curatorFramework, rpcProperties);
    }

    @Bean
    public RpcServer rpcServer() {
        return new RpcServer(rpcProperties.getServerPort());
    }
}
```

## 5. 创建 Spring Boot Starter（可选但推荐）

为了让其他项目能够轻松引入你的 RPC 框架，可以创建一个 starter：

### 5.1 创建 `spring.factories` 文件

在 `src/main/resources/META-INF/` 下创建 `spring.factories`：

```properties
# Auto Configure
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.yourcompany.rpc.config.RpcAutoConfiguration
```

### 5.2 创建 Starter 模块（如果作为独立项目）

如果你的 RPC 框架是独立项目，可以创建一个专门的 starter 模块：

```xml
<!-- rpc-spring-boot-starter/pom.xml -->
<dependencies>
    <dependency>
        <groupId>com.yourcompany</groupId>
        <artifactId>rpc-core</artifactId>
        <version>1.0.0</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
</dependencies>
```

## 6. 修改之前的处理器类

确保之前的处理器类都是 `@Component`，这样 Spring 会自动管理它们：

```java
// RpcServiceProviderProcessor.java 和 RpcReferenceConsumerProcessor.java
// 确保都有 @Component 注解
@Component
public class RpcServiceProviderProcessor implements BeanPostProcessor {
    // ...
}

@Component  
public class RpcReferenceConsumerProcessor implements BeanPostProcessor, ApplicationContextAware {
    // ...
}
```

## 7. 创建 RPC 服务器类

```java
package com.yourcompany.rpc.core.server;

import org.springframework.stereotype.Component;
import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

/**
 * RPC 服务器，负责启动和停止网络服务
 */
@Component
public class RpcServer {

    private final int port;
    private NettyServer nettyServer; // 假设使用Netty

    public RpcServer(int port) {
        this.port = port;
    }

    @PostConstruct
    public void start() throws Exception {
        nettyServer = new NettyServer(port);
        nettyServer.start();
        System.out.println("RPC Server started on port: " + port);
    }

    @PreDestroy
    public void stop() {
        if (nettyServer != null) {
            nettyServer.stop();
            System.out.println("RPC Server stopped");
        }
    }
}
```

## 8. 创建配置文件

在 `src/main/resources/application.yml`：

```yaml
# RPC 配置
rpc:
  registry-address: localhost:2181
  server-port: 8088
  serializer: protobuf
  timeout: 5000

# Spring 配置
spring:
  application:
    name: rpc-demo
```

或者在 `application.properties` 中：

```properties
# RPC 配置
rpc.registry-address=localhost:2181
rpc.server-port=8088
rpc.serializer=protobuf
rpc.timeout=5000

# Spring 配置
spring.application.name=rpc-demo
```

## 9. 使用示例

### 服务提供者

```java
@Service
@RpcService(version = "1.0.0", group = "test")
public class UserServiceImpl implements UserService {
    @Override
    public User getUserById(Long id) {
        return new User(id, "Test User");
    }
}
```

### 服务消费者

```java
@RestController
public class UserController {

    @RpcReference(version = "1.0.0", group = "test")
    private UserService userService;

    @GetMapping("/user/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }
}
```

## 10. 启动和测试

### 启动应用
```bash
mvn spring-boot:run
# 或者
java -jar target/your-rpc-app.jar
```

### 测试 RPC 调用
```bash
curl http://localhost:8080/user/123
```

## 项目结构建议

```
src/main/java/
├── com.yourcompany.rpc/
│   ├── RpcApplication.java          # 主启动类
│   ├── config/
│   │   ├── RpcAutoConfiguration.java # 自动配置
│   │   ├── RpcProperties.java        # 配置属性
│   │   └── RpcConfig.java            # Bean配置
│   ├── core/
│   │   ├── processor/               # 注解处理器
│   │   ├── proxy/                   # 动态代理
│   │   ├── registry/                # 注册中心
│   │   ├── server/                  # 服务器
│   │   └── client/                  # 客户端
│   ├── annotation/                  # 注解定义
│   └── model/                       # 数据模型
└── resources/
    ├── application.yml              # 配置文件
    └── META-INF/
        └── spring.factories         # 自动配置声明
```

这样，你的 RPC 框架就完全集成到 Spring Boot 中了，用户只需要添加依赖和简单的配置就可以使用。
