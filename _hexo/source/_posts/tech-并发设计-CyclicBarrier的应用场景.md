---
title: 'CyclicBarrier的应用场景'
date: '2025-09-09 18:00'
categories:
  - '技术文档'
  - '并发设计'
tags:
  - '并发设计'
---

好的，我将为前面提到的几个应用场景提供相应的 Java 代码示例。
------
### 场景一：多线程数据计算与最终结果合并

**代码示例：计算大数组总和**

```java
import java.util.Arrays;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CyclicBarrier;

public class ArraySumCalculator {

    private final int[] array;
    private final int numOfThreads;
    private final int segmentSize;
    private final long[] partialSums;
    private final CyclicBarrier barrier;
    private long totalSum;

    public ArraySumCalculator(int[] array, int numOfThreads) {
        this.array = array;
        this.numOfThreads = numOfThreads;
        this.segmentSize = (int) Math.ceil((double) array.length / numOfThreads);
        this.partialSums = new long[numOfThreads];
        // 屏障点动作：汇总所有部分和
        this.barrier = new CyclicBarrier(numOfThreads, this::sumPartialSums);
    }

    public long calculateSum() throws InterruptedException {
        Thread[] threads = new Thread[numOfThreads];

        // 创建并启动工作线程
        for (int i = 0; i < numOfThreads; i++) {
            final int threadIndex = i;
            int start = threadIndex * segmentSize;
            int end = Math.min(start + segmentSize, array.length);
            
            threads[i] = new Thread(() -> {
                long sum = 0;
                for (int j = start; j < end; j++) {
                    sum += array[j];
                }
                partialSums[threadIndex] = sum; // 存储部分和
                
                try {
                    System.out.println(Thread.currentThread().getName() + " 计算完成，等待其他线程...");
                    barrier.await(); // 等待所有线程完成计算
                } catch (InterruptedException | BrokenBarrierException e) {
                    Thread.currentThread().interrupt();
                }
            });
            threads[i].start();
        }

        // 等待所有线程结束
        for (Thread thread : threads) {
            thread.join();
        }

        return totalSum;
    }

    // 屏障点到达后执行的回调方法（由最后一个到达屏障的线程执行）
    private void sumPartialSums() {
        System.out.println("所有线程计算完成，开始汇总...");
        totalSum = Arrays.stream(partialSums).sum();
        System.out.println("汇总完成，总和: " + totalSum);
    }

    public static void main(String[] args) throws InterruptedException {
        // 创建一个大型数组
        int[] largeArray = new int[10000];
        Arrays.fill(largeArray, 1); // 填充为1，总和应为10000

        ArraySumCalculator calculator = new ArraySumCalculator(largeArray, 4);
        long result = calculator.calculateSum();
        
        System.out.println("最终结果: " + result);
    }
}
```
------
### 场景二：分布式测试或模拟（压力测试）

**代码示例：模拟用户并发登录**

```java
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.TimeUnit;

public class StressTester {

    private static class User implements Runnable {
        private final int userId;
        private final CyclicBarrier barrier;

        public User(int userId, CyclicBarrier barrier) {
            this.userId = userId;
            this.barrier = barrier;
        }

        @Override
        public void run() {
            try {
                // 模拟准备工作（建立连接、组装数据等）
                System.out.println("用户 " + userId + " 正在准备请求数据...");
                Thread.sleep((long) (Math.random() * 1000));
                
                System.out.println("用户 " + userId + " 准备就绪，等待其他用户...");
                barrier.await(); // 等待所有用户准备就绪
                
                // 所有用户同时发送请求
                System.out.println("用户 " + userId + " 开始发送登录请求! 时间: " + System.currentTimeMillis());
                // 这里实际调用登录API
                login(userId);
                
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        private void login(int userId) {
            // 模拟登录逻辑
            try {
                TimeUnit.MILLISECONDS.sleep(100); // 模拟网络请求耗时
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    public static void main(String[] args) {
        final int userCount = 5;
        CyclicBarrier barrier = new CyclicBarrier(userCount, () -> {
            System.out.println("\n=== 所有用户准备就绪，开始并发请求 ===\n");
        });

        System.out.println("开始模拟 " + userCount + " 个用户并发登录...");
        
        for (int i = 1; i <= userCount; i++) {
            new Thread(new User(i, barrier)).start();
        }
    }
}
```
------
### 场景三：游戏服务器中多个玩家的同步

