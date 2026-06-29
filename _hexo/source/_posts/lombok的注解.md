---
title: 'lombok 的注解'
date: '2022-09-30 20:19'
categories: 'lombok'
tags:
  - 'lombok'
---

<h3 id="1-Getter-和-Setter"><a href="#1-Getter-和-Setter" class="headerlink" title="1. @Getter 和 @Setter"></a>1. <code>@Getter</code> 和 <code>@Setter</code></h3><ul>
<li><p><strong>功能</strong>：自动生成类中的所有字段的 getter 和 setter 方法。</p>
</li>
<li><p><strong>用法</strong>：</p>
<ul>
<li><code>@Getter</code>：为字段生成 <code>getter</code> 方法。</li>
<li><code>@Setter</code>：为字段生成 <code>setter</code> 方法。</li>
</ul>
<p><strong>示例</strong>：</p>
<figure class="highlight less"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br></pre></td><td class="code"><pre><code class="hljs less"><span class="hljs-selector-tag">javaimport</span> <span class="hljs-selector-tag">lombok</span><span class="hljs-selector-class">.Getter</span>;<br><span class="hljs-selector-tag">import</span> <span class="hljs-selector-tag">lombok</span><span class="hljs-selector-class">.Setter</span>;<br><br><span class="hljs-selector-tag">public</span> <span class="hljs-selector-tag">class</span> <span class="hljs-selector-tag">User</span> &#123;<br>    <span class="hljs-variable">@Getter</span> <span class="hljs-variable">@Setter</span><br>    private String name;<br><br>    <span class="hljs-variable">@Getter</span> <span class="hljs-variable">@Setter</span><br>    private int age;<br>&#125;<br></code></pre></td></tr></table></figure></li>
</ul>
<h3 id="3-NoArgsConstructor、-AllArgsConstructor、-RequiredArgsConstructor"><a href="#3-NoArgsConstructor、-AllArgsConstructor、-RequiredArgsConstructor" class="headerlink" title="3. @NoArgsConstructor、@AllArgsConstructor、@RequiredArgsConstructor"></a>3. <code>@NoArgsConstructor</code>、<code>@AllArgsConstructor</code>、<code>@RequiredArgsConstructor</code></h3><ul>
<li><p><strong>功能</strong>：</p>
<ul>
<li><code>@NoArgsConstructor</code>：生成一个无参构造器。</li>
<li><code>@AllArgsConstructor</code>：生成一个全参构造器（包含类中所有字段的构造函数）。</li>
<li><code>@RequiredArgsConstructor</code>：生成一个包含 <code>final</code> 或带 <code>@NonNull</code> 注解字段的构造函数。</li>
</ul>
<p><strong>示例</strong>：</p>
<figure class="highlight java"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br><span class="line">11</span><br><span class="line">12</span><br><span class="line">13</span><br></pre></td><td class="code"><pre><code class="hljs java">javaimport lombok.NoArgsConstructor;<br><span class="hljs-keyword">import</span> lombok.AllArgsConstructor;<br><span class="hljs-keyword">import</span> lombok.RequiredArgsConstructor;<br><span class="hljs-keyword">import</span> lombok.NonNull;<br><br><span class="hljs-meta">@NoArgsConstructor</span> <span class="hljs-comment">// 无参构造器</span><br><span class="hljs-meta">@AllArgsConstructor</span> <span class="hljs-comment">// 全参构造器</span><br><span class="hljs-meta">@RequiredArgsConstructor</span> <span class="hljs-comment">// 只包含final和@NonNull字段的构造器</span><br><span class="hljs-keyword">public</span> <span class="hljs-keyword">class</span> <span class="hljs-title class_">User</span> &#123;<br>    <span class="hljs-keyword">private</span> String name;<br>    <span class="hljs-meta">@NonNull</span><br>    <span class="hljs-keyword">private</span> Integer age; <span class="hljs-comment">// 由于带@NonNull，会被RequiredArgsConstructor包含</span><br>&#125;<br></code></pre></td></tr></table></figure></li>
</ul>
<h3 id="2-Data"><a href="#2-Data" class="headerlink" title="2. @Data"></a>2. <code>@Data</code></h3><ul>
<li><p><strong>功能</strong>：自动生成 <code>getter</code>、<code>setter</code>、<code>toString()</code>、<code>equals()</code>、<code>hashCode()</code> 和 <code>全参构造器</code>。</p>
</li>
<li><p><strong>用法</strong>：</p>
<p><strong>示例</strong>：</p>
<figure class="highlight fortran"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br></pre></td><td class="code"><pre><code class="hljs fortran">javaimport lombok.<span class="hljs-keyword">Data</span>;<br><br>@<span class="hljs-keyword">Data</span><br><span class="hljs-keyword">public</span> <span class="hljs-keyword">class</span> User &#123;<br>    <span class="hljs-keyword">private</span> String <span class="hljs-keyword">name</span>;<br>    <span class="hljs-keyword">private</span> <span class="hljs-built_in">int</span> age;<br>&#125;<br></code></pre></td></tr></table></figure>

