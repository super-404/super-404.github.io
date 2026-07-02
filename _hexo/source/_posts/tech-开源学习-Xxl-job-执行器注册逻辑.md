---
title: '执行器注册逻辑'
date: '2025-12-28 10:27'
categories:
  - '开源学习'
  - 'XXL-JOB'
  - '执行器'
  - '注册逻辑'
tags:
  - '开源学习'
  - 'Xxl-job'
---


## xxl-job 执行器服务注册机制

### 1. 执行器启动时初始化

执行器启动时，`XxlJobExecutor.start()` 会：
1. 初始化 AdminBiz 客户端列表（用于调用调度中心 API）
2. 启动内嵌的 Netty HTTP 服务器
3. 启动注册线程

```76:99:xxl-job-core/src/main/java/com/xxl/job/core/executor/XxlJobExecutor.java
    public void start() throws Exception {

        // valid enabled
        if (enabled!=null && !enabled) {
            logger.info(">>>>>>>>>>> xxl-job executor start fail, enabled:{}", enabled);
            return;
        }

        // init logpath
        XxlJobFileAppender.initLogPath(logPath);

        // init invoker, admin-client
        initAdminBizList(adminAddresses, accessToken, timeout);


        // init JobLogFileCleanThread
        JobLogFileCleanThread.getInstance().start(logRetentionDays);

        // init TriggerCallbackThread
        TriggerCallbackThread.getInstance().start();

        // init executor-server
        initEmbedServer(address, ip, port, appname, accessToken);
```

### 2. 创建 AdminBiz 客户端

执行器通过 `initAdminBizList()` 创建调度中心的 HTTP 客户端代理：

```135:167:xxl-job-core/src/main/java/com/xxl/job/core/executor/XxlJobExecutor.java
    private void initAdminBizList(String adminAddresses, String accessToken, int timeout) throws Exception {
        // valid
        if (StringTool.isBlank(adminAddresses)) {
            return;
        }

        // build adminBizList
        for (String address: adminAddresses.trim().split(",")) {
            if (StringTool.isBlank(address)) {
                continue;
            }

            // parse param
            String finalAddress = address.trim();
            finalAddress = finalAddress.endsWith("/") ? (finalAddress + "api") : (finalAddress + "/api");
            int finalTimeout = (timeout >=1 && timeout <= 10)
                    ?timeout
                    :3;

            // build
            AdminBiz adminBiz = HttpTool.createClient()
                    .url(finalAddress)
                    .timeout(finalTimeout * 1000)
                    .header(Const.XXL_JOB_ACCESS_TOKEN, accessToken)
                    .proxy(AdminBiz.class);

            // registry
            if (adminBizList == null) {
                adminBizList = new ArrayList<AdminBiz>();
            }
            adminBizList.add(adminBiz);
        }
    }
```

### 3. 启动注册线程

内嵌服务器启动后，会启动注册线程：

```248:251:xxl-job-core/src/main/java/com/xxl/job/core/server/EmbedServer.java
    public void startRegistry(final String appname, final String address) {
        // start registry
        ExecutorRegistryThread.getInstance().start(appname, address);
    }
```

### 4. 注册线程核心逻辑

`ExecutorRegistryThread` 以心跳方式定期向调度中心注册：

