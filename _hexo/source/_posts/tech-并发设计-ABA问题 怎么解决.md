---
title: 'ABA问题 怎么解决'
date: '2025-09-06 15:33'
categories:
  - '技术文档'
  - '并发编程'
  - 'CAS'
  - 'ABA问题'
tags:
  - '并发设计'
---

好的，ABA问题是使用CAS（乐观锁）时的一个经典陷阱。解决它的核心思想是：**不仅要检查值是否相同，还要检查版本号或状态是否发生过变化。**
------
### 1. 什么是ABA问题？

假设一个共享变量的值为 `A`。

1.  线程1读取到值 `A`。
2.  线程1被挂起。
3.  线程2将值从 `A` 修改为 `B`。
4.  线程3（或线程2）又将值从 `B` 修改回 `A`。
5.  线程1恢复运行，执行CAS操作：它期望的值是 `A`，当前值确实也是 `A`，所以CAS**成功**。

**问题在于**：从线程1的视角看，值好像从来没变过。但它不知道这个值已经经历了一个 `A -> B -> A` 的“轮回”。这个中间变化可能非常重要，如果线程1的逻辑依赖于“值未被修改过”这一假设，那么程序就会出现逻辑错误。

**现实比喻**：
你把一瓶水放在桌子上，然后离开。一个朋友过来喝光了水，**又把空瓶灌满了水**放回原处。你回来后，看到瓶子是满的（值还是 `A`），以为没人动过，就放心地喝了。但你不知道这瓶水已经被换过了。
------
### 2. 解决方案：版本号（Stamp）或状态引用

最常用且有效的解决方案是**使用一个自增的版本号（Version Number）或时间戳（Stamp）来标记变量的每一次修改**。在进行CAS操作时，同时比较**值**和**版本号**，只有两者都未发生变化时，操作才算成功。

这通常通过一个封装类来实现。

#### 方案一：AtomicStampedReference

Java标准库提供了 `AtomicStampedReference<V>` 类 precisely 用于解决ABA问题。

*   **原理**：它将一个 `int` 类型的**版本号（stamp）** 和一个对象的**引用**包装在一起。
*   每次更新引用时，版本号都必须递增。
*   CAS操作需要同时提供**期望的引用**、**新的引用**、**期望的版本号**和**新的版本号**。

```java
import java.util.concurrent.atomic.AtomicStampedReference;

public class ABASolution {
    // 初始值为 100，初始版本号为 0
    private static AtomicStampedReference<Integer> atomicStampedRef =
            new AtomicStampedReference<>(100, 0);

    public static void main(String[] args) throws InterruptedException {
        int initialStamp = atomicStampedRef.getStamp(); // 获取初始版本号：0
        Integer initialRef = atomicStampedRef.getReference(); // 获取初始值：100

        // 线程1：模拟ABA场景，并尝试用CAS恢复原始值
        Thread t1 = new Thread(() -> {
            // 模拟线程1先读取值和版本号
            int stamp = atomicStampedRef.getStamp();
            Integer reference = atomicStampedRef.getReference();
            System.out.println("T1 - 初始值: " + reference + ", 版本号: " + stamp);

            // 模拟线程1被挂起
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            // 线程1醒来后尝试CAS：期望值=100，新值=200；期望版本号=0，新版本号=0+1
            boolean success = atomicStampedRef.compareAndSet(reference, 200, stamp, stamp + 1);
            System.out.println("T1 - CAS操作是否成功: " + success);
            if (success) {
                System.out.println("T1 - 操作成功，新值: " + atomicStampedRef.getReference() + ", 新版本号: " + atomicStampedRef.getStamp());
            } else {
                System.out.println("T1 - 操作失败，值已被其他线程修改过（即使值可能相同）");
            }
        });

        // 线程2：执行 A -> B -> A 的操作
        Thread t2 = new Thread(() -> {
            // 先改成 500，版本号+1
            boolean success1 = atomicStampedRef.compareAndSet(initialRef, 500, initialStamp, initialStamp + 1);
            System.out.println("T2 - CAS A->B 成功: " + success1 + ", 当前版本号: " + atomicStampedRef.getStamp());

            // 再改回 100，版本号再次+1
            boolean success2 = atomicStampedRef.compareAndSet(500, 100, initialStamp + 1, initialStamp + 2);
            System.out.println("T2 - CAS B->A 成功: " + success2 + ", 当前版本号: " + atomicStampedRef.getStamp());
        });

        t1.start();
        t2.start();
        t1.join();
        t2.join();
    }
}
```

