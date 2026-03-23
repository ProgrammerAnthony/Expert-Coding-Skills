# 常见问题类型的调试模式

## Web API 问题

### 接口返回 4xx/5xx

```bash
# 1. 确认请求参数（用 curl 复现）
curl -v -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "test"}'

# 2. 查看服务器错误日志
docker logs api-container --tail 50

# 3. 检查请求是否到达服务器（有时候是网关/代理问题）
# 在服务入口添加日志
```

### 接口超时

排查顺序：
1. 接口内部是否有慢查询？（添加计时日志）
2. 是否调用了外部服务？（检查外部服务响应时间）
3. 是否有数据库 N+1 问题？（开启 SQL 日志）
4. 是否有死锁？（检查数据库锁等待）

```python
# 快速定位慢点
import time

def api_handler(request):
    t0 = time.perf_counter()
    
    data = fetch_from_db()
    print(f"DB 查询: {time.perf_counter()-t0:.3f}s")
    
    result = process(data)
    print(f"处理: {time.perf_counter()-t0:.3f}s")
    
    return result
```

---

## 数据库问题

### 慢查询

```sql
-- MySQL/PostgreSQL：查看慢查询
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

-- 查看索引使用情况
SHOW INDEX FROM orders;

-- PostgreSQL：查看当前慢查询
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
```

**常见原因**：
- 缺少索引（`EXPLAIN` 中显示 `Seq Scan`）
- 函数包裹的列无法用索引（`WHERE DATE(created_at) = ...`）
- 返回大量数据（缺少 `LIMIT`）
- 关联查询缺少连接条件索引

### 连接池耗尽

症状：突然大量超时，错误信息含 "connection pool exhausted" / "too many connections"

```python
# 检查当前连接数（PostgreSQL）
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# 查找长时间不释放的连接
SELECT pid, query_start, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

**常见原因**：
- 未关闭连接（忘记 `close()` 或未使用 `with` 语句）
- 长事务未提交
- 连接池大小配置过小

---

## 内存问题

### 内存泄漏排查（Python）

```python
# 方法 1：tracemalloc
import tracemalloc

tracemalloc.start()

# ... 运行可疑代码 ...

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)

# 方法 2：objgraph（需安装）
import objgraph
objgraph.show_most_common_types(limit=10)
objgraph.show_growth()
```

**常见原因**：
- 列表/字典不断追加但从不清空（全局缓存无限增长）
- 循环引用阻止垃圾回收
- 事件监听器注册后未取消注册

---

## 并发/竞态条件

识别特征：
- 问题随机出现，高并发时更频繁
- 日志显示操作顺序不符合预期
- 数据库出现不一致的数据

```python
# 典型的竞态条件：读-改-写
def decrement_stock(product_id, quantity):
    # 危险！多个请求并发执行时会出错
    product = db.get(product_id)
    if product.stock >= quantity:
        product.stock -= quantity
        db.save(product)

# 修复方案 1：数据库原子操作
UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty

# 修复方案 2：乐观锁
UPDATE products SET stock = stock - :qty, version = version + 1
WHERE id = :id AND stock >= :qty AND version = :expected_version

# 修复方案 3：悲观锁（SELECT FOR UPDATE）
with transaction():
    product = db.execute("SELECT ... FOR UPDATE")
    if product.stock >= quantity:
        product.stock -= quantity
```

---

## 异步/协程问题

### Python asyncio

```python
# 常见问题：阻塞操作放在异步函数中
async def bad_example():
    time.sleep(5)  # 阻塞整个事件循环！
    return result

async def good_example():
    await asyncio.sleep(5)  # 正确：让出控制权
    return result

# 调试：找出事件循环阻塞
import asyncio
asyncio.get_event_loop().set_debug(True)
# 这会在检测到长时间阻塞时打印警告
```

---

## 前端与后端集成问题

### CORS 问题

症状：浏览器控制台 "Access to XMLHttpRequest has been blocked by CORS policy"

```bash
# 检查响应头
curl -v -H "Origin: http://localhost:3000" http://api.example.com/endpoint
# 查看响应中是否有 Access-Control-Allow-Origin
```

### 请求/响应格式不匹配

```javascript
// 浏览器 Network 标签查看：
// 1. 请求的 Content-Type 是否正确
// 2. 请求体格式是否符合后端预期
// 3. 响应的数据结构是否与前端预期一致
```

---

## Node.js 特定问题

### 未捕获的 Promise 拒绝

```javascript
// 危险：未处理的 Promise 错误会静默失败
fetchData()
  .then(processData)  // 如果这里抛出错误，会被忽略

// 安全：始终添加 catch
fetchData()
  .then(processData)
  .catch(err => console.error('处理失败:', err))

// 或使用 async/await
try {
  const data = await fetchData()
  await processData(data)
} catch (err) {
  console.error('处理失败:', err)
}

// 全局捕获（仅作为兜底）
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason)
})
```