```27:78:xxl-job-core/src/main/java/com/xxl/job/core/thread/ExecutorRegistryThread.java
    public void start(final String appname, final String address){

        // valid
        if (appname==null || appname.trim().length()==0) {
            logger.warn(">>>>>>>>>>> xxl-job, executor registry config fail, appname is null.");
            return;
        }
        if (XxlJobExecutor.getAdminBizList() == null) {
            logger.warn(">>>>>>>>>>> xxl-job, executor registry config fail, adminAddresses is null.");
            return;
        }

        registryThread = new Thread(new Runnable() {
            @Override
            public void run() {

                // registry
                while (!toStop) {
                    try {
                        RegistryRequest registryParam = new RegistryRequest(RegistType.EXECUTOR.name(), appname, address);
                        for (AdminBiz adminBiz: XxlJobExecutor.getAdminBizList()) {
                            try {
                                Response<String> registryResult = adminBiz.registry(registryParam);
                                if (registryResult!=null && registryResult.isSuccess()) {
                                    registryResult = Response.ofSuccess();
                                    logger.debug(">>>>>>>>>>> xxl-job registry success, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
                                    break;
                                } else {
                                    logger.info(">>>>>>>>>>> xxl-job registry fail, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
                                }
                            } catch (Throwable e) {
                                logger.info(">>>>>>>>>>> xxl-job registry error, registryParam:{}", registryParam, e);
                            }

                        }
                    } catch (Throwable e) {
                        if (!toStop) {
                            logger.error(e.getMessage(), e);
                        }

                    }

                    try {
                        if (!toStop) {
                            TimeUnit.SECONDS.sleep(Const.BEAT_TIMEOUT);
                        }
                    } catch (Throwable e) {
                        if (!toStop) {
                            logger.warn(">>>>>>>>>>> xxl-job, executor registry thread interrupted, error msg:{}", e.getMessage());
                        }
                    }
                }
```

要点：
- 注册参数：`RegistryRequest(RegistType.EXECUTOR.name(), appname, address)`
- 心跳间隔：30 秒（`Const.BEAT_TIMEOUT = 30`）
- 支持多个调度中心地址，依次尝试直到成功

### 5. 调度中心处理注册请求

调度中心通过 `OpenApiController` 接收注册请求：

```63:66:xxl-job-admin/src/main/java/com/xxl/job/admin/scheduler/openapi/OpenApiController.java
                case "registry": {
                    RegistryRequest registryParam = GsonTool.fromJson(requestBody, RegistryRequest.class);
                    return adminBiz.registry(registryParam);
                }
```

`JobRegistryHelper.registry()` 处理注册：

```158:188:xxl-job-admin/src/main/java/com/xxl/job/admin/scheduler/thread/JobRegistryHelper.java
	public Response<String> registry(RegistryRequest registryParam) {

		// valid
		if (StringTool.isBlank(registryParam.getRegistryGroup())
				|| StringTool.isBlank(registryParam.getRegistryKey())
				|| StringTool.isBlank(registryParam.getRegistryValue())) {
			return Response.ofFail("Illegal Argument.");
		}

		// async execute
		registryOrRemoveThreadPool.execute(new Runnable() {
			@Override
			public void run() {
				// 0-fail; 1-save suc; 2-update suc;
				int ret = XxlJobAdminBootstrap.getInstance().getXxlJobRegistryMapper().registrySaveOrUpdate(registryParam.getRegistryGroup(), registryParam.getRegistryKey(), registryParam.getRegistryValue(), new Date());
				if (ret == 1) {
					// fresh (add)
					freshGroupRegistryInfo(registryParam);
				}
				/*int ret = XxlJobAdminConfig.getAdminConfig().getXxlJobRegistryDao().registryUpdate(registryParam.getRegistryGroup(), registryParam.getRegistryKey(), registryParam.getRegistryValue(), new Date());
				if (ret < 1) {
					XxlJobAdminConfig.getAdminConfig().getXxlJobRegistryDao().registrySave(registryParam.getRegistryGroup(), registryParam.getRegistryKey(), registryParam.getRegistryValue(), new Date());

					// fresh
					freshGroupRegistryInfo(registryParam);
				}*/
			}
		});

		return Response.ofSuccess();
	}
```

### 6. 注册信息保存与刷新

调度中心会：
1. 保存或更新注册信息到数据库（`xxl_job_registry` 表）
2. 如果是新增（ret == 1），立即刷新执行器组信息
3. 后台监控线程定期刷新执行器组地址列表

监控线程逻辑：

