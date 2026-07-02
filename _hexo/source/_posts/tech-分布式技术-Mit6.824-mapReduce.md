---
title: '崩溃恢复'
date: '2026-01-08 14:25'
categories:
  - '分布式系统'
  - 'MIT 6.824'
  - 'MapReduce'
tags:
  - '分布式技术'
  - 'Mit6.824'
---

是的，但这句话**要分两层理解**，不然很容易混淆（6.5840 里这是一个“考点级别”的概念）。

------

## 一句话先给结论

> **Map 和 Reduce 的“具体计算逻辑”是在 worker 中执行的，
> 但 MapReduce 的“调度与流程控制”是在 coordinator 中完成的。**

换句话说：

| 角色            | 负责什么                                   |
| --------------- | ------------------------------------------ |
| **worker**      | 真正执行 `Map()` 和 `Reduce()` 函数        |
| **coordinator** | 分配任务、跟踪状态、容错、决定什么时候结束 |

------

## 一、Map / Reduce 函数本身是谁实现的？

### 1️⃣ Map / Reduce 不是你写的（实验角度）

在 6.5840 里：

```go
func Map(filename string, contents string) []mr.KeyValue
func Reduce(key string, values []string) string
```

这些函数：

- **不在 worker.go**
- 在 `mrapps/*.go` 里（如 `wc.go`、`indexer.go`）
- 被编译成 **plugin（.so 文件）**

例如：

```go
../mrworker ../../mrapps/wc.so
```

👉 worker **动态加载**这些函数。

------

### 2️⃣ worker 如何“拿到” Map / Reduce？

在 `mrworker.go` 的 `main()` 里：

```go
mapf, reducef := loadPlugin(os.Args[1])
Worker(mapf, reducef)
```

然后：

```go
func Worker(
    mapf func(string, string) []KeyValue,
    reducef func(string, []string) string,
)
```

👉 **worker 拿到的是函数指针**

------

## 二、Map / Reduce 是在哪里“被调用”的？

### ✅ 是在 worker 中调用的（重点）

#### Map 阶段（在 worker）

```go
kva := mapf(filename, contents)
```

#### Reduce 阶段（在 worker）

```go
output := reducef(key, values)
```

👉 **真正的计算发生在 worker 进程里**

------

## 三、Coordinator 做了什么（不是计算）

Coordinator **从来不调用 mapf / reducef**。

它只做：

- 记录有哪些 Map / Reduce 任务
- 通过 RPC 告诉 worker：
  - “你去做第 X 个 Map”
  - “你去做第 Y 个 Reduce”
- 追踪任务状态（Idle / InProgress / Done）
- 超时重发任务
- 判断 `Done()`

可以理解为：

> **coordinator 是“项目经理”，worker 是“码农”**

------

## 四、用一个完整流程串起来（非常重要）

### ① coordinator 启动

```text
初始化 Map 任务
初始化 Reduce 任务
Phase = Map
```

------

### ② worker 启动

```text
worker -> RPC: 给我一个任务
```

------

### ③ coordinator 分配 Map 任务

```text
回复：MapTask { file=pg-xxx.txt }
```

------

### ④ worker 执行 Map（核心）

```go
contents := readFile(file)
kva := mapf(file, contents)   // ⭐ 这里才是真正的 Map
写 mr-X-Y 中间文件
RPC 告诉 coordinator：Map 完成
```

------

### ⑤ coordinator 切换到 Reduce 阶段

```text
所有 Map 完成 → Phase = Reduce
```

------

### ⑥ worker 执行 Reduce

```go
读取所有 mr-X-Y
排序
output := reducef(key, values)  // ⭐ 这里才是真正的 Reduce
写 mr-out-Y
RPC 告诉 coordinator：Reduce 完成
```

------

### ⑦ coordinator Done() 返回 true

```text
Phase = Done
coordinator 退出
worker RPC 失败 → worker 退出
```

------

## 五、一个非常容易犯的误区（重点提醒）

❌ **错误理解**

> “Map / Reduce 是 coordinator 调用的”

这是错的 ❌
coordinator **不参与任何数据计算**

------

✅ **正确理解**

> **Map / Reduce 是 worker 执行的，coordinator 只负责调度**

------

## 六、用 Java / 分布式系统类比一下（帮你建立直觉）

| MapReduce 角色 | Java / 分布式类比             |
| -------------- | ----------------------------- |
| coordinator    | JobTracker / Master           |
| worker         | TaskExecutor / WorkerNode     |
| Map / Reduce   | 业务函数（lambda / callback） |
| RPC            | gRPC / RMI                    |
| plugin         | SPI / 动态加载 jar            |

