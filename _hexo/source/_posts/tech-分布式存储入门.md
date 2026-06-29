---
title: '分布式存储入门'
date: '2026-03-04 17:44'
categories:
  - '技术文档'
  - '基础文档'
tags:
---

分布式存储

下面给你一个**更细致、每天都有明确产出**的 30 天分布式存储入门计划（偏 TiKV/etcd 这类分布式 KV/数据库底座）。你照着做就能稳步搭起“理论 + 实战 + 阅读真实系统”的骨架。

我把每天控制在 **60–120 分钟**左右，并且每一天都给一个**可验证的产出**（笔记/代码/实验截图/结论）。

------

## 第 1 周：打地基（存储引擎 + 系统基本功）

目标：你能解释“写入为什么快/慢、为什么会抖、为什么要 WAL/Compaction”。

### Day 1：分布式存储全景图

- 任务
  - 画一张图：Client → Router/Proxy → Shard/Region → Replicas → Storage Engine
  - 写下 10 个关键词：shard/replica/raft leader/quorum/wal/lsm/compaction/mvcc/2pc/si
- 产出：一页手绘或 markdown 图 + 10 句解释

### Day 2：磁盘与写入路径直觉

- 任务
  - 理解顺序写/随机写、page cache、fsync 的意义
  - 看一次简单 benchmark 结果（不用纠结工具，关注“fsync/不 fsync”的差异）
- 产出：你自己的结论：**为什么 WAL 要顺序写 + 为什么提交要 fsync**

### Day 3：LSM-Tree 入门

- 任务
  - 搞懂：memtable → immutable memtable → SSTable → compaction
  - 理解 Bloom Filter / block cache 的作用
- 产出：写 1 页笔记：**读放大/写放大/空间放大是什么**

### Day 4：WAL 与崩溃恢复

- 任务
  - 用自己的话解释：为什么 WAL 能恢复？checkpoint 是啥？
  - 画：写入 = append WAL → update memtable → (flush) → compaction
- 产出：一张“崩溃恢复流程”图

### Day 5：简单 KV 引擎（本地版）

- 任务
  - 写一个 toy KV（文件持久化）：
    - set/get
    - WAL 追加写
    - 启动时重放 WAL
  - 语言随你（Go/Rust/Python 都行）
- 产出：跑通 demo：kill -9 后重启仍能读到数据

### Day 6：超时、重试、幂等

- 任务
  - 理解：为什么分布式里必须有 timeout & retry
  - 区分：at-least-once / at-most-once / exactly-once（理解工程现实）
- 产出：写出 3 条“重试必须注意的坑”（比如重复写、乱序、雪崩）

### Day 7：周总结（把地基连起来）

- 任务
  - 复盘：从一次 set 到最终落盘会经过哪些层？
- 产出：一篇 500–800 字总结（你自己的理解）

------

## 第 2 周：共识算法 Raft（分布式存储的心脏）

目标：你能解释 leader 选举、日志复制、提交规则、网络分区时为何安全。

### Day 8：Raft 三个角色与状态机

- 任务：搞懂 follower/candidate/leader；term；心跳；选举超时
- 产出：画状态转换图（超时→candidate→投票→leader）

### Day 9：选举细节（为什么不会脑裂）

- 任务：理解“多数派”与“同一 term 最多一个 leader”的直觉
- 产出：写 5 句话解释：**多数派为什么能避免双 leader 持久存在**

### Day 10：日志复制（AppendEntries）

- 任务：理解 prevLogIndex/prevLogTerm、冲突回退、日志对齐
- 产出：手动模拟一次冲突修复：Follower 日志比 Leader 长/短怎么办

### Day 11：提交规则（commitIndex）

- 任务：理解“已提交日志 = 多数派复制 + leader 规则”
- 产出：用例子解释：为什么“复制到多数派”才算提交

### Day 12：快照与 log compaction

- 任务：理解为什么必须 snapshot（否则日志无限长）
- 产出：写出 snapshot 安装的大致流程（leader 发送快照 → follower 替换状态）

### Day 13：实现迷你 Raft（极简版）

- 任务：写一个极简 raft（可以只做内存日志）：
  - 3 节点
  - 选举 + 心跳
- 产出：日志打印：谁当 leader、term 如何变化

### Day 14：扩展迷你 Raft（加日志复制）

- 任务
  - 增加 set 命令走 leader → replicate → majority → apply
- 产出：演示：kill leader，集群恢复后仍然能继续写（可能会丢未提交写，这是预期）

------

## 第 3 周：分片/调度/迁移（规模化的关键）

