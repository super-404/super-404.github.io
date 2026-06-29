---
title: '@builder'
date: '2025-09-01 15:02'
categories:
  - '技术文档'
  - 'Java'
  - 'Lombok'
  - 'Builder'
tags:
---

好的，Lombok 的 `@Builder` 是一个非常强大且常用的注解，它用一种非常优雅的方式实现了**建造者模式（Builder Pattern）**，使得创建复杂对象变得简单、可读性高且线程安全。

下面我将详细解释如何使用它。
------
### 1. 基本使用

#### 步骤 1: 引入依赖
首先，确保你的项目中已经引入了 Lombok 依赖（以 Maven 为例）：
```xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
</dependency>
```

#### 步骤 2: 在类上添加 `@Builder` 注解
这是最基础的用法。只需在类上添加 `@Builder` 注解，Lombok 就会自动为你生成一个建造者。

```java
import lombok.Builder;
import lombok.Getter; // 可选，推荐加上以避免直接暴露字段
import lombok.Setter; // 可选

@Getter // 通常Builder用于创建不可变对象，所以常与@Getter搭配
@Builder // 核心注解
public class User {
    private final String name; // 使用final表示不可变
    private final Integer age;
    private String email; // 也可以不是final
}
```

#### 步骤 3: 使用生成的 Builder
Lombok 会自动生成一个名为 `builder()` 的静态方法，以及一个内部建造者类。使用方法如下：

```java
public class Main {
    public static void main(String[] args) {
        // 链式调用，清晰易懂
        User user = User.builder()
                .name("Alice")
                .age(30)
                .email("alice@example.com")
                .build(); // 最终调用 build() 方法创建对象

        System.out.println(user.getName()); // 输出: Alice
        System.out.println(user.getAge());  // 输出: 30
    }
}
```
------
### 2. 高级用法与定制

#### 2.1 设置默认值
你可以在字段声明时直接赋予默认值。如果建造者没有设置该字段，就会使用默认值。

```java
@Builder
@Getter
public class Product {
    private String name;
    private String category = "Electronics"; // 默认值
    private Double price;
}

// 使用
Product product = Product.builder()
        .name("iPhone")
        // 没有设置 category，将使用默认值 "Electronics"
        .price(999.99)
        .build();
```

#### 2.2 在方法上使用 `@Builder` (用于复杂构造)
如果你不想污染整个类，或者想为一个已有的构造函数生成 Builder，可以在方法（通常是构造函数或静态工厂方法）上使用 `@Builder`。

```java
public class User {
    private String name;
    private Integer age;

    // 在构造函数上使用 @Builder
    @Builder
    public User(String name, Integer age) {
        this.name = name;
        this.age = age;
    }
}

// 使用方式完全相同
User user = User.builder()
        .name("Bob")
        .age(25)
        .build();
```

#### 2.3 使用 `@Builder.Default` 控制默认值
`@Builder.Default` 提供了更精确的控制。**当 Builder 没有设置该值时，会使用这个默认值；如果显式设置了 `null`，则会覆盖默认值。**

```java
@Builder
@Getter
public class Account {
    private String username;
    
    @Builder.Default // 使用此注解控制默认值
    private String status = "ACTIVE";
    
    @Builder.Default
    private Integer loginCount = 0;
}

// 使用
Account acc1 = Account.builder()
        .username("user1")
        // 不设置 status 和 loginCount，使用默认值
        .build(); // status = "ACTIVE", loginCount = 0

Account acc2 = Account.builder()
        .username("user2")
        .status("INACTIVE") // 显式设置，覆盖默认值
        // 不设置 loginCount，仍使用默认值 0
        .build();
```

#### 2.4 与 `@Singular` 集合构建
这是 `@Builder` 一个非常强大的功能！它可以让你优雅地构建集合（List, Set, Map），并自动处理 `null` 和重复元素。

```java
import lombok.Builder;
import lombok.Singular;
import java.util.List;
import java.util.Set;

@Builder
@Getter
public class Order {
    private String orderId;
    
    @Singular // 为 items 列表生成优雅的方法
    private List<String> items;
    
    @Singular("tag") // 可以指定方法名，默认是集合名的单数形式
    private Set<String> tags;
}

// 使用
Order order = Order.builder()
        .orderId("ORD-123")
        .item("Book") // 添加单个元素，方法名是集合名的单数形式 (item)
        .item("Pen")  // 再添加一个
        .tag("urgent") // 因为用了 @Singular("tag")，所以方法是 .tag()
        .tag("gift")
        // 也可以一次添加所有元素（但这样就失去了Builder的意义）
        // .items(Arrays.asList("Book", "Pen"))
        .build();

System.out.println(order.getItems()); // 输出: [Book, Pen]
System.out.println(order.getTags());  // 输出: [urgent, gift]
```
Lombok 会生成 `item()`, `items()`, `clearItems()` 等一系列方法，非常方便。
------
### 3. 完整的实践示例

这是一个综合了上述特性的常见 DTO 示例：

```java
import lombok.Builder;
import lombok.Getter;
import lombok.Singular;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Builder
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    
    @Singular
    private List<String> errors;
    
    @Singular("metadataEntry")
    private Map<String, Object> metadata;
}

// 使用：构建一个复杂的响应对象
ApiResponse<User> response = ApiResponse.<User>builder() // 注意泛型的写法
        .success(true)
        .message("User found successfully")
        .data(user) // 假设user是之前创建的对象
        // timestamp 使用默认的当前时间
        .metadataEntry("version", "1.0")
        .metadataEntry("page", 1)
        // 如果没有错误，就不调用 .error()
        .build();
```
------
### 总结

| 特性         | 用法                             | 说明                                                        |
| :----------- | :------------------------------- | :---------------------------------------------------------- |
| **基础构建** | `@Builder` on class              | 为整个类生成建造者。                                        |
| **方法构建** | `@Builder` on constructor/method | 为特定方法生成建造者，更灵活。                              |
| **默认值**   | 直接赋值 或 `@Builder.Default`   | `@Builder.Default` 优先级更高，且不会被显式的 `null` 覆盖。 |
| **集合构建** | `@Singular` on collection field  | 生成优雅的方法来逐个添加集合元素，自动处理空集合。          |
| **泛型支持** | `ClassName.<Type>builder()`      | 构建泛型类时需要使用这种语法。                              |

**优点：**

*   **代码极其简洁**：无需手动编写大量的 setter 方法和构建代码。
*   **可读性强**：链式调用使得对象创建过程一目了然。
*   **线程安全**：建造者模式通常用于构建不可变对象。
*   **灵活性高**：可以忽略某些字段，使用默认值。

**最终建议：** 在创建复杂的、尤其是带有许多可选参数的 DTO、配置类或实体时，**强烈推荐使用 `@Builder`**，它能极大地提升代码质量和开发体验。
