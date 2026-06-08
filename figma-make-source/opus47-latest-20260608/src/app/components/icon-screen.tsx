import { COLORS, PhoneFrame, HomeIndicator } from "./login-kit";

// =================================================================
// Lumii Icon — premium monogram
// Concept: a custom "L" stroke whose lower terminal blooms into a soft
// paw-pad bean, set on a deep peach gradient with inner light + glass
// highlight. A single teal spark at upper-right signals the AI companion.
// =================================================================
function LumiiIconArt({ size = 180, radius }: { size?: number; radius?: number }) {
  const s = size;
  const rPct = radius != null ? (radius / s) * 200 : 45; // 22.5% iOS continuous
  return (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <defs>
        {/* Deep warm gradient — like late afternoon sun on terracotta */}
        <linearGradient id="bg-warm" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#FFB182" />
          <stop offset="0.45" stopColor="#FF8A5C" />
          <stop offset="1" stopColor="#D85F35" />
        </linearGradient>
        {/* Top sheen */}
        <radialGradient id="bg-sheen" cx="30%" cy="10%" r="80%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Bottom warm vignette to add depth */}
        <radialGradient id="bg-vignette" cx="70%" cy="100%" r="80%">
          <stop offset="0" stopColor="#7A2C0F" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7A2C0F" stopOpacity="0" />
        </radialGradient>
        {/* Mark gradient — warm ivory with subtle warm tint */}
        <linearGradient id="mark-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#FFF6EC" />
          <stop offset="1" stopColor="#FBE6D2" />
        </linearGradient>
        {/* Mark inner shadow */}
        <filter id="mark-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7A2C0F" floodOpacity="0.25" />
        </filter>
        {/* Spark gradient */}
        <radialGradient id="spark-l" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#7FDDD2" />
          <stop offset="0.7" stopColor="#4DB6AC" />
          <stop offset="1" stopColor="#3A968D" />
        </radialGradient>
        <clipPath id="bg-clip">
          <rect x="0" y="0" width="200" height="200" rx={rPct} ry={rPct} />
        </clipPath>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="200" height="200" rx={rPct} ry={rPct} fill="url(#bg-warm)" />

      <g clipPath="url(#bg-clip)">
        {/* Deep warm vignette at bottom-right */}
        <rect x="0" y="0" width="200" height="200" fill="url(#bg-vignette)" />
        {/* Top sheen */}
        <rect x="0" y="0" width="200" height="200" fill="url(#bg-sheen)" />

        {/* Faint orbital ring — adds dimension */}
        <ellipse
          cx="100"
          cy="100"
          rx="78"
          ry="78"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.08"
          strokeWidth="1"
        />

        {/* Paw mark — anatomically balanced: 1 heart pad + 4 toes in arc */}
        <g filter="url(#mark-shadow)">
          {/* Main heart-bean pad */}
          <path
            d="
              M 100 104
              C 76 104, 60 124, 60 144
              C 60 162, 78 170, 100 170
              C 122 170, 140 162, 140 144
              C 140 124, 124 104, 100 104 Z
            "
            fill="url(#mark-l)"
          />
          {/* 4 toes — fanned in upper arc */}
          <ellipse
            cx="60"
            cy="92"
            rx="11.5"
            ry="15"
            fill="url(#mark-l)"
            transform="rotate(-20 60 92)"
          />
          <ellipse
            cx="84"
            cy="70"
            rx="12.5"
            ry="16"
            fill="url(#mark-l)"
            transform="rotate(-7 84 70)"
          />
          <ellipse
            cx="116"
            cy="70"
            rx="12.5"
            ry="16"
            fill="url(#mark-l)"
            transform="rotate(7 116 70)"
          />
          <ellipse
            cx="140"
            cy="92"
            rx="11.5"
            ry="15"
            fill="url(#mark-l)"
            transform="rotate(20 140 92)"
          />
        </g>

        {/* Teal companion spark — top-right */}
        <g transform="translate(150 56)">
          <circle r="13" fill="url(#spark-l)" opacity="0.35" />
          <circle r="7" fill="url(#spark-l)" />
          <circle r="2.4" cx="-1.6" cy="-1.6" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* Inner edge highlight */}
        <rect
          x="0.5"
          y="0.5"
          width="199"
          height="199"
          rx={rPct}
          ry={rPct}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

function LumiiIconRound({ size = 180 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow:
          "0 14px 32px -12px rgba(216,95,53,0.55), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <LumiiIconArt size={size} radius={size / 2} />
    </div>
  );
}

// Mono themed icon — ivory mark on charcoal
function LumiiIconMono({ size = 100 }: { size?: number }) {
  const r = size * 0.235;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: "#1B1C19",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 18px -8px rgba(0,0,0,0.4)",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 200 200">
        <path
          d="M 100 104 C 76 104, 60 124, 60 144 C 60 162, 78 170, 100 170
             C 122 170, 140 162, 140 144 C 140 124, 124 104, 100 104 Z"
          fill="#FFFFFF"
        />
        <ellipse cx="60" cy="92" rx="11.5" ry="15" fill="#FFFFFF" transform="rotate(-20 60 92)" />
        <ellipse cx="84" cy="70" rx="12.5" ry="16" fill="#FFFFFF" transform="rotate(-7 84 70)" />
        <ellipse cx="116" cy="70" rx="12.5" ry="16" fill="#FFFFFF" transform="rotate(7 116 70)" />
        <ellipse cx="140" cy="92" rx="11.5" ry="15" fill="#FFFFFF" transform="rotate(20 140 92)" />
      </svg>
    </div>
  );
}

