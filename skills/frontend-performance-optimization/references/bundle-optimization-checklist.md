# 打包体积优化检查清单

## 分析工具

### Webpack
```bash
npm install --save-dev webpack-bundle-analyzer

# webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
module.exports = {
  plugins: [new BundleAnalyzerPlugin()]
}
```

### Vite / Rollup
```bash
npm install --save-dev rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'
export default {
  plugins: [visualizer({ open: true, gzipSize: true })]
}
```

### Next.js
```bash
npm install --save-dev @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true })
module.exports = withBundleAnalyzer({})
```

---

## 检查清单

### Tree Shaking
- [ ] 确保 package.json 中 `"sideEffects": false`（或指定有副作用的文件）
- [ ] 使用 ES Module 格式的依赖（避免 CommonJS）
- [ ] 检查是否有命名空间导入阻止 Tree Shaking
  ```js
  // 不推荐：导入整个命名空间
  import * as lodash from 'lodash'
  // 推荐：按需导入
  import { debounce } from 'lodash-es'
  ```

### 代码分割
- [ ] 路由懒加载（每个路由单独打包）
  ```tsx
  // React
  const UserPage = React.lazy(() => import('./pages/UserPage'))
  // Next.js App Router 自动按路由分割
  ```
- [ ] 大型组件懒加载
  ```tsx
  const HeavyChart = dynamic(() => import('./HeavyChart'), { ssr: false })
  ```
- [ ] 避免巨型 chunk（单个 chunk > 500KB 需拆分）

### 第三方依赖优化
- [ ] 检查有无体积过大的依赖（在分析报告中看）
- [ ] 替换大体积库：

| 原始库 | 替换方案 | 体积对比 |
|--------|----------|----------|
| moment.js (67KB) | date-fns / dayjs | < 10KB |
| lodash (70KB) | lodash-es 按需导入 | 按需 |
| antd 全量 | 按需引入 | 减少 80%+ |
| axios (13KB) | ky / 原生 fetch | < 5KB |

- [ ] 使用 CDN 引入不常更新的大型库（Vue、React、Three.js 等）

### 图片优化
- [ ] 图片格式转换为 WebP 或 AVIF
  ```bash
  # 批量转换
  for file in images/*.jpg; do
    cwebp -q 80 "$file" -o "${file%.jpg}.webp"
  done
  ```
- [ ] 图片压缩（TinyPNG、Squoosh）
- [ ] SVG 图标使用 SVGO 压缩

### 压缩配置
- [ ] 开启 Gzip 压缩（Nginx 配置）
  ```nginx
  gzip on;
  gzip_types text/plain text/css application/javascript application/json;
  gzip_min_length 1024;
  gzip_comp_level 6;
  ```
- [ ] 或开启 Brotli 压缩（压缩率更高）
  ```nginx
  brotli on;
  brotli_types text/plain text/css application/javascript;
  ```
- [ ] JS/CSS/HTML 在构建时 minify（Webpack/Vite 默认开启）

### 缓存策略
- [ ] 静态资源加哈希指纹（`bundle.[contenthash].js`）
- [ ] 设置长缓存（Cache-Control: max-age=31536000）
- [ ] HTML 文件设置 no-cache（保证能更新）
  ```nginx
  location / {
    add_header Cache-Control "no-cache";
  }
  location /assets/ {
    add_header Cache-Control "max-age=31536000, immutable";
  }
  ```

### 预加载关键资源
```html
<!-- 关键 JS/CSS 预加载 -->
<link rel="preload" href="/critical.js" as="script">
<link rel="preload" href="/hero.jpg" as="image">

<!-- 下一个页面的资源预获取 -->
<link rel="prefetch" href="/about.js">
```

---

## 体积目标参考

| 资源类型 | 优秀 | 良好 | 需优化 |
|----------|------|------|--------|
| 首屏 JS（gzip） | < 100KB | < 200KB | > 300KB |
| 首屏 CSS（gzip） | < 20KB | < 50KB | > 80KB |
| 首屏 HTML | < 20KB | < 50KB | > 100KB |
| 最大图片资源 | < 100KB | < 300KB | > 500KB |
