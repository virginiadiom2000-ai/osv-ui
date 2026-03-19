<div align="center">
  
![osv-ui dashboard](./docs/screenshot.png)

# osv-ui

**一款美观、零配置的 npm 和 Python 项目 CVE 仪表板。**  
一条命令。无需注册。无需 API 密钥。立即在浏览器中打开。

[🇻🇳 Tiếng Việt](README.vi.md) · [🇺🇸 English](README.md) · [🇨🇳 中文](README.zh.md) · [🇯🇵 日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/osv-ui?color=red&label=npm)](https://www.npmjs.com/package/osv-ui)
[![npm downloads](https://img.shields.io/npm/dm/osv-ui?color=orange)](https://www.npmjs.com/package/osv-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16-blue)](https://nodejs.org)

</div>

---

## 问题

```bash
$ npm audit

# ... 这里有 300 行 ...
# moderate  Regular Expression Denial of Service in semver
# package   semver
# patched in >=7.5.2
# ...
# 12 vulnerabilities (3 moderate, 6 high, 3 critical)
```

没人会读这些枯燥的文字。安全问题被忽视。依赖项仍然存在漏洞。

## 解决方案

```bash
npx osv-ui
```

→ 打开一个直观的仪表板。每一个 CVE，每一个修复方案，涵盖你所有的服务。搞定。

### 为什么要尝试使用？

- **零配置**：无需安装、无需创建帐户或 API Key。
- **安全与隐私**：100% 本地运行。**绝不会**将您的源代码发送到 OSV.dev (Google) 进行对比。
- **直观且快速**：几秒钟内即可显示风险评分、漏洞图表和详细的升级指南（安全版本）。
- **支持多平台**：完美支持 Node.js (npm) 和 Python 项目。

---

## 功能特性

| | |
|---|---|
| 🟨 **npm** + 🐍 **Python** + 🔵 **Go** + 🦀 **Rust** | 扫描 `package-lock.json`、`Pipfile.lock`、`poetry.lock`、`requirements.txt`、`go.sum`、`Cargo.lock` |
| 📡 **实时 CVE 数据** | 由 [OSV.dev](https://osv.dev) 提供支持 — 每天从 NVD、GitHub Advisory、PyPI Advisory 更新。**无需 API 密钥。** |
| 🏢 **多服务扫描** | 一条命令扫描整个 monorepo — 前端、后端、workers、ML 服务 |
| 💊 **修复指南** | Dependabot 风格的升级表：当前版本 → 安全版本 + 一键复制命令 |
| 🎯 **风险评分** | 每个服务 0–100 分，让你知道该优先处理哪里 |
| 🔍 **CVE 详情** | 点击任意行查看：CVSS 评分、描述、NVD 链接、GitHub Advisory 链接 |
| 🔌 **JSON API** | `GET /api/data` — 接入你自己的 CI 脚本或报告工具 |

---

## 快速开始

**扫描当前目录：**
```bash
npx osv-ui
```

**扫描 monorepo（同时扫描多个服务）：**
```bash
npx osv-ui ./frontend ./api ./worker ./ml-service
```

**自动发现当前目录下的所有服务：**
```bash
npx osv-ui -d
```

**添加到你的 `package.json` 脚本中：**
```json
{
  "scripts": {
    "audit:ui":  "npx osv-ui",
    "audit:all": "npx osv-ui ./frontend ./api ./worker"
  }
}
```

**所有选项：**
```
--discover, -d  自动查找包含支持的清单文件的服务目录
--port=2003     使用自定义端口（默认：2003）
--no-open       不自动打开浏览器
--offline       跳过 OSV.dev 查询 — 仅解析清单文件
```

---

## 支持的清单文件

| 生态系统 | 文件 |
|-----------|-------|
| **npm** | `package-lock.json` (lockfileVersion 1, 2, 3) |
| **Python** | `requirements.txt` · `Pipfile.lock` · `poetry.lock` · `pyproject.toml` |
| **Go** | `go.sum` |
| **Rust** | `Cargo.lock` |

更多生态系统即将推出 — 请参阅 [路线图](#路线图)。

---

## 工作原理

```
项目文件
    │
    ├─ package-lock.json   ──┐
    ├─ Pipfile / poetry    ──┤──► 解析器 (parser) ──► 软件包列表
    ├─ go.sum / Cargo.lock ──┘
                                     │
                                     ▼
                             OSV.dev 批量 API (免费，无需密钥)
                                     │
                                     ▼
                             CVE 匹配 + 修复版本
                                     │
                                     ▼
                          Express 服务器 → 浏览器仪表板
                               http://localhost:2003
```

CVE 数据来自 **[OSV.dev](https://osv.dev)** — 一个由 Google 维护的免费开放数据库，汇总了：
- 🇺🇸 [NVD](https://nvd.nist.gov) — 美国国家漏洞数据库
- 🐙 [GitHub Advisory Database](https://github.com/advisories) (GHSA)
- 🐍 [PyPI Advisory Database](https://github.com/pypa/advisory-database)
- 📦 npm Advisory Database
- 🦀 RustSec · Go Vuln DB · OSS-Fuzz · 等等

**每日**更新。无需账号。无速率限制。无供应商锁定。

---

## 与其他方案的比较

| | **osv-ui** | `npm audit` | Snyk | Dependabot |
|---|:---:|:---:|:---:|:---:|
| 直观仪表板 | ✅ | ❌ 仅限终端 | ✅ | ✅ |
| 支持 npm | ✅ | ✅ | ✅ | ✅ |
| 支持 Python | ✅ | ❌ | ✅ | ✅ |
| 一处查看多服务 | ✅ | ❌ | ✅ (付费) | ✅ |
| 无需注册 | ✅ | ✅ | ❌ | ❌ |
| 适用于 **GitLab 免费版** | ✅ | ✅ | ❌ | ❌ |
| 自托管 / 本地运行 | ✅ | ✅ | ❌ | ❌ |
| 修复命令 | ✅ | 部分 | ✅ | ✅ |
| 开源 | ✅ | ✅ | ❌ | ❌ |

---

## GitLab CI — 在出现严重 CVE 时阻止部署

在 GitLab 免费版上没有 Dependabot？将此内容添加到 `.gitlab-ci.yml`：

```yaml
audit:
  stage: test
  image: node:20-alpine
  script:
    - npm audit --json > /tmp/audit.json || true
    - |
      node -e "
        const r = require('/tmp/audit.json');
        const crit = Object.values(r.vulnerabilities || {})
          .filter(v => v.severity === 'critical').length;
        if (crit > 0) {
          console.error('已阻止：发现 ' + crit + ' 个严重 CVE。请运行：npx osv-ui');
          process.exit(1);
        }
        console.log('OK：无严重漏洞');
      "
  artifacts:
    paths: [/tmp/audit.json]
    when: always
```

---

## 运行要求

- **Node.js** >= 16
- 访问互联网以进行 OSV.dev 查询 — 或使用 `--offline`
- npm 项目：先运行 `npm install` 以生成 `package-lock.json`
- Python 项目：上述清单列表中的任何文件

---

## 路线图

欢迎所有贡献。如果你想开发某个功能，请先开启一个 issue，以便我们进行协调。

- [x] **支持 Go** — 解析 `go.sum` / `go.mod`
- [x] **支持 Rust** — 解析 `Cargo.lock`
- [ ] **Java / Maven** — 解析 `pom.xml`
- [ ] **导出报告** — 保存为 HTML / PDF / JSON
- [ ] **GitHub Actions** — 在 PR 上发布 CVE 差异评论
- [ ] **导出 SBOM** — CycloneDX / SPDX 格式 (用于 Dependency-Track)
- [ ] **监听模式 (Watch mode)** — 在清单文件更改时重新扫描
- [ ] **历史 / 趋势** — 追踪每个分支随时间变化的 CVE 数量
- [ ] **Slack / webhook** — 出现新的严重 CVE 时发出通知
- [ ] **深色模式 (Dark mode)** — 仪表板 UI 的深色模式

---

## 贡献 (Contributing)

本项目由社区构建。欢迎各种技能水平的开发者。

**适合新手的 issue** (无需深厚知识)：
- 添加 Go 或 Rust 清单解析器 (参考 `src/parsers.js` 中的模式)
- 改进 Python 解析器的边缘情况
- 为仪表板 CSS 添加深色模式
- 为解析器编写单元测试

```bash
# 克隆并在本地运行
git clone https://github.com/toan203/osv-ui
cd osv-ui
npm install

# 针对你自己的项目运行
node bin/cli.js /path/to/your/project

# 针对多个服务运行
node bin/cli.js ./backend ./frontend
```

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 以了解代码风格和 PR 流程。

---

## 开源协议 (License)

[MIT](LICENSE) — 随意使用、克隆、嵌入或二次开发。

---

<div align="center">

osv-ui 是否在你的项目中发现了真实的 CVE？  
一颗 ⭐ 能帮助其他开发者发现这个工具。

[![Sponsor this project](https://img.shields.io/badge/Sponsor-this%20project-lightgrey?style=flat-square&logo=ko-fi)](https://ko-fi.com/P5P31W9W6A)

**[在 Twitter 分享](https://twitter.com/intent/tweet?text=Just%20found%20osv-ui%20%E2%80%94%20a%20beautiful%20one-command%20CVE%20dashboard%20for%20npm%20%26%20Python.%20Free%2C%20no%20signup%3A%20npx%20osv-ui%20%F0%9F%94%A5&url=https://github.com/toan203/osv-ui)** · **[在 Reddit 发布](https://reddit.com/submit?url=https://github.com/toan203/osv-ui&title=osv-ui%20%E2%80%94%20visual%20CVE%20dashboard%20for%20npm%20%26%20Python%2C%20one%20command%2C%20no%20signup)**

</div>
