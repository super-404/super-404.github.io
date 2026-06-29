---
title: '@RequestBody'
date: '2025-08-23 16:46'
categories:
  - '技术文档'
  - 'springboot'
tags:
  - 'springboot'
---

好的，我们来详细解释一下 `@RequestBody` 这个在 Spring MVC 中非常重要的注解。

### 核心概念

`@RequestBody` 是一个 Spring MVC 注解，它的主要作用是：**将 HTTP 请求体（Body）中的 JSON/XML 数据，自动绑定（反序列化）到一个 Java 对象上**。

简单来说，它实现了从“字符串”到“对象”的自动转换。
------
### 工作原理（流程）

当一个客户端（比如网页前端、Postman、另一个服务）发送一个请求时，通常的流程如下：

1.  **客户端发送数据**：客户端发送一个 HTTP 请求（通常是 POST 或 PUT），并在请求头 `Content-Type` 中声明它发送的数据格式（如 `application/json`）。请求体（Body）中包含的就是原始的字符串数据，例如：`{"name": "Alice", "age": 25}`。

2.  **请求到达DispatcherServlet**：Spring 的核心控制器 `DispatcherServlet` 接收到这个请求。

3.  **寻找合适的Handler**：`DispatcherServlet` 根据请求路径，找到处理该请求的控制器（Controller）和方法（Handler Method）。

4.  **解析参数 - @RequestBody 发挥作用**：
    *   Spring 发现方法参数前有 `@RequestBody` 注解。
    *   它会根据请求头中的 `Content-Type`（如 `application/json`）来选择一个合适的 **HttpMessageConverter**（消息转换器）。
    *   最常用的转换器是 **MappingJackson2HttpMessageConverter**（如果你使用了 Jackson 库，Spring Boot 会自动配置它）。
    *   这个转换器会读取请求体的原始字符串数据，并尝试将其**反序列化（Deserialize）** 成注解后面指定的 Java 对象类型（如 `User` 类）。
    *   如果 JSON 的键名与 Java 对象的属性名匹配，转换器就会为这个 Java 对象创建新的实例并设置相应的值。

5.  **执行方法**：此时，你的控制器方法接收到的已经是一个填充好数据的 Java 对象了，而不是一串原始的 JSON 字符串。你可以直接使用这个对象进行业务逻辑处理。

6.  **返回响应**：方法执行完毕后，最终将结果返回给客户端。
------
### 如何使用

#### 1. 前端请求示例
假设前端发送一个 POST 请求：
*   **URL**: `/api/users`
*   **Header**: `Content-Type: application/json`
*   **Body (Raw JSON)**:
    ```json
    {
      "name": "Alice",
      "age": 25,
      "email": "alice@example.com"
    }
    ```

#### 2. 后端代码示例

首先，你需要一个对应的 Java 类（通常称为 DTO 或 POJO）来映射 JSON 结构：

```java
// User.java 或 UserRequest.java
public class User {
    private String name;
    private Integer age;
    private String email;

    // 必须有无参构造函数（通常由Java默认提供，但如果你定义了有参构造，则需要显式写出无参构造）
    // 必须有标准的 getter 和 setter 方法
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    // ... 其他属性的 getter 和 setter
}
```

然后，在 Controller 中使用 `@RequestBody`：

```java
@RestController // 这个注解包含了 @Controller 和 @ResponseBody
@RequestMapping("/api/users")
public class UserController {

    @PostMapping
    public ResponseEntity<String> createUser(@RequestBody User user) {
        // 此时，`user` 对象已经被 Spring 自动创建并填充了数据
        System.out.println("用户名: " + user.getName()); // 输出: 用户名: Alice
        System.out.println("年龄: " + user.getAge());    // 输出: 年龄: 25

        // 这里可以编写业务逻辑，例如将 user 保存到数据库...

        return ResponseEntity.ok("用户 '" + user.getName() + "' 创建成功！");
    }
}
```
------
### 关键要点与注意事项

1.  **必须指定 Content-Type**：客户端必须在请求头中明确设置 `Content-Type`，通常是 `application/json`。这样 Spring 才知道如何选择正确的 `HttpMessageConverter` 来解析数据。

2.  **需要默认构造函数**：目标 Java 类必须有一个默认的无参构造函数（通常不需要显式写出来，除非你定义了别的构造函数），并且属性要有正确的 getter 和 setter 方法，这样转换器才能创建对象并设置值。

3.  **JSON 字段与对象属性匹配**：JSON 中的字段名必须与 Java 类中的属性名**匹配**（默认情况下是大小写敏感的）。如果不想匹配，可以使用 `@JsonProperty` 注解来指定映射关系。

4.  **常用在 POST/PUT 请求**：`@RequestBody` 最常用于接收 **POST**、**PUT**、**PATCH** 等非幂等性且携带数据的请求。

5.  **一个方法只能有一个 `@RequestBody`**：一个控制器方法中，通常只能使用一个 `@RequestBody` 注解，因为整个请求体只能被读取一次。

6.  **与 `@ResponseBody` 对应**：
    *   `@RequestBody`：**入参**，用于**读取**请求体，将 **JSON -> Java 对象**。
    *   `@ResponseBody`（或 `@RestController`）：**出参**，用于**写入**响应体，将 **Java 对象 -> JSON**。

### 总结

| 方面         | 解释                                                         |
| :----------- | :----------------------------------------------------------- |
| **是什么**   | Spring MVC 注解，用于处理 HTTP 请求体。                      |
| **做什么**   | 将请求体中的 JSON/XML 数据**反序列化**为 Java 对象。         |
| **怎么用**   | 在控制器方法的参数前加上 `@RequestBody`。                    |
| **为什么用** | 简化开发，避免手动解析 JSON 字符串的繁琐工作。               |
| **注意**     | 需要正确的 `Content-Type`、匹配的字段名、以及对象的 getter/setter。 |

希望这个解释能帮助你彻底理解 `@RequestBody`！
