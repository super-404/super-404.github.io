---
title: 'redis的使用经验'
date: '2023-09-30 20:19'
categories: 'redis'
tags:
  - 'redis'
---

<p>Redis功能强大，数据类型丰富，再快的系统，也经不住疯狂的滥用。通过禁用部分高风险功能，并挂上开发的枷锁，业务更能够以简洁、通用的思想去考虑问题，而不是绑定在某种实现上。</p>
<h2 id="使用规范"><a href="#使用规范" class="headerlink" title="使用规范"></a>使用规范</h2><h3 id="冷热数据区分"><a href="#冷热数据区分" class="headerlink" title="冷热数据区分"></a>冷热数据区分</h3><p>虽然 Redis支持持久化，但将所有数据存储在 Redis 中，成本非常昂贵。建议将热数据 (如 QPS超过 5k) 的数据加载到 Redis 中。低频数据可存储在 Mysql、 ElasticSearch中。</p>
<h3 id="业务数据分离"><a href="#业务数据分离" class="headerlink" title="业务数据分离"></a>业务数据分离</h3><p>不要将不相关的数据业务都放到一个 Redis中。一方面避免业务相互影响，另一方面避免单实例膨胀，并能在故障时降低影响面，快速恢复。</p>
<h3 id="消息大小限制"><a href="#消息大小限制" class="headerlink" title="消息大小限制"></a>消息大小限制</h3><p>由于 Redis 是单线程服务，消息过大会阻塞并拖慢其他操作。保持消息内容在 1KB 以下是个好的习惯。严禁超过 50KB 的单条记录。消息过大还会引起网络带宽的高占用，持久化到磁盘时的 IO 问题</p>
<h3 id="连接数限制"><a href="#连接数限制" class="headerlink" title="连接数限制"></a>连接数限制</h3><p>连接的频繁创建和销毁，会浪费大量的系统资源，极限情况会造成宿主机宕机。请确保使用了正确的 Redis 客户端连接池配置。</p>
<h3 id="缓存-Key-设置失效时间"><a href="#缓存-Key-设置失效时间" class="headerlink" title="缓存 Key 设置失效时间"></a>缓存 Key 设置失效时间</h3><p>作为缓存使用的 Key，必须要设置失效时间。失效时间并不是越长越好，请根据业务性质进行设置。注意，失效时间的单位有的是秒，有的是毫秒，这个很多同学不注意容易搞错。</p>
<h3 id="缓存不能有中间态"><a href="#缓存不能有中间态" class="headerlink" title="缓存不能有中间态"></a>缓存不能有中间态</h3><p>缓存应该仅作缓存用，去掉后业务逻辑不应发生改变，万不可切入到业务里。</p>
<p>第一，缓存的高可用会影响业务；</p>
<p>第二，产生深耦合会发生无法预料的效果；</p>
<p>第三，会对维护产生负面效果。</p>
<h3 id="扩展方式首选客户端-hash"><a href="#扩展方式首选客户端-hash" class="headerlink" title="扩展方式首选客户端 hash"></a>扩展方式首选客户端 hash</h3><p>如单 redis 集群并不能为你的数据服务，不要着急扩大你的 redis 集群（包括 M&#x2F;S 和 Cluster)，集群越大，在状态同步和持久化方面的性能越差。优先使用客户端 hash 进行集群拆分。如：根据用户 id 分 10 个集群，用户尾号为 0 的落在第一个集群。</p>
<h2 id="操作限制"><a href="#操作限制" class="headerlink" title="操作限制"></a>操作限制</h2><h3 id="严禁使用-Keys"><a href="#严禁使用-Keys" class="headerlink" title="严禁使用 Keys"></a>严禁使用 Keys</h3><p>Keys 命令效率极低，属于 O(N)操作，会阻塞其他正常命令，在 cluster 上，会是灾难性的操作。严禁使用，DBA 应该 rename 此命令，从根源禁用。</p>
<h3 id="严禁使用-Flush"><a href="#严禁使用-Flush" class="headerlink" title="严禁使用 Flush"></a>严禁使用 Flush</h3><p>flush 命令会清空所有数据，属于高危操作。严禁使用，DBA 应该 rename 此命令，从根源禁用，仅 DBA 可操作。</p>
<h3 id="严禁作为消息队列使用"><a href="#严禁作为消息队列使用" class="headerlink" title="严禁作为消息队列使用"></a>严禁作为消息队列使用</h3><p>如没有非常特殊的需求，严禁将 Redis 当作消息队列使用。Redis 当作消息队列使用，会有容量、网络、效率、功能方面的多种问题。如需要消息队列，可使用高吞吐的 Kafka 或者高可靠的 RocketMQ。</p>
<h3 id="严禁不设置范围的批量操作"><a href="#严禁不设置范围的批量操作" class="headerlink" title="严禁不设置范围的批量操作"></a>严禁不设置范围的批量操作</h3><p>redis 那么快，慢查询除了网络延迟，就属于这些批量操作函数。大多数线上问题都是由于这些函数引起。</p>
<h4 id="1、-zset-严禁对-zset-的不设范围操作"><a href="#1、-zset-严禁对-zset-的不设范围操作" class="headerlink" title="1、[zset] 严禁对 zset 的不设范围操作"></a>1、[zset] 严禁对 zset 的不设范围操作</h4><p>ZRANGE、 ZRANGEBYSCORE等多个操作 ZSET 的函数，严禁使用 ZRANGE myzset 0 -1 等这种不设置范围的操作。请指定范围，如 ZRANGE myzset 0 100。如不确定长度，可使用 ZCARD 判断长度</p>
<h4 id="2、-hash-严禁对大数据量-Key-使用-HGETALL"><a href="#2、-hash-严禁对大数据量-Key-使用-HGETALL" class="headerlink" title="2、[hash] 严禁对大数据量 Key 使用 HGETALL"></a>2、[hash] 严禁对大数据量 Key 使用 HGETALL</h4><p>HGETALL会取出相关 HASH 的所有数据，如果数据条数过大，同样会引起阻塞，请确保业务可控。如不确定长度，可使用 HLEN 先判断长度</p>
<h4 id="3、-key-Redis-Cluster-集群的-mget-操作"><a href="#3、-key-Redis-Cluster-集群的-mget-操作" class="headerlink" title="3、[key] Redis Cluster 集群的 mget 操作"></a>3、[key] Redis Cluster 集群的 mget 操作</h4><p>Redis Cluster 的 MGET 操作，会到各分片取数据聚合，相比传统的 M&#x2F;S架构，性能会下降很多，请提前压测和评估</p>
<h4 id="4、-其他-严禁使用-sunion-sinter-sdiff等一些聚合操作"><a href="#4、-其他-严禁使用-sunion-sinter-sdiff等一些聚合操作" class="headerlink" title="4、[其他] 严禁使用 sunion, sinter, sdiff等一些聚合操作"></a>4、[其他] 严禁使用 sunion, sinter, sdiff等一些聚合操作</h4><h3 id="禁用-select-函数"><a href="#禁用-select-函数" class="headerlink" title="禁用 select 函数"></a>禁用 select 函数</h3><p>select函数用来切换 database，对于使用方来说，这是很容易发生问题的地方，cluster 模式也不支持多个 database，且没有任何收益，禁用。</p>
<h3 id="禁用事务"><a href="#禁用事务" class="headerlink" title="禁用事务"></a>禁用事务</h3><p>redis 本身已经很快了，如无大的必要，建议捕获异常进行回滚，不要使用事务函数，很少有人这么干。</p>
<h3 id="禁用-lua-脚本扩展"><a href="#禁用-lua-脚本扩展" class="headerlink" title="禁用 lua 脚本扩展"></a>禁用 lua 脚本扩展</h3><p>lua 脚本虽然能做很多看起来很 cool 的事情，但它就像是 SQL 的存储过程，会引入性能和一些难以维护的问题，禁用。</p>
<h3 id="禁止长时间-monitor"><a href="#禁止长时间-monitor" class="headerlink" title="禁止长时间 monitor"></a>禁止长时间 monitor</h3><p>monitor函数可以快速看到当前 redis 正在执行的数据流，但是当心，高峰期长时间阻塞在 monitor 命令上，会严重影响 redis 的性能。此命令不禁止使用，但使用一定要特别特别注意。</p>
<h2 id="Key-规范"><a href="#Key-规范" class="headerlink" title="Key 规范"></a>Key 规范</h2><p>Redis 的 Key 一定要规范，这样在遇到问题时，能够进行方便的定位。Redis 属于无 scheme 的 KV 数据库，所以，我们靠约定来建立其 scheme 语义。其好处：</p>
<p>1、能够根据某类 key 进行数据清理</p>
<p>2、能够根据某类 key 进行数据更新</p>
<p>3、能够方便了解到某类 key 的归属方和应用场景</p>
<p>4、为统一化、平台化做准备，减少技术变更</p>
<p>一般，一个 key 需要带以下维度：业务、key 用途、变量等，各个维度使用 : 进行分隔，以下是几个 key 的实例:<strong>user:sex 用户 10002232 的性别 msg:achi 201712 的用户发言数量排行榜</strong></p>
