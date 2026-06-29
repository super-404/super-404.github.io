---
title: 'risc-v OS学习记录'
date: '2023-10-19 19:43'
categories: 'risc-V'
tags:
  - 'risc-v'
  - '汇编'
---

<p>[TOC]</p>
<h3 id="前期准备"><a href="#前期准备" class="headerlink" title="前期准备"></a>前期准备</h3><p>学习资料：</p>
<p>gdb调试   <a target="_blank" rel="noopener" href="https://linuxtools-rst.readthedocs.io/zh_CN/latest/tool/gdb.html">linuxtools</a></p>
<p>make 小知识 </p>
<p>​		1   利用-n 可以看到详细的makefile的输出</p>
<p>寄存器小知识</p>
<blockquote>
<p>RISC-V 架构中有一组通用寄存器（General-Purpose Registers），它们通常用于存储整数数据和执行算术操作。以下是一些常见的 RISC-V 通用寄存器及其典型的作用：</p>
<ol>
<li><strong>x0</strong>：零寄存器，总是包含值0。在某些情况下，也被称为<code>zero</code>寄存器。</li>
<li><strong>x1</strong>：保留寄存器，用于汇编器、链接器等工具。</li>
<li><strong>x2</strong> - <strong>x11</strong>：临时寄存器，通常用于存储临时数据和计算结果。</li>
<li><strong>x12</strong> - <strong>x17</strong>：保存寄存器（s0 - s5），通常用于保存函数调用期间的寄存器值，以便在函数返回后能够正确恢复。</li>
<li><strong>x18</strong> - <strong>x27</strong>：临时寄存器，类似于 x2 - x11，用于存储临时数据。</li>
<li><strong>x28</strong> - <strong>x31</strong>：临时寄存器，通常用于存储临时数据和计算结果。</li>
</ol>
<p>除了通用寄存器，RISC-V 架构还包括一些特殊寄存器，这些寄存器在特定的操作和功能中发挥重要作用，例如：</p>
<ul>
<li><strong>pc</strong>：程序计数器，用于存储当前指令的地址，控制程序的执行顺序。</li>
<li><strong>sp</strong>：栈指针，用于管理函数调用期间的堆栈。</li>
<li><strong>gp</strong>：全局指针，通常用于访问全局数据。</li>
<li><strong>tp</strong>：线程指针，用于多线程环境中跟踪线程相关的数据。</li>
<li><strong>fp</strong>：帧指针，用于存储函数的栈帧信息。</li>
<li><strong>ra</strong>：返回地址寄存器，用于存储函数返回时的返回地址。</li>
<li><strong>a0</strong> - <strong>a7</strong>：参数寄存器，用于传递函数参数。</li>
<li><strong>t0</strong> - <strong>t6</strong>：临时寄存器，类似于通用寄存器，用于存储临时数据和计算结果。</li>
<li><strong>sstatus</strong>：状态寄存器，用于控制和管理处理器的状态，如中断和异常处理。</li>
<li><strong>stvec</strong>：中断向量寄存器，指示中断处理程序的入口地址。</li>
<li><strong>sie</strong>：中断使能寄存器，用于允许或禁止中断的发生。</li>
<li><strong>sip</strong>：中断挂起寄存器，用于标记中断请求的状态。</li>
<li><strong>mstatus</strong>：机器模式状态寄存器，类似于 <code>sstatus</code>，但用于机器模式下。</li>
<li><strong>mcause</strong>：机器模式异常原因寄存器，存储最近的异常原因。</li>
<li><strong>mtvec</strong>：机器模式中断向量寄存器，指示异常处理程序的入口地址。</li>
<li><strong>mepc</strong>：机器模式程序计数器，用于保存机器模式下的程序计数器值。</li>
</ul>
<p>这些寄存器在 RISC-V 架构中的不同模式下（用户模式、机器模式等）具有不同的行为和作用，但通常用于管理程序的执行、存储数据和处理中断与异常等任务。</p>
</blockquote>
<h3 id="00-bootstrap"><a href="#00-bootstrap" class="headerlink" title="00-bootstrap"></a>00-bootstrap</h3><p>这个项目下总共有四个文件夹分别是</p>
<p>首先看.h文件</p>
<h4 id="platform-h"><a href="#platform-h" class="headerlink" title="platform.h"></a>platform.h</h4><figure class="highlight c"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br><span class="line">11</span><br><span class="line">12</span><br><span class="line">13</span><br><span class="line">14</span><br><span class="line">15</span><br></pre></td><td class="code"><pre><code class="hljs c"><span class="hljs-meta">#<span class="hljs-keyword">ifndef</span> __PLATFORM_H__</span><br><span class="hljs-meta">#<span class="hljs-keyword">define</span> __PLATFORM_H__</span><br><br><span class="hljs-comment">/*</span><br><span class="hljs-comment"> * QEMU RISC-V Virt machine with 16550a UART and VirtIO MMIO</span><br><span class="hljs-comment"> */</span><br><br><span class="hljs-comment">/* </span><br><span class="hljs-comment"> * maximum number of CPUs</span><br><span class="hljs-comment"> * see https://github.com/qemu/qemu/blob/master/include/hw/riscv/virt.h</span><br><span class="hljs-comment"> * #define VIRT_CPUS_MAX 8</span><br><span class="hljs-comment"> */</span><br><span class="hljs-meta">#<span class="hljs-keyword">define</span> MAXNUM_CPU 8 <span class="hljs-comment">//这里的 8 应该是对应的hart的数量</span></span><br><br><span class="hljs-meta">#<span class="hljs-keyword">endif</span> <span class="hljs-comment">/* __PLATFORM_H__ */</span></span><br></code></pre></td></tr></table></figure>



