# Lumii 正式 API HTTPS 与 Release 构建门禁

日期：2026-07-29

## 1. 当前域名与服务器状态

- 正式 API 域名：`api.lumiiapp.cn`
- DNS：`api.lumiiapp.cn -> 193.112.92.111`
- HTTP：已由 Nginx 返回 `301 https://api.lumiiapp.cn$request_uri`
- HTTPS 证书：Let's Encrypt，证书路径为 `/etc/letsencrypt/live/api.lumiiapp.cn/`；同一证书 lineage 覆盖 `api.lumiiapp.cn`、`lumiiapp.cn` 和 `www.lumiiapp.cn`
- 当前证书到期日：2026-10-08
- 自动续期：`certbot.timer` 已安装，`certbot renew --dry-run` 已成功
- 服务器本机 HTTPS：`GET /health` 已返回 `state=success`
- 公网 HTTPS：`https://api.lumiiapp.cn/health` 已通过站外证书、SNI 与 HTTP 200 验证；`media.lumiiapp.cn` 由腾讯云境内 CDN 提供独立证书
- 裸域用途：`lumiiapp.cn` 与 `www.lumiiapp.cn` 不反向代理后台，根路径跳转到浏览器可读的隐私政策，其他路径保持 URI 跳到 `api.lumiiapp.cn`

腾讯云 CVM 绑定安全组必须持续保留以下基线规则：

```text
协议端口：TCP:443
来源：0.0.0.0/0
策略：允许
备注：Lumii API HTTPS
```

如实例启用了公网 IPv6，再补 `::/0` 的 TCP 443；当前服务主要使用公网 IPv4。

从非服务器网络持续验证：

```powershell
curl.exe -fsS https://api.lumiiapp.cn/health
curl.exe -sS -o NUL -w "%{http_code} %{redirect_url}" http://api.lumiiapp.cn/health
```

正式上线要求分别为：

- HTTPS 返回 `{"data":...,"state":"success"}`
- HTTP 返回 `301 https://api.lumiiapp.cn/health`

公网 API 两项均已满足；Android 真机通知授权、FCM token、Expo ticket/receipt 和通知点击仍按独立 Push 门禁验收。

## 2. Nginx 配置

仓库文件：

- `ops/nginx/lumii-bootstrap.conf`：首次签发证书前使用，开放 ACME Webroot 并保留 HTTP API。
- `ops/nginx/lumii.conf`：正式配置，API HTTP 跳 HTTPS，443 反向代理到 `127.0.0.1:8787`。

正式配置同时保留：

- IP 和 `media.lumiiapp.cn` 的原有 HTTP 回源，不破坏腾讯 CDN。
- `/downloads/` APK 静态目录。
- 200 MB 请求体上限。
- 15 秒连接超时和 180 秒读写超时，兼容 AI 创建任务与大文件请求。
- TLS 1.2/1.3 和 HSTS。
- 裸域/`www` 的独立 HTTP/HTTPS vhost：允许 ACME challenge，但不把未知 Host 代理到后台；浏览器入口统一跳到公开合规文本。

扩展现有证书 lineage 时先部署带裸域 ACME location 的 HTTP 配置，再执行：

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  --cert-name api.lumiiapp.cn --expand \
  -d api.lumiiapp.cn -d lumiiapp.cn -d www.lumiiapp.cn
```

签发后必须用 `openssl x509` 确认证书 SAN 同时包含三个名称，再启用正式 HTTPS vhost。不要创建第二套同名证书目录，避免续期时 Nginx 继续引用旧 lineage。

部署配置前必须执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3. 移动端 Release 安全默认

以下构建默认使用 `https://api.lumiiapp.cn`：

- EAS `preview` APK。
- EAS `production` AAB。
- 本地 `npm run build:android:apk` arm64 Release APK。

正式配置固定：

```text
EXPO_PUBLIC_API_MODE=http
EXPO_PUBLIC_API_BASE_URL=https://api.lumiiapp.cn
EXPO_PUBLIC_REQUIRE_HTTPS=true
LUMII_ALLOW_CLEARTEXT=false
```

Android 最终合并 Manifest 已验证：

- Release：`android:usesCleartextTraffic="false"`
- Debug：`android:usesCleartextTraffic="true"`

