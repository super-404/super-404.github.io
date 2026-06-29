---
title: '实现一个简化的 CompletableFuture'
date: '2025-09-05 10:48'
categories:
  - '技术文档'
  - '并发设计'
tags:
  - '并发设计'
---

# 实现一个简化的 CompletableFuture

下面我将展示如何实现一个简化版的 CompletableFuture，帮助你理解其核心原理。

## 核心接口定义

```java
public interface MyFuture<V> {
    V get() throws InterruptedException, ExecutionException;
    V get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException;
    boolean isDone();
    boolean cancel(boolean mayInterruptIfRunning);
    boolean isCancelled();
}

public interface MyCompletionStage<V> {
    <U> MyCompletionStage<U> thenApply(Function<V, U> fn);
    <U> MyCompletionStage<U> thenApplyAsync(Function<V, U> fn);
    MyCompletionStage<V> thenAccept(Consumer<V> action);
    MyCompletionStage<Void> thenRun(Runnable action);
    <U> MyCompletionStage<U> thenCompose(Function<V, MyCompletionStage<U>> fn);
}
```

## 核心实现类

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.function.Function;

public class MyCompletableFuture<V> implements MyFuture<V>, MyCompletionStage<V> {
    
    // 状态常量
    private static final int NEW = 0;
    private static final int COMPLETING = 1;
    private static final int NORMAL = 2;
    private static final int EXCEPTIONAL = 3;
    private static final int CANCELLED = 4;
    
    // 当前结果和状态
    private volatile Object result;
    private volatile int state = NEW;
    
    // 等待的线程栈（简化版使用链表）
    private volatile CompletionNode waiters;
    
    // 执行异步任务的线程池
    private static final ExecutorService asyncPool = Executors.newCachedThreadPool();
    
    // 内部节点类，用于链式存储等待的操作
    private static class CompletionNode {
        final Runnable action;
        final Executor executor;
        final CompletionNode next;
        
        CompletionNode(Runnable action, Executor executor, CompletionNode next) {
            this.action = action;
            this.executor = executor;
            this.next = next;
        }
    }
    
    // 核心完成方法
    public boolean complete(V value) {
        return completeValue(value, NORMAL);
    }
    
    public boolean completeExceptionally(Throwable ex) {
        return completeValue(ex, EXCEPTIONAL);
    }
    
    private boolean completeValue(Object value, int completionState) {
        if (state != NEW) return false;
        
        synchronized (this) {
            if (state != NEW) return false;
            state = COMPLETING;
            this.result = value;
            state = completionState;
            
            // 触发所有等待的操作
            CompletionNode q = waiters;
            waiters = null;
            while (q != null) {
                triggerCompletion(q);
                q = q.next;
            }
        }
        return true;
    }
    
    private void triggerCompletion(CompletionNode node) {
        if (node.executor != null) {
            node.executor.execute(node.action);
        } else {
            node.action.run();
        }
    }
    
    // Future 接口实现
    @Override
    public V get() throws InterruptedException, ExecutionException {
        if (state <= COMPLETING) {
            awaitDone(false, 0);
        }
        return reportGet();
    }
    
    @Override
    public V get(long timeout, TimeUnit unit) 
            throws InterruptedException, ExecutionException, TimeoutException {
        if (state <= COMPLETING) {
            if (!awaitDone(true, unit.toNanos(timeout))) {
                throw new TimeoutException();
            }
        }
        return reportGet();
    }
    
    private boolean awaitDone(boolean timed, long nanos) throws InterruptedException {
        long startTime = timed ? System.nanoTime() : 0;
        
        synchronized (this) {
            while (state <= COMPLETING) {
                if (Thread.interrupted()) {
                    throw new InterruptedException();
                }
                
                if (timed && nanos <= 0) {
                    return false;
                }
                
                try {
                    if (timed) {
                        wait(nanos / 1000000, (int) (nanos % 1000000));
                    } else {
                        wait();
                    }
                } catch (InterruptedException e) {
                    throw e;
                }
                
                if (timed) {
                    nanos = startTime + nanos - System.nanoTime();
                }
            }
        }
        return true;
    }
    
    private V reportGet() throws ExecutionException {
        if (state == NORMAL) {
            @SuppressWarnings("unchecked") V v = (V) result;
            return v;
        }
        if (state == CANCELLED) {
            throw new CancellationException();
        }
        throw new ExecutionException((Throwable) result);
    }
    
    @Override
    public boolean isDone() {
        return state > COMPLETING;
    }
    
    @Override
    public boolean cancel(boolean mayInterruptIfRunning) {
        return completeValue(new CancellationException(), CANCELLED);
    }
    
    @Override
    public boolean isCancelled() {
        return state == CANCELLED;
    }
    
    // CompletionStage 接口实现
    @Override
    public <U> MyCompletionStage<U> thenApply(Function<V, U> fn) {
        return thenApplyAsync(fn, null);
    }
    
