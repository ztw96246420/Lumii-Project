# Lumii 正式 API HTTPS 与 Release 构建门禁

日期：2026-07-10

## 1. 当前域名与服务器状态

- 正式 API 域名：`api.lumiiapp.cn`
- DNS：`api.lumiiapp.cn -> 193.112.92.111`
- HTTP：已由 Nginx 返回 `301 https://api.lumiiapp.cn$request_uri`
- HTTPS 证书：Let's Encrypt，证书路径为 `/etc/letsencrypt/live/api.lumiiapp.cn/`
- 当前证书到期日：2026-10-08
- 自动续期：`certbot.timer` 已安装，`certbot renew --dry-run` 已成功
- 服务器本机 HTTPS：`GET /health` 已返回 `state=success`
- 公网 HTTPS：Nginx 已记录外部网络 `GET /health` 返回 200，入站 TCP 443 已生效
- 当前开发电脑的 `FlClash` 网络路径会导致该域名 TLS 握手失败；这是本机代理路径问题，不是服务器或证书故障

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

预期分别为：

- HTTPS 返回 `{"data":...,"state":"success"}`
- HTTP 返回 `301 https://api.lumiiapp.cn/health`

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

后台系统健康会使用 `api.lumiiapp.cn` 作为 Host/SNI，并通过 `127.0.0.1:443` 执行真实 TLS 与 `GET /health` 校验：

- 成功且响应 `state=success`：`public_api_https=ok`
- HTTP、证书/SNI 错误、超时、非 200 或响应格式错误：`public_api_https=bad`

同机连接地址只绕过云主机访问自身公网 IP 时可能发生的 NAT 回环限制，不跳过证书验证，也不会把 HTTP 当成 HTTPS。公网安全组与外部可用性需继续由站外监控和 Nginx 外部访问证据覆盖；上线台账中的 `api_https` P0 负责阻断域名、TLS、证书和健康响应不合格的正式包。
