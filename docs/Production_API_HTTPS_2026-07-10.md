# Lumii 正式 API HTTPS 与 Release 构建门禁

日期：2026-07-12

## 1. 当前域名与服务器状态

- 正式 API 域名：`api.lumiiapp.cn`
- DNS：`api.lumiiapp.cn -> 193.112.92.111`
- HTTP：已由 Nginx 返回 `301 https://api.lumiiapp.cn$request_uri`
- HTTPS 证书：Let's Encrypt，证书路径为 `/etc/letsencrypt/live/api.lumiiapp.cn/`
- 当前证书到期日：2026-10-08
- 自动续期：`certbot.timer` 已安装，`certbot renew --dry-run` 已成功
- 服务器本机 HTTPS：`GET /health` 已返回 `state=success`
- 公网 HTTPS：当前站外连接 TCP 443 成功，但 TLS ClientHello 在到达 Nginx 前被重置，`curl` 返回握手失败且 HTTP code 为 `000`
- 当前判断：源站 Nginx、证书和本机 SNI 校验正常；腾讯云公网/备案/边缘网络链路仍需恢复，不能把源站成功误报成公网可用

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

截至 2026-07-12，第一项仍未满足，因此生产 APK 可以完成安全构建，但不能视为真机联网验收通过。

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

Expo SDK 56 环境变量必须使用 `process.env.EXPO_PUBLIC_*` 点号静态引用，相关实现已按官方说明修正：

- https://docs.expo.dev/guides/environment-variables/
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/build-reference/npm-hooks/

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
