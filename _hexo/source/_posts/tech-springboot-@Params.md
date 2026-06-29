---
title: '@Params'
date: '2025-08-25 11:09'
categories:
  - '技术文档'
  - 'springboot'
tags:
  - 'springboot'
---

好的，我们来详细讲解一下在 MyBatis（特别是与 Spring 集成的版本中） `@Param` 注解的作用和用法。

### 一、核心作用

`@Param` 注解的**核心作用是为Mapper接口中的方法参数命名**，以便在MyBatis的XML映射文件中能够通过这个名字来引用该参数。

在没有其他注解（如 `@Param`）的情况下，MyBatis 默认会使用以下规则来处理参数：

1.  **单个基本类型或 String 类型参数**：可以直接在 XML 中使用任何名字（但通常使用参数名本身），但更推荐使用 `_parameter` 这个内置名称。
2.  **单个JavaBean（POJO）参数**：直接在 XML 中使用其属性名。
3.  **多个参数**：MyBatis 默认会将它们转换为一个 `Map` 结构，其键为 `param1`, `param2`, ... 或者 `arg0`, `arg1`, ...。这种方式非常不直观，容易出错。

`@Param` 注解就是为了解决第3种（多参数）情况的清晰度问题，同时也让第1种情况更加明确。
------
### 二、主要用法和场景

#### 场景1：方法有多个参数

这是 `@Param` 最常用、最重要的场景。它让多个简单类型的参数变得可读性更高。

**没有 `@Param` 时（不推荐）：**

```java
// Mapper 接口
User findByCredentials(String username, String password);
```

```xml
<!-- XML 映射文件 -->
<select id="findByCredentials" resultType="User">
  SELECT * FROM user 
  WHERE username = #{param1}  <!-- 或者 #{arg0} -->
  AND password = #{param2}    <!-- 或者 #{arg1} -->
</select>
```
这种方式非常糟糕，因为你必须记住参数的顺序。

**使用 `@Param` 后（推荐）：**

```java
// Mapper 接口
User findByCredentials(
    @Param("name") String username, 
    @Param("pwd") String password
);
```

```xml
<!-- XML 映射文件 -->
<select id="findByCredentials" resultType="User">
  SELECT * FROM user 
  WHERE username = #{name}  <!-- 直接使用注解定义的名称 -->
  AND password = #{pwd}
</select>
```
这样代码的可读性和可维护性大大提高，参数的含义一目了然。

#### 场景2：方法参数是一个集合（如 List, Array, Set）

当需要传递一个集合给 `foreach` 标签时，使用 `@Param` 命名是必须的。

```java
// Mapper 接口
List<User> findByIds(@Param("idList") List<Long> ids);
```

```xml
<!-- XML 映射文件 -->
<select id="findByIds" resultType="User">
  SELECT * FROM user 
  WHERE id IN 
  <foreach item="item" collection="idList" open="(" separator="," close=")">
    #{item}
  </foreach>
</select>
```
这里的 `collection="idList"` 必须与 `@Param("idList")` 中定义的名称一致。

#### 场景3：增强单个参数的可读性

即使只有一个参数，使用 `@Param` 也可以让XML中的 `#{}` 更清晰地表达意图，而不是使用默认的 `_parameter`。

```java
// Mapper 接口
User findByName(@Param("userName") String name);
```

```xml
<!-- XML 映射文件 -->
<select id="findByName" resultType="User">
  SELECT * FROM user WHERE username = #{userName}
</select>
```
这比 `#{_parameter}` 或随意起一个名字要专业和清晰得多。

#### 场景4：与动态SQL（如 `<if>`）结合使用

在动态SQL的测试条件中，直接使用命名的参数会比 `param1` 清晰得多。

```java
// Mapper 接口
List<User> searchUsers(
    @Param("name") String name,
    @Param("email") String email,
    @Param("status") Integer status
);
```

```xml
<!-- XML 映射文件 -->
<select id="searchUsers" resultType="User">
  SELECT * FROM user 
  <where>
    <if test="name != null and name != ''">
      AND username LIKE CONCAT('%', #{name}, '%')
    </if>
    <if test="email != null">
      AND email = #{email}
    </if>
    <if test="status != null">
      AND status = #{status}
    </if>
  </where>
</select>
```
在 `<if test="...">` 表达式中，可以直接使用 `@Param` 定义的名称（如 `name`, `email`），这使得动态SQL的条件判断非常直观。
------
### 三、底层原理

当你在方法参数上使用 `@Param("myName")` 后，MyBatis 在底层会做这样一件事：

它将这个参数放入一个Map中，其中 **Key** 就是你指定的名称（例如 `"myName"`），**Value** 就是参数的值。

所以，在XML中通过 `#{myName}` 访问时，实际上就是从这个小Map中根据Key `myName` 来获取对应的Value。
------
### 四、总结对比

| 场景         | 无 `@Param`（默认行为）                 | 使用 `@Param`（推荐）                  |
| :----------- | :-------------------------------------- | :------------------------------------- |
| **多参数**   | 使用 `param1`, `param2`, `arg0`, `arg1` | 使用自定义的清晰名称，如 `name`, `pwd` |
| **集合参数** | 无法直接处理，需包装成Map或POJO         | 使用自定义名称，可直接用于 `foreach`   |
| **动态SQL**  | 在 `<if test>` 中需使用 `param1`        | 在 `<if test>` 中可直接使用自定义名称  |
| **单参数**   | 可使用 `_parameter` 或任意名称          | 使用有意义的自定义名称，增强可读性     |

**最佳实践建议：**

*   **只要方法参数超过1个，就毫不犹豫地使用 `@Param`。**
*   即使只有一个参数，如果它是一个简单的类型（如 `String`, `Long`），也建议使用 `@Param` 来赋予它一个清晰的名称，这会让你的代码更专业、更易维护。
*   如果单个参数是一个复杂的JavaBean，则不需要使用 `@Param`，直接在XML中使用其属性名即可。
