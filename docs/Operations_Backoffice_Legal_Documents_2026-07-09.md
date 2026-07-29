# 运营后台合规文本与签署闭环

日期：2026-07-09

本次补齐“合规文本”后台页，让用户协议、隐私政策、内容审核制度和 App 备案/上架材料从固定测试文本升级为可配置、可签署、可审计的上线门槛。

## 覆盖范围

- 用户协议：公开接口 `/legal/terms`。
- 隐私政策：公开接口 `/legal/privacy`。
- 内容审核制度：公开接口 `/legal/content-policy`。
- App 备案与上架合规材料：后台内部材料，不公开到 `/legal/*`。

四份材料都是上线必需项。默认完整草稿只代表系统有待复核的基础正文，不代表真实运营主体已经确认或生产合规已经签署。

## 公开浏览器页面

`/legal/terms`、`/legal/privacy` 和 `/legal/content-policy` 现在同时支持机器可读 JSON 与浏览器可读 HTML：

- App 使用 `Accept: application/json`，接口契约保持不变。
- 普通浏览器使用 `Accept: text/html`，返回与当前公开快照一致的排版页面；也可用 `?format=json` / `?format=html` 显式选择。
- 未签署草稿显示“未发布草稿”并禁止搜索引擎索引；发布后显示正式版本号和生效日期。
- 标题、正文与运营主体资料全部经过 HTML 转义，页面使用严格 CSP、禁止 iframe 嵌入并关闭来源信息外传。
- 浏览器页面与 App 不维护第二份文案，后台发布新快照后两种格式同时更新，避免上架页与 App 正文漂移。

## 后台能力

入口：运营后台 `合规文本`。

每份材料支持：

- 编辑标题、版本号、生效日期、备注和正文。
- 签署为当前生产确认版本。
- 重置为默认测试文本。
- 查看公开路径、正文摘要、签署人、签署时间和签署说明。

编辑动作会清除原签署状态并回到草稿，避免生产文本被修改后仍沿用旧的 ready 结论。编辑、签署、重置都会写入审计日志：

- `legal.document.update`
- `legal.document.approve`
- `legal.document.reset`

## 上线台账联动

`GET /admin/launch/readiness` 的 `q-compliance-text` 已改为读取合规文本签署状态：

- 四份材料全部 `approved + productionReady=true` 时，状态自动为 `ready / 已签署`。
- 任一材料未签署时，状态保持 `open / 待签署`，并列出缺失材料。

这使合规 P0 不再只能靠人工口头确认，也避免默认测试文本被误认为生产可上线文本。

## 权限

新增后台权限点：

- `legal.documents.view`：查看合规文本与签署状态。
- `legal.documents.update`：更新并签署合规文本。

只读/审计角色可查看；实际更新和签署只开放给具备后台管理或运营管理权限的角色。

## 验收脚本

后端闭环：

```powershell
node scripts/smoke-legal-documents.cjs
```

该脚本同时覆盖 JSON 兼容、HTML 内容协商、草稿禁止索引、正式版本展示、运营主体回显和可编辑正文的 XSS 转义。

页面可用性：

```powershell
node scripts/smoke-admin-legal-documents-page.cjs
```

启动门禁已纳入：

```powershell
node scripts/smoke-launch-regression.cjs --only=legal-documents,admin-legal-documents-page,launch-readiness-decisions,audit-integrity
```

完整回归默认会运行 `legal-documents`；带 `--include-visual` 时会运行后台页面检查。

## 2026-07-14 production-readiness update

- Documents now have separate draft and published state. Publishing creates an immutable revision snapshot with a content hash; later edits create a new draft and do not rewrite historical consent evidence.
- The operator profile is maintained in the same admin page and covers the legal entity name, unified social credit code, registered address, support/privacy contacts, ICP/App filing details, and third-party/SDK disclosure details required by the document templates.
- Placeholder, test, or incomplete operator values keep the documents non-production-ready. The server will not invent an entity, sign on behalf of an authorized person, or auto-enable consent enforcement.
- Login consent traces store the exact terms/privacy versions, revision IDs, content hashes, acceptance source, timestamp, and mobile build evidence used at acceptance time.
- Legacy `test-*` records migrate to detailed `draft-2026-07-14` drafts on startup. They remain drafts until an authorized operator completes the real profile and explicitly publishes each required document.
