---
title: '使用LettuceConnectionFactory管理Redis连接池'
date: '2025-09-01 15:06'
categories:
  - '开源学习'
  - 'Redis'
  - 'Spring集成'
  - '连接池'
tags:
  - '开源学习'
  - 'redis'
---

# 使用LettuceConnectionFactory管理Redis连接池

![image-20250901150309947](#local-path)

实际上这两个连接池的配置效果是相同的，最后都由![image-20250901150410824](#local-path)

```java
//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by FernFlower decompiler)
//

package org.springframework.boot.autoconfigure.data.redis;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(
    prefix = "spring.redis"
)
public class RedisProperties {
    private int database = 0;
    private String url;
    private String host = "localhost";
    private String username;
    private String password;
    private int port = 6379;
    private boolean ssl;
    private Duration timeout;
    private Duration connectTimeout;
    private String clientName;
    private ClientType clientType;
    private Sentinel sentinel;
    private Cluster cluster;
    private final Jedis jedis = new Jedis();
    private final Lettuce lettuce = new Lettuce();

    public int getDatabase() {
        return this.database;
    }

    public void setDatabase(int database) {
        this.database = database;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getHost() {
        return this.host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public String getUsername() {
        return this.username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return this.password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public int getPort() {
        return this.port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public boolean isSsl() {
        return this.ssl;
    }

    public void setSsl(boolean ssl) {
        this.ssl = ssl;
    }

    public void setTimeout(Duration timeout) {
        this.timeout = timeout;
    }

    public Duration getTimeout() {
        return this.timeout;
    }

    public Duration getConnectTimeout() {
        return this.connectTimeout;
    }

    public void setConnectTimeout(Duration connectTimeout) {
        this.connectTimeout = connectTimeout;
    }

    public String getClientName() {
        return this.clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public ClientType getClientType() {
        return this.clientType;
    }

    public void setClientType(ClientType clientType) {
        this.clientType = clientType;
    }

    public Sentinel getSentinel() {
        return this.sentinel;
    }

    public void setSentinel(Sentinel sentinel) {
        this.sentinel = sentinel;
    }

    public Cluster getCluster() {
        return this.cluster;
    }

    public void setCluster(Cluster cluster) {
        this.cluster = cluster;
    }

    public Jedis getJedis() {
        return this.jedis;
    }

    public Lettuce getLettuce() {
        return this.lettuce;
    }

  //注意Client
    public static enum ClientType {
        LETTUCE,
        JEDIS;
    }
		//最后的pool都配置在了这里
    public static class Pool {
        private int maxIdle = 8;
        private int minIdle = 0;
        private int maxActive = 8;
        private Duration maxWait = Duration.ofMillis(-1L);
        private Duration timeBetweenEvictionRuns;

        public int getMaxIdle() {
            return this.maxIdle;
        }

        public void setMaxIdle(int maxIdle) {
            this.maxIdle = maxIdle;
        }

        public int getMinIdle() {
            return this.minIdle;
        }

        public void setMinIdle(int minIdle) {
            this.minIdle = minIdle;
        }

        public int getMaxActive() {
            return this.maxActive;
        }

        public void setMaxActive(int maxActive) {
            this.maxActive = maxActive;
        }

        public Duration getMaxWait() {
            return this.maxWait;
        }

        public void setMaxWait(Duration maxWait) {
            this.maxWait = maxWait;
        }

        public Duration getTimeBetweenEvictionRuns() {
            return this.timeBetweenEvictionRuns;
        }

        public void setTimeBetweenEvictionRuns(Duration timeBetweenEvictionRuns) {
            this.timeBetweenEvictionRuns = timeBetweenEvictionRuns;
        }
    }

    public static class Cluster {
        private List<String> nodes;
        private Integer maxRedirects;

        public List<String> getNodes() {
            return this.nodes;
        }

        public void setNodes(List<String> nodes) {
            this.nodes = nodes;
        }

        public Integer getMaxRedirects() {
            return this.maxRedirects;
        }

        public void setMaxRedirects(Integer maxRedirects) {
            this.maxRedirects = maxRedirects;
        }
    }

    public static class Sentinel {
        private String master;
        private List<String> nodes;
        private String password;

        public String getMaster() {
            return this.master;
        }

        public void setMaster(String master) {
            this.master = master;
        }

        public List<String> getNodes() {
            return this.nodes;
        }

        public void setNodes(List<String> nodes) {
            this.nodes = nodes;
        }

        public String getPassword() {
            return this.password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class Jedis {
        private Pool pool;

        public Pool getPool() {
            return this.pool;
        }

        public void setPool(Pool pool) {
            this.pool = pool;
        }
    }

    public static class Lettuce {
        private Duration shutdownTimeout = Duration.ofMillis(100L);
        private Pool pool;
        private final Cluster cluster = new Cluster();

        public Duration getShutdownTimeout() {
            return this.shutdownTimeout;
        }

        public void setShutdownTimeout(Duration shutdownTimeout) {
            this.shutdownTimeout = shutdownTimeout;
        }

        public Pool getPool() {
            return this.pool;
        }

        public void setPool(Pool pool) {
            this.pool = pool;
        }

        public Cluster getCluster() {
            return this.cluster;
        }

        public static class Cluster {
            private final Refresh refresh = new Refresh();

            public Refresh getRefresh() {
                return this.refresh;
            }

            public static class Refresh {
                private boolean dynamicRefreshSources = true;
                private Duration period;
                private boolean adaptive;

                public boolean isDynamicRefreshSources() {
                    return this.dynamicRefreshSources;
                }

                public void setDynamicRefreshSources(boolean dynamicRefreshSources) {
                    this.dynamicRefreshSources = dynamicRefreshSources;
                }

                public Duration getPeriod() {
                    return this.period;
                }

                public void setPeriod(Duration period) {
                    this.period = period;
                }

                public boolean isAdaptive() {
                    return this.adaptive;
                }

                public void setAdaptive(boolean adaptive) {
                    this.adaptive = adaptive;
                }
            }
        }
    }
}
```

LettuceConnectionFactory默认使用内置连接池，但也可以通过配置来优化连接池管理。

## 1. 基本配置方式

### 方式一：通过配置文件（推荐）
```yaml
spring:
  redis:
    host: localhost
    port: 6379
    password: your_password
    database: 0
    lettuce:
      pool:
        enabled: true
        max-active: 8      # 最大连接数
        max-idle: 8        # 最大空闲连接
        min-idle: 0        # 最小空闲连接
        max-wait: -1ms     # 获取连接最大等待时间（-1表示无限等待）
        time-between-eviction-runs: 30000ms # 空闲连接检查间隔
      shutdown-timeout: 100ms # 关闭超时时间
```

### 方式二：Java代码配置
```java
@Configuration
public class RedisConfig {

    @Bean
    public LettuceConnectionFactory lettuceConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName("localhost");
        config.setPort(6379);
        config.setPassword("password");
        config.setDatabase(0);

        LettucePoolingClientConfiguration clientConfig = LettucePoolingClientConfiguration.builder()
                .poolConfig(lettucePoolConfig())
                .clientOptions(clientOptions())
                .build();

        return new LettuceConnectionFactory(config, clientConfig);
    }

    private GenericObjectPoolConfig<Object> lettucePoolConfig() {
        GenericObjectPoolConfig<Object> poolConfig = new GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(8);           // 最大连接数
        poolConfig.setMaxIdle(8);            // 最大空闲连接
        poolConfig.setMinIdle(0);            // 最小空闲连接
        poolConfig.setMaxWait(Duration.ofMillis(-1)); // 无限等待
        poolConfig.setTestOnBorrow(true);    // 借出时验证
        poolConfig.setTestWhileIdle(true);   // 空闲时验证
        return poolConfig;
    }

    private ClientOptions clientOptions() {
        return ClientOptions.builder()
                .autoReconnect(true)         // 自动重连
                .disconnectedBehavior(ClientOptions.DisconnectedBehavior.REJECT_COMMANDS)
                .timeoutOptions(TimeoutOptions.enabled(Duration.ofSeconds(5)))
                .build();
    }
}
```

## 2. 高级连接池配置

### 完整的连接池管理配置
```java
@Configuration
@EnableCaching
public class RedisPoolConfig {

    @Value("${spring.redis.host}")
    private String host;

    @Value("${spring.redis.port}")
    private int port;

    @Value("${spring.redis.password}")
    private String password;

    @Bean
    public LettuceConnectionFactory lettuceConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(host);
        config.setPort(port);
        config.setPassword(RedisPassword.of(password));

        // 详细的连接池配置
        LettucePoolingClientConfiguration clientConfig = LettucePoolingClientConfiguration.builder()
                .poolConfig(createPoolConfig())
                .clientOptions(createClientOptions())
                .commandTimeout(Duration.ofSeconds(10))
                .shutdownTimeout(Duration.ofMillis(100))
                .build();

        LettuceConnectionFactory factory = new LettuceConnectionFactory(config, clientConfig);
        factory.setValidateConnection(true); // 验证连接有效性
        return factory;
    }

    private GenericObjectPoolConfig<Object> createPoolConfig() {
        GenericObjectPoolConfig<Object> config = new GenericObjectPoolConfig<>();
        config.setMaxTotal(20);                      // 最大连接数
        config.setMaxIdle(10);                       // 最大空闲连接
        config.setMinIdle(2);                        // 最小空闲连接（重要！避免连接震荡）
        config.setMaxWait(Duration.ofSeconds(3));    // 获取连接最大等待时间
        config.setTestOnBorrow(true);                // 借出时测试连接
        config.setTestOnReturn(false);               // 归还时测试连接
        config.setTestWhileIdle(true);               // 空闲时测试连接
        config.setTimeBetweenEvictionRuns(Duration.ofSeconds(30)); // 空闲连接检查间隔
        config.setMinEvictableIdleTime(Duration.ofMinutes(5)); // 连接最小空闲时间
        config.setNumTestsPerEvictionRun(3);         // 每次检查的连接数
        config.setBlockWhenExhausted(true);          // 连接耗尽时是否阻塞
        return config;
    }

    private ClientOptions createClientOptions() {
        return ClientOptions.builder()
                .autoReconnect(true)                 // 自动重连
                .cancelCommandsOnReconnectFailure(true) // 重连失败时取消命令
                .disconnectedBehavior(ClientOptions.DisconnectedBehavior.REJECT_COMMANDS)
                .socketOptions(SocketOptions.builder()
                        .keepAlive(true)             // 启用KeepAlive
                        .tcpNoDelay(true)           // 禁用Nagle算法
                        .build())
                .timeoutOptions(TimeoutOptions.enabled(Duration.ofSeconds(5)))
                .publishOnScheduler(true)           // 在调度器上发布消息
                .build();
    }
}
```

## 3. 连接池监控和管理

### 添加监控指标
```java
@Bean
public MeterRegistry meterRegistry() {
    return new SimpleMeterRegistry();
}

@Bean
public MetricsCommandLatencyRecorder latencyRecorder(MeterRegistry meterRegistry) {
    return new MetricsCommandLatencyRecorder(meterRegistry, "redis");
}

// 在连接工厂配置中添加监控
LettucePoolingClientConfiguration.builder()
    .commandLatencyRecorder(latencyRecorder(meterRegistry))
    // ... 其他配置
```

### 获取连接池状态
```java
@Service
public class RedisPoolMonitor {

    @Autowired
    private LettuceConnectionFactory connectionFactory;

    public void printPoolStats() {
        if (connectionFactory != null) {
            System.out.println("活动连接数: " + connectionFactory.getRequiredConnectionFactory()
                    .getPoolStats().getActive());
            System.out.println("空闲连接数: " + connectionFactory.getRequiredConnectionFactory()
                    .getPoolStats().getIdle());
        }
    }
}
```

## 4. 最佳实践配置

### 生产环境推荐配置
```yaml
spring:
  redis:
    lettuce:
      pool:
        max-active: 20           # 根据业务负载调整
        max-idle: 10             # 通常为max-active的50-70%
        min-idle: 2              # 避免连接震荡，设置最小空闲连接
        max-wait: 2000ms         # 合理的等待时间，避免长时间阻塞
        time-between-eviction-runs: 30000ms
      shutdown-timeout: 100ms
    timeout: 3000ms              # 命令执行超时时间
```

## 5. 注意事项

1. **min-idle的重要性**：设置合理的min-idle可以避免连接震荡
2. **连接验证**：启用testWhileIdle或testOnBorrow确保连接有效性
3. **超时设置**：合理设置连接获取和命令执行超时
4. **监控**：生产环境需要监控连接池状态
5. **资源清理**：应用关闭时确保连接池正确关闭

## 6. 完整示例

```java
@Configuration
public class RedisConfiguration {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName("localhost");
        config.setPort(6379);

        LettucePoolingClientConfiguration clientConfig = LettucePoolingClientConfiguration.builder()
                .poolConfig(redisPoolConfig())
                .clientOptions(ClientOptions.builder()
                        .autoReconnect(true)
                        .timeoutOptions(TimeoutOptions.enabled(Duration.ofSeconds(5)))
                        .build())
                .build();

        return new LettuceConnectionFactory(config, clientConfig);
    }

    private GenericObjectPoolConfig<Object> redisPoolConfig() {
        GenericObjectPoolConfig<Object> config = new GenericObjectPoolConfig<>();
        config.setMaxTotal(20);
        config.setMaxIdle(10);
        config.setMinIdle(2);
        config.setMaxWait(Duration.ofSeconds(2));
        config.setTestWhileIdle(true);
        config.setTimeBetweenEvictionRuns(Duration.ofSeconds(30));
        return config;
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(LettuceConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
```

这样配置后，LettuceConnectionFactory就会使用连接池来管理Redis连接，提供更好的性能和资源管理。