**代码示例：多玩家游戏房间**

```java
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.TimeUnit;

public class GameRoom {

    private static class Player implements Runnable {
        private final String playerName;
        private final CyclicBarrier barrier;

        public Player(String playerName, CyclicBarrier barrier) {
            this.playerName = playerName;
            this.barrier = barrier;
        }

        @Override
        public void run() {
            try {
                // 模拟加载资源
                System.out.println(playerName + " 正在加载游戏资源...");
                TimeUnit.SECONDS.sleep((long) (Math.random() * 3 + 1));
                
                System.out.println(playerName + " 资源加载完成！");
                barrier.await(); // 等待其他玩家
                
                // 游戏开始后的逻辑
                System.out.println(playerName + ": 游戏开始！");
                
            } catch (Exception e) {
                System.out.println(playerName + " 加载失败: " + e.getMessage());
            }
        }
    }

    public static void main(String[] args) {
        final int playersNeeded = 4;
        String[] playerNames = {"Alice", "Bob", "Charlie", "David"};
        
        CyclicBarrier barrier = new CyclicBarrier(playersNeeded, () -> {
            System.out.println("\n🎮 所有玩家已准备就绪，游戏开始！\n");
        });

        System.out.println("等待 " + playersNeeded + " 名玩家加入游戏...");
        
        for (String name : playerNames) {
            new Thread(new Player(name, barrier)).start();
        }
    }
}
```
------
### 场景四：批量操作数据库或API

**代码示例：并行获取页面数据**

```java
import java.util.concurrent.*;

public class ParallelDataFetcher {

    private static class DataFetcher implements Runnable {
        private final String dataType;
        private final String result;
        private final CyclicBarrier barrier;

        public DataFetcher(String dataType, CyclicBarrier barrier) {
            this.dataType = dataType;
            this.barrier = barrier;
            this.result = null;
        }

        @Override
        public void run() {
            try {
                // 模拟调用不同的API或查询数据库
                System.out.println("开始获取 " + dataType + " 数据...");
                TimeUnit.MILLISECONDS.sleep((long) (Math.random() * 1000 + 500));
                
                String simulatedResult = dataType + "_Data"; // 模拟返回数据
                System.out.println(dataType + " 数据获取完成");
                
                barrier.await(); // 等待其他数据源
                
            } catch (InterruptedException | BrokenBarrierException e) {
                System.out.println("获取 " + dataType + " 数据时出错: " + e.getMessage());
                Thread.currentThread().interrupt();
            }
        }
    }

    public static void main(String[] args) {
        String[] dataSources = {"用户信息", "订单列表", "推荐商品"};
        CyclicBarrier barrier = new CyclicBarrier(dataSources.length, () -> {
            System.out.println("\n=== 所有数据获取完成，开始组装页面 ===");
            // 这里实际进行数据组装逻辑
            System.out.println("页面组装完成，返回给前端");
        });

        System.out.println("开始并行获取页面数据...");
        
        ExecutorService executor = Executors.newFixedThreadPool(dataSources.length);
        for (String source : dataSources) {
            executor.execute(new DataFetcher(source, barrier));
        }
        
        executor.shutdown();
        try {
            executor.awaitTermination(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

### 关键点说明：

1. **`barrier.await()`**: 每个工作线程在完成自己的任务后调用此方法等待。
2. **屏障动作**: 在构造函数中传入的 Runnable，会在所有线程到达屏障点时**由最后一个到达屏障的线程执行**。
3. **异常处理**: `await()` 方法会抛出 `BrokenBarrierException` 和 `InterruptedException`，需要妥善处理。
4. **重置功能**: 这些示例中虽然没有显式重置屏障，但 CyclicBarrier 可以在屏障被打破后通过 `reset()` 方法重置使用。
5. **超时机制**: `await(long timeout, TimeUnit unit)` 可以设置超时时间，防止线程无限期等待。

这些代码示例展示了 CyclicBarrier 在不同场景下的实际应用方式，你可以根据具体需求进行调整和扩展。
