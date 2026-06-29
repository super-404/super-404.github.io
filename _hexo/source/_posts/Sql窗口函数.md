---
title: 'Sql窗口函数'
date: '2022-09-28 23:46'
categories: 'mysql'
---

<h2 id="窗口函数语法"><a href="#窗口函数语法" class="headerlink" title="窗口函数语法"></a>窗口函数语法</h2><p>SQL窗口函数是SQL中的一种高级函数，它允许用户在不显式分组查询的情况下对结果集进行分组和聚合计算。<br> 窗口函数的特别之处在于，它们将结果集中的每一行看作一个单独的计算对象，而不是将结果集划分为分组并计算每个分组的聚合值。这就使得窗口函数能够为结果集中的每一行计算类似排名、行号、百分比和移动聚合函数等值。</p>
<p><strong>SQL窗口函数的语法如下：</strong></p>
<figure class="highlight sql"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br></pre></td><td class="code"><pre><code class="hljs sql"><br><span class="hljs-operator">&lt;</span>窗口函数<span class="hljs-operator">&gt;</span> <span class="hljs-keyword">OVER</span> ([<span class="hljs-keyword">PARTITION</span> <span class="hljs-keyword">BY</span> <span class="hljs-operator">&lt;</span>分组列<span class="hljs-operator">&gt;</span> [, <span class="hljs-operator">&lt;</span>分组列<span class="hljs-operator">&gt;</span>...]]<br><br>                     [<span class="hljs-keyword">ORDER</span> <span class="hljs-keyword">BY</span> <span class="hljs-operator">&lt;</span>排序列<span class="hljs-operator">&gt;</span> [<span class="hljs-keyword">ASC</span> <span class="hljs-operator">|</span> <span class="hljs-keyword">DESC</span>] [, <span class="hljs-operator">&lt;</span>排序列<span class="hljs-operator">&gt;</span> [<span class="hljs-keyword">ASC</span> <span class="hljs-operator">|</span> <span class="hljs-keyword">DESC</span>]]...]<br><br>                     [<span class="hljs-operator">&lt;</span><span class="hljs-keyword">rows</span> <span class="hljs-keyword">or</span> <span class="hljs-keyword">range</span> clause<span class="hljs-operator">&gt;</span>])<br></code></pre></td></tr></table></figure>

<p>其中:</p>
<ul>
<li><code>&lt;窗口函数&gt;</code> : 定义要在窗口中计算的聚合函数或其它分析函数，如COUNT、RANK、SUM等。</li>
<li><code>OVER</code> : 窗口函数的核心关键字。</li>
<li><code>PARTITION BY</code> : 定义要用来分组的一组列名。</li>
<li><code>ORDER BY</code> : 定义用来排序的一组列名。</li>
<li><code>&lt;rows or range clause&gt;</code> : 定义窗口的行集合。默认为  <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> ，表示窗口包括从窗口开始到当前行的所有行。</li>
</ul>
