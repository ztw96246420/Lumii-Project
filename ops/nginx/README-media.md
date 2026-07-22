# Lumii media CDN origin deployment

The deployable `ops/nginx/lumii.conf` and certificate-bootstrap
`ops/nginx/lumii-bootstrap.conf` both contain an exact
`server_name media.lumiiapp.cn` HTTP origin vhost. This prevents the existing
HTTP `default_server` from forwarding the full Lumii API when it receives the
media Host header.

The media origin exposes only these read paths:

| Path | Allowed methods | Other requests |
| --- | --- | --- |
| `/storage/objects/*` | `GET`, `HEAD`, `OPTIONS` | denied |
| `/media/uploads/<media-id>/file` | `GET`, `HEAD`, `OPTIONS` | denied |
| every other path | none | `404` |

The backend remains bound to `127.0.0.1:8787`. Origin requests have bearer
credentials stripped before proxying.

## Launch architecture: HTTPS at the CDN edge, HTTP to origin

The current CDN fetches from `media.lumiiapp.cn:80`, so the origin vhost must
return media bytes instead of redirecting. Public HTTP-to-HTTPS enforcement is
a Tencent CDN edge rule, not an origin Nginx redirect. This avoids sending an
origin fetch back to the CDN and creating a redirect loop.

Launch rollout:

1. Replace the enabled production Nginx configuration with
   `ops/nginx/lumii.conf`.
2. Run `sudo nginx -t` before reloading Nginx.
3. Confirm the CDN origin still uses the server origin IP, HTTP port 80, and
   origin Host `media.lumiiapp.cn`.
4. Confirm the Tencent CDN edge redirects public HTTP to HTTPS and serves a
   valid certificate for `media.lumiiapp.cn`.
5. Verify a known object with `HEAD` and ranged `GET`; verify `/health`,
   `/admin`, and upload/write methods are not exposed through the media Host.

No media certificate or new origin port is required on the origin server for
this launch topology. TLS terminates at the CDN edge.

## Optional origin isolation after launch

`lumii-media-origin-http.example.conf` provides a fail-closed port-8081
listener for a later migration. It defaults to loopback only. Before enabling
it, add verified CDN origin-source CIDRs above `deny all` and restrict TCP/8081
to exactly the same CIDRs in both the cloud security group and host firewall.
Then change the CDN origin port and verify it before removing the port-80
media vhost.

The allowlist is defense in depth; do not build it from `X-Forwarded-For`,
because clients can spoof that header. Revalidate CDN source ranges before
every change. HTTPS origin on port 443 is another later option when an origin
certificate is installed.

## Backend environment

Install the systemd example as a real drop-in before restarting the backend:

```bash
sudo cp ops/systemd/lumii-backend.service.d/45-media-cdn.example.conf \
  /etc/systemd/system/lumii-backend.service.d/45-media-cdn.conf
sudo systemctl daemon-reload
sudo systemctl restart lumii-backend
sudo systemctl cat lumii-backend
```

`PET_AVATAR_PUBLIC_BASE_URL` controls media URLs returned to the App.
`MEDIA_PUBLIC_PROBE_BASE_URL` controls the independent admin health probe.
Both should use `https://media.lumiiapp.cn` after the CDN route is healthy.

The backend returns successful public media as
`Cache-Control: public, max-age=60, s-maxage=300`. The code caps browser
caching at 60 seconds and shared caching at 300 seconds until active CDN
purging exists. JSON, authorization, errors, and unsatisfiable range responses
use `Cache-Control: no-store`.

## Tencent CDN launch settings

In `CDN > Domain management > media.lumiiapp.cn > Manage`:

1. Confirm the origin is the real server IP, protocol `HTTP`, port `80`, and
   origin Host `media.lumiiapp.cn`. Never use the CDN hostname as its own
   origin.
2. In advanced node-cache expiry rules, make `All files: do not cache` the
   lowest-priority fallback. Add higher-priority directory rules for
   `/storage/objects` and `/media/uploads`, both set to `follow origin`, with
   heuristic and forced caching disabled.
3. Preserve URL parameters and case in the cache key. Do not ignore query
   parameters during the first rollout.
4. Disable status-code caching, or set every configured 4xx/5xx status to
   zero seconds. In particular, remove the default/non-zero 404 cache.
5. Enable edge `HTTP -> HTTPS` redirect, HTTP/2, TLS 1.2/1.3, and HSTS. Start
   HSTS at 300 seconds without `includeSubDomains`; increase it only after the
   redirect is stable.
6. Keep edge ports 80 and 443 enabled and disable 8080. Leave range-origin
   splitting off initially; enable it later only for verified large video
   paths.
7. After the server and CDN rules are published, refresh all cached content
   for `https://media.lumiiapp.cn/`. This is required to remove the historical
   API, authorization, HTTP-scheme, transformed-avatar, and negative-cache
   variants.

Tencent documents that dynamic/login/API routes must not be cached and that
an unmatched response without `Cache-Control` may otherwise be cached for 600
seconds. It also documents that a directory rule set to `follow origin`
honors `s-maxage`, while `no-store` and `private` remain uncacheable:

- <https://cloud.tencent.com/document/product/228/47672>
- <https://cloud.tencent.com/document/product/228/41536>
- <https://cloud.tencent.com/document/product/228/41688>
- <https://cloud.tencent.com/document/product/228/44867>
- <https://cloud.tencent.com/document/product/228/6299>

## Verification

Use a real, approved object key; encode `/` inside the object key as `%2F`.

```bash
curl -I http://media.lumiiapp.cn/storage/objects/<encoded-object-key>
curl -I https://media.lumiiapp.cn/storage/objects/<encoded-object-key>
curl -i -H 'Range: bytes=0-0' \
  https://media.lumiiapp.cn/storage/objects/<encoded-object-key>
curl -i -X POST \
  https://media.lumiiapp.cn/storage/objects/<encoded-object-key>
curl -i https://media.lumiiapp.cn/health
```

Expected public-edge results are an HTTP-to-HTTPS redirect, `200` for `HEAD`,
`200` or `206` for ranged `GET`, a denied write method, and `404` for
`/health`. Repeat the ranged `GET` and inspect the CDN cache headers and `Age`
value.

The origin itself intentionally does not redirect. Test the exact origin
vhost without changing DNS by using the origin IP:

```bash
curl -I --resolve media.lumiiapp.cn:80:<origin-ip> \
  http://media.lumiiapp.cn/storage/objects/<encoded-object-key>
curl -i --resolve media.lumiiapp.cn:80:<origin-ip> \
  http://media.lumiiapp.cn/health
```

Those origin checks should return the object response and `404`, respectively.

Until moderation rejection, account/pet deletion, and operator replacement
actively call the CDN purge API, a previously cached object can remain visible
for up to five minutes at an edge and one minute in a browser. Do not increase
those caps before the purge workflow exists.