<h4 id="start-S"><a href="#start-S" class="headerlink" title="start.S"></a>start.S</h4><p>注意是大写的S,可以包含#include 等指令，小写的则不行，它的作用是，在进入C语言的main函数中，初始化一些内容，比如hart的栈空间，</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br><span class="line">11</span><br><span class="line">12</span><br><span class="line">13</span><br><span class="line">14</span><br><span class="line">15</span><br><span class="line">16</span><br><span class="line">17</span><br><span class="line">18</span><br><span class="line">19</span><br><span class="line">20</span><br><span class="line">21</span><br><span class="line">22</span><br><span class="line">23</span><br><span class="line">24</span><br><span class="line">25</span><br><span class="line">26</span><br><span class="line">27</span><br><span class="line">28</span><br><span class="line">29</span><br><span class="line">30</span><br><span class="line">31</span><br><span class="line">32</span><br><span class="line">33</span><br><span class="line">34</span><br><span class="line">35</span><br><span class="line">36</span><br><span class="line">37</span><br><span class="line">38</span><br><span class="line">39</span><br></pre></td><td class="code"><pre><code class="hljs assembly">#include &quot;platform.h&quot;  //将.h文件包含<br><br>	# size of each hart&#x27;s stack is 1024 bytes<br>	.equ	STACK_SIZE, 1024 #.equ是汇编器识别的伪指令，作用是定义一个symble lable，值为1024<br>	<br>	#定义全局的标签，是给链接器看的，告诉qemu从这里开始执行第一条指令<br>	.global	_start<br><br>	.text<br>_start:<br>	# park harts with id != 0<br>	<br>	#csrr是专门用来访问状态寄存器的<br>	<br>	csrr	t0, mhartid		# read current hart id<br>	mv	tp, t0			# keep CPU&#x27;s hartid in its tp for later usage.<br>	bnez	t0, park		# if we&#x27;re not on the hart 0<br>					# we park the hart<br>	# Setup stacks, the stack grows from bottom to top, so we put the<br>	# stack pointer to the very end of the stack range.<br>	<br>	//后面这些指令是为了不同的hart设置不同的栈空间，但是应该用不上<br>	slli	t0, t0, 10		# shift left the hart id by 1024<br>	la	sp, stacks + STACK_SIZE	# set the initial stack pointer<br>					# to the end of the first stack space<br>	add	sp, sp, t0		# move the current hart stack pointer<br>					# to its place in the stack space<br>	<br>	j	start_kernel		# hart 0 jump to c<br><br>park:<br>	wfi //是一种用来休眠的指令，避免空转耗电<br>	j	park<br><br>stacks:<br>	.skip	STACK_SIZE * MAXNUM_CPU # allocate space for all the harts stacks<br><br>	.end				# End of file<br><br></code></pre></td></tr></table></figure>

