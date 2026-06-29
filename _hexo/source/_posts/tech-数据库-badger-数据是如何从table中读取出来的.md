---
title: '数据是如何从table中读取出来的'
date: '2026-04-27 11:27'
categories:
  - '技术文档'
  - '数据库'
  - 'Badger'
  - '读路径'
tags:
  - '数据库'
  - 'badger'
---

从 `table` 里把数据读出来，核心链路是：

```text
Table index
-> 找到目标 block
-> 从文件/mmap 里读出 block
-> 必要时解密、解压
-> 在 block 内定位 entry
-> 还原 key
-> 把 value bytes 解码成 ValueStruct
```

可以分成 4 层看。
------
## 1. 先从 table 级 iterator 开始
入口通常是：

```go
it := tbl.NewIterator(0)
defer it.Close()

it.Seek(key)
if it.Valid() {
    k := it.Key()
    vs := it.Value()
}
```

这里 `Seek(key)` 在 [table/iterator.go](#local-path)。

它不是扫整个文件，而是先在 **table index** 里二分找 block。
------
## 2. 先定位到哪个 block
`Seek` 最终会走到 `seekFrom()`，里面用：

```go
sort.Search(itr.t.offsetsLength(), ...)
```

根据每个 block 的最小 key，先确定目标 key 落在哪个 block 附近。

所以第一步是：

**先从 table index 找到 block 编号。**
------
## 3. 把这个 block 从文件里读出来
真正加载 block 的是 [table.go](#local-path)：

```go
func (t *Table) block(idx int, useCache bool) (*Block, error)
```

它会做这些事：

1. 先查 block cache
2. 如果没命中，从 table index 取这个 block 的 `offset/len`
3. 调：

```go
blk.data, err = t.read(blk.offset, int(ko.Len()))
```

而 `t.read()` 本身就是：

```go
func (t *Table) read(off, sz int) ([]byte, error) {
    return t.Bytes(off, sz)
}
```

也就是说：

**从 mmap 文件视图里切出这一段 block 字节。**

然后它还会继续：

- 如果加密了，先解密
- 如果压缩了，再解压
- 解析 block 尾部的 `entryOffsets`

所以到这里，`blk` 已经变成一个“可以遍历的内存 block”。
------
## 4. 在 block 内定位到具体 entry
block 内部不是每条 KV 随便连着放的，它有一个偏移数组：

```go
blk.entryOffsets
```

`blockIterator.setIdx(i)` 在 [table/iterator.go](#local-path) 会：

1. 根据 `entryOffsets[i]` 找当前 entry 起点
2. 根据 `entryOffsets[i+1]` 找终点
3. 切出 `entryData`
4. 解 header
5. 还原 key
6. 得到 value bytes

这里有一个细节：block 内 key 做了前缀压缩，所以不是直接整 key 存着。  
`setIdx` 会用 `baseKey + overlap + diff` 还原出完整 key。

最终：

```go
itr.bi.key // 当前 key
itr.bi.val // 当前 value bytes
```
------
## 5. 最后把 value bytes 解码成 `ValueStruct`
`Iterator.Value()` 在 [table/iterator.go](#local-path)：

```go
func (itr *Iterator) Value() (ret y.ValueStruct) {
    ret.Decode(itr.bi.val)
    return
}
```

所以 `bi.val` 里其实是编码后的 value bytes，  
这里再 `Decode` 成：

```go
y.ValueStruct
```

也就是你最终拿到的：

- `Meta`
- `UserMeta`
- `ExpiresAt`
- `Value`
------
## 一个最短的心智模型

### 如果是 `Seek(key)`
```text
table index 二分
-> block(idx)
-> block 内二分 / 定位 entry
-> Key()
-> Value()
```

### 如果是顺序遍历 `Next()`
```text
当前 block 下一条
-> block 走完了就加载下一个 block
-> Key()
-> Value()
```
------
## 注意一个点
`table` 读出来的 `ValueStruct` 不一定就是最终用户 value。

如果：

```go
vs.Meta & bitValuePointer > 0
```

那 `vs.Value` 里存的是 value pointer，还要上层再去 value log 取真正大 value。  
所以：

- `table` 负责从 SSTable 读出 `key + ValueStruct`
- `DB/Item` 层再决定是否继续去 vlog 取真实 value
------
一句话总结：

**数据从 table 中读出来，是先通过 table index 找 block，再把 block 从 mmap 文件中读出并解密/解压，在 block 内根据 `entryOffsets` 找到具体 entry，还原 key，最后把 value bytes 解码成 `y.ValueStruct`。**

如果你愿意，我可以下一步直接画一张“`Seek(key)` 的读取流程图”。

可以把这个函数理解成：

**“把 SSTable 的第 `idx` 个 block 安全地取出来，变成一个可遍历、可缓存、可校验的内存对象。”**

它做的事很多，但主线只有 4 步：

1. 先看缓存里有没有  
2. 没有就从文件里读 raw block  
3. 必要时解密、解压、解析 block 尾部索引  
4. 用引用计数把 block 交给调用方和 cache 共同持有
------
## 一、函数输入输出

```go
func (t *Table) block(idx int, useCache bool) (*Block, error)
```

含义：

- `idx`：第几个 block
- `useCache`：这次读取是否允许使用/写入 block cache
- 返回：解析好的 `*Block`

这个 `Block` 后面会被 `blockIterator` 使用。
------
## 二、先做边界检查

```go
y.AssertTruef(idx >= 0, "idx=%d", idx)
if idx >= t.offsetsLength() {
	return nil, errors.New("block out of index")
}
```

意思很直接：

- `idx` 不能小于 0
- `idx` 不能超过 table 里 block 数量

`offsetsLength()` 就是这张表有多少个 block。
------
## 三、先查 block cache

```go
if t.opt.BlockCache != nil {
	key := t.blockCacheKey(idx)
	blk, ok := t.opt.BlockCache.Get(key)
	if ok && blk != nil {
		if blk.incrRef() {
			return blk, nil
		}
	}
}
```

这里是在走快路径：

- 如果 block cache 开了，先按 `idx` 生成 cache key
- 命中缓存就尝试 `blk.incrRef()`
- 成功就直接返回

### 为什么命中缓存还要 `incrRef()`
因为这个 block 可能在：

```text
Get(key)
到
真正使用它
```

之间被驱逐。

所以必须通过 `incrRef()` 确认：

**“这个 block 现在仍然有效，且我成功拿到了一份引用。”**
------
## 四、从 table index 里找到 block 的 offset 和长度

```go
var ko fb.BlockOffset
y.AssertTrue(t.offsets(&ko, idx))
blk := &Block{offset: int(ko.Offset())}
```

这里的 `ko` 是 table index 里记录的 block 元信息，至少有：

- `Offset()`：这个 block 在文件中的起始位置
- `Len()`：这个 block 占多少字节

所以到这里，已经知道：

**第 `idx` 个 block 在文件里的哪一段。**
------
## 五、初始化 block 的引用计数

```go
blk.ref.Store(1)
defer blk.decrRef()
```

这是这个函数最关键、也最容易绕的地方。

### 当前语义
刚 new 出来的 `blk`，先给它一个初始引用：

```text
ref = 1
```

然后挂一个：

```go
defer blk.decrRef()
```

意思是：

**如果函数中途失败 return，这个初始引用会自动释放。**

所以这个 `defer` 是错误路径清理机制。
------
## 六、真正从文件中读 block 原始字节

```go
if blk.data, err = t.read(blk.offset, int(ko.Len())); err != nil {
	return nil, ...
}
```

这里的 `t.read(...)` 本质上是：

**从 SSTable 文件/mmap 中按 `offset + len` 取出这一段 block bytes。**

这时拿到的还是磁盘上的 block 原始格式，可能：
- 已加密
- 已压缩
------
## 七、如果加密了，先解密

```go
if t.shouldDecrypt() {
	if blk.data, err = t.decrypt(blk.data, true); err != nil {
		return nil, err
	}
	blk.freeMe = true
}
```

这一步的意思：

- 如果 table 是加密的，就先把 block 解密成明文
- 解密后 `blk.data` 可能是新分配出来的内存
- 所以 `blk.freeMe = true`，告诉后续释放逻辑：这块内存要回收
------
## 八、如果压缩了，再解压

```go
if err = t.decompress(blk); err != nil {
	return nil, ...
}
```

到这里之后，`blk.data` 就变成了：

**可直接解析的 block 内容。**
------
## 九、解析 block 尾部元信息

这是这个函数的第二个重点。

block 尾部大概布局是：

```text
[data entries][entryOffsets...][numEntries(4B)][checksum][checksumLen(4B)]
```

所以代码从尾巴往前拆。
------
### 1. 先读 checksum 长度

```go
readPos := len(blk.data) - 4
blk.chkLen = int(y.BytesToU32(blk.data[readPos : readPos+4]))
```

最后 4 字节表示 checksum 自身有多长。
------
### 2. 防止 checksum 长度异常

```go
if blk.chkLen > len(blk.data) {
	return nil, errors.New("invalid checksum length ...")
}
```

如果 checksum 长度比整个 block 还大，说明数据坏了，或者压缩/解密选项不匹配。
------
### 3. 取出 checksum 本体

```go
readPos -= blk.chkLen
blk.checksum = blk.data[readPos : readPos+blk.chkLen]
```
------
### 4. 再读 numEntries

```go
readPos -= 4
numEntries := int(y.BytesToU32(blk.data[readPos : readPos+4]))
```

说明这个 block 里有多少条 entry。
------
### 5. 再读 entryOffsets 数组

```go
entriesIndexStart := readPos - (numEntries * 4)
entriesIndexEnd := entriesIndexStart + numEntries*4

blk.entryOffsets = y.BytesToU32Slice(blk.data[entriesIndexStart:entriesIndexEnd])
blk.entriesIndexStart = entriesIndexStart
```

这一步得到：

**这个 block 里每条 entry 的起始偏移数组。**

后面的 `blockIterator` 就靠它做：
- `setIdx(i)`
- `seek`
- `next`
- `prev`
------
### 6. 把 `blk.data` 裁到真正需要的部分

```go
blk.data = blk.data[:readPos+4]
```

这会去掉：
- checksum
- checksumLen

保留下来的部分是：

```text
[data entries][entryOffsets][numEntries]
```

注释也说了：

```go
// The checksum is calculated for actual data + entry index + index length
```

所以 block 数据区保留到这里正合适。
------
## 十、按配置决定是否立刻验 checksum

```go
if t.opt.ChkMode == options.OnBlockRead || t.opt.ChkMode == options.OnTableAndBlockRead {
	if err = blk.verifyCheckSum(); err != nil {
		return nil, err
	}
}
```

如果配置要求“读 block 时校验”，这里会立即验证 block 完整性。
------
## 十一、给调用方一份引用

```go
blk.incrRef()
```

因为前面有：

```go
defer blk.decrRef()
```

函数退出时会减掉初始那一份引用。

所以在返回给调用方前，必须先再加一份引用，表示：

**“返回值持有这个 block。”**
------
## 十二、如果允许缓存，再给 cache 一份引用

```go
if useCache && t.opt.BlockCache != nil {
	key := t.blockCacheKey(idx)
	y.AssertTrue(blk.incrRef())

	if !t.opt.BlockCache.Set(key, blk, blk.size()) {
		blk.decrRef()
	}
}
```

这里再 `incrRef()` 一次，是为了：

**cache 也持有这个 block。**

所以最后可能有两类持有者：

- 调用方：一份 ref
- block cache：一份 ref

如果 cache 没收下它，就立刻 `decrRef()` 把 cache 那份释放掉。
------
## 十三、引用计数整体怎么理解

这是最容易迷糊的部分，单独总结一下：

### 刚创建时
```text
ref = 1
```
表示函数内部临时持有

### 返回给调用方前
```go
blk.incrRef()
```
变成：
```text
ref = 2
```

### 如果放入 cache
再：
```go
blk.incrRef()
```
变成：
```text
ref = 3
```

### 函数 return 时
`defer blk.decrRef()` 执行，减掉内部临时那一份：

- 没放 cache：最后 `ref = 1`（调用方持有）
- 放 cache：最后 `ref = 2`（调用方 + cache）

这就是它的生命周期管理逻辑。
------
## 十四、最后返回的 block 有什么内容

返回的 `blk` 至少已经准备好了这些：

- `blk.offset`：文件中的位置
- `blk.data`：已解密/解压、可供解析的数据区
- `blk.entryOffsets`：block 内每条 entry 的偏移
- `blk.entriesIndexStart`：entryOffsets 在 block 中的起点
- `blk.checksum` / `blk.chkLen`：校验信息

所以后面的 `blockIterator.setBlock(blk)` 才能直接工作。
------
## 一句话总结

这个函数就是：

**按 block 编号，从 SSTable 中取出一个 block；优先走缓存，否则从文件读取并解密/解压；再从 block 尾部解析出 entryOffsets 和 checksum；最后通过引用计数把这个 block 安全地交给调用方和 cache 使用。**

如果你愿意，我下一步可以继续把这段和 `blockIterator.setIdx()` 连起来，组成完整的：

```text
block(idx) -> setBlock() -> setIdx(i) -> Key()/Value()
```

读取链路。
