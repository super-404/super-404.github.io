---
title: '核心原代码'
date: '2025-12-03 14:27'
categories:
  - '技术文档'
  - '并发编程'
  - '高性能队列'
  - 'Disruptor'
tags:
---

##                                         Disruptor3.3.0框架详解

## 1.生产者-RingBuffer

 	在Disruptor中生产者被称为DataProvider,在该接口中主要由RingBuffer实现。由该类负责提供数据管理。

### (1) 索引设计

传统环形队列通常维护两个指针：

```
head (pop index)
tail (push index)
```

并且下标通过：

```
index = tail % size
```

但是 —— `%`（取模运算）非常慢，而且会影响 CPU 分支预测，尤其是在高频读写场景（百万级 ops/sec）下。

为了更高效的获取数据，RingBuffer采用的是环形数组结构，

Disruptor 的设计思路：

> **索引 = 序号 & (bufferSize - 1)**
>  条件：bufferSize 必须是 2 的幂。

比如 `bufferSize = 1024 = 2^10`：

```
seq: 0   → 0000000000   → index = 0 & 1023 = 0
seq: 1024→ 10000000000  → index = 1024 & 1023 = 0
```

### (2) 解决伪共享

多线程共享缓存行时，如果不同线程写同一个 cache line，CPU 会不断 invalidate/cache line sync → 缓存效率很低。

解决的办法也很简单，在关键变量之前利用padding填充整个缓存行，保证不会有其他线程的数据共享这个缓存行

例：

```java
public class Sequence extends LhsPadding {
    volatile long value;   // 8字节
}
```

两侧加上几十字节 dummy 变量：

```java
long p1,p2,p3,p4,p5,p6,p7;
```

最终占用一整个 cache line (~64 bytes)，避免多个 Sequence 写入同一 cache line。

### (3) 避免频繁GC

在RingBuffer中为了避免频繁GC

- 数组内**每个槽位**存放的 Event 是提前创建好的
- 后续写入数据时 **修改对象字段，而不是创建新对象**

### (4) 数据的发布-单生产者模式下

在利用环形数组生产数据时，非常重要的一点是如何避免数据被覆盖，换句话说，如何控制生产的速度小于消费的速度。

这段代码来自 Disruptor 的单生产者 `Sequencer` 的 `next(n)`：它**为生产者批量申请 n 个序号（claim n slots）**，并保证不会覆盖还未被消费者处理的槽位（backpressure）。

# 核心原代码

```java
@Override
public long next(int n)
{
    if (n < 1)
    {
        throw new IllegalArgumentException("n must be > 0");
    }

    long nextValue = this.nextValue;

    long nextSequence = nextValue + n;
    long wrapPoint = nextSequence - bufferSize;
    long cachedGatingSequence = this.cachedValue;

    if (wrapPoint > cachedGatingSequence || cachedGatingSequence > nextValue)
    {
        long minSequence;
        while (wrapPoint > (minSequence = Util.getMinimumSequence(gatingSequences, nextValue)))
        {
            LockSupport.parkNanos(1L); // TODO: Use waitStrategy to spin?
        }

        this.cachedValue = minSequence;
    }

    this.nextValue = nextSequence;

    return nextSequence;
}
```

------

## 一句话概括

`next(n)`：为生产者分配 `[nextValue+1 .. nextValue+n]` 这 n 个序号（返回 `nextSequence = nextValue + n`），但在分配前会**检查最慢消费者的位置**，如果分配会导致覆盖（wrap），则等待直到消费者进度足以释放槽位。

## 逐步解析（变量含义 & 目的）

- `if (n < 1)`
   参数校验：一次至少要申请 1 个序号。

- `long nextValue = this.nextValue;`
   读取序号分配游标的本地副本。**在单生产者模式下**，`nextValue` 通常是类字段（非 volatile），仅由生产者线程更新 —— 这样可以避免每次读写都使用内存栅栏，提高性能（生产者线程独占它）。

- `long nextSequence = nextValue + n;`
   计算本次分配后最后一个序号（inclusive）。返回值就是这个 `nextSequence`，表示生产者已 claim 到这个序号。

- `long wrapPoint = nextSequence - bufferSize;`
   关键计算：如果 `wrapPoint > minConsumerSequence`，说明分配 `nextSequence` 会“回绕”并**覆盖**下标 `nextSequence % bufferSize`，而该槽位可能还没被最慢的消费者处理（即危险）。

  - 直观：`wrapPoint` 表示最小可允许的消费者序号阈值，若最慢消费者尚未超过 `wrapPoint`，则写入会覆盖未消费的数据。

