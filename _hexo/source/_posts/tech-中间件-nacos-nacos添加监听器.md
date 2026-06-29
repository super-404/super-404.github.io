---
title: '监听器的配置'
date: '2025-09-24 10:46'
categories:
  - '技术文档'
  - '中间件'
tags:
  - '中间件'
  - 'nacos'
---

我来为您的配置类添加Nacos监听器。这里有几种实现方式：

## 方式一：使用@NacosConfigListener注解（推荐）

```java
import com.alibaba.nacos.api.config.annotation.NacosConfigListener;
import com.alibaba.nacos.spring.context.annotation.config.NacosPropertySource;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import lombok.Data;
import java.util.Map;

@Configuration
@RefreshScope
@ConfigurationProperties(prefix = "map-rule")
@Data
@NacosPropertySource(dataId = "your-config-dataId", groupId = "DEFAULT_GROUP", autoRefreshed = true)
public class ConfigTest {

    private Map<String, String> dataMap;

    /**
     * Nacos配置变更监听器
     */
    @NacosConfigListener(dataId = "your-config-dataId", groupId = "DEFAULT_GROUP", timeout = 5000)
    public void onConfigChange(String newConfig) {
        System.out.println("配置发生变化，新配置内容: " + newConfig);
        // 这里可以添加配置解析逻辑
        // 由于使用了@ConfigurationProperties，Spring会自动刷新，这里主要做日志或额外处理
        System.out.println("dataMap已自动更新，当前大小: " + (dataMap != null ? dataMap.size() : 0));
    }

    public void setDataMap(Map<String, String> dataMap) {
        System.out.println("dataMap被更新，新大小: " + (dataMap != null ? dataMap.size() : 0));
        this.dataMap = dataMap;
    }

    public Map<String, String> getAll() {
        return dataMap;
    }

    public String getIns(RuleDTO ruleDTO) {
        if (dataMap == null) {
            return "";
        }
        return dataMap.getOrDefault(getKey(ruleDTO.getCountry(), ruleDTO.getPage(), ruleDTO.getPageType(), ruleDTO.getSlot()), "");
    }

    // 根据四个 key 获取 value
    public String getKey(String country, String page, String pageType, String slot) {
        return String.format("%s-%s-%s-%s", country, page, pageType, slot);
    }
}
```

## 方式二：使用ConfigService编程式监听

```java
import com.alibaba.nacos.api.config.ConfigService;
import com.alibaba.nacos.api.config.listener.Listener;
import com.alibaba.cloud.nacos.NacosConfigManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;
import javax.annotation.PostConstruct;
import java.util.Map;
import java.util.concurrent.Executor;

@Configuration
@RefreshScope
@ConfigurationProperties(prefix = "map-rule")
@Data
public class ConfigTest {

    @Autowired
    private NacosConfigManager nacosConfigManager;

    private Map<String, String> dataMap;

    @PostConstruct
    public void init() {
        addNacosListener();
    }

    /**
     * 添加Nacos配置监听器
     */
    private void addNacosListener() {
        try {
            ConfigService configService = nacosConfigManager.getConfigService();
            
            // 监听配置变化
            configService.addListener("your-config-dataId", "DEFAULT_GROUP", new Listener() {
                @Override
                public void receiveConfigInfo(String configInfo) {
                    System.out.println("=== Nacos配置变更监听 ===");
                    System.out.println("配置内容已更新: " + configInfo);
                    System.out.println("当前dataMap大小: " + (dataMap != null ? dataMap.size() : 0));
                    System.out.println("=== 监听结束 ===");
                    
                    // 可以在这里添加自定义处理逻辑
                    handleConfigChange(configInfo);
                }

                @Override
                public Executor getExecutor() {
                    return null; // 使用默认执行器
                }
            });
            
            System.out.println("Nacos配置监听器注册成功");
            
        } catch (Exception e) {
            System.err.println("Nacos配置监听器注册失败: " + e.getMessage());
        }
    }

    /**
     * 处理配置变更
     */
    private void handleConfigChange(String newConfig) {
        // 这里可以添加自定义的配置变更处理逻辑
        // 例如：发送事件、刷新缓存、记录日志等
        
        // 由于使用了@RefreshScope和@ConfigurationProperties，配置会自动更新
        // 这个方法主要用于额外的业务处理
        
        System.out.println("配置变更处理完成，新配置已生效");
    }

    public void setDataMap(Map<String, String> dataMap) {
        System.out.println("dataMap被更新，旧大小: " + (this.dataMap != null ? this.dataMap.size() : 0) + 
                          ", 新大小: " + (dataMap != null ? dataMap.size() : 0));
        this.dataMap = dataMap;
    }

    public Map<String, String> getAll() {
        return dataMap;
    }

    public String getIns(RuleDTO ruleDTO) {
        if (dataMap == null) {
            return "";
        }
        return dataMap.getOrDefault(getKey(ruleDTO.getCountry(), ruleDTO.getPage(), ruleDTO.getPageType(), ruleDTO.getSlot()), "");
    }

    public String getKey(String country, String page, String pageType, String slot) {
        return String.format("%s-%s-%s-%s", country, page, pageType, slot);
    }
}
```