EAS `production` 会在安装依赖前运行 `mobile/scripts/validate-release-config.cjs`。以下任一情况都会直接阻止正式构建：

- API 不是 HTTPS。
- API 使用 IP、localhost 或非批准域名。
- 正式包启用明文流量。
- 正式包使用 mock API。
- 未显式开启 `EXPO_PUBLIC_REQUIRE_HTTPS`。
- `google-services.json` 缺失、JSON 非法，或 Firebase 项目不是 `lumii-lingban`。
- Firebase Android 客户端缺少 `com.lumii.lingban`、`mobilesdk_app_id`、项目编号或 API key。

本地正式 APK 在构建前还会自动运行 `mobile/scripts/verify-android-release-prerequisites.cjs`，并在构建后复验实包。也可以只运行预检而不打 APK：

```powershell
cd mobile
npm run validate:android-release
```

预检会确认 app.json 与 Gradle 的包名、版本一致，Firebase 文件属于正式项目，本机 keystore 可读取且证书 SHA-256 为既有生产签名。实包复验进一步要求仅一个签名者、APK v2 签名有效、证书不变、包名/版本一致且仅包含 `arm64-v8a`；任一条件不满足都不会复制到 `dist`。签名证书如需依法轮换，必须先按升级迁移方案调整门禁，不得直接替换 keystore。

Expo SDK 56 环境变量必须使用 `process.env.EXPO_PUBLIC_*` 点号静态引用，相关实现已按官方说明修正：

- https://docs.expo.dev/guides/environment-variables/
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/build-reference/npm-hooks/
- https://docs.expo.dev/versions/v56.0.0/config/app/#googleservicesfile-1
- https://docs.expo.dev/versions/v56.0.0/sdk/notifications/

## 4. HTTP 应急测试包

默认打包不再允许 HTTP。只有明确需要在 443 故障期间制作临时测试包时，才可显式设置：

```powershell
$env:LUMII_ALLOW_INSECURE_TEST_API='1'
npm run build:android:apk
```

该包会：

- 使用 `http://193.112.92.111`
- 设置 `usesCleartextTraffic=true`
- 文件名带 `insecure-test`

这种包不能作为正式候选包或提交应用市场。

## 5. 后台上线台账联动

服务器需配置：

```text
LUMII_PUBLIC_API_BASE_URL=https://api.lumiiapp.cn
LUMII_PUBLIC_API_PROBE_TIMEOUT_MS=6000
LUMII_PUBLIC_API_PROBE_CONNECT_ADDRESS=127.0.0.1
```

后台系统健康会使用 `api.lumiiapp.cn` 作为 Host/SNI，并通过 `127.0.0.1:443` 执行真实源站 TLS 与 `GET /health` 校验：

- 成功且响应 `state=success`：`public_api_https=ok`
- HTTP、证书/SNI 错误、超时、非 200 或响应格式错误：`public_api_https=bad`

同机连接地址只绕过云主机访问自身公网 IP 时可能发生的 NAT 回环限制，不跳过证书验证，也不会把 HTTP 当成 HTTPS。但它只能证明源站，不能证明真实公网链路。

服务端另外维护 `public_api_external_https` 证据：

- Nginx 必须覆盖 `Host`、`X-Real-IP`、`X-Forwarded-For`、`X-Forwarded-Host` 和 `X-Forwarded-Proto`。
- 后端只信任 `LUMII_TRUSTED_PROXY_IPS` 中的代理，默认仅 `127.0.0.1,::1`；客户端自带的伪造转发头不能覆盖 Nginx 的真实客户端 IP。
- 站外浏览器、真机或监控通过正式域名和 HTTPS 到达后端后，会自动记录不含客户端 IP、Token 或 User-Agent 的限时证明。
- 证明默认 24 小时有效，可通过 `LUMII_PUBLIC_API_EXTERNAL_PROOF_MAX_AGE_MS` 调整；过期后重新回到待验证。
- 上线台账 `api_https` 只有在源站 TLS 与站外证据同时有效时才为 `ready`。

生产服务器可用脱敏探针读取当前真实台账，不会输出管理员凭据、Token 或密钥：

```bash
sudo /opt/node-v24.18.0-linux-x64/bin/node scripts/probe-production-readiness.cjs
```
