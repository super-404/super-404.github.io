---
title: '调度中心的调度逻辑'
date: '2025-12-28 10:32'
categories:
  - '开源学习'
  - 'XXL-JOB'
  - '调度中心'
  - '调度逻辑'
tags:
  - '开源学习'
  - 'Xxl-job'
---


## 调度中心通知执行器的流程

### 1. 任务触发入口

调度中心通过 `JobTrigger.trigger()` 触发任务：

```253:270:xxl-job-admin/src/main/java/com/xxl/job/admin/scheduler/trigger/JobTrigger.java
    private Response<String> doTrigger(TriggerRequest triggerParam, String address){
        Response<String> runResult = null;
        try {
            ExecutorBiz executorBiz = XxlJobAdminBootstrap.getExecutorBiz(address);
            runResult = executorBiz.run(triggerParam);
        } catch (Exception e) {
            logger.error(">>>>>>>>>>> xxl-job trigger error, please check if the executor[{}] is running.", address, e);
            runResult = Response.of(XxlJobContext.HANDLE_CODE_FAIL, ThrowableTool.toString(e));
        }

        StringBuffer runResultSB = new StringBuffer(I18nUtil.getString("jobconf_trigger_run") + "：");
        runResultSB.append("<br>address：").append(address);
        runResultSB.append("<br>code：").append(runResult.getCode());
        runResultSB.append("<br>msg：").append(runResult.getMsg());

        runResult.setMsg(runResultSB.toString());
        return runResult;
    }
```

### 2. 创建 HTTP 客户端代理

调度中心通过 `XxlJobAdminBootstrap.getExecutorBiz()` 创建 HTTP 客户端代理：

```138:160:xxl-job-admin/src/main/java/com/xxl/job/admin/scheduler/config/XxlJobAdminBootstrap.java
    private static ConcurrentMap<String, ExecutorBiz> executorBizRepository = new ConcurrentHashMap<String, ExecutorBiz>();
    public static ExecutorBiz getExecutorBiz(String address) throws Exception {
        // valid
        if (StringTool.isBlank(address)) {
            return null;
        }

        // load-cache
        address = address.trim();
        ExecutorBiz executorBiz = executorBizRepository.get(address);
        if (executorBiz != null) {
            return executorBiz;
        }

        // set-cache
        executorBiz = HttpTool.createClient()
                .url(address)
                .timeout(XxlJobAdminBootstrap.getInstance().getTimeout() * 1000)
                .header(Const.XXL_JOB_ACCESS_TOKEN, XxlJobAdminBootstrap.getInstance().getAccessToken())
                .proxy(ExecutorBiz.class);
        executorBizRepository.put(address, executorBiz);
        return executorBiz;
    }
```

要点：
- 使用 `HttpTool.createClient()` 创建 HTTP 客户端
- 通过 `.proxy(ExecutorBiz.class)` 生成接口代理
- 代理会将方法调用转换为 HTTP POST 请求
- 使用缓存避免重复创建

### 3. 执行器接收请求

执行器通过 Netty HTTP 服务器接收请求：

```170:208:xxl-job-core/src/main/java/com/xxl/job/core/server/EmbedServer.java
        private Object dispatchRequest(HttpMethod httpMethod, String uri, String requestData, String accessTokenReq) {
            // valid
            if (HttpMethod.POST != httpMethod) {
                return Response.ofFail("invalid request, HttpMethod not support.");
            }
            if (uri == null || uri.trim().isEmpty()) {
                return Response.ofFail( "invalid request, uri-mapping empty.");
            }
            if (accessToken != null
                    && !accessToken.trim().isEmpty()
                    && !accessToken.equals(accessTokenReq)) {
                return Response.ofFail("The access token is wrong.");
            }

            // services mapping
            try {
                switch (uri) {
                    case "/beat":
                        return executorBiz.beat();
                    case "/idleBeat":
                        IdleBeatRequest idleBeatParam = GsonTool.fromJson(requestData, IdleBeatRequest.class);
                        return executorBiz.idleBeat(idleBeatParam);
                    case "/run":
                        TriggerRequest triggerParam = GsonTool.fromJson(requestData, TriggerRequest.class);
                        return executorBiz.run(triggerParam);
                    case "/kill":
                        KillRequest killParam = GsonTool.fromJson(requestData, KillRequest.class);
                        return executorBiz.kill(killParam);
                    case "/log":
                        LogRequest logParam = GsonTool.fromJson(requestData, LogRequest.class);
                        return executorBiz.log(logParam);
                    default:
                        return Response.ofFail( "invalid request, uri-mapping(" + uri + ") not found.");
                }
            } catch (Throwable e) {
                logger.error(e.getMessage(), e);
                return Response.ofFail("request error:" + ThrowableTool.toString(e));
            }
        }
```

### 4. 执行器处理任务

执行器通过 `ExecutorBizImpl.run()` 处理任务：