<p>这个注解等效于同时使用 <code>@Getter</code>、<code>@Setter</code>、<code>@ToString</code>、<code>@EqualsAndHashCode</code> 和 <code>@RequiredArgsConstructor</code>。你可以快速生成一整个实体类的基础功能。</p>
</li>
</ul>
<h3 id="6-Builder"><a href="#6-Builder" class="headerlink" title="6. @Builder"></a>6. <code>@Builder</code></h3><ul>
<li><p><strong>功能</strong>：为类生成一个 <code>Builder</code> 模式的构造器，方便链式构造对象。</p>
</li>
<li><p><strong>用法</strong>：</p>
<p><strong>示例</strong>：</p>
<figure class="highlight angelscript"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br></pre></td><td class="code"><pre><code class="hljs angelscript">javaimport lombok.Builder;<br><br>@Builder<br><span class="hljs-keyword">public</span> <span class="hljs-keyword">class</span> <span class="hljs-symbol">User</span> &#123;<br>    <span class="hljs-keyword">private</span> String name;<br>    <span class="hljs-keyword">private</span> <span class="hljs-built_in">int</span> age;<br>&#125;<br></code></pre></td></tr></table></figure>

<p>使用生成的 <code>builder</code>：</p>
<figure class="highlight pgsql"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br></pre></td><td class="code"><pre><code class="hljs pgsql">java<br><span class="hljs-keyword">User</span> <span class="hljs-keyword">user</span> = <span class="hljs-keyword">User</span>.builder().name(&quot;Alice&quot;).age(<span class="hljs-number">25</span>).build();<br></code></pre></td></tr></table></figure></li>
</ul>
<h3 id="7-NonNull"><a href="#7-NonNull" class="headerlink" title="7. @NonNull"></a>7. <code>@NonNull</code></h3><ul>
<li><p><strong>功能</strong>：为字段生成空值检查。如果构造器或方法参数使用了 <code>@NonNull</code>，Lombok 会自动在生成的代码中插入空值检查。</p>
</li>
<li><p><strong>用法</strong>：</p>
<p><strong>示例</strong>：</p>
<figure class="highlight pgsql"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br></pre></td><td class="code"><pre><code class="hljs pgsql">javaimport lombok.NonNull;<br><br><span class="hljs-built_in">public</span> <span class="hljs-keyword">class</span> <span class="hljs-keyword">User</span> &#123;<br>    <span class="hljs-built_in">public</span> <span class="hljs-keyword">User</span>(@NonNull String <span class="hljs-type">name</span>) &#123;<br>        this.name = <span class="hljs-type">name</span>;<br>    &#125;<br>&#125;<br></code></pre></td></tr></table></figure>

<p>这会在构造器中生成类似于以下的代码：</p>
<figure class="highlight pgsql"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br></pre></td><td class="code"><pre><code class="hljs pgsql">javapublic <span class="hljs-keyword">User</span>(String <span class="hljs-type">name</span>) &#123;<br>    <span class="hljs-keyword">if</span> (<span class="hljs-type">name</span> == <span class="hljs-keyword">null</span>) &#123;<br>        throw <span class="hljs-built_in">new</span> NullPointerException(&quot;name is marked @NonNull but is null&quot;);<br>    &#125;<br>    this.name = <span class="hljs-type">name</span>;<br>&#125;<br></code></pre></td></tr></table></figure></li>
</ul>
<h3 id="8-Synchronized"><a href="#8-Synchronized" class="headerlink" title="8. @Synchronized"></a>8. <code>@Synchronized</code></h3><ul>
<li><p><strong>功能</strong>：生成同步方法（类似于 <code>synchronized</code> 关键字）。比直接在方法上使用 <code>synchronized</code> 更安全，因为它可以防止同步在 <code>null</code> 对象上。</p>
</li>
<li><p><strong>用法</strong>：</p>
<p><strong>示例</strong>：</p>
<figure class="highlight gradle"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br></pre></td><td class="code"><pre><code class="hljs gradle">javaimport lombok.<span class="hljs-keyword">Synchronized</span>;<br><br><span class="hljs-keyword">public</span> <span class="hljs-keyword">class</span> Counter &#123;<br>    <span class="hljs-keyword">private</span> <span class="hljs-keyword">int</span> <span class="hljs-keyword">count</span> = <span class="hljs-number">0</span>;<br><br>    @<span class="hljs-keyword">Synchronized</span><br>    <span class="hljs-keyword">public</span> <span class="hljs-keyword">void</span> increment() &#123;<br>        <span class="hljs-keyword">count</span>++;<br>    &#125;<br>&#125;<br></code></pre></td></tr></table></figure></li>
</ul>
<h3 id="9-Slf4j"><a href="#9-Slf4j" class="headerlink" title="9. @Slf4j"></a>9. <code>@Slf4j</code></h3><ul>
<li><p><strong>功能</strong>：为类生成一个 <code>Slf4j</code> 日志记录器实例。</p>
</li>
<li><p><strong>用法</strong>：</p>
<p><strong>示例</strong>：</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br></pre></td><td class="code"><pre><code class="hljs csharp">javaimport lombok.<span class="hljs-keyword">extern</span>.slf4j.Slf4j;<br><br>@Slf4j<br><span class="hljs-keyword">public</span> <span class="hljs-keyword">class</span> <span class="hljs-title">UserService</span> &#123;<br>    <span class="hljs-function"><span class="hljs-keyword">public</span> <span class="hljs-keyword">void</span> <span class="hljs-title">process</span>()</span> &#123;<br>        log.info(<span class="hljs-string">&quot;Processing user...&quot;</span>);<br>    &#125;<br>&#125;<br></code></pre></td></tr></table></figure>

<p>这个注解会自动为类生成 <code>log</code> 对象，用于日志记录。</p>
</li>
</ul>
