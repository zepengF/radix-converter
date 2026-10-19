# 部署到公网

RADIX 是纯静态站点：只有 HTML、CSS 和 JavaScript，没有后端、数据库或环境变量。任何静态托管服务都可以发布，不需要买服务器。

发布时只需要保证 **`index.html` 位于站点根目录**，并同时上传：

```text
index.html
styles.css
app.js
converter.js
favicon.svg
```

`README.md`、`preview.png`、`tests/` 和 `.nojekyll` 不影响运行，可以一起上传，也可以不传。

## 方案怎么选

| 方案 | 上手难度 | 免费 | 适合 |
| --- | --- | --- | --- |
| Netlify Drop | 最低 | 有免费额度 | 想几分钟内拿到公网链接 |
| GitHub Pages | 低 | 公开仓库免费 | 想用 Git 管理、长期维护 |
| Cloudflare Pages | 低 | 有免费额度 | 全球访问、自动 HTTPS、可绑域名 |
| 阿里云 OSS / 腾讯云 COS + CDN | 中等 | 按量付费，费用很低 | 主要用户在中国大陆，需要稳定速度 |

> 中国大陆访问 GitHub Pages、Netlify、Cloudflare 的速度并不稳定；如果主要用户在国内，优先考虑国内对象存储 + CDN。

---

## 方案一：Netlify Drop（最快）

1. 打开 [Netlify Drop](https://app.netlify.com/drop)，登录账号。
2. 把 `D:\DSWorkSpace\base-converter` **整个文件夹**拖进页面。
3. 等待部署完成，会得到一个 `https://随机名称.netlify.app` 地址。
4. 在 **Site configuration → General → Site details** 中修改站点名称。
5. 需要自己的域名时，在 **Domain management** 中添加域名并按照提示配置 DNS。

以后更新：重新拖入整个文件夹，或在 Netlify 中关联 Git 仓库自动部署。

---

## 方案二：GitHub Pages（免费、长期）

### 1. 新建仓库

先在 GitHub 上创建一个空仓库（不要勾选初始化 README），例如 `radix-converter`。

### 2. 推送代码

在 PowerShell 中执行：

```powershell
cd D:\DSWorkSpace\base-converter
git init
git add .
git commit -m "Deploy RADIX base converter"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

如果 Git 还没有配置提交身份：

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

### 3. 开启 Pages

进入仓库的 **Settings → Pages**：

- Source 选择 **Deploy from a branch**
- Branch 选择 **main**，目录选择 **/ (root)**
- 点击 **Save**

等待 1–2 分钟后，访问：

```text
https://<你的用户名>.github.io/<仓库名>/
```

免费账号发布 Pages 通常需要使用 **public** 仓库。

### 4. 更新

修改文件后执行：

```powershell
git add .
git commit -m "Update"
git push
```

GitHub Pages 会自动重新部署。

---

## 方案三：Cloudflare Pages（全球 CDN）

### 直接上传（推荐第一次使用）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages → Create → Pages → Upload assets**。
3. 输入项目名，上传 `base-converter` 文件夹或它的 ZIP。
4. 部署完成后会得到 `https://<项目名>.pages.dev`。
5. 在项目的 **Custom domains** 中绑定自己的域名，HTTPS 会自动配置。

### 关联 Git 自动部署

1. 先把项目推送到 GitHub（步骤同上）。
2. 在 Cloudflare Pages 中选择 **Connect to Git**，授权并选中仓库。
3. Framework preset 选择 **None**，构建命令留空，输出目录填 `/`（如果面板不接受，填 `.`）。
4. Save and Deploy。

> Cloudflare 控制台菜单名称可能随版本调整，以上为大致路径。

---

## 方案四：中国大陆访问优先

如果主要用户在国内，可以使用：

- **阿里云 OSS 静态网站托管 + 阿里云 CDN**
- **腾讯云 COS 静态网站托管 + 腾讯云 CDN**

大致步骤：

1. 创建存储桶，开启静态网站托管，默认首页设为 `index.html`。
2. 上传 5 个运行时文件，确保 `.html`、`.css`、`.js`、`.svg` 的 Content-Type 正确。
3. 绑定自定义域名并开启 HTTPS。
4. 使用中国大陆 CDN 时，域名必须完成 **ICP 备案**。
5. 不想备案时，可以选择香港或海外节点，但国内访问速度不保证。

对象存储按量计费，这种小型静态站的费用通常很低。

---

## 绑定自己的域名

以上平台都支持自定义域名，一般流程是：

1. 购买域名（如 `radix.example.com`）。
2. 在托管平台添加域名。
3. 按平台提示添加 DNS 记录，通常是 CNAME。
4. 等待 DNS 生效，开启自动 HTTPS。
5. 在 GitHub Pages 中可勾选 **Enforce HTTPS**。

如果使用中国大陆 CDN，域名需要 ICP 备案；使用海外托管通常不需要。

---

## 上线检查

- [ ] 在无痕窗口打开公网地址，确认不是只在本机可访问
- [ ] 手机和电脑各测试一次
- [ ] 测试 2、8、10、16 进制切换和小数转换
- [ ] 点击卡片和复制按钮，确认剪贴板正常
- [ ] 打开浏览器控制台，确认没有资源 404 或 JavaScript 报错
- [ ] 确认地址栏显示 HTTPS
- [ ] 把链接发给朋友测试

## 常见问题

**打开是 404**

发布目录里必须直接有 `index.html`，不能变成 `站点根目录/base-converter/index.html`。

**页面没有样式**

没有上传 `styles.css`，或者上传后目录结构变了。保持 5 个文件在同一层即可。

**GitHub Pages 显示 README**

Pages 的分支或目录设置不对，确认发布的是包含 `index.html` 的根目录。

**更新后还是旧页面**

等待 CDN 刷新，或用 `Ctrl + F5` 强制刷新。

**国内访问慢**

换用国内对象存储 + CDN，或使用香港/新加坡节点；同时需要接受备案或速度上的取舍。
