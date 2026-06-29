---
title: '过期任务处理机制详解'
date: '2025-12-30 16:06'
categories:
  - '技术文档'
  - '开源学习'
  - 'XXL-JOB'
  - '任务过期'
  - '处理机制'
tags:
  - '开源学习'
  - 'Xxl-job'
---

# 过期任务处理机制详解

## 📋 目录
1. [过期任务识别](#过期任务识别)
2. [处理流程](#处理流程)
3. [Misfire 策略](#misfire-策略)
4. [完整流程图](#完整流程图)
5. [代码实现](#代码实现)
------
## 🔍 过期任务识别

### 判断条件

在 `JobScheduleHelper` 中，过期任务通过以下条件识别：

```java
// 过期超过5秒
if (nowTime > jobInfo.getTriggerNextTime() + PRE_READ_MS) {
    // 处理 misfire
}
```

**判断逻辑**：
- `nowTime`：当前时间
- `triggerNextTime`：任务应该执行的时间
- `PRE_READ_MS`：预读时间，固定为 5000 毫秒（5秒）

**示例**：
```
当前时间：10:30:25.500
任务执行时间：10:30:20.000
过期时间：5.5秒 > 5秒
→ 判定为过期任务，需要处理 misfire
```
------
## 🔄 处理流程

### 完整处理流程

```
过期任务处理流程：

┌─────────────────────────────────────────────────┐
│ 1. 检测到任务过期超过5秒                          │
│    nowTime > triggerNextTime + 5000             │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ 2. 获取任务的 Misfire 策略                        │
│    MisfireStrategyEnum.match(...)                │
│    默认：DO_NOTHING                               │
└─────────────────────────────────────────────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    DO_NOTHING      FIRE_ONCE_NOW      其他策略
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────┐
│ 3.1 忽略策略     │ │ 3.2 立即执行策略│ │ 默认策略 │
│ 只记录日志       │ │ 立即触发任务    │ │          │
└─────────────────┘ └─────────────────┘ └──────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────┐
│ 4. 更新下次执行时间                               │
│    refreshNextTriggerTime(jobInfo, new Date())  │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ 5. 更新数据库                                     │
│    scheduleUpdate(jobInfo)                      │
└─────────────────────────────────────────────────┘
```
------
## 🎯 Misfire 策略

### 策略类型

xxl-job 提供了两种 Misfire 策略：

#### 1. DO_NOTHING（忽略策略）- 默认策略

**策略说明**：
- 忽略过期的任务，不执行
- 只记录警告日志
- 直接更新下次执行时间

**代码实现**：
```java
public class MisfireDoNothing extends MisfireHandler {
    @Override
    public void handle(int jobId) {
        logger.warn(">>>>>>>>>>> xxl-job, schedule MisfireDoNothing: jobId = " + jobId);
        // 什么都不做，只记录日志
    }
}
```

**适用场景**：
- 定时报表任务（过期了就不需要再执行）
- 数据同步任务（下次执行时会自动同步）
- 对时效性要求不高的任务

#### 2. FIRE_ONCE_NOW（立即执行一次）

**策略说明**：
- 立即触发执行过期任务
- 触发类型为 `MISFIRE`（调度过期补偿）
- 执行后更新下次执行时间

**代码实现**：
```java
public class MisfireFireOnceNow extends MisfireHandler {
    @Override
    public void handle(int jobId) {
        // 立即触发任务，触发类型为 MISFIRE
        XxlJobAdminBootstrap.getInstance()
            .getJobTriggerPoolHelper()
            .trigger(jobId, TriggerTypeEnum.MISFIRE, -1, null, null, null);
        logger.warn(">>>>>>>>>>> xxl-job, schedule MisfireFireOnceNow: jobId = " + jobId);
    }
}
```

**适用场景**：
- 重要的业务任务（必须执行，不能遗漏）
- 数据统计任务（需要补偿执行）
- 对时效性要求高的任务
------
## 📊 完整流程图

### 过期任务处理详细流程

```
时间线：10:30:20.000 → 10:30:25.500

┌─────────────────────────────────────────────────┐
│ 10:30:20.000 - 任务A应该执行                     │
│ triggerNextTime = 10:30:20.000                  │
└─────────────────────────────────────────────────┘
         │
         │ 时间流逝（系统延迟、处理慢等）
         ▼
┌─────────────────────────────────────────────────┐
│ 10:30:25.500 - 调度线程扫描到任务A               │
│ nowTime = 10:30:25.500                          │
│ 判断：nowTime > triggerNextTime + 5000           │
│ 结果：过期 5.5 秒                                │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ 获取任务的 Misfire 策略                           │
│ jobInfo.getMisfireStrategy()                    │
└─────────────────────────────────────────────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    DO_NOTHING      FIRE_ONCE_NOW      未配置（默认）
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────┐
│ 记录警告日志     │ │ 立即触发任务    │ │ 使用默认 │
│ 不执行任务       │ │ trigger(...,   │ │ DO_NOTHING│
│                 │ │  MISFIRE)      │ │          │
└─────────────────┘ └─────────────────┘ └──────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────┐
│ 计算下次执行时间                                 │
│ refreshNextTriggerTime(jobInfo, new Date())     │
│ 基于当前时间计算下次触发时间                      │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ 更新数据库                                       │
│ scheduleUpdate(jobInfo)                         │
│ 更新 triggerNextTime 和 triggerLastTime         │
└─────────────────────────────────────────────────┘
```
------
## 💻 代码实现

### 1. 过期任务检测与处理

```java
// JobScheduleHelper.java
if (nowTime > jobInfo.getTriggerNextTime() + PRE_READ_MS) {
    // 2.1、trigger-expire > 5s：pass && make next-trigger-time
    
    // 1、misfire handle
    MisfireStrategyEnum misfireStrategyEnum = 
        MisfireStrategyEnum.match(
            jobInfo.getMisfireStrategy(), 
            MisfireStrategyEnum.DO_NOTHING  // 默认策略
        );
    misfireStrategyEnum.getMisfireHandler().handle(jobInfo.getId());
    
    // 2、fresh next
    refreshNextTriggerTime(jobInfo, new Date());
}
```

### 2. DO_NOTHING 策略实现

```java
// MisfireDoNothing.java
public class MisfireDoNothing extends MisfireHandler {
    private static final Logger logger = 
        LoggerFactory.getLogger(MisfireDoNothing.class);
    
    @Override
    public void handle(int jobId) {
        // 只记录警告日志，不执行任务
        logger.warn(">>>>>>>>>>> xxl-job, schedule MisfireDoNothing: jobId = " + jobId);
    }
}
```

### 3. FIRE_ONCE_NOW 策略实现

```java
// MisfireFireOnceNow.java
public class MisfireFireOnceNow extends MisfireHandler {
    protected static Logger logger = 
        LoggerFactory.getLogger(MisfireFireOnceNow.class);
    
    @Override
    public void handle(int jobId) {
        // 立即触发任务，触发类型为 MISFIRE
        XxlJobAdminBootstrap.getInstance()
            .getJobTriggerPoolHelper()
            .trigger(
                jobId, 
                TriggerTypeEnum.MISFIRE,  // 触发类型：调度过期补偿
                -1,                       // failRetryCount: -1 使用任务配置
                null,                     // executorShardingParam
                null,                     // executorParam
                null                      // addressList
            );
        logger.warn(">>>>>>>>>>> xxl-job, schedule MisfireFireOnceNow: jobId = " + jobId);
    }
}
```

### 4. 更新下次执行时间

```java
// JobScheduleHelper.java
private void refreshNextTriggerTime(XxlJobInfo jobInfo, Date fromTime) {
    try {
        // 根据调度类型生成下次执行时间
        ScheduleTypeEnum scheduleTypeEnum = 
            ScheduleTypeEnum.match(jobInfo.getScheduleType(), ScheduleTypeEnum.NONE);
        Date nextTriggerTime = 
            scheduleTypeEnum.getScheduleType()
                .generateNextTriggerTime(jobInfo, fromTime);
        
        if (nextTriggerTime != null) {
            // 更新下次执行时间
            jobInfo.setTriggerStatus(-1);
            jobInfo.setTriggerLastTime(jobInfo.getTriggerNextTime());
            jobInfo.setTriggerNextTime(nextTriggerTime.getTime());
        } else {
            // 生成失败，停止任务
            jobInfo.setTriggerStatus(TriggerStatus.STOPPED.getValue());
            jobInfo.setTriggerLastTime(0);
            jobInfo.setTriggerNextTime(0);
        }
    } catch (Throwable e) {
        // 生成错误，停止任务
        jobInfo.setTriggerStatus(TriggerStatus.STOPPED.getValue());
        jobInfo.setTriggerLastTime(0);
        jobInfo.setTriggerNextTime(0);
    }
}
```
------
## 🎨 策略对比

### DO_NOTHING vs FIRE_ONCE_NOW

| 对比项 | DO_NOTHING | FIRE_ONCE_NOW |
|--------|-----------|---------------|
| **执行动作** | 不执行，只记录日志 | 立即执行一次 |
| **触发类型** | 无 | MISFIRE（调度过期补偿） |
| **适用场景** | 定时报表、数据同步 | 重要业务任务 |
| **性能影响** | 无 | 会增加系统负载 |
| **数据一致性** | 可能丢失一次执行 | 保证执行 |
| **默认策略** | ✅ 是 | ❌ 否 |
------
## 📈 处理示例

### 示例1：DO_NOTHING 策略

```
场景：定时报表任务，每天凌晨执行

10:30:20.000 - 任务应该执行
10:30:25.500 - 检测到过期（系统重启导致）

处理流程：
1. 检测到过期超过5秒
2. 获取策略：DO_NOTHING
3. 记录日志：">>>>>>>>>>> xxl-job, schedule MisfireDoNothing: jobId = 1"
4. 不执行任务
5. 更新下次执行时间：明天凌晨
6. 更新数据库

结果：任务被跳过，等待下次正常执行
```

### 示例2：FIRE_ONCE_NOW 策略

```
场景：重要数据统计任务，每小时执行

10:30:20.000 - 任务应该执行
10:30:25.500 - 检测到过期（处理延迟导致）

处理流程：
1. 检测到过期超过5秒
2. 获取策略：FIRE_ONCE_NOW
3. 立即触发任务：
   trigger(jobId, TriggerTypeEnum.MISFIRE, ...)
4. 记录日志：">>>>>>>>>>> xxl-job, schedule MisfireFireOnceNow: jobId = 2"
5. 更新下次执行时间：11:30:20.000
6. 更新数据库

结果：任务立即执行，保证数据完整性
```
------
## 🔧 配置方式

### 在任务配置中设置

任务创建或编辑时，可以设置 Misfire 策略：

```java
// 任务配置
XxlJobInfo jobInfo = new XxlJobInfo();
jobInfo.setMisfireStrategy(MisfireStrategyEnum.DO_NOTHING.name());
// 或
jobInfo.setMisfireStrategy(MisfireStrategyEnum.FIRE_ONCE_NOW.name());
```

### 数据库字段

```sql
-- xxl_job_info 表
misfire_strategy VARCHAR(50)  -- 调度过期策略
-- 可选值：DO_NOTHING, FIRE_ONCE_NOW
```
------
## ⚠️ 注意事项

### 1. 过期阈值

- **固定5秒**：`PRE_READ_MS = 5000`
- 过期超过5秒才进入 misfire 处理
- 过期小于5秒会立即触发，不进入 misfire

### 2. 默认策略

- **默认策略**：`DO_NOTHING`
- 如果任务未配置策略，使用默认策略
- 建议根据业务重要性选择合适的策略

### 3. 触发类型

- **FIRE_ONCE_NOW** 策略触发时，`TriggerTypeEnum.MISFIRE`
- 在任务日志中可以区分正常触发和过期补偿触发

### 4. 时间计算

- 更新下次执行时间时，基于**当前时间**计算
- 不是基于过期时间计算，避免时间累积
------
## 📝 总结

过期任务处理机制：

1. **识别**：任务过期超过5秒时触发处理
2. **策略**：根据任务配置的 Misfire 策略处理
   - `DO_NOTHING`：忽略，只记录日志
   - `FIRE_ONCE_NOW`：立即执行一次
3. **更新**：处理完成后更新下次执行时间
4. **记录**：所有处理都会记录日志，便于排查

这种设计既保证了系统的稳定性，又提供了灵活的补偿机制，确保重要任务不会因为系统延迟而永久丢失。