## 方式三：完整的带异常处理版本

```java
import com.alibaba.nacos.api.config.ConfigService;
import com.alibaba.nacos.api.config.listener.Listener;
import com.alibaba.cloud.nacos.NacosConfigManager;
import com.alibaba.nacos.api.exception.NacosException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import javax.annotation.PostConstruct;
import java.util.Map;
import java.util.concurrent.Executor;

@Slf4j
@Configuration
@RefreshScope
@ConfigurationProperties(prefix = "map-rule")
@Data
public class ConfigTest {

    @Autowired(required = false)
    private NacosConfigManager nacosConfigManager;

    private Map<String, String> dataMap;

    // 配置的dataId和group，可以从配置文件中注入
    private String configDataId = "map-rule-config.yaml";
    private String configGroup = "DEFAULT_GROUP";

    @PostConstruct
    public void init() {
        if (nacosConfigManager != null) {
            addNacosListener();
        } else {
            log.warn("NacosConfigManager未注入，跳过监听器注册");
        }
    }

    /**
     * 添加Nacos配置监听器
     */
    private void addNacosListener() {
        try {
            ConfigService configService = nacosConfigManager.getConfigService();
            
            configService.addListener(configDataId, configGroup, new Listener() {
                @Override
                public void receiveConfigInfo(String configInfo) {
                    log.info("=== Nacos配置变更监听触发 ===");
                    log.info("配置DataId: {}, Group: {}", configDataId, configGroup);
                    log.info("新配置内容长度: {}", configInfo.length());
                    log.info("当前dataMap大小: {}", dataMap != null ? dataMap.size() : 0);
                    
                    try {
                        handleConfigChange(configInfo);
                        log.info("配置变更处理成功");
                    } catch (Exception e) {
                        log.error("配置变更处理失败", e);
                    }
                }

                @Override
                public Executor getExecutor() {
                    return null;
                }
            });
            
            log.info("Nacos配置监听器注册成功 - DataId: {}, Group: {}", configDataId, configGroup);
            
            // 获取初始配置内容
            try {
                String initialConfig = configService.getConfig(configDataId, configGroup, 5000);
                log.info("初始配置内容: {}", initialConfig);
            } catch (NacosException e) {
                log.warn("获取初始配置失败", e);
            }
            
        } catch (Exception e) {
            log.error("Nacos配置监听器注册失败", e);
        }
    }

    /**
     * 处理配置变更
     */
    private void handleConfigChange(String newConfig) {
        // 这里可以添加自定义业务逻辑
        // 例如：
        // 1. 验证配置格式
        // 2. 发送配置变更事件
        // 3. 更新相关缓存
        // 4. 记录审计日志
        
        if (newConfig == null || newConfig.trim().isEmpty()) {
            log.warn("接收到空配置，跳过处理");
            return;
        }
        
        // 示例：记录配置变更摘要
        log.info("配置变更摘要: {}", newConfig.substring(0, Math.min(100, newConfig.length())));
    }

    public void setDataMap(Map<String, String> dataMap) {
        log.info("dataMap更新 - 旧大小: {}, 新大小: {}", 
                this.dataMap != null ? this.dataMap.size() : 0, 
                dataMap != null ? dataMap.size() : 0);
        this.dataMap = dataMap;
    }

    public Map<String, String> getAll() {
        return dataMap;
    }

    public String getIns(RuleDTO ruleDTO) {
        if (dataMap == null) {
            log.debug("dataMap为null，返回空字符串");
            return "";
        }
        String key = getKey(ruleDTO.getCountry(), ruleDTO.getPage(), ruleDTO.getPageType(), ruleDTO.getSlot());
        String value = dataMap.getOrDefault(key, "");
        log.debug("获取配置 - key: {}, value: {}", key, value);
        return value;
    }

    public String getKey(String country, String page, String pageType, String slot) {
        return String.format("%s-%s-%s-%s", country, page, pageType, slot);
    }
    
    /**
     * 手动触发配置检查（可选）
     */
    public void checkConfig() {
        if (nacosConfigManager != null) {
            try {
                ConfigService configService = nacosConfigManager.getConfigService();
                String currentConfig = configService.getConfig(configDataId, configGroup, 3000);
                log.info("当前配置内容: {}", currentConfig);
            } catch (NacosException e) {
                log.error("检查配置失败", e);
            }
        }
    }
}
```

## 添加依赖

确保在pom.xml中添加了Nacos配置依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
    <version>2022.0.0.0</version>
</dependency>

<!-- 如果使用@NacosConfigListener -->
<dependency>
    <groupId>com.alibaba.nacos</groupId>
    <artifactId>nacos-spring-context</artifactId>
    <version>1.1.1</version>
</dependency>
```

## 配置示例（bootstrap.yml）

```yaml
spring:
  application:
    name: your-application
  cloud:
    nacos:
      config:
        server-addr: localhost:8848
        file-extension: yaml
        group: DEFAULT_GROUP
        # 监听器的配置
        data-id: map-rule-config.yaml
```

**推荐使用方式二**，因为它更灵活且与Spring Cloud Alibaba集成更好。监听器会在配置发生变化时自动触发，您可以在`receiveConfigInfo`方法中添加自定义的业务逻辑。