- `long cachedGatingSequence = this.cachedValue;`
   读取上次缓存的最慢消费者进度（避免频繁扫描 `gatingSequences`）。`gatingSequences` 是所有消费者 sequence 的集合，取最小值代表最慢消费者。

  ## 为什么要判断 `if (wrapPoint > cachedGatingSequence || cachedGatingSequence > nextValue)`？

  这是两方面的触发条件，用于决定是否需要实际读取（扫描）所有消费者序号：

  1. `wrapPoint > cachedGatingSequence`
      如果申请的序号会 wrap（覆盖）到 `cachedGatingSequence` 之前的位置，就必须检查真实的最慢消费者位置是否已经推进（即是否释放空间）。若没有推进，就需要等待。
  2. `cachedGatingSequence > nextValue`
      这是一个**缓存失效/自洽性检查**：`cachedGatingSequence` 理应代表一个不大于 `nextValue` 的最慢消费者位置（因为 `nextValue` 是生产者已经 claim 的最后序号）。若缓存的最慢消费者位置 **大于** `nextValue`，说明缓存值不可靠或出现异常（例如缓存被提前更新），所以也需要重新读取（刷新）最慢消费者值以保证正确性。

  > 总结：只在必要时（有覆盖风险或缓存不可信）去调用昂贵的 `getMinimumSequence` 扫描所有消费者，否则直接使用缓存以提高吞吐。

### （5） 消费者控制消费速度

​		核心类ProcessingSequenceBarrier

# 1. `SequenceBarrier` 是什么？为什么需要它？

`SequenceBarrier` 是**消费者在取数据之前必须经过的“协调屏障”**，它解决两个问题：

1. **协调消费者之间的先后依赖**
   - 例如 HandlerC 必须等 HandlerA、HandlerB 先处理完事件 X 才能处理。
   - 那么 C 的 barrier 就依赖 A、B 的 sequence。
2. **协调生产者与消费者（防止越界消费）**
   - 消费者不能消费尚未 publish 的序号（即使 RingBuffer 里有旧数据）。
   - 因此消费者必须阻塞在 barrier 上，直到 sequencer 发布了该序号。

# 🌋 2. `ProcessingSequenceBarrier` 的主要字段

```java
final WaitStrategy waitStrategy;
final Sequence dependentSequence;
final Sequence cursorSequence;
volatile boolean alerted = false;
final Sequencer sequencer;
```

解释如下：

| 字段                | 作用                                                     |
| ------------------- | -------------------------------------------------------- |
| `cursorSequence`    | 指向 **生产者发布到的最大序号**，通常是 ringBufferCursor |
| `dependentSequence` | 表示 **本消费者依赖的前置消费者最慢的序号**              |
| `waitStrategy`      | 管理等待策略（Blocking、Yielding、BusySpin 等）          |
| `alerted`           | 表示 barrier 是否处于 alert 状态（被 shut down 或 halt） |
| `sequencer`         | 用来查询 publish 的最高可用序列区间                      |

# 3.`ProcessingSequenceBarrier.waitFor()` 的核心代码

源码

```java
public long waitFor(final long sequence)
    throws AlertException, InterruptedException, TimeoutException
{
    checkAlert();

    long availableSequence = waitStrategy.waitFor(
        sequence,          // 我要等待的序号
        cursorSequence,    // 生产者发布的游标
        dependentSequence, // 依赖的前置消费者
        this               // barrier 自身（用于检查警告中断）
    );

    if (availableSequence < sequence)
        return availableSequence;

    return sequencer.getHighestPublishedSequence(sequence, availableSequence);
}
```

# 🌋 4. `waitStrategy.waitFor()` 做了什么？

这句是整个 barrier 的核心：

```java
availableSequence = waitStrategy.waitFor(sequence, cursorSequence, dependentSequence, this);
```

解析四个参数：

1. **sequence**
   - 当前消费者想要处理的序号（必须等待它被 publish）。
2. **cursorSequence（生产者）**
   - 这是生产者已经 publish 的最大序号。
   - 如果 `cursor < sequence`，消费者必须等待生产者。
3. **dependentSequence（前置消费者）**
   - 如果当前 Consumer 依赖其他 Consumer，那么必须等待依赖链最快的序号 >= sequence。
4. **barrier（用于 alert 检测）**
   - 比如 shutdown/halt 时立即中断 wait。

### WaitStrategy 返回的 availableSequence 意味着：

> “到目前为止，**至少到 availableSequence（含）** 这些序号已经可以安全消费了。”

例如：

- 生产者 publish 了 10
- 我依赖的 HandlerB 处理到了 7
- 我希望消费 5

那么 waitFor(5) 可能返回 7 —— 说明 **0～7 都是 safe 的**。

# 🌋 5. 为什么返回后还要：

```
return sequencer.getHighestPublishedSequence(sequence, availableSequence);
```

因为许多 WaitStrategy（例如 BusySpin）只关心 **cursorSequence** 是否前进，但不关注 **中间的序号是否被连续 publish**。

例如：

- 生产者先拿到 next(3)：4,5,6
- 写入 4，然后 publish 4
- 写入 5，然后 publish 5
- 写入 6（慢），未 publish 6

此时：

- `cursorSequence = 6`
- **但 6 还没 publish，不能消费！**

因此需要 sequencer 检查“连续已发布的序列区间”：

```
highest = getHighestPublishedSequence(from=sequence, to=availableSequence);
```

### 消费者和生产者的整合

### 1. 消费者如何拿到生产者的最新的index

在消费者内部设置一个barrier,
