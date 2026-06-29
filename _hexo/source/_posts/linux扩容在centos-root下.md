---
title: 'linux扩容在centos-root下'
date: '2023-03-21 17:53'
categories: 'linux'
---

<p>最近在用elasticsearch，发现索引只能读不能写，health 是red，df -h 发现磁盘空间不够了。</p>
<h2 id="2、在系统中挂载磁盘"><a href="#2、在系统中挂载磁盘" class="headerlink" title="2、在系统中挂载磁盘"></a>2、在系统中挂载磁盘</h2><p>开启虚拟机并登录后，使用命令查看当磁盘状态</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs csharp"><span class="hljs-meta"># df -h</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/ffafd265255ffee15fb82cd6c6d8cc16.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>可看到当前还是原本的20G，并未扩容，首先先通过命令查看到新磁盘的分区</p>
<figure class="highlight 1c"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs 1c"><span class="hljs-meta"># fdisk -l</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/bf74ced066e8d0624b9f2f47992a3fd0.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>然后对新加的磁盘进行分区操作：</p>
<figure class="highlight gradle"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs gradle"># fdisk <span class="hljs-regexp">/dev/</span>sda<br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/63c08b0cc5808959bc6ec8bafdff62fd.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p><img src="https://i-blog.csdnimg.cn/blog_migrate/7023656e1f7d907c375ba5e91f0bc611.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>期间，如果需要将分区类型的Linux修改为Linux LVM的话需要在新增了分区之后，选择t，然后选择8e，之后可以将新的分区修改为linux LVM，之后我们可以再次用以下命令查看到磁盘当前情况</p>
<figure class="highlight 1c"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs 1c"><span class="hljs-meta"># fdisk -l</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/666d8d1e5200939fd74dc3e7cd524da1.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>重启虚拟机格式化新建分区</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs csharp"><span class="hljs-meta"># reboot</span><br></code></pre></td></tr></table></figure>

<p>然后将新添加的分区添加到已有的组实现扩容<br>首先查看卷组名</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs csharp"><span class="hljs-meta"># vgdisplay</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/e43dbb6e32e0f575ad78b15ac4ca8b8f.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>初始化刚刚的分区</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs cobol"># pvcreate /dev/sda3<br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/063f26433d5b310418ca100d633a196d.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>将初始化过的分区加入到虚拟卷组名</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br></pre></td><td class="code"><pre><code class="hljs cobol"># vgextend 虚拟卷组名 新增的分区<br><br># vgextend centos /dev/sda3<br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/5295809d06707d27e4bf5a343c767956.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>再次查看卷组情况</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs csharp"><span class="hljs-meta"># vgdisplay</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/1a75a2f36580e4e9c36f5f18d2835e39.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>这里可以看到，有30G的空间是空闲的<br>查看当前磁盘情况并记下需要扩展的文件系统名，我这里因为要扩展根目录，所以我记下的是 &#x2F;dev&#x2F;mapper&#x2F;centos-root</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs csharp"><span class="hljs-meta"># df -h</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/218f81f60c725c804968e36af55a7857.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>扩容已有的卷组容量（这里有个细节，就是不能全扩展满，比如空闲空间是30G，然后这里的话30G不能全扩展上，这里我扩展的是29G）</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs cobol"><br></code></pre></td></tr></table></figure>

<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br></pre></td><td class="code"><pre><code class="hljs cobol"># lvextend -L +需要扩展的容量 需要扩展的文件系统名 <br><br><br><br># lvextend -L +29G /dev/mapper/centos-root<br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/24bd253c2798a02a8df60f2348d5e38d.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>然后我们用命令查看当前卷组</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs csharp"><span class="hljs-meta"># pvdisplay</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/3176b19e8f1407898440e80163a9135a.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>这里可以看到，卷组已经扩容了<br>以上只是卷的扩容，然后我们需要将文件系统扩容</p>
<p>这个是网上很多参考资料的用法，但是在这里报错了</p>
<p><img src="https://i-blog.csdnimg.cn/blog_migrate/342fdd41c399bf2847b25ea0ec84056c.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>解决办法是，首先查看文件系统的格式</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs cobol"># cat /etc/fstab | grep centos-root<br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/ef8079f8913063df152bcefe4b5ef427.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>这里可以看到，文件系统是xfs，所以需要xfs的命令来扩展磁盘空间</p>
<p><img src="https://i-blog.csdnimg.cn/blog_migrate/e5aeccb7003206a20a9258a0e6fa373b.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>之后我们再次用命令查看磁盘状态</p>
<figure class="highlight csharp"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><code class="hljs csharp"><span class="hljs-meta"># df -h</span><br></code></pre></td></tr></table></figure>

<p><img src="https://i-blog.csdnimg.cn/blog_migrate/0fea8bd3aa90b12f2eb6e8434cb77900.png" srcset="/img/loading.gif" lazyload alt="img"></p>
<p>扩容成功！</p>