```48:150:xxl-job-core/src/main/java/com/xxl/job/core/openapi/impl/ExecutorBizImpl.java
    @Override
    public Response<String> run(TriggerRequest triggerRequest) {
        // load old：jobHandler + jobThread
        JobThread jobThread = XxlJobExecutor.loadJobThread(triggerRequest.getJobId());
        IJobHandler jobHandler = jobThread!=null?jobThread.getHandler():null;
        String removeOldReason = null;

        // valid：jobHandler + jobThread
        GlueTypeEnum glueTypeEnum = GlueTypeEnum.match(triggerRequest.getGlueType());
        if (GlueTypeEnum.BEAN == glueTypeEnum) {

            // new jobhandler
            IJobHandler newJobHandler = XxlJobExecutor.loadJobHandler(triggerRequest.getExecutorHandler());

            // valid old jobThread
            if (jobThread!=null && jobHandler != newJobHandler) {
                // change handler, need kill old thread
                removeOldReason = "change jobhandler or glue type, and terminate the old job thread.";

                jobThread = null;
                jobHandler = null;
            }

            // valid handler
            if (jobHandler == null) {
                jobHandler = newJobHandler;
                if (jobHandler == null) {
                    return Response.of(XxlJobContext.HANDLE_CODE_FAIL, "job handler [" + triggerRequest.getExecutorHandler() + "] not found.");
                }
            }

        } else if (GlueTypeEnum.GLUE_GROOVY == glueTypeEnum) {

            // valid old jobThread
            if (jobThread != null &&
                    !(jobThread.getHandler() instanceof GlueJobHandler
                        && ((GlueJobHandler) jobThread.getHandler()).getGlueUpdatetime()== triggerRequest.getGlueUpdatetime() )) {
                // change handler or gluesource updated, need kill old thread
                removeOldReason = "change job source or glue type, and terminate the old job thread.";

                jobThread = null;
                jobHandler = null;
            }

            // valid handler
            if (jobHandler == null) {
                try {
                    IJobHandler originJobHandler = GlueFactory.getInstance().loadNewInstance(triggerRequest.getGlueSource());
                    jobHandler = new GlueJobHandler(originJobHandler, triggerRequest.getGlueUpdatetime());
                } catch (Exception e) {
                    logger.error(e.getMessage(), e);
                    return Response.of(XxlJobContext.HANDLE_CODE_FAIL, e.getMessage());
                }
            }
        } else if (glueTypeEnum!=null && glueTypeEnum.isScript()) {

            // valid old jobThread
            if (jobThread != null &&
                    !(jobThread.getHandler() instanceof ScriptJobHandler
                            && ((ScriptJobHandler) jobThread.getHandler()).getGlueUpdatetime()== triggerRequest.getGlueUpdatetime() )) {
                // change script or gluesource updated, need kill old thread
                removeOldReason = "change job source or glue type, and terminate the old job thread.";

                jobThread = null;
                jobHandler = null;
            }

            // valid handler
            if (jobHandler == null) {
                jobHandler = new ScriptJobHandler(triggerRequest.getJobId(), triggerRequest.getGlueUpdatetime(), triggerRequest.getGlueSource(), GlueTypeEnum.match(triggerRequest.getGlueType()));
            }
        } else {
            return Response.of(XxlJobContext.HANDLE_CODE_FAIL, "glueType[" + triggerRequest.getGlueType() + "] is not valid.");
        }

        // executor block strategy
        if (jobThread != null) {
            ExecutorBlockStrategyEnum blockStrategy = ExecutorBlockStrategyEnum.match(triggerRequest.getExecutorBlockStrategy(), null);
            if (ExecutorBlockStrategyEnum.DISCARD_LATER == blockStrategy) {
                // discard when running
                if (jobThread.isRunningOrHasQueue()) {
                    return Response.of(XxlJobContext.HANDLE_CODE_FAIL, "block strategy effect："+ExecutorBlockStrategyEnum.DISCARD_LATER.getTitle());
                }
            } else if (ExecutorBlockStrategyEnum.COVER_EARLY == blockStrategy) {
                // kill running jobThread
                if (jobThread.isRunningOrHasQueue()) {
                    removeOldReason = "block strategy effect：" + ExecutorBlockStrategyEnum.COVER_EARLY.getTitle();

                    jobThread = null;
                }
            } else {
                // just queue trigger
            }
        }

        // replace thread (new or exists invalid)
        if (jobThread == null) {
            jobThread = XxlJobExecutor.registJobThread(triggerRequest.getJobId(), jobHandler, removeOldReason);
        }

        // push data to queue
        return jobThread.pushTriggerQueue(triggerRequest);
    }
```

## 通信机制总结

1. 通信方式：HTTP POST
2. 请求地址：`{执行器地址}/run`
3. 请求头：包含 `XXL-JOB-ACCESS-TOKEN` 用于认证
4. 请求体：JSON 格式的 `TriggerRequest` 对象
5. 响应格式：JSON 格式的 `Response` 对象

## 完整流程

1. 调度中心触发任务 → `JobTrigger.trigger()`
2. 路由选择执行器地址 → 根据路由策略选择
3. 创建 HTTP 客户端代理 → `XxlJobAdminBootstrap.getExecutorBiz()`
4. 发送 HTTP POST 请求 → 调用 `executorBiz.run(triggerParam)`
5. 执行器接收请求 → Netty HTTP 服务器处理 `/run` 接口
6. 执行器处理任务 → `ExecutorBizImpl.run()` 将任务推送到 `JobThread` 队列
7. 任务执行 → `JobThread` 从队列取出任务并执行

该机制基于 HTTP 的 RPC 调用，调度中心通过动态代理将接口调用转换为 HTTP 请求发送给执行器。
