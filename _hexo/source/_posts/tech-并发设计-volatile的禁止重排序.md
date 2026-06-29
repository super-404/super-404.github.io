---
title: 'volatile的禁止重排序'
date: '2025-09-09 17:44'
categories:
  - '技术文档'
  - '并发设计'
tags:
  - '并发设计'
---

好的，我们来深入浅出地理解 `volatile` 的**禁止重排序**含义。这是 `volatile` 关键字除了保证可见性之外的另一个核心作用。

### 核心概念：什么是指令重排序？

为了优化性能，编译器和处理器常常会在不改变**单线程**程序执行结果的前提下，对指令的执行顺序进行重新排序。

**举个例子：**
```java
int a = 1;
int b = 2;
```
这两行代码在单线程下，先执行哪一行最终结果都一样。编译器或处理器就可能将 `b = 2` 的执行排在 `a = 1` 之前。这就是指令重排序。

在单线程环境下，这完全没问题。但在多线程环境下，这种“自作聪明”的优化可能会导致灾难性的后果。
------
### `volatile` 的禁止重排序

当一个变量被声明为 `volatile` 后，Java 内存模型（JMM）会为其提供特殊的内存屏障（Memory Barrier）保障。这些内存屏障就像一道道“栅栏”，确保了以下两点：

1.  **编译器和处理器不会把 `volatile` 变量读写操作与它**前面和后面**的其他普通内存操作随意地重排序。**
2.  **所有对 `volatile` 变量的写入操作，都会立即同步回主内存；所有对 `volatile` 变量的读取操作，都会直接从主内存读取。**

简单来说，`volatile` 变量就像一个“关卡”，它之前的操作必须全部完成，它之后的操作必须全部在它之后开始。
------
### 例子1：单例模式（Double-Checked Locking）

这是最经典、最能说明禁止重排序重要性的例子。

**错误的单例模式（没有 `volatile`）：**
```java
public class Singleton {
    private static Singleton instance; // 错误！这里缺少 volatile

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                // 第一次检查
            synchronized (Singleton.class) {   // 加锁
                if (instance == null) {        // 第二次检查
                    instance = new Singleton(); // 问题出在这一行！
                }
            }
        }
        return instance;
    }
}
```

**问题分析：**
`instance = new Singleton();` 这行代码在 JVM 中并不是一个原子操作，它大致可以分为三步：
1.  `memory = allocate();`    // 1. 分配对象的内存空间
2.  `ctorInstance(memory);`   // 2. 初始化对象（调用构造函数）
3.  `instance = memory;`      // 3. 将 `instance` 引用指向分配好的内存地址

**如果没有禁止重排序**，编译器和处理器为了优化，可能会将步骤 **3** 和步骤 **2** 重排序。执行顺序可能变成：
1.  `memory = allocate();`    // 1. 分配内存
2.  `instance = memory;`      // 3. 引用指向内存（此时 instance != null，但对象还未初始化！）
3.  `ctorInstance(memory);`   // 2. 初始化对象

现在，想象一下多线程场景：
- 线程 A 执行 `getInstance()`，进入了同步块，并开始执行 `new Singleton()`。
- 当执行到重排序后的顺序（即完成了步骤1和3，但还没执行步骤2）时，线程 A 被挂起。此时 `instance` 已经不为 `null`，但它指向的是一个**未初始化完毕的残缺对象**。
- 此时线程 B 执行 `getInstance()`，在第一次检查 `if (instance == null)` 时，发现 `instance` 不为 `null`，于是直接返回了这个**未初始化完毕的对象**。
- 线程 B 使用这个对象时，就会发生不可预料的错误。

**解决方案：使用 `volatile`**
```java
public class Singleton {
    // 使用 volatile 禁止 "instance = new Singleton()" 内部的指令重排序
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton(); // 这行代码内部的指令不会被重排序
                }
            }
        }
        return instance;
    }
}
```
`volatile` 关键字在这里的作用就是**禁止步骤2（初始化）和步骤3（赋值）之间的重排序**，从而保证其他线程在看到 `instance` 不为 `null` 时，该对象一定是已经完全初始化好的。
------
### 例子2：状态标志位

这是一个更简单的例子，展示了禁止重排序如何保证逻辑的正确性。

**没有 `volatile` 的场景（可能出错）：**
```java
// 线程1
public void init() {
    resource = loadResource(); // 1. 初始化一个资源
    initialized = true;        // 2. 将标志位设为 true
}

// 线程2
public void use() {
    if (initialized) {         // 3. 检查标志位
        resource.doSomething(); // 4. 使用资源
    }
}
```
由于指令重排序，线程1中的 `步骤1` 和 `步骤2` 可能会被颠倒顺序。执行顺序可能变成：
1.  `initialized = true;`     // 标志位先被设为true
2.  `resource = loadResource();` // 资源后初始化

如果发生这种重排序：
- 线程1先执行了 `initialized = true`，然后被挂起。
- 线程2执行 `use()` 方法，发现 `initialized` 为 `true`，于是放心地调用 `resource.doSomething()`。
- 但此时 `resource` 还没有被初始化（`loadResource()` 还没执行完），线程2就会使用一个 `null` 或不完整的对象，导致程序崩溃。

**解决方案：使用 `volatile`**

```java
volatile boolean initialized = false; // 使用 volatile 修饰标志位

public void init() {
    resource = loadResource();
    initialized = true; // 由于 initialized 是 volatile 的，
                        // 所以这条语句之前的任何操作（resource = loadResource()）
                        // 都必须在此语句之前完成并可见。
}

public void use() {
    if (initialized) {   // 读取 volatile 变量，能保证看到之前所有操作的结果
        resource.doSomething();
    }
}
```
`volatile` 关键字在这里的作用是：
1.  禁止编译器/处理器将 `initialized = true` 重排到 `resource = loadResource()` 之前。
2.  当线程2读取到 `initialized = true` 时，由于 `volatile` 的可见性保证，线程2也能立即看到 `resource = loadResource()` 的结果（即初始化好的 resource 对象）。

### 总结

`volatile` 的**禁止重排序**意味着：

| 场景       | 规则                                                         |
| :--------- | :----------------------------------------------------------- |
| **写操作** | 对一个 `volatile` 变量的**写操作**，其**之前**的所有普通读写操作都已完成，且结果对后续操作可见。 |
| **读操作** | 对一个 `volatile` 变量的**读操作**，其**之后**的所有普通读写操作都肯定尚未开始。 |

它通过插入**内存屏障**来实现这一点，就像一个“单向阀门”或“同步点”，确保了操作的顺序性，从而在多线程环境下保证了程序的正确逻辑。上面的两个例子清晰地展示了如果没有这种保障，程序会如何在不经意间崩溃。
