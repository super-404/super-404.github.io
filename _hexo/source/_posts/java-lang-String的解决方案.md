---
title: 'SpringBoot升级3.2报错Invalid value type for attribute factoryBeanObjectType java.lang.String的解决方案'
date: '2024-09-28 23:23'
categories: 'springboot'
tags:
  - 'bug'
---

<p>这篇文章给大家介绍了SpringBoot升级3.2报错Invalid value type for attribute factoryBeanObjectType: java.lang.String的解决方案,文中有详细的原因分析,需要的朋友可以参考下</p>
<h1 id="错误概览"><a href="#错误概览" class="headerlink" title="错误概览"></a>错误概览</h1><p>报错截图如下：</p>
<p><img src="/2024/09/28/java-lang-String%E7%9A%84%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88/error.jpg" srcset="/img/loading.gif" lazyload alt="图片引用方法三"></p>
<h2 id="原因分析"><a href="#原因分析" class="headerlink" title="原因分析"></a>原因分析</h2><p><code>mybatis-spring</code> 官方 ISSUE:<a target="_blank" rel="noopener" href="https://github.com/mybatis/spring/issues/855"> https://github.com/mybatis/spring/issues/855</a></p>
<p>项目中使用 <code>mybatis-plus-boot-starter</code> 当前最新版本 3.5.4.1 ，其中依赖的 <code>mybatis-spring</code> 版本为 2.1.1</p>
<p><img src="/2024/09/28/java-lang-String%E7%9A%84%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88/dependency.png" srcset="/img/loading.gif" lazyload alt="图片引用方法三"></p>
<p>在 mybatis-spring 2.1.1 版本的 ClassPathMapperScanner#processBeanDefinitions 方法里将 <code>BeanClassName </code> 赋值给 String 变量</p>
<p><img src="/2024/09/28/java-lang-String%E7%9A%84%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88/clue1.jpg" srcset="/img/loading.gif" lazyload alt="图片引用方法三"></p>
<p>并将 <code>beanClassName</code> 赋值给 <code>factoryBeanObjectType</code></p>
<p><img src="/2024/09/28/java-lang-String%E7%9A%84%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88/clue2.jpg" srcset="/img/loading.gif" lazyload alt="图片引用方法三"></p>
<p>但是在 Spring Boot 3.2 版本中<code>FactoryBeanRegistrySupport#getTypeForFactoryBeanFromAttributes</code>方法已变更，如果 <code>factoryBeanObjectType</code> 不是 ResolvableType 或 Class 类型会抛出 <code>IllegalArgumentException</code> 异常。</p>
<p>此时因为 <code>factoryBeanObjectType</code> 是 String 类型，不符合条件而抛出异常。</p>
<p><img src="/2024/09/28/java-lang-String%E7%9A%84%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88/clue3.jpg" srcset="/img/loading.gif" lazyload alt="图片引用方法三"></p>
<h2 id="解决方案"><a href="#解决方案" class="headerlink" title="解决方案"></a>解决方案</h2><h4 id="方案1"><a href="#方案1" class="headerlink" title="方案1"></a>方案1</h4><p>mybatis-spring 官方 ISSUE 说明在 3.0.3 版本修复此问题</p>
<p><img src="/2024/09/28/java-lang-String%E7%9A%84%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88/resolve1.png" srcset="/img/loading.gif" lazyload alt="图片引用方法三"></p>
<p>Mybatis-Plus 官方 ISSUE#5808 下面也说明会在 3.5.5 版本升级 mybatis-spring 依赖修复此问题，但截止到目前只有快照版本 <code>3.5.5-SNAPSHOT</code> 。</p>
<p>所以目前好一点的方案就是手动升级 <code>mybatis-spring</code> 版本为 3.0.3</p>
<figure class="highlight xml"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br><span class="line">11</span><br><span class="line">12</span><br><span class="line">13</span><br><span class="line">14</span><br><span class="line">15</span><br><span class="line">16</span><br><span class="line">17</span><br><span class="line">18</span><br></pre></td><td class="code"><pre><code class="hljs xml"><span class="hljs-tag">&lt;<span class="hljs-name">dependency</span>&gt;</span><br>    <span class="hljs-tag">&lt;<span class="hljs-name">groupId</span>&gt;</span>com.baomidou<span class="hljs-tag">&lt;/<span class="hljs-name">groupId</span>&gt;</span><br>    <span class="hljs-tag">&lt;<span class="hljs-name">artifactId</span>&gt;</span>mybatis-plus-boot-starter<span class="hljs-tag">&lt;/<span class="hljs-name">artifactId</span>&gt;</span><br>    <span class="hljs-tag">&lt;<span class="hljs-name">version</span>&gt;</span>3.5.7<span class="hljs-tag">&lt;/<span class="hljs-name">version</span>&gt;</span><br>    //排除掉mybatis-spring<br>    <span class="hljs-tag">&lt;<span class="hljs-name">exclusions</span>&gt;</span><br>        <span class="hljs-tag">&lt;<span class="hljs-name">exclusion</span>&gt;</span><br>            <span class="hljs-tag">&lt;<span class="hljs-name">groupId</span>&gt;</span>org.mybatis<span class="hljs-tag">&lt;/<span class="hljs-name">groupId</span>&gt;</span><br>            <span class="hljs-tag">&lt;<span class="hljs-name">artifactId</span>&gt;</span>mybatis-spring<span class="hljs-tag">&lt;/<span class="hljs-name">artifactId</span>&gt;</span><br>        <span class="hljs-tag">&lt;/<span class="hljs-name">exclusion</span>&gt;</span><br>    <span class="hljs-tag">&lt;/<span class="hljs-name">exclusions</span>&gt;</span><br><span class="hljs-tag">&lt;/<span class="hljs-name">dependency</span>&gt;</span><br> //手动加上<br><span class="hljs-tag">&lt;<span class="hljs-name">dependency</span>&gt;</span><br>    <span class="hljs-tag">&lt;<span class="hljs-name">groupId</span>&gt;</span>org.mybatis<span class="hljs-tag">&lt;/<span class="hljs-name">groupId</span>&gt;</span><br>    <span class="hljs-tag">&lt;<span class="hljs-name">artifactId</span>&gt;</span>mybatis-spring<span class="hljs-tag">&lt;/<span class="hljs-name">artifactId</span>&gt;</span><br>    <span class="hljs-tag">&lt;<span class="hljs-name">version</span>&gt;</span>3.0.3<span class="hljs-tag">&lt;/<span class="hljs-name">version</span>&gt;</span><br><span class="hljs-tag">&lt;/<span class="hljs-name">dependency</span>&gt;</span><br></code></pre></td></tr></table></figure>

<h4 id="方案2"><a href="#方案2" class="headerlink" title="方案2"></a>方案2</h4><p>回退到springboot 3.1.x版本，例如3.0.5.</p>
