# RADIX · 进制转换器

> 在线体验：<https://zepengf.github.io/radix-converter/>

![RADIX 进制转换器预览](preview.png)

一个无需构建、直接打开即可使用的进制转换计算器。支持 2–36 进制、任意精度整数与小数，所有计算都在浏览器本地完成。

## 使用

直接双击 `index.html`，或用任意静态文件服务器打开。无外部依赖、无需安装。

```text
base-converter/
├─ index.html          页面结构
├─ styles.css          界面与响应式样式
├─ app.js              交互逻辑
├─ converter.js        进制转换核心（浏览器 / Node 通用）
├─ favicon.svg
├─ preview.png         界面预览
├─ DEPLOY.md           部署到公网的完整说明
├─ .nojekyll           GitHub Pages 配置
└─ tests/
   └─ converter.test.js
```

## 部署到公网

这是纯静态站点，不需要服务器。可以直接上传到 Netlify、Cloudflare Pages、GitHub Pages，或国内对象存储 + CDN。

最短路径：打开 [Netlify Drop](https://app.netlify.com/drop)，把 `base-converter` 文件夹拖进去即可获得公网地址。

完整步骤、GitHub Pages 命令、自定义域名与备案说明见 [DEPLOY.md](DEPLOY.md)。

## 功能

- 2–36 任意进制互转，常用 2 / 8 / 10 / 16 进制快捷切换
- 基于 `BigInt` 的任意精度整数，不会在超大数值上丢精度
- 小数转换，支持 8 / 16 / 24 / 32 位小数精度；无法整除时标记为“近似”
- 支持负数、小数点、`0b` / `0o` / `0x` 前缀，以及空格、逗号、下划线分隔
- 常用进制卡片与全部 35 种进制总览，点击即复制
- 深色 / 浅色主题，自动跟随系统并可手动切换
- 分组显示与十六进制以上字母大小写切换
- 响应式布局，适配手机与桌面
- 快捷键：`Ctrl/Cmd + K` 或 `/` 聚焦输入框

## 示例

| 输入 | 输入进制 | 输出进制 | 结果 |
| --- | --- | --- | --- |
| `1011.01` | 2 | 10 | `11.25` |
| `FF.A` | 16 | 10 | `255.625` |
| `3.14159` | 10 | 2 | `11.0010010000111111…` |
| `FFFFFFFFFFFFFFFF` | 16 | 10 | `18446744073709551615` |

## 测试

```bash
node tests/converter.test.js
```

测试覆盖整数、小数、循环小数、负数、前缀、分隔符、非法字符、长度限制与各进制边界。
