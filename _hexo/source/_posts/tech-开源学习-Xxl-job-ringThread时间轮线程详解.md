---
title: 'ringThread 时间轮线程详解'
date: '2025-12-30 16:28'
categories:
  - '技术文档'
  - '开源学习'
  - 'XXL-JOB'
  - '调度源码'
  - '时间轮'
tags:
  - '开源学习'
  - 'Xxl-job'
---

# ringThread 时间轮线程详解

## 📋 目录
1. [核心职责](#核心职责)
2. [工作流程](#工作流程)
3. [关键步骤详解](#关键步骤详解)
4. [容错机制](#容错机制)
5. [代码解析](#代码解析)
------
## 🎯 核心职责

`ringThread` 是时间轮线程，主要负责：

1. **精确触发**：在精确的秒级时间点触发任务
2. **时间对齐**：对齐到整秒，保证触发时间的精确性
3. **批量处理**：从时间轮中取出任务并批量触发
4. **容错处理**：向前校验，避免遗漏任务
------
## 🔄 工作流程

### 完整流程图

```
ringThread 工作流程：

开始
  │
  ▼
对齐到整秒（sleep到下一个整秒）
  │
  ▼
获取当前秒数（0-59）
  │
  ▼
┌─────────────────────────────────┐
│  收集时间轮数据                  │
│  - 当前秒的任务                  │
│  - 前1秒的任务（避免遗漏）        │
│  - 前2秒的任务（避免遗漏）        │
└─────────────────────────────────┘
  │
  ▼
去重处理（避免重复触发）
  │
  ▼
批量触发任务
  │
  ▼
清空已处理的数据
  │
  ▼
等待到下一个整秒
  │
  ▼
循环
```
------
## 🔍 关键步骤详解

### 步骤1：对齐到整秒

```java
// align second
TimeUnit.MILLISECONDS.sleep(1000 - System.currentTimeMillis() % 1000);
```

**作用**：
- 确保在整秒时刻触发任务
- 例如：10:30:25.500 → sleep 500ms → 10:30:26.000

**示例**：
```
当前时间：10:30:25.350
计算：1000 - 350 = 650ms
sleep 650ms
结果：10:30:26.000（精确到整秒）
```

### 步骤2：获取当前秒数

```java
int nowSecond = Calendar.getInstance().get(Calendar.SECOND);
```

**作用**：
- 获取当前时间的秒数（0-59）
- 用于从时间轮中取出对应秒数的任务

### 步骤3：收集时间轮数据（核心逻辑）

```java
for (int i = 0; i <= 2; i++) {
    List<Integer> ringItemList = ringData.remove((nowSecond + 60 - i) % 60);
    if (CollectionTool.isNotEmpty(ringItemList)) {
        // 去重
        List<Integer> ringItemListDistinct = ringItemList.stream().distinct().toList();
        // 收集
        ringItemData.addAll(ringItemListDistinct);
    }
}
```

**收集范围**：
- `i=0`：当前秒（nowSecond）
- `i=1`：前1秒（nowSecond-1）
- `i=2`：前2秒（nowSecond-2）

**为什么收集前2秒？**
- 避免处理耗时导致遗漏
- 如果处理耗时超过1秒，可能跨过刻度

**示例**：
```
当前秒数：30
收集范围：
- i=0: (30+60-0)%60 = 30秒
- i=1: (30+60-1)%60 = 29秒
- i=2: (30+60-2)%60 = 28秒

从时间轮中取出：
ringData.remove(30) → [1, 2, 3]
ringData.remove(29) → [4, 5]
ringData.remove(28) → [6]

合并：ringItemData = [1, 2, 3, 4, 5, 6]
```

### 步骤4：去重处理

```java
List<Integer> ringItemListDistinct = ringItemList.stream().distinct().toList();
if (ringItemListDistinct.size() < ringItemList.size()) {
    logger.warn(">>>>>>>>>>> xxl-job, time-ring found job repeat beat : " + nowSecond + " = " + ringItemData);
}
```

**作用**：
- 避免重复触发同一个任务
- 如果发现重复，记录警告日志

**为什么会有重复？**
- scheduleThread 可能多次推送同一个任务到时间轮
- 例如：任务在边界时间，可能被多次放入

### 步骤5：批量触发任务

```java
if (CollectionTool.isNotEmpty(ringItemData)) {
    for (int jobId: ringItemData) {
        XxlJobAdminBootstrap.getInstance()
            .getJobTriggerPoolHelper()
            .trigger(jobId, TriggerTypeEnum.CRON, -1, null, null, null);
    }
    ringItemData.clear();
}
```

**作用**：
- 批量触发收集到的任务
- 触发类型：CRON（正常调度）
- 清空已处理的数据
------
## 🛡️ 容错机制

### 1. 向前校验2秒

**原因**：
```
场景：处理耗时导致遗漏

10:30:25.000 - 应该触发任务A
10:30:25.500 - ringThread 开始处理第25秒的任务
10:30:26.000 - 处理完成，但耗时0.5秒
10:30:26.000 - 开始处理第26秒的任务
              - 但第25秒的任务可能还没处理完

解决方案：向前校验2秒
- 在10:30:26.000时，不仅处理第26秒的任务
- 还处理第25秒和第24秒的任务
- 确保不会遗漏
```

### 2. 去重处理

**原因**：
```
场景：重复推送导致重复触发

10:30:25.000 - scheduleThread 推送任务A到第25秒
10:30:25.500 - scheduleThread 再次推送任务A到第25秒（边界情况）

解决方案：去重
- 使用 distinct() 去重
- 确保同一个任务只触发一次
```

### 3. 时间对齐

**原因**：
```
场景：时间不精确导致触发时间偏差

10:30:25.350 - 如果不对齐，可能在这个时间触发
10:30:25.500 - 或者在这个时间触发

解决方案：对齐到整秒
- sleep到下一个整秒
- 确保在精确的整秒时刻触发
```
------
## 💻 代码解析

### 完整代码

```java
// ring thread
ringThread = new Thread(new Runnable() {
    @Override
    public void run() {
        while (!ringThreadToStop) {
            
            // 1. 对齐到整秒
            try {
                TimeUnit.MILLISECONDS.sleep(1000 - System.currentTimeMillis() % 1000);
            } catch (Throwable e) {
                if (!ringThreadToStop) {
                    logger.error(e.getMessage(), e);
                }
            }
            
            try {
                // 2. 初始化收集列表
                List<Integer> ringItemData = new ArrayList<>();
                
                // 3. 获取当前秒数
                int nowSecond = Calendar.getInstance().get(Calendar.SECOND);
                
                // 4. 收集时间轮数据（当前秒及前2秒）
                for (int i = 0; i <= 2; i++) {
                    List<Integer> ringItemList = ringData.remove((nowSecond + 60 - i) % 60);
                    if (CollectionTool.isNotEmpty(ringItemList)) {
                        // 5. 去重
                        List<Integer> ringItemListDistinct = 
                            ringItemList.stream().distinct().toList();
                        if (ringItemListDistinct.size() < ringItemList.size()) {
                            logger.warn(">>>>>>>>>>> xxl-job, time-ring found job repeat beat : " 
                                + nowSecond + " = " + ringItemData);
                        }
                        // 6. 收集
                        ringItemData.addAll(ringItemListDistinct);
                    }
                }
                
                // 7. 批量触发
                logger.debug(">>>>>>>>>>> xxl-job, time-ring beat : " + nowSecond + " = " + ringItemData);
                if (CollectionTool.isNotEmpty(ringItemData)) {
                    for (int jobId: ringItemData) {
                        XxlJobAdminBootstrap.getInstance()
                            .getJobTriggerPoolHelper()
                            .trigger(jobId, TriggerTypeEnum.CRON, -1, null, null, null);
                    }
                    ringItemData.clear();
                }
            } catch (Throwable e) {
                if (!ringThreadToStop) {
                    logger.error(">>>>>>>>>>> xxl-job, JobScheduleHelper#ringThread error:{}", 
                        e.getMessage(), e);
                }
            }
        }
        logger.info(">>>>>>>>>>> xxl-job, JobScheduleHelper#ringThread stop");
    }
});
```
------
## 📊 时间线示例

### 完整执行流程

```
时间：10:30:25.350 → 10:30:26.000 → 10:30:27.000

10:30:25.350 - ringThread 开始执行
              │
              ▼
10:30:25.350 - 计算 sleep 时间
              sleep(1000 - 350) = sleep(650ms)
              │
              ▼
10:30:26.000 - 对齐到整秒
              │
              ▼
10:30:26.000 - 获取当前秒数：26
              │
              ▼
10:30:26.000 - 收集时间轮数据
              - 第26秒：[1, 2, 3]
              - 第25秒：[4, 5]
              - 第24秒：[6]
              │
              ▼
10:30:26.000 - 去重处理
              ringItemData = [1, 2, 3, 4, 5, 6]
              │
              ▼
10:30:26.000 - 批量触发
              trigger(1, CRON, ...)
              trigger(2, CRON, ...)
              trigger(3, CRON, ...)
              trigger(4, CRON, ...)
              trigger(5, CRON, ...)
              trigger(6, CRON, ...)
              │
              ▼
10:30:26.000 - 清空数据
              ringItemData.clear()
              │
              ▼
10:30:26.000 - 等待下一个整秒
              sleep(1000 - 0) = sleep(1000ms)
              │
              ▼
10:30:27.000 - 下一轮循环
```
------
## 🎨 设计亮点

### 1. 精确触发

- **对齐到整秒**：确保在精确的整秒时刻触发
- **秒级精度**：时间轮精确到秒，满足大部分调度需求

### 2. 容错机制

- **向前校验2秒**：避免处理耗时导致遗漏
- **去重处理**：避免重复触发
- **异常处理**：捕获异常，不影响后续执行

### 3. 高效处理

- **批量触发**：一次处理多个任务
- **O(1) 取任务**：从时间轮中取任务时间复杂度为 O(1)
- **内存清理**：处理完立即清空，避免内存泄漏

### 4. 解耦设计

- **生产者-消费者**：scheduleThread 生产，ringThread 消费
- **时间轮缓冲**：作为缓冲区，解耦扫描和触发
------
## 🔄 与 scheduleThread 的配合

### 协作流程

```
scheduleThread (生产者)          ringData (时间轮)          ringThread (消费者)
     │                              │                          │
     │ 扫描任务                      │                          │
     │ 发现任务A在26秒执行            │                          │
     │                              │                          │
     │──────────────────────────────>│                          │
     │ pushTimeRing(26, A)          │ [26: [A]]               │
     │                              │                          │
     │                              │                          │ 10:30:26.000
     │                              │                          │ 对齐到整秒
     │                              │                          │
     │                              │<─────────────────────────│
     │                              │ remove(26, 25, 24)      │
     │                              │                          │
     │                              │                          │ 触发任务A
     │                              │                          │
```
------
## 📝 关键代码片段解析

### 1. 时间对齐

```java
TimeUnit.MILLISECONDS.sleep(1000 - System.currentTimeMillis() % 1000);
```

**计算逻辑**：
```
当前时间：10:30:25.350
System.currentTimeMillis() % 1000 = 350
sleep(1000 - 350) = sleep(650ms)
结果：10:30:26.000
```

### 2. 收集时间轮数据

```java
for (int i = 0; i <= 2; i++) {
    List<Integer> ringItemList = ringData.remove((nowSecond + 60 - i) % 60);
    // ...
}
```

**取模运算**：
```
nowSecond = 30
i=0: (30+60-0)%60 = 30
i=1: (30+60-1)%60 = 29
i=2: (30+60-2)%60 = 28

nowSecond = 1
i=0: (1+60-0)%60 = 1
i=1: (1+60-1)%60 = 0
i=2: (1+60-2)%60 = 59  ← 处理跨分钟的情况
```

### 3. 去重处理

```java
List<Integer> ringItemListDistinct = ringItemList.stream().distinct().toList();
```

**示例**：
```
原始列表：[1, 2, 2, 3, 3, 3]
去重后：[1, 2, 3]
```
------
## ⚠️ 注意事项

### 1. 时间对齐的重要性

- **必须对齐**：不对齐会导致触发时间不精确
- **影响调度**：时间偏差会影响任务的执行时间

### 2. 向前校验的必要性

- **避免遗漏**：处理耗时可能导致遗漏
- **校验范围**：向前校验2秒，平衡性能和准确性

### 3. 去重的重要性

- **避免重复**：重复触发可能导致业务问题
- **性能影响**：重复触发会增加系统负载
------
## 📝 总结

`ringThread` 主要做了以下几件事：

1. ✅ **时间对齐**：对齐到整秒，保证触发时间的精确性
2. ✅ **数据收集**：从时间轮中收集当前秒及前2秒的任务
3. ✅ **去重处理**：避免重复触发同一个任务
4. ✅ **批量触发**：批量触发收集到的任务
5. ✅ **容错处理**：向前校验，避免遗漏任务

`ringThread` 是时间轮机制的核心，负责精确触发任务，与 `scheduleThread` 配合实现了高效、精确的任务调度。