**输出结果：**
```
T1 - 初始值: 100, 版本号: 0
T2 - CAS A->B 成功: true, 当前版本号: 1
T2 - CAS B->A 成功: true, 当前版本号: 2
T1 - CAS操作是否成功: false // 关键在这里！虽然值还是100，但版本号从0变成了2，所以CAS失败。
T1 - 操作失败，值已被其他线程修改过（即使值可能相同）
```
**关键点**：线程1的CAS操作失败了，因为它期望的版本号是 `0`，但当前的版本号已经被线程2递增到了 `2`。这就完美地检测到了ABA问题。

#### 方案二：AtomicMarkableReference

如果并不关心值具体被修改了多少次，而只关心**它是否被修改过**，可以使用 `AtomicMarkableReference<V>`。

*   **原理**：它使用一个 `boolean` 标记来代替整数版本号。这个标记表示值“是否被修改过”。
*   它更轻量，但提供的信息也更少（只关心“脏不脏”，不关心“改了几次”）。

```java
// 初始值100，标记初始为false，表示未修改过
AtomicMarkableReference<Integer> atomicMarkableRef = new AtomicMarkableReference<>(100, false);

// CAS操作：同时比较值和标记
boolean[] markHolder = new boolean[1];
int currentValue = atomicMarkableRef.get(markHolder); // 同时获取值和当前标记
boolean currentMark = markHolder[0];

// 尝试更新：期望值=100，新值=200；期望标记=false，新标记=true
atomicMarkableRef.compareAndSet(100, 200, false, true);
```
------
### 3. 不常用的方案：延迟重用

在某些特殊场景下，可以确保一个值一旦被修改，就再也不会被重用。例如，如果你操作的引用指向一个对象，可以确保 `A -> B -> A` 中的最后一个 `A` 是一个**全新的对象**，而不是最初的那个 `A`。

*   **原理**：利用对象的地址（引用）进行比较。因为 `new A()` 和 `new A()` 是两个不同的对象，它们的引用（内存地址）不同。
*   **实现**：使用 `AtomicReference<V>`，但确保状态变化总是伴随着新对象的创建。
*   **缺点**：可能产生大量小对象，增加GC压力。通常只在状态对象本身天然不可重用时才有效。

```java
// 假设我们有一个State类
class State { /* ... some fields ... */ }

AtomicReference<State> ref = new AtomicReference<>(new State());

// 线程1：读取原始状态对象State@1001
State originalState = ref.get();

// 线程2：修改状态
ref.set(new State()); // State@2002

// 线程3：又设置了一个新的State对象，但内容和最初一样
ref.set(new State()); // State@3003 - 这是一个全新的对象，地址和State@1001不同

// 线程1：尝试CAS
// 期望的引用是 State@1001，但当前引用是 State@3003，引用不同，CAS失败！
ref.compareAndSet(originalState, newState);
```

### 总结

| 方案                        | 核心思想               | 优点                 | 缺点                           | 适用场景                             |
| :-------------------------- | :--------------------- | :------------------- | :----------------------------- | :----------------------------------- |
| **AtomicStampedReference**  | **添加整数版本号**     | 精确，能知道修改次数 | 稍微复杂，需要管理版本号       | 通用场景，需要严格防止ABA问题        |
| **AtomicMarkableReference** | **添加布尔标记位**     | 比整数版本号更轻量   | 只能知道是否被修改过，不知次数 | 只关心“有无修改”的场景               |
| **延迟重用**                | **确保状态不重复使用** | 无需额外字段         | 可能产生GC压力，不通用         | 状态对象天然唯一或不可重用的特殊场景 |

**最佳实践：**
在大多数需要解决ABA问题的业务场景中，**优先使用 `AtomicStampedReference`**。它提供的信息最完整，是解决ABA问题的标准且可靠的方案。
