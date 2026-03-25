# Lighthouse 性能优化指南

## 评分说明

Lighthouse 性能评分基于以下 5 个核心指标加权计算：

| 指标 | 权重 | 说明 |
|------|------|------|
| FCP（首次内容绘制） | 10% | 第一个 DOM 元素渲染完成 |
| SI（速度指数） | 10% | 页面内容填充速度 |
| LCP（最大内容绘制） | 25% | 最大内容元素渲染完成 |
| TBT（总阻塞时间） | 30% | FCP 到 TTI 期间长任务的阻塞时间总和 |
| CLS（累积布局偏移） | 25% | 意外布局偏移总量 |

**评分标准**：0-49 差 | 50-89 需改进 | 90-100 优秀

---

## 如何运行 Lighthouse

### 方式一：Chrome DevTools
1. 打开 Chrome DevTools（F12）
2. 切换到 `Lighthouse` 面板
3. 选择 `Mobile` 或 `Desktop` 模式
4. 点击 `Analyze page load`
5. 等待分析完成，查看报告

**注意**：关闭 Chrome 扩展（隐身模式下运行），避免扩展影响测试结果。

### 方式二：命令行
```bash
# 安装
npm install -g lighthouse

# 运行（生成 HTML 报告）
lighthouse https://example.com --output html --output-path ./report.html

# 移动端测试
lighthouse https://example.com --emulated-form-factor mobile

# 仅收集性能数据
lighthouse https://example.com --only-categories performance
```

### 方式三：CI 集成（持续监控）
```yaml
# GitHub Actions
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://example.com
      https://example.com/about
    budgetPath: ./budget.json
    uploadArtifacts: true
```

```json
// budget.json（性能预算）
[
  {
    "path": "/*",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "total-blocking-time", "budget": 300 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 200 }
    ]
  }
]
```

---

## 常见 Lighthouse 优化项

### "消除阻塞渲染的资源"
```html
<!-- 非关键 CSS 使用 preload + onload 异步加载 -->
<link rel="preload" href="non-critical.css" as="style" onload="this.rel='stylesheet'">

<!-- 非关键 JS 使用 defer 或 async -->
<script src="analytics.js" defer></script>
<script src="ads.js" async></script>
```

### "适当地调整图片大小"
```tsx
// Next.js - 使用 next/image 自动优化
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  sizes="(max-width: 768px) 100vw, 1200px"  // 响应式尺寸
/>

// 原生 HTML - 响应式图片
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero" loading="lazy" width="1200" height="600">
</picture>
```

### "减少未使用的 JavaScript"
```bash
# 检查哪些 JS 未被使用
# Chrome DevTools -> Coverage 面板 -> 录制页面加载
# 红色区域 = 未使用的代码

# 解决方案：
# 1. 路由懒加载（按需加载页面代码）
# 2. 替换大体积库（如 moment -> dayjs）
# 3. 开启 Tree Shaking
```

### "确保文本在网络字体加载期间保持可见"
```css
/* 添加 font-display: swap，在字体加载完成前显示系统字体 */
@font-face {
  font-family: 'MyFont';
  src: url('myfont.woff2') format('woff2');
  font-display: swap;
}
```

### "避免链接的关键请求"
```html
<!-- 预加载关键资源 -->
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/hero.jpg" as="image" fetchpriority="high">
<link rel="preload" href="/api/initial-data" as="fetch" crossorigin>
```

---

## 性能分析工作流

```
1. 运行 Lighthouse → 获取基准评分
        ↓
2. 查看"机会"（Opportunities）→ 找到高收益优化项
        ↓
3. 查看"诊断"（Diagnostics）→ 了解底层问题
        ↓
4. 优先修复 TBT（总阻塞时间）→ 直接影响用户体验
        ↓
5. 修复 LCP → 首屏加载体验
        ↓
6. 修复 CLS → 避免布局抖动
        ↓
7. 再次运行 Lighthouse → 对比分数，验证效果
```

---

## 移动端 vs 桌面端

移动端 Lighthouse 评分通常比桌面端低 20-40 分，这是正常的，因为：
- 模拟的是低端移动设备（4x CPU 降速）
- 模拟的是 4G 网络（下载速度 ~25Mbps）

**优化建议**：优先优化移动端评分，桌面端性能通常会自然跟随提升。

移动端目标：LCP < 2.5s，TBT < 200ms，CLS < 0.1，性能评分 > 80
