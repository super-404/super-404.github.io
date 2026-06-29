---
title: '数据库连接配置'
date: '2025-08-23 09:23'
categories:
  - '技术文档'
  - '基础文档'
tags:
---

这个MySQL消息是关于**数据库、表和列名的大小写敏感设置**。让我详细解释这个问题和相关的配置：

## 消息解释

```
Case sensitivity: plain=mixed, delimited=mixed
```

这表示MySQL的标识符（数据库名、表名、列名）的大小写处理规则：

- **plain=mixed**：未使用反引号包裹的标识符，在存储时可能被转换为小写，但查询时不区分大小写
- **delimited=mixed**：使用反引号包裹的标识符，保持原样存储和区分大小写

## MySQL大小写敏感规则

### 1. 不同操作系统的影响
| 操作系统 | 默认行为     | 说明               |
| -------- | ------------ | ------------------ |
| Windows  | 不区分大小写 | 文件名不区分大小写 |
| macOS    | 通常不区分   | 但文件系统可以配置 |
| Linux    | 区分大小写   | 文件名区分大小写   |

### 2. MySQL配置参数

```sql
-- 查看当前大小写配置
SHOW VARIABLES LIKE 'lower_case_table_names';
```

- **0**：区分大小写（Linux默认）
- **1**：不区分大小写（Windows默认）
- **2**：存储时按原样，查询时转换为小写

## 解决方案

### 方案1：统一使用小写命名（推荐）

```sql
-- 创建数据库、表、列时统一使用小写
CREATE DATABASE seckill_db;

CREATE TABLE seckill_user (
    id BIGINT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    create_time DATETIME
);
```

### 方案2：使用反引号包裹标识符

```sql
-- 如果需要使用大写或特殊字符，使用反引号
CREATE TABLE `SeckillUser` (
    `Id` BIGINT PRIMARY KEY,
    `UserName` VARCHAR(50),
    `Email` VARCHAR(100),
    `CreateTime` DATETIME
);

-- 查询时也要使用反引号
SELECT `Id`, `UserName` FROM `SeckillUser`;
```

### 方案3：修改MySQL配置（需要重启）

**Linux系统修改 `/etc/my.cnf`：**
```ini
[mysqld]
lower_case_table_names=1
```

**Windows系统修改 `my.ini`：**
```ini
[mysqld]
lower_case_table_names=1
```

## 应用代码中的最佳实践

### 1. MyBatis配置中使用小写

```xml
<!-- mapper.xml -->
<select id="selectUserById" resultType="io.binghe.seckill.domain.model.User">
    SELECT id, username, email, create_time as createTime
    FROM seckill_user  <!-- 使用小写表名 -->
    WHERE id = #{id}
</select>
```

### 2. 实体类字段映射

```java
public class SeckillUser {
    private Long id;
    private String username;
    private String email;
    
    // 使用@Column注解明确指定列名
    @Column(name = "create_time")
    private Date createTime;
    
    // getter和setter
}
```

### 3. JPA实体配置

```java
@Entity
@Table(name = "seckill_user")  // 明确指定小写表名
public class SeckillUser {
    @Id
    private Long id;
    
    @Column(name = "username")  // 明确指定小写列名
    private String username;
    
    // 其他字段
}
```

## 完整的数据库配置示例

### 1. 数据库初始化脚本

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS `seckill_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `seckill_db`;

-- 创建用户表（全部使用小写）
CREATE TABLE `seckill_user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20),
    `email` VARCHAR(100),
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建商品表
CREATE TABLE `seckill_goods` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `goods_name` VARCHAR(100) NOT NULL,
    `goods_price` DECIMAL(10,2) NOT NULL,
    `stock_count` INT NOT NULL,
    `start_time` DATETIME,
    `end_time` DATETIME,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. application.properties 配置

```properties
# 数据库连接配置
spring.datasource.url=jdbc:mysql://localhost:3306/seckill_db?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
spring.datasource.username=root
spring.datasource.password=your_password

# JPA配置
spring.jpa.hibernate.ddl-auto=validate  # 使用validate而不是create-drop
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
spring.jpa.properties.hibernate.globally_quoted_identifiers=true

# MyBatis配置
mybatis.configuration.map-underscore-to-camel-case=true
```

### 3. 避免大小写问题的代码实践

```java
@Repository
public class SeckillUserRepository {
    
    // 使用小写SQL
    private static final String FIND_BY_USERNAME = 
        "SELECT * FROM seckill_user WHERE username = ?";
    
    // 或者使用命名参数
    private static final String FIND_BY_EMAIL = 
        "SELECT * FROM seckill_user WHERE email = :email";
}
```

## 排查和验证

### 1. 检查数据库大小写配置

```sql
-- 查看当前配置
SHOW VARIABLES LIKE 'lower_case_table_names';

-- 查看数据库排序规则
SHOW CREATE DATABASE seckill_db;

-- 查看表排序规则
SHOW CREATE TABLE seckill_user;
```

### 2. 测试大小写敏感性

```sql
-- 测试查询是否区分大小写
SELECT * FROM SECKILL_USER;  -- 可能报错
SELECT * FROM seckill_user;  -- 正确
SELECT * FROM `seckill_user`; -- 正确
```

## 总结

**"Case sensitivity: plain=mixed, delimited=mixed"** 是MySQL的正常信息，不是错误。为了确保应用的可移植性和稳定性：

1. **统一使用小写**命名数据库、表和列
2. **在SQL中保持一致**的大小写使用
3. **避免混合使用**大小写
4. **在跨平台部署时**注意操作系统的差异
5. **使用配置管理**来确保一致性

遵循这些最佳实践可以避免因大小写问题导致的数据库访问错误。