function IconCard({
  children,
  label,
  sub,
}: {
  children: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        padding: "16px 12px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {children}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10.5, color: COLORS.subText, marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function HomeScreenSim({ android }: { android?: boolean }) {
  const apps = [
    { c: "#1AAD19", l: "微信" },
    { c: "#07C160", l: "钱包" },
    { c: "#FF4E3A", l: "小红书" },
    { c: "#111", l: "抖音" },
    { c: "#FE2C55", l: "美团" },
    { c: "#0079FF", l: "Safari" },
    { c: "#34C759", l: "电话" },
    { c: "lumii", l: "Lumii" },
  ];
  return (
    <div
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 22,
        background:
          "linear-gradient(160deg, #2D2A25 0%, #3F3B33 50%, #5A4F40 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,138,92,0.22) 0%, rgba(255,138,92,0) 70%)",
          top: -50,
          left: -50,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 140,
          height: 140,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(77,182,172,0.18) 0%, rgba(77,182,172,0) 70%)",
          bottom: -40,
          right: -30,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {apps.map((a) => (
          <div
            key={a.l}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
            }}
          >
            {a.c === "lumii" ? (
              android ? (
                <LumiiIconRound size={50} />
              ) : (
                <div
                  style={{
                    boxShadow:
                      "0 8px 16px -4px rgba(216,95,53,0.55), 0 0 0 1px rgba(0,0,0,0.06)",
                    borderRadius: 12,
                  }}
                >
                  <LumiiIconArt size={50} />
                </div>
              )
            ) : (
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: android ? "50%" : 12,
                  background: a.c,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                }}
              />
            )}
            <div style={{ fontSize: 9, color: "#FFFFFF", fontWeight: 500 }}>
              {a.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================
// Screen 74 · App Icon (premium)
// =================================================================
export function Screen74() {
  const colorChips = [
    { c: "#D85F35", l: "暮色橘" },
    { c: "#FF8A5C", l: "主橙" },
    { c: "#FFB182", l: "晨曦橙" },
    { c: "#FBE6D2", l: "象牙暖白" },
    { c: "#4DB6AC", l: "灵伴青" },
    { c: "#1B1C19", l: "墨黑" },
  ];

  return (
    <PhoneFrame label="74 · App 图标 · Premium Monogram">
      <div style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 20px 14px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.2 }}>
            App 图标
          </div>
          <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 4 }}>
            Lumii 灵伴 · 极简爪印 · 灵伴青色光点
          </div>
        </div>

        {/* Hero — dark stage for contrast */}
        <div
          style={{
            margin: "0 16px 18px",
            padding: "28px 16px 22px",
            background:
              "linear-gradient(160deg, #2A2722 0%, #3A342C 100%)",
            borderRadius: 22,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* ambient halos */}
          <div
            style={{
              position: "absolute",
              right: -60,
              top: -60,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,138,92,0.28) 0%, rgba(255,138,92,0) 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -50,
              bottom: -50,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(77,182,172,0.18) 0%, rgba(77,182,172,0) 70%)",
            }}
          />

          <div
            style={{
              position: "relative",
              borderRadius: 40,
              boxShadow:
                "0 30px 60px -20px rgba(216,95,53,0.7), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            <LumiiIconArt size={172} />
          </div>
          <div style={{ textAlign: "center", position: "relative" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
              Lumii 灵伴
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.55)",
                marginTop: 4,
                letterSpacing: 0.8,
              }}
            >
              YOUR PET · YOUR SPIRIT COMPANION
            </div>
          </div>
        </div>

        {/* Construction grid */}
        <div style={{ padding: "0 16px", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: COLORS.subText,
              padding: "0 4px 8px",
              letterSpacing: 0.4,
            }}
          >
            构图说明
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 16,
              padding: 14,
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", width: 96, height: 96 }}>
              <LumiiIconArt size={96} />
              {/* construction overlay */}
              <svg
                width={96}
                height={96}
                viewBox="0 0 200 200"
                style={{ position: "absolute", inset: 0 }}
              >
                <circle cx="100" cy="100" r="78" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeDasharray="3 3" />
                <line x1="100" y1="20" x2="100" y2="180" stroke="#FFFFFF" strokeOpacity="0.3" strokeDasharray="2 3" />
                <line x1="20" y1="100" x2="180" y2="100" stroke="#FFFFFF" strokeOpacity="0.3" strokeDasharray="2 3" />
              </svg>
            </div>
            <div style={{ flex: 1, fontSize: 11.5, color: COLORS.subText, lineHeight: 1.7 }}>
              <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>
                一枚爪印 · 一个陪伴
              </div>
              4 颗脚趾沿黄金弧线展开 + 心形主肉垫居中，整体内切于 78px 安全圆。右上青绿光点为 AI 灵伴的呼吸感。
            </div>
          </div>
        </div>

        {/* Variants */}
        <div style={{ padding: "0 16px", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: COLORS.subText,
              padding: "0 4px 8px",
              letterSpacing: 0.4,
            }}
          >
            平台形态
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <IconCard label="iOS" sub="圆角 22.5%">
              <div
                style={{
                  borderRadius: 18,
                  boxShadow:
                    "0 10px 22px -8px rgba(216,95,53,0.5), 0 0 0 1px rgba(0,0,0,0.04)",
                }}
              >
                <LumiiIconArt size={78} />
              </div>
            </IconCard>
            <IconCard label="Android" sub="自适应圆形">
              <LumiiIconRound size={78} />
            </IconCard>
            <IconCard label="主题图标" sub="单色 Mono">
              <LumiiIconMono size={78} />
            </IconCard>
          </div>
        </div>

        {/* Home screen previews */}
        <div style={{ padding: "0 16px", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: COLORS.subText,
              padding: "0 4px 8px",
              letterSpacing: 0.4,
            }}
          >
            桌面预览
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <HomeScreenSim />
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.subText,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                iOS 主屏
              </div>
            </div>
            <div>
              <HomeScreenSim android />
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.subText,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Android 主屏
              </div>
            </div>
          </div>
        </div>

        {/* Color tokens */}
        <div style={{ padding: "0 16px", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: COLORS.subText,
              padding: "0 4px 8px",
              letterSpacing: 0.4,
            }}
          >
            色彩规范
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 8,
            }}
          >
            {colorChips.map((c) => (
              <div
                key={c.l}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: c.c,
                    border: `1px solid ${COLORS.line}`,
                  }}
                />
                <div style={{ fontSize: 9.5, color: COLORS.subText }}>
                  {c.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            margin: "0 16px 14px",
            padding: 12,
            background: "#FFF7F0",
            border: "1px solid #FFE0CC",
            borderRadius: 12,
            fontSize: 11,
            color: COLORS.subText,
            lineHeight: 1.7,
          }}
        >
          交付：iOS 1024 PNG · Android 432×432 前景/背景/主题三件套 · SVG 矢量源
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