目标：你能解释“为什么需要 PD/调度器”，以及扩缩容为什么难。

### Day 15：分片模型（range vs hash）

- 任务：对比两种分片方式的优缺点
- 产出：表格：range/hash 在 scan、热点、迁移上的差异

### Day 16：一致性哈希与重平衡

- 任务：实现一致性哈希路由（toy）
- 产出：演示：加节点前后 key 的迁移比例

### Day 17：range 分片与 split

- 任务：理解 range 分片如何做 split（按 key 范围切）
- 产出：写一个 split 策略：达到阈值就切成两个 shard

### Day 18：副本放置与容灾

- 任务：理解“同一个 shard 的 3 副本不能在同机架/同 AZ”
- 产出：写一个放置规则（constraints）例子：zone-aware

### Day 19：调度器（像 PD 那样思考）

- 任务：理解调度目标：
  - 均衡容量
  - 均衡热点
  - 修复副本
- 产出：写一个“调度决策伪代码”：发现某节点过载 → 迁移某 shard 副本

### Day 20：迁移与一致性（难点）

- 任务：理解迁移时读写怎么不中断：
  - 双写 / 重定向 / epoch 版本
- 产出：写一段文字解释：**为什么迁移需要版本号/epoch 防止旧路由写入**

### Day 21：周总结：一个请求从路由到落盘

- 任务：把“路由→分片→raft→落盘→返回”串起来
- 产出：一张时序图（sequence diagram）

------

## 第 4 周：事务与真实系统（以 TiKV/etcd 为主）

目标：你能解释 MVCC、SI、2PC，以及能读懂 TiKV/etcd 的关键模块职责。

### Day 22：MVCC 基础（版本链）

- 任务：理解：同一个 key 多个版本 + 时间戳（start_ts/commit_ts）
- 产出：手写一个版本链例子：T1/T2 并发读写会看到什么

### Day 23：Snapshot Isolation（SI）

- 任务：理解 SI 保证与不保证（比如 write skew 可能出现）
- 产出：举一个 SI 下可能异常的例子（写偏斜）

### Day 24：锁与 SELECT FOR UPDATE

- 任务：理解为什么要“锁读”：避免别人并发改
- 产出：说明：什么时候用乐观（不加锁）什么时候要悲观（加锁）

### Day 25：2PC（两阶段提交）+ 故障场景

- 任务：理解 prepare/commit 两阶段，协调者挂了怎么办
- 产出：列出 3 种故障：leader 挂/网络分区/重复 commit 请求，系统如何处理

### Day 26：Percolator 风格事务（贴近 TiKV）

- 任务：理解 primary lock / secondary lock / async commit（知道概念即可）
- 产出：写一张“写事务流程图”

### Day 27：读 TiKV 架构（不进细节源码）

- 任务：读官方架构介绍，搞清模块：
  - Raftstore（复制与 region）
  - Storage（MVCC/事务）
  - PD（调度/分片）
- 产出：一页“模块职责图”

### Day 28：跑一个 TiKV/TiDB 或 etcd 实验（选一）

- 任务（建议）
  - 3 节点部署（docker/k8s 都行）
  - 做：写入、kill leader、观察恢复
- 产出：记录现象：leader 变化、写入是否中断、恢复耗时大概受什么影响

### Day 29：性能视角（必懂的指标）

- 任务：理解并能解释：
  - p99 延迟
  - compaction 触发带来的抖动
  - raft 日志积压
  - 热点 region
- 产出：写“排查 checklist”：慢是 CPU/IO/网络/锁/raft 哪类？

### Day 30：最终整合：写一篇“我理解的分布式存储”

- 任务：用你自己的语言写：
  - 复制一致性怎么做（raft）
  - 数据怎么切（shard/region + split）
  - 数据怎么搬（PD 调度）
  - 事务怎么做（MVCC + SI + 2PC）
- 产出：1500–2500 字总结 + 2 张图（架构图 + 时序图）

------

## 你可以怎么执行得更顺（很关键）

- 每天只抓一个主题，**不要发散**。
- 每天的产出尽量“可运行/可画图/可复现”，别只看不写。
- 你如果愿意写代码，我建议：
  - **Go**：生态多，做分布式 demo 很快
  - **Rust**：贴近 TiKV，但门槛高一点

------

如果你告诉我两点：

1. 你想重点走 **TiKV/TiDB（事务型）** 还是 **Ceph/S3（对象/文件）**？
2. 你更熟的语言（Go/Rust/Java/Python）？

我可以把上面计划里“Day 5、13–14、16–17、22–26”的代码任务，改成**你语言的具体项目结构 + 关键接口**（直接开写那种）。
