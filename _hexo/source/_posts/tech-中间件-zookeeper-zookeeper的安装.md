---
title: 'MAC-安装zookeeper'
date: '2025-09-26 10:25'
categories:
  - '中间件'
  - 'ZooKeeper'
  - '安装部署'
tags:
  - '中间件'
  - 'zookeeper'
---

# MAC-安装zookeeper

### 一、下载jar包

官网下载地址：https://dlcdn.apache.org/zookeeper/
直接最新版本

![image-20250926095848464](#local-path)

下载完成后，我放在我经常使用的tools下并[解压缩](https://so.csdn.net/so/search?q=解压缩&spm=1001.2101.3001.7020)，方便以后操作。

![image-20250926095930463](#local-path)

### 二、设置权限

注意：启动时会报错（因为data缺少文件zookeeper_server.pid，为了能通过命令停止zookeeper，经过测试是因为目录及文件权限不够，需要授权）

```bash
chmod -R 777 apache-zookeeper-3.9.4-bin
```

### 三、配置zoo.cfg

##### 1、将zoo_sample.cfg复制出来一份并重新命名为：zoo.cfg

![image-20250926095957146](#local-path)

##### 2、修改zoo.cfg的配置

不需要太多配置，仅需要配置三个属性即可，其他属性保持不变。(dataLogDir原来没有，新增的，两个目录会自动创建)

![image-20250926100038978](#local-path)

### 四、启动

启动命令：`./zkServer.sh start`
查询状态命令：`./zkServer.sh status`
停止命令：`./zkServer.sh stop`
重启命令：`./zkServer.sh restart`

在bin目录下执行./zkServer.sh start

可以看到如下输出

![image-20250926100428688](#local-path)

查看状态，./zkServer.sh status 应该是这样的



![image-20250926100515543](#local-path)

再去logs下面观察日志

![image-20250926100530978](#local-path)