```58:111:xxl-job-admin/src/main/java/com/xxl/job/admin/scheduler/thread/JobRegistryHelper.java
		registryMonitorThread = new Thread(new Runnable() {
			@Override
			public void run() {
				while (!toStop) {
					try {
						// auto registry group
						List<XxlJobGroup> groupList = XxlJobAdminBootstrap.getInstance().getXxlJobGroupMapper().findByAddressType(0);
						if (groupList!=null && !groupList.isEmpty()) {

							// remove dead address (admin/executor)
							List<Integer> ids = XxlJobAdminBootstrap.getInstance().getXxlJobRegistryMapper().findDead(Const.DEAD_TIMEOUT, new Date());
							if (ids!=null && !ids.isEmpty()) {
								XxlJobAdminBootstrap.getInstance().getXxlJobRegistryMapper().removeDead(ids);
							}

							// fresh online address (admin/executor)
							HashMap<String, List<String>> appAddressMap = new HashMap<String, List<String>>();
							List<XxlJobRegistry> list = XxlJobAdminBootstrap.getInstance().getXxlJobRegistryMapper().findAll(Const.DEAD_TIMEOUT, new Date());
							if (list != null) {
								for (XxlJobRegistry item: list) {
									if (RegistType.EXECUTOR.name().equals(item.getRegistryGroup())) {
										String appname = item.getRegistryKey();
										List<String> registryList = appAddressMap.get(appname);
										if (registryList == null) {
											registryList = new ArrayList<String>();
										}

										if (!registryList.contains(item.getRegistryValue())) {
											registryList.add(item.getRegistryValue());
										}
										appAddressMap.put(appname, registryList);
									}
								}
							}

							// fresh group address
							for (XxlJobGroup group: groupList) {
								List<String> registryList = appAddressMap.get(group.getAppname());
								String addressListStr = null;
								if (registryList!=null && !registryList.isEmpty()) {
									Collections.sort(registryList);
									StringBuilder addressListSB = new StringBuilder();
									for (String item:registryList) {
										addressListSB.append(item).append(",");
									}
									addressListStr = addressListSB.toString();
									addressListStr = addressListStr.substring(0, addressListStr.length()-1);
								}
								group.setAddressList(addressListStr);
								group.setUpdateTime(new Date());

								XxlJobAdminBootstrap.getInstance().getXxlJobGroupMapper().update(group);
							}
						}
					} catch (Throwable e) {
						if (!toStop) {
							logger.error(">>>>>>>>>>> xxl-job, job registry monitor thread error:{}", e);
						}
					}
```

### 7. 执行器停止时注销

执行器停止时，注册线程会调用 `registryRemove` 注销：

```80:105:xxl-job-core/src/main/java/com/xxl/job/core/thread/ExecutorRegistryThread.java
                // registry remove
                try {
                    RegistryRequest registryParam = new RegistryRequest(RegistType.EXECUTOR.name(), appname, address);
                    for (AdminBiz adminBiz: XxlJobExecutor.getAdminBizList()) {
                        try {
                            Response<String> registryResult = adminBiz.registryRemove(registryParam);
                            if (registryResult!=null && registryResult.isSuccess()) {
                                registryResult = Response.ofSuccess();
                                logger.info(">>>>>>>>>>> xxl-job registry-remove success, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
                                break;
                            } else {
                                logger.info(">>>>>>>>>>> xxl-job registry-remove fail, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
                            }
                        } catch (Throwable e) {
                            if (!toStop) {
                                logger.info(">>>>>>>>>>> xxl-job registry-remove error, registryParam:{}", registryParam, e);
                            }

                        }

                    }
                } catch (Throwable e) {
                    if (!toStop) {
                        logger.error(e.getMessage(), e);
                    }
                }
```

## 注册机制总结

1. 注册方式：HTTP POST，接口 `/api/registry`
2. 注册频率：每 30 秒一次心跳
3. 注册内容：
   - `registryGroup`: "EXECUTOR"
   - `registryKey`: 执行器 AppName
   - `registryValue`: 执行器地址（如 `http://127.0.0.1:9999/`）
4. 存储位置：数据库表 `xxl_job_registry`
5. 失效检测：90 秒（`DEAD_TIMEOUT = BEAT_TIMEOUT * 3`）未更新视为失效
6. 自动刷新：调度中心监控线程每 30 秒刷新执行器组地址列表

该机制基于数据库的注册中心，通过心跳保持执行器在线状态，调度中心可动态感知执行器上下线。