    @Override
    public <U> MyCompletionStage<U> thenApplyAsync(Function<V, U> fn) {
        return thenApplyAsync(fn, asyncPool);
    }
    
    private <U> MyCompletionStage<U> thenApplyAsync(Function<V, U> fn, Executor executor) {
        MyCompletableFuture<U> dependent = new MyCompletableFuture<>();
        
        CompletionNode node = new CompletionNode(() -> {
            try {
                if (state == NORMAL) {
                    @SuppressWarnings("unchecked") V v = (V) result;
                    U u = fn.apply(v);
                    dependent.complete(u);
                } else if (state == EXCEPTIONAL) {
                    dependent.completeExceptionally((Throwable) result);
                } else if (state == CANCELLED) {
                    dependent.cancel(false);
                }
            } catch (Throwable ex) {
                dependent.completeExceptionally(ex);
            }
        }, executor, null);
        
        addCompletion(node);
        return dependent;
    }
    
    private void addCompletion(CompletionNode node) {
        synchronized (this) {
            if (state > COMPLETING) {
                triggerCompletion(node);
            } else {
                node.next = waiters;
                waiters = node;
            }
        }
    }
    
    // 其他简化实现
    @Override
    public MyCompletionStage<V> thenAccept(Consumer<V> action) {
        return thenApply(v -> {
            action.accept(v);
            return v;
        });
    }
    
    @Override
    public MyCompletionStage<Void> thenRun(Runnable action) {
        return thenApply(v -> {
            action.run();
            return null;
        });
    }
    
    @Override
    public <U> MyCompletionStage<U> thenCompose(Function<V, MyCompletionStage<U>> fn) {
        MyCompletableFuture<U> dependent = new MyCompletableFuture<>();
        
        thenApplyAsync(fn, asyncPool).thenApplyAsync(future -> {
            try {
                dependent.complete(((MyFuture<U>) future).get());
            } catch (Exception e) {
                dependent.completeExceptionally(e);
            }
            return null;
        });
        
        return dependent;
    }
    
    // 静态工厂方法
    public static <U> MyCompletableFuture<U> supplyAsync(Supplier<U> supplier) {
        return supplyAsync(supplier, asyncPool);
    }
    
    public static <U> MyCompletableFuture<U> supplyAsync(Supplier<U> supplier, Executor executor) {
        MyCompletableFuture<U> future = new MyCompletableFuture<>();
        executor.execute(() -> {
            try {
                future.complete(supplier.get());
            } catch (Throwable ex) {
                future.completeExceptionally(ex);
            }
        });
        return future;
    }
    
    public static MyCompletableFuture<Void> runAsync(Runnable runnable) {
        return runAsync(runnable, asyncPool);
    }
    
    public static MyCompletableFuture<Void> runAsync(Runnable runnable, Executor executor) {
        MyCompletableFuture<Void> future = new MyCompletableFuture<>();
        executor.execute(() -> {
            try {
                runnable.run();
                future.complete(null);
            } catch (Throwable ex) {
                future.completeExceptionally(ex);
            }
        });
        return future;
    }
}
```

## 使用示例

```java
public class MyCompletableFutureExample {
    public static void main(String[] args) throws Exception {
        // 创建异步任务
        MyCompletableFuture<String> future = MyCompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
            return "Hello";
        });
        
        // 链式处理
        MyCompletableFuture<String> greeting = (MyCompletableFuture<String>) future
            .thenApply(s -> s + " World")
            .thenApply(s -> s + "!");
        
        System.out.println("Result: " + greeting.get());
        
        // 组合多个future
        MyCompletableFuture<String> future1 = MyCompletableFuture.supplyAsync(() -> "Hello");
        MyCompletableFuture<String> future2 = MyCompletableFuture.supplyAsync(() -> "World");
        
        MyCompletableFuture<String> combined = (MyCompletableFuture<String>) future1
            .thenCombine(future2, (s1, s2) -> s1 + " " + s2);
        
        System.out.println("Combined: " + combined.get());
    }
}
```

## 核心设计要点

1. **状态管理**：使用状态机管理任务的生命周期（NEW、COMPLETING、NORMAL等）
2. **等待机制**：使用 wait/notify 机制实现阻塞获取结果
3. **回调链**：使用链表结构存储等待执行的回调操作
4. **线程安全**：通过 synchronized 保证线程安全
5. **异常处理**：支持异常传播和异常完成

这个简化实现包含了 CompletableFuture 的核心功能，但实际 JDK 的实现更加复杂和优化，包括：
- 更高效的内存管理
- 更复杂的栈管理（Treiber stack）
- 更多的组合操作（allOf、anyOf等）
- 更好的性能优化

希望这个实现能帮助你理解 CompletableFuture 的内部工作原理！
