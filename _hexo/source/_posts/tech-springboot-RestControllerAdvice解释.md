---
title: 'RestControllerAdvice解释'
date: '2025-09-02 16:03'
categories:
  - '技术文档'
  - 'Spring'
  - 'Spring Boot'
  - 'Web接口'
  - '全局异常处理'
tags:
  - 'springboot'
---

[TOC]

好的，我们来详细解释一下 `@RestControllerAdvice` 这个注解。它是一个非常强大且常用的注解，是现代Spring Web应用程序中处理全局异常的**核心注解**。
------
### 1. 核心定义

`@RestControllerAdvice` 是一个**组合注解**（Meta-annotation），它同时具备了两大功能：

1.  **`@ResponseBody`**：它的语义继承自 `@RestController`  vs `@Controller`。这意味着该注解类中所有方法返回的数据都会直接写入HTTP响应体（Response Body）中，而不是跳转到一个视图页面。通常用于返回JSON或XML数据。
2.  **`@ControllerAdvice`**：这是它的核心功能。它标识这个类是一个**全局拦截器**（或称为“增强器”），用于拦截所有或指定的Controller的请求，并进行**全局统一处理**。

**简单来说：`@RestControllerAdvice = @ControllerAdvice + @ResponseBody`**
------
### 2. 主要用途

`@RestControllerAdvice` 通常用于以下三个主要场景，这也是它为什么如此重要的原因：

#### a) 全局异常处理 (最常用)

这是它最典型的用途。你可以定义一个地方来捕获整个应用程序中Controller层抛出的所有异常，并进行统一处理，返回一个格式友好的错误信息（JSON格式），而不是一个丑陋的WhiteLabel错误页面。

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 当系统中抛出 Exception 异常时，会被此方法捕获
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        ErrorResponse error = new ErrorResponse("SERVER_ERROR", "An unexpected error occurred");
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 专门处理自定义的 BusinessException 异常
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        ErrorResponse error = new ErrorResponse(ex.getCode(), ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // 专门处理Spring MVC中常见的异常，如请求参数 missing
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        // 获取校验失败的所有字段信息
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        
        ErrorResponse error = new ErrorResponse("VALIDATION_FAILED", errorMessage);
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}

// 一个简单的错误响应体模板
@Data
class ErrorResponse {
    private String code;
    private String message;
    // 还可以包含 timestamp, details 等字段

    public ErrorResponse(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
```

#### b) 全局数据绑定 (Global Model Attribute)

允许你在所有Controller的Model中自动添加一些通用的数据。

```java
@RestControllerAdvice
public class GlobalDataBinder {

    // 在每个Controller的请求处理方法执行前，Model中都会自动加入appVersion这个属性
    @ModelAttribute("appVersion")
    public String addVersion() {
        return "v1.2.0";
    }
}
```

#### c) 全局数据预处理 (Global Data Pre-processing)

用于对带有特定前缀的参数进行预处理，比较复杂，使用较少。
------
### 3. 高级用法：指定生效范围

默认情况下，`@RestControllerAdvice` 会应用于**所有**Controller。但你可以通过以下属性精确控制它 advice（建议/拦截）哪些Controller：

*   **`basePackages`**: 根据包名限制。
    ```java
    @RestControllerAdvice(basePackages = "com.example.api.v1")
    // 只处理 com.example.api.v1 包下的Controller
    ```

*   **`basePackageClasses`**: 根据类所在包限制（类型安全的方式）。
    ```java
    @RestControllerAdvice(basePackageClasses = {UserController.class, ProductController.class})
    // 只处理 UserController 和 ProductController 所在包下的Controller
    ```

*   **`assignableTypes`**: 根据具体的Controller类限制。
    ```java
    @RestControllerAdvice(assignableTypes = {AdminController.class})
    // 只处理 AdminController 这个类
    ```

*   **`annotations`**: 根据Controller上的注解限制。
    ```java
    @RestControllerAdvice(annotations = RestController.class)
    // 只处理被 @RestController 注解的Controller
    ```
------
### 4. 工作流程

为了更清晰地理解，我们可以看一下它的工作流程：

```mermaid
flowchart TD
    A[客户端HTTP请求] --> B[DispatcherServlet]
    B --> C[进入Controller方法]
    C --> D{执行是否出现异常?}
    D -- 是 --> E[抛出异常]
    E --> F[@RestControllerAdvice扫描<br>@ExceptionHandler方法]
    F --> G{找到匹配的<br>异常处理方法?}
    G -- 是 --> H[执行该方法并返回<br>格式统一的JSON错误响应]
    G -- 否 --> I[返回默认错误页面<br>如WhiteLabel Page]
    H --> J[客户端收到JSON错误信息]
    I --> J
    D -- 否 --> K[正常返回结果]
    K --> J
```
------
### 总结

| 方面         | 解释                                                         |
| :----------- | :----------------------------------------------------------- |
| **是什么**   | 一个组合注解，结合了 `@ControllerAdvice` 和 `@ResponseBody` 的功能。 |
| **做什么**   | 为所有或指定的Controller提供**全局的、统一的**异常处理、数据绑定和数据预处理。 |
| **为什么用** | 1. **避免重复代码**：无需在每个Controller中写try-catch。<br>2. **统一响应格式**：确保所有错误返回的JSON结构一致。<br>3. **关注点分离**：让Controller更专注于业务逻辑，异常处理交给专门的类。 |
| **怎么用**   | 在一个类上标注 `@RestControllerAdvice`，并在方法上使用 `@ExceptionHandler` 等注解。 |

**简单记忆：它是你项目中处理API全局异常的“总指挥部”。**