------

## 七、为什么这点和你“卡住”的问题强相关？

你现在的卡死现象很可能是：

- worker **执行了 Map**
- 但 **没有正确向 coordinator 报告完成**
- coordinator **认为任务没做完**
- `Done()` 永远 false

👉 **不是 Map/Reduce 没跑，是“跑完没人告诉老板”**

------

## 八、一句话终极总结（建议记住）

> **Map / Reduce 的“算法”在 plugin 里，
> Map / Reduce 的“执行”在 worker 里，
> Map / Reduce 的“调度与结束判断”在 coordinator 里。**

------

如果你愿意，下一步我可以直接：

- 给你画一张 **worker / coordinator RPC 交互时序图**
- 或帮你 **对照 test-mr.sh 一条一条实现 coordinator 的状态机**

你现在已经理解到 **6.5840 最核心的抽象层次了** 👏



# 崩溃恢复

分析 worker 崩溃恢复机制。先查看相关代码，理解当前实现：

[4 tools called]


分析当前实现并提出 worker 崩溃恢复方案：

[1 tool called]


## Worker 崩溃恢复方案

### 当前问题分析

1. 无任务状态跟踪：coordinator 分配任务后，不记录任务状态（未分配/已分配/已完成）
2. 无 worker 关联：不知道哪个 worker 在处理哪个任务
3. 无超时检测：无法判断 worker 是否崩溃
4. 任务丢失：worker 崩溃后，任务无法重新分配

### 恢复方案设计

#### 1. 任务状态管理

在 `Coordinator` 中添加：

```go
type Coordinator struct {
    // ... 现有字段 ...
    
    // Map 任务管理
    mapTasks map[string]*MapTask  // key: 文件名, value: 任务信息
    
    // Reduce 任务管理
    reduceTasks map[int]*ReduceTask  // key: reduce task num, value: 任务信息
}

type MapTask struct {
    FileName    string
    Status      string  // "pending", "assigned", "completed"
    AssignedTo  int     // worker ID
    AssignedAt  time.Time
}

type ReduceTask struct {
    TaskNum     int
    Status      string  // "pending", "assigned", "completed"
    AssignedTo  int     // worker ID
    AssignedAt  time.Time
}
```

#### 2. 超时检测机制

- 启动后台 goroutine，定期检查任务超时（如每 1 秒）
- 超时阈值：10 秒（可配置）
- 超时处理：将任务状态从 "assigned" 重置为 "pending"，允许重新分配

#### 3. 任务分配逻辑修改

- Map 任务：
  - 从 `mapTasks` 中查找状态为 "pending" 的任务
  - 分配时设置状态为 "assigned"，记录 worker ID 和分配时间
  - 完成时设置状态为 "completed"

- Reduce 任务：
  - 类似 Map 任务的管理方式
  - 从 `reduceTasks` 中查找状态为 "pending" 的任务

#### 4. 任务完成验证

- 在 `TaskDone` 中验证：
  - 任务确实被分配给该 worker
  - 任务状态是 "assigned"
  - 防止重复完成计数

#### 5. 中间文件清理

- 重新分配 Map 任务前，删除可能不完整的中间文件（`mr-X-Y`）
- 重新分配 Reduce 任务前，确保所有 Map 任务已完成

### 实现步骤

1. 修改 `Coordinator` 结构体：添加任务状态跟踪字段
2. 修改 `MakeCoordinator`：初始化任务状态
3. 修改 `assignMapTask`：从任务状态中分配，而不是直接从 `fileList`
4. 修改 `assignReduceTask`：从任务状态中分配
5. 修改 `TaskDone`：更新任务状态，验证任务有效性
6. 添加超时检测 goroutine：定期检查并重置超时任务
7. 添加任务清理逻辑：重新分配前清理不完整的文件

### 关键设计点

1. 超时时间：10 秒（可配置，需覆盖 crash.go 的最大延迟）
2. 并发安全：所有状态修改需加锁
3. 幂等性：任务完成可重复报告，但只计数一次
4. 文件清理：重新分配前删除可能不完整的中间文件

### 预期效果

- Worker 崩溃后，任务会在超时后自动重新分配
- 新 worker 可以接管崩溃 worker 的任务
- 系统能够从 worker 崩溃中恢复，完成所有任务
- 通过 crash test

需要我开始实现吗？
