---
title: 'lsm_tree学习'
date: '2026-04-09 17:35'
categories:
  - '技术文档'
  - '数据库'
  - '存储引擎'
  - 'LSM Tree'
tags:
---

如果你现在在做 LSM/存储引擎，这些 Go 开源项目很值得重点看：

- `cockroachdb/pebble`  
  Go 生态里最成熟的 RocksDB 风格 LSM 实现之一。重点学 compaction、manifest/version set、迭代器语义和大量工程化测试。

- `dgraph-io/badger`  
  经典的 Go KV（LSM + value log）。适合学习 WAL/value log 分离、GC、事务接口和高吞吐写路径设计。

- `etcd-io/bbolt`  
  不是 LSM，而是 B+Tree；非常干净的存储实现。可以对比学习页管理、mmap、崩溃一致性和简洁 API 设计。

- `etcd-io/etcd`  
  看“存储引擎如何被生产系统使用”。重点是 Raft + WAL + snapshot + compaction 在分布式系统中的结合。

- `prometheus/tsdb`（在 `prometheus/prometheus` 里）  
  时间序列场景的分段存储与压缩。适合学 block lifecycle、索引组织、后台 compaction 和查询路径优化。

- `influxdata/influxdb`（尤其 1.x 的 TSM / 2.x IOx 思路）  
  可学写放大/读放大权衡、压缩编码、冷热数据管理、后台任务调度。
------
如果你想“直接提升你现在这个项目”，优先顺序我建议：

1. 先读 `pebble`（compaction/manifest/iterator）  
2. 再看 `badger`（写路径和 value log）  
3. 用 `etcd/bbolt` 做结构对照（另一条设计路线）

如果你愿意，我可以下一步给你整理一份**按你当前代码结构映射的阅读清单**（比如你的 `engine_compaction.go` 对应 pebble 哪几个文件最该先看）。
