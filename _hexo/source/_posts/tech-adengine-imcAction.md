---
title: 'imc-cache 的作用'
date: '2025-09-04 17:40'
categories:
  - '技术文档'
  - 'adengine'
tags:
  - 'adengine'
---

#  imc-cache 的作用

##  配置如下

```yml
imc-cache:
  param-keys: 105,106
  duration: 300
  capacity: 500000
```

该配置将会被**EngineProperties**读入

```java
private ImcCache imcCache = new ImcCache();
。。。。。。。
  
public static class ImcCache {
        private Integer capacity = 1000000;

        private Integer maximumSize = 1000000;

        /*
        缓存时间，单位分钟
         */
        private Integer duration = 60;

        private String paramKeys;
  			public String getParamKeys() {
            return paramKeys;
        }

 				public void setParamKeys(String paramKeys) {
            this.paramKeys = paramKeys;
        }
       。。。。。。
    }
```

随后由**infoCache**使用并设置到`paramKeys`中

```java
public class InfoCache {

    private static Cache<Long, Info> entityInfoCache;
    private static final List<String> paramKeys = new ArrayList<>();


    public static void init(EngineProperties properties) {
        entityInfoCache = Caffeine.newBuilder()
                .initialCapacity(properties.getImcCache().getCapacity())
                .maximumSize(properties.getImcCache().getMaximumSize())
                .expireAfterWrite(properties.getImcCache().getDuration(), TimeUnit.MINUTES)
                .recordStats()
                .build();
     // 在这里被设置
        if (StringUtils.isNotBlank(properties.getImcCache().getParamKeys())) {
            paramKeys.addAll(new ArrayList<>(Arrays.asList(properties.getImcCache().getParamKeys().split(","))));
        }
    }


    public static void putInfoCache(Long entityId, Info info) {
        entityInfoCache.put(entityId, info);
    }

    public static Info getInfo(Long entityId) {
        return entityInfoCache.getIfPresent(entityId);
    }
		//在这里被其他类使用
    public static List<String> getCacheKeys() {
        return paramKeys;
    }

}
```

随后在获取到Imc信息后,构建好**Imc**

```java
public Imc(Info info) {
    this.setAdId(info.getInfoID());
    this.setUserId(info.getUserID());
    this.setOriginCateId(info.getOriginCateID());
    this.setDispLocalId(fillDispLocalId(info));
    this.setTitle(info.getTitle());
    this.setPostTime(info.getPostDate());
  	//该Imc的所有的params在这里被设置
    this.setParamsKV(info.getParams());
    this.setPic(info.getPic());
}
```



```java
 public void setParamsKV(String params) {
            //这里拿到的所有的需要获取的单参
            List<String> keyList = InfoCache.getCacheKeys();
            if (CollectionUtils.isEmpty(keyList)) {
                return;
            }
   					//匹配到一部分需要的单参
            keyList.forEach(key -> {
                String val = AdEngineUtils.getValueFromParams(params, NumberUtils.toInt(key, 0));
                if (StringUtils.isNotBlank(val)) {
                    this.paramMap.put(key, val);
                }
            });
        }
```