<h4 id="kernel-c"><a href="#kernel-c" class="headerlink" title="kernel.c"></a>kernel.c</h4><figure class="highlight c"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br></pre></td><td class="code"><pre><code class="hljs c"><span class="hljs-comment">//跳进来了以后开始空转</span><br><span class="hljs-type">void</span> <span class="hljs-title function_">start_kernel</span><span class="hljs-params">(<span class="hljs-type">void</span>)</span><br>&#123;<br>	<span class="hljs-keyword">while</span> (<span class="hljs-number">1</span>) &#123;&#125;; <span class="hljs-comment">// stop here!</span><br>&#125;<br></code></pre></td></tr></table></figure>

<p><strong>makefile 的输出</strong></p>
<figure class="highlight makefile"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br></pre></td><td class="code"><pre><code class="hljs makefile">riscv64-unknown-elf-gcc \<br>-nostdlib \<br>-fno-builtin \<br>-march=rv32ima \ <br>-mabi=ilp32 \ <br>-g <br>-Wall <br>-c <br>-o start.o start.S<br><br></code></pre></td></tr></table></figure>

<blockquote>
<p>这是一个编译命令，用于将 RISC-V 32位体系结构的汇编文件 <code>start.S</code> 编译成目标文件 <code>start.o</code>。以下是对该命令的各个部分的解释：</p>
<ul>
<li><p><code>riscv64-unknown-elf-gcc</code>: 这是 RISC-V 交叉编译工具链（Cross-Compiler）的命令前缀。<code>riscv64-unknown-elf-gcc</code> 表示使用的是针对 RISC-V 体系结构的交叉编译器。这个编译器可用于编译 RISC-V 架构的程序。</p>
</li>
<li><p><code>-nostdlib</code>: 这是一个编译选项，指示编译器不要链接标准 C 库。通常，嵌入式系统或嵌入式应用程序可能不需要完整的标准库，因此可以使用此选项来禁用标准库的链接。</p>
</li>
<li><p><code>-fno-builtin</code>: 这也是一个编译选项，用于禁用内建函数（Builtin Functions）的使用。内建函数是编译器内置的一些函数，它们通常用于执行特定操作，如优化。使用此选项可以禁用这些内建函数。</p>
</li>
<li><p><code>-march=rv32ima</code>: 这是一个编译选项，指定了目标架构。在这里，<code>-march=rv32ima</code> 表示目标架构是 RISC-V 32位，支持整数（i）、乘法扩展（m）和原子操作扩展（a）指令集。</p>
</li>
<li><p><code>-mabi=ilp32</code>: 这是另一个编译选项，指定了目标 ABI（Application Binary Interface）。<code>ilp32</code> 表示整数类型、寄存器和地址都是32位的。这与 <code>lp64</code>（长整数类型、寄存器和地址为64位）等不同的 ABI 有关。</p>
</li>
<li><p><code>-g</code>: 这是一个编译选项，用于生成调试信息。它会在目标文件中嵌入调试信息，以便在后续调试程序时使用。</p>
</li>
<li><p><code>-Wall</code>: 这是一个编译选项，用于启用编译器的警告。编译器将生成警告消息，以帮助开发人员识别潜在的问题或错误。</p>
</li>
<li><p><code>-c</code>: 这是一个编译选项，指示编译器仅生成目标文件，而不进行链接操作。生成的目标文件通常具有 <code>.o</code> 扩展名。</p>
</li>
<li><p><code>-o start.o</code>: 这是一个编译选项，指定生成的目标文件的名称。在这里，生成的目标文件将命名为 <code>start.o</code>。</p>
</li>
</ul>
<p>总的来说，这个编译命令用于将 RISC-V 32位汇编文件 <code>start.S</code> 编译成目标文件 <code>start.o</code>，使用了特定的目标架构和 ABI，并启用了调试信息和警告。这是编译一个 RISC-V 32位汇编程序的标准命令。后续可以使用该目标文件进行链接操作，以创建可执行文件。</p>
</blockquote>
<h3 id="01-HelloRVOS"><a href="#01-HelloRVOS" class="headerlink" title="01-HelloRVOS"></a>01-HelloRVOS</h3><p>想办法打印出一个hello world</p>
