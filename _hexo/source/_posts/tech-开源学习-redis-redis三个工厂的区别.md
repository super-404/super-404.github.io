---
title: 'Redis连接工厂和配置对比'
date: '2025-09-01 14:33'
categories:
  - '开源学习'
  - 'Redis'
  - 'Spring集成'
  - '连接工厂'
tags:
  - '开源学习'
  - 'redis'
---

# Redis连接工厂和配置对比

这四个组件在Spring Data Redis中扮演不同的角色，我来详细解释它们的区别：

## 1. JedisPoolConfig
**角色**: 连接池配置对象（不是连接工厂）
**用途**: 配置Jedis客户端的连接池参数
```java
@Bean
public JedisPoolConfig jedisPoolConfig() {
    JedisPoolConfig poolConfig = new JedisPoolConfig();
    poolConfig.setMaxTotal(10);      // 最大连接数
    poolConfig.setMaxIdle(5);        // 最大空闲连接
    poolConfig.setMinIdle(2);        // 最小空闲连接
    poolConfig.setMaxWait(Duration.ofSeconds(3)); // 最大等待时间
    return poolConfig;
}
```

## 2. JedisConnectionFactory
**基于**: Jedis客户端（阻塞式I/O）
**特点**: 
- 阻塞式操作
- 连接池支持完善
- 线程不安全，需要连接池
- 传统且稳定

```java
@Bean
public JedisConnectionFactory jedisConnectionFactory(JedisPoolConfig poolConfig) {
    JedisConnectionFactory factory = new JedisConnectionFactory(poolConfig);
    factory.setHostName("localhost");
    factory.setPort(6379);
    factory.setPassword("password");
    return factory;
}
```

## 3. LettuceConnectionFactory
**基于**: Lettuce客户端（Netty NIO）
**特点**:
- 非阻塞异步IO
- 高性能，支持响应式编程
- 线程安全，单个连接可多线程共享
- 支持集群、哨兵模式更好
- Spring Boot 2.x+ 默认客户端

```java
@Bean
public LettuceConnectionFactory lettuceConnectionFactory() {
    RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
    config.setHostName("localhost");
    config.setPort(6379);
    config.setPassword("password");
    return new LettuceConnectionFactory(config);
}
```

## 4. RedissonConnectionFactory
**基于**: Redisson客户端（Netty NIO）
**特点**:
- 不仅仅是连接工厂，是完整的分布式服务框架
- 提供丰富的分布式功能（锁、集合、服务等）
- 支持多种编解码器
- 适合复杂的分布式系统场景

```java
@Bean
public RedissonConnectionFactory redissonConnectionFactory(RedissonClient redissonClient) {
    return new RedissonConnectionFactory(redissonClient);
}

@Bean
public RedissonClient redissonClient() {
    Config config = new Config();
    config.useSingleServer()
          .setAddress("redis://localhost:6379")
          .setPassword("password");
    return Redisson.create(config);
}
```

## 对比总结

| 特性           | JedisConnectionFactory | LettuceConnectionFactory | RedissonConnectionFactory |
| -------------- | ---------------------- | ------------------------ | ------------------------- |
| **底层客户端** | Jedis                  | Lettuce                  | Redisson                  |
| **I/O模型**    | 阻塞式                 | 非阻塞NIO                | 非阻塞NIO                 |
| **线程安全**   | 不安全，需要连接池     | 安全，可共享连接         | 安全                      |
| **性能**       | 一般                   | 高                       | 高                        |
| **功能范围**   | 基本Redis操作          | 基本Redis操作+响应式     | 完整的分布式服务          |
| **使用场景**   | 传统应用，简单场景     | 高并发，现代应用         | 分布式系统，复杂场景      |
| **配置依赖**   | 需要JedisPoolConfig    | 无需额外连接池配置       | 需要RedissonClient        |

## 选择建议

- **简单应用**: JedisConnectionFactory + JedisPoolConfig
- **高性能现代应用**: LettuceConnectionFactory（Spring Boot默认）
- **分布式系统**: RedissonConnectionFactory + RedissonClient

## 配置示例

```yaml
# application.yml
spring:
  redis:
    host: localhost
    port: 6379
    password: your_password
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
    jedis:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
```

现代Spring Boot项目通常推荐使用Lettuce作为默认客户端。
