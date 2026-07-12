import type { CSSProperties, ReactNode } from "react";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { LumiiPromoProps } from "./Root";

const C = {
  orange: "#FF8A5C",
  orangeDeep: "#E9683A",
  orangeSoft: "#FFF0E8",
  teal: "#4DB6AC",
  tealSoft: "#E1F7F4",
  bone: "#FBF7F1",
  ink: "#1B1C19",
  muted: "#7A7972",
  border: "#ECE7DE",
  white: "#FFFFFF",
};

const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const AUDIO_MASTER_GAIN = 1.584893192; // +4 dB, measured final mix: about -16 LUFS / -1.8 dBTP.

const ASSET = {
  original: "assets/v2/user-dog-original-video.jpg",
  generated: "assets/v2/user-dog-generated-video.jpg",
  home: "assets/v2/ui-home-current.png",
  discover: "assets/v2/ui-discover-current.png",
  map: "assets/v2/ui-map-current.png",
  health: "assets/v2/ui-health-current.png",
} as const;

const rise = (frame: number, start = 0, end = 18) =>
  interpolate(frame, [start, end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

const enter = (frame: number, start = 0, end = 16) =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

const pulse = (frame: number, speed = 12) => 1 + Math.sin(frame / speed) * 0.025;

const Paw = ({ color = C.white, size = 42 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="40" rx="16" ry="14" fill={color} />
    <ellipse cx="15" cy="25" rx="7" ry="9" rotate="-25" fill={color} />
    <ellipse cx="29" cy="17" rx="7" ry="9" rotate="-5" fill={color} />
    <ellipse cx="45" cy="20" rx="7" ry="9" rotate="18" fill={color} />
    <ellipse cx="53" cy="34" rx="7" ry="9" rotate="32" fill={color} />
  </svg>
);

const HeartPulse = ({ color = C.orange, size = 48 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <path
      d="M32 54C20 45 9 36 9 23.5C9 15.5 14.7 10 22.2 10C26.7 10 30 12.3 32 15.5C34 12.3 37.3 10 41.8 10C49.3 10 55 15.5 55 23.5C55 36 44 45 32 54Z"
      stroke={color}
      strokeWidth="5"
      strokeLinejoin="round"
    />
    <path d="M16 32H25L29 24L35 40L39 32H49" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MapPin = ({ color = C.teal, size = 44 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <path d="M32 57C32 57 51 39 51 24C51 13.5 42.5 5 32 5C21.5 5 13 13.5 13 24C13 39 32 57 32 57Z" fill={color} />
    <circle cx="32" cy="24" r="8" fill={C.white} />
  </svg>
);

const Backdrop = ({
  children,
  dark = false,
  accent = C.orange,
}: {
  children: ReactNode;
  dark?: boolean;
  accent?: string;
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background: dark
          ? "linear-gradient(160deg, #151816 0%, #20312E 58%, #16201E 100%)"
          : "linear-gradient(155deg, #FFF9F4 0%, #FBF7F1 55%, #F5ECE3 100%)",
        color: dark ? C.white : C.ink,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: 999,
          left: -280,
          top: -230,
          opacity: dark ? 0.2 : 0.16,
          background: accent,
          filter: "blur(100px)",
          translate: `${Math.sin(frame / 30) * 38}px ${Math.cos(frame / 40) * 30}px`,
          scale: pulse(frame, 18),
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 660,
          height: 660,
          borderRadius: 999,
          right: -330,
          bottom: 150,
          opacity: dark ? 0.2 : 0.14,
          background: C.teal,
          filter: "blur(110px)",
          translate: `${Math.cos(frame / 34) * 34}px ${Math.sin(frame / 29) * 26}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: dark ? 0.13 : 0.08,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "82px 82px",
          translate: `${-(frame % 82)}px ${-(frame % 82)}px`,
          maskImage: "linear-gradient(to bottom, black, transparent 75%)",
        }}
      />
      {Array.from({ length: 18 }).map((_, i) => {
        const x = (i * 149 + 73) % 1080;
        const y = (i * 257 + frame * (0.7 + (i % 4) * 0.18)) % 2100;
        const size = 3 + (i % 4) * 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: 1960 - y,
              width: size,
              height: size,
              borderRadius: 99,
              background: i % 3 === 0 ? C.orange : i % 3 === 1 ? C.teal : C.white,
              opacity: dark ? 0.45 : 0.32,
              boxShadow: `0 0 ${size * 4}px currentColor`,
            }}
          />
        );
      })}
      {children}
    </AbsoluteFill>
  );
};

const Wordmark = ({ light = false, compact = false }: { light?: boolean; compact?: boolean }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 16 : 22,
        opacity: enter(frame, 0, 14),
        translate: `0 ${rise(frame, 0, 14) * 34}px`,
      }}
    >
      <div
        style={{
          width: compact ? 70 : 92,
          height: compact ? 70 : 92,
          borderRadius: compact ? 22 : 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(145deg, #FFA77F, ${C.orangeDeep})`,
          boxShadow: "0 18px 50px rgba(233,104,58,0.28)",
          rotate: `${Math.sin(frame / 17) * 2}deg`,
        }}
      >
        <Paw size={compact ? 40 : 52} />
      </div>
      <div>
        <div style={{ fontSize: compact ? 38 : 52, fontWeight: 900, letterSpacing: -2, color: light ? C.white : C.ink }}>
          Lumii 灵伴
        </div>
        {!compact && (
          <div style={{ marginTop: 2, fontSize: 25, fontWeight: 600, letterSpacing: 4, color: light ? "rgba(255,255,255,0.66)" : C.muted }}>
            真实宠物的数字伙伴
          </div>
        )}
      </div>
    </div>
  );
};

const Phone = ({
  src,
  width = 600,
  height = 1330,
  objectPosition = "center top",
  style,
}: {
  src: string;
  width?: number;
  height?: number;
  objectPosition?: CSSProperties["objectPosition"];
  style?: CSSProperties;
}) => (
  <div
    style={{
      width,
      height,
      padding: 14,
      borderRadius: 82,
      background: "linear-gradient(145deg, #191A18, #4C4B45)",
      boxShadow: "0 52px 110px rgba(34,28,23,0.28), 0 10px 28px rgba(34,28,23,0.22)",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}
  >
    <div style={{ width: "100%", height: "100%", borderRadius: 68, overflow: "hidden", position: "relative", background: C.bone }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(115deg, rgba(255,255,255,0.25) 0%, transparent 22%, transparent 72%, rgba(255,255,255,0.12) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
    <div style={{ position: "absolute", top: 28, left: "50%", translate: "-50% 0", width: 104, height: 25, borderRadius: 99, background: "#171816" }} />
  </div>
);

const MotionCompanionCard = ({ frame }: { frame: number }) => {
  const bob = Math.sin(frame / 8.5) * 11;
  const tilt = Math.sin(frame / 18) * 2.2;
  const breathe = 1 + Math.sin(frame / 10) * 0.014;

  return (
    <div
      style={{
        width: 500,
        height: 610,
        padding: 18,
        borderRadius: 70,
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(255,255,255,0.62)",
        boxShadow: "0 42px 100px rgba(0,0,0,0.34)",
        overflow: "hidden",
        position: "relative",
        translate: `0 ${bob}px`,
        rotate: `${tilt}deg`,
        scale: breathe,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 18,
          borderRadius: 54,
          background: "radial-gradient(circle at 50% 34%, #FFFFFF 0%, #FFF8EE 62%, #FBE8D7 100%)",
        }}
      />
      <Img
        src={staticFile(ASSET.generated)}
        style={{
          position: "absolute",
          left: 18,
          top: 12,
          width: 464,
          height: 520,
          objectFit: "contain",
          filter: "drop-shadow(0 22px 28px rgba(101,63,31,0.18))",
          translate: `${Math.sin(frame / 23) * 3}px ${Math.sin(frame / 10) * -2}px`,
          scale: 1 + Math.sin(frame / 12) * 0.01,
        }}
      />
      {[0, 1, 2].map((i) => {
        const sparkle = 0.7 + Math.sin(frame / 6 + i * 1.8) * 0.3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: [55, 392, 410][i],
              top: [92, 128, 330][i],
              color: i === 1 ? C.teal : C.orange,
              fontSize: [36, 28, 34][i],
              fontWeight: 900,
              opacity: sparkle,
              rotate: `${frame * (i % 2 ? -0.8 : 0.8)}deg`,
              scale: 0.7 + sparkle * 0.3,
            }}
          >
            ✦
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 26,
          bottom: 25,
          padding: "11px 18px",
          borderRadius: 999,
          background: "rgba(27,28,25,0.82)",
          color: C.white,
          fontSize: 22,
          fontWeight: 850,
          letterSpacing: 1,
        }}
      >
        ✦ 灵伴动效演示
      </div>
    </div>
  );
};

const HookScene = () => {
  const frame = useCurrentFrame();
  const secondLine = frame > 14;
  return (
    <Backdrop dark accent={C.orange}>
      <div style={{ position: "absolute", left: 84, top: 112 }}>
        <Wordmark light compact />
      </div>

      <div style={{ position: "absolute", left: 82, right: 82, top: 330 }}>
        <div
          style={{
            fontSize: 98,
            lineHeight: 1.04,
            fontWeight: 900,
            letterSpacing: -5,
            opacity: enter(frame, 4, 18),
            translate: `0 ${rise(frame, 4, 18) * 70}px`,
          }}
        >
          如果它能
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 112,
            lineHeight: 1.05,
            fontWeight: 950,
            letterSpacing: -6,
            color: C.orange,
            opacity: secondLine ? enter(frame, 14, 30) : 0,
            translate: `0 ${rise(frame, 14, 30) * 90}px`,
            textShadow: "0 18px 60px rgba(255,138,92,0.28)",
          }}
        >
          从照片里
          <br />
          跑出来？
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 174,
          bottom: 158,
          width: 730,
          height: 730,
          borderRadius: 120,
          background: "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "0 50px 110px rgba(0,0,0,0.34)",
          overflow: "hidden",
          opacity: enter(frame, 23, 42),
          translate: `0 ${rise(frame, 23, 42) * 120}px`,
          scale: interpolate(frame, [23, 46], [0.82, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        }}
      >
        <Img
          src={staticFile(ASSET.original)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "36% 34%", scale: 1.03 }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 9,
            top: interpolate(frame, [28, 90], [-30, 760], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }),
            background: C.teal,
            boxShadow: "0 0 34px 12px rgba(77,182,172,0.75)",
          }}
        />
        <div style={{ position: "absolute", left: 34, top: 34, padding: "14px 20px", borderRadius: 999, background: "rgba(22,26,24,0.74)", color: C.white, fontSize: 27, fontWeight: 800 }}>
          用户原图
        </div>
        <div style={{ position: "absolute", right: 34, bottom: 34, padding: "14px 20px", borderRadius: 999, background: C.teal, color: C.white, fontSize: 27, fontWeight: 800 }}>
          正在唤醒灵伴
        </div>
      </div>
    </Backdrop>
  );
};

const BirthScene = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [12, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.72, 0, 0.28, 1),
  });
  return (
    <Backdrop accent={C.orange}>
      <div style={{ position: "absolute", left: 82, right: 82, top: 106 }}>
        <div style={{ fontSize: 29, color: C.teal, fontWeight: 850, letterSpacing: 5, opacity: enter(frame, 0, 12) }}>一张照片 · 一次相遇</div>
        <div
          style={{
            marginTop: 24,
            fontSize: 92,
            lineHeight: 1.06,
            fontWeight: 950,
            letterSpacing: -5,
            opacity: enter(frame, 2, 18),
            translate: `0 ${rise(frame, 2, 18) * 54}px`,
          }}
        >
          遇见你的
          <br />
          <span style={{ color: C.orange }}>专属电子灵伴</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 94,
          top: 510,
          width: 892,
          height: 1030,
          borderRadius: 108,
          background: C.white,
          border: `1px solid ${C.border}`,
          boxShadow: "0 58px 120px rgba(89,57,35,0.18)",
          overflow: "hidden",
          opacity: enter(frame, 7, 26),
          scale: interpolate(frame, [7, 28], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        }}
      >
        <Img
          src={staticFile(ASSET.original)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "37% 31%", filter: "saturate(0.9) brightness(1.02)", scale: 1.02 }}
        />
        <div style={{ position: "absolute", inset: 0, width: `${reveal * 100}%`, overflow: "hidden" }}>
          <Img src={staticFile(ASSET.generated)} style={{ position: "absolute", inset: 0, width: 892, height: 1030, objectFit: "cover", objectPosition: "center center", scale: 1.01 }} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${reveal * 100}%`,
            width: 9,
            background: C.teal,
            boxShadow: "0 0 42px 18px rgba(77,182,172,0.72)",
            translate: "-4px 0",
          }}
        />
        <div style={{ position: "absolute", top: 34, left: 34, padding: "14px 22px", borderRadius: 999, background: "rgba(27,28,25,0.76)", color: C.white, fontSize: 27, fontWeight: 800 }}>
          {reveal < 0.55 ? "用户原图" : "本次生成效果"}
        </div>
        <div style={{ position: "absolute", right: 34, bottom: 34, padding: "12px 20px", borderRadius: 999, background: "rgba(255,255,255,0.88)", color: C.muted, fontSize: 23, fontWeight: 700, backdropFilter: "blur(16px)" }}>
          同一只狗 · 真实案例
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 122,
          right: 122,
          bottom: 120,
          display: "flex",
          justifyContent: "center",
          gap: 18,
          opacity: enter(frame, 70, 92),
          translate: `0 ${rise(frame, 70, 92) * 36}px`,
        }}
      >
        {["保留毛色", "保留神态", "只属于 TA"].map((label, i) => (
          <div key={label} style={{ padding: "16px 23px", borderRadius: 999, background: i === 2 ? C.orange : C.tealSoft, color: i === 2 ? C.white : C.teal, fontSize: 25, fontWeight: 850 }}>
            {label}
          </div>
        ))}
      </div>
    </Backdrop>
  );
};

const CompanionScene = () => {
  const frame = useCurrentFrame();
  return (
    <Backdrop dark accent={C.teal}>
      <div style={{ position: "absolute", left: 82, right: 82, top: 106, zIndex: 3 }}>
        <div style={{ fontSize: 28, fontWeight: 850, letterSpacing: 5, color: C.teal, opacity: enter(frame, 0, 12) }}>不替代现实陪伴</div>
        <div
          style={{
            marginTop: 22,
            fontSize: 93,
            lineHeight: 1.06,
            letterSpacing: -5,
            fontWeight: 950,
            opacity: enter(frame, 3, 20),
            translate: `0 ${rise(frame, 3, 20) * 58}px`,
          }}
        >
          熟悉的它
          <br />
          <span style={{ color: C.orange }}>在首页动起来</span>
        </div>
      </div>

      <Phone
        src={ASSET.home}
        width={640}
        height={1420}
        style={{
          position: "absolute",
          left: 310,
          top: 470,
          rotate: `${interpolate(frame, [0, 25], [8, 1.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}deg`,
          translate: `${interpolate(frame, [0, 25], [170, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px ${rise(frame, 0, 25) * 90}px`,
          scale: interpolate(frame, [0, 25], [0.86, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 58,
          top: 710,
          zIndex: 5,
          opacity: enter(frame, 24, 43),
          translate: `${rise(frame, 24, 43) * -95}px 0`,
          scale: interpolate(frame, [24, 44], [0.84, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        }}
      >
        <MotionCompanionCard frame={frame} />
      </div>

      <div
        style={{
          position: "absolute",
          right: 52,
          bottom: 205,
          width: 500,
          padding: "28px 34px",
          borderRadius: "38px 38px 10px 38px",
          background: C.orange,
          color: C.white,
          fontSize: 32,
          lineHeight: 1.35,
          fontWeight: 850,
          boxShadow: "0 26px 70px rgba(255,138,92,0.25)",
          opacity: enter(frame, 63, 82),
          translate: `${rise(frame, 63, 82) * 70}px 0`,
          zIndex: 5,
        }}
      >
        我在呀，今天想去哪？
      </div>
    </Backdrop>
  );
};

const MetricCard = ({
  frame,
  delay,
  icon,
  label,
  value,
  accent,
  top,
}: {
  frame: number;
  delay: number;
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
  top: number;
}) => (
  <div
    style={{
      position: "absolute",
      right: 54,
      top,
      width: 520,
      minHeight: 198,
      padding: "30px 34px",
      borderRadius: 40,
      background: "rgba(255,255,255,0.96)",
      color: C.ink,
      border: "1px solid rgba(255,255,255,0.5)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
      display: "flex",
      alignItems: "center",
      gap: 26,
      opacity: enter(frame, delay, delay + 17),
      translate: `${rise(frame, delay, delay + 17) * 130}px 0`,
      scale: interpolate(frame, [delay, delay + 17], [0.88, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
    }}
  >
    <div style={{ width: 96, height: 96, borderRadius: 28, background: `${accent}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 25, color: C.muted, fontWeight: 750 }}>{label}</div>
      <div style={{ marginTop: 7, fontSize: 51, lineHeight: 1.05, fontWeight: 950, color: accent }}>{value}</div>
    </div>
  </div>
);

const MemoryScene = () => {
  const frame = useCurrentFrame();
  return (
    <Backdrop dark accent={C.orange}>
      <div style={{ position: "absolute", left: 82, right: 72, top: 102, zIndex: 5 }}>
        <div style={{ color: C.orange, fontSize: 29, fontWeight: 850, letterSpacing: 5, opacity: enter(frame, 0, 12) }}>当前健康页 · 真实界面</div>
        <div
          style={{
            marginTop: 22,
            fontSize: 91,
            lineHeight: 1.07,
            fontWeight: 950,
            letterSpacing: -5,
            opacity: enter(frame, 2, 18),
            translate: `0 ${rise(frame, 2, 18) * 55}px`,
          }}
        >
          每个重要日子
          <br />
          <span style={{ color: C.teal }}>都被认真记住</span>
        </div>
      </div>

      <Phone
        src={ASSET.health}
        width={560}
        height={1245}
        style={{
          position: "absolute",
          left: -100,
          top: 560,
          rotate: `${interpolate(frame, [0, 28], [-10, -4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}deg`,
          translate: `${interpolate(frame, [0, 28], [-180, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px 0`,
          opacity: enter(frame, 0, 20),
        }}
      />

      <MetricCard frame={frame} delay={20} top={690} accent={C.teal} icon={<HeartPulse color={C.teal} size={54} />} label="今日健康分" value="96 / 100" />
      <MetricCard frame={frame} delay={40} top={920} accent={C.orange} icon={<span style={{ fontSize: 54 }}>✦</span>} label="疫苗 / 驱虫计划" value="待添加" />
      <MetricCard frame={frame} delay={60} top={1150} accent={C.teal} icon={<span style={{ fontSize: 52 }}>↗</span>} label="当前体重" value="28.6 kg" />

      <div
        style={{
          position: "absolute",
          left: 210,
          right: 82,
          bottom: 122,
          padding: "28px 34px",
          borderRadius: 34,
          background: "rgba(255,138,92,0.16)",
          border: "1px solid rgba(255,138,92,0.3)",
          color: C.white,
          fontSize: 30,
          lineHeight: 1.4,
          fontWeight: 700,
          opacity: enter(frame, 75, 92),
          translate: `0 ${rise(frame, 75, 92) * 40}px`,
        }}
      >
        体重、疫苗与宠物日历，重要的事不再忘记。
      </div>
    </Backdrop>
  );
};

const SocialScene = () => {
  const frame = useCurrentFrame();
  const swap = enter(frame, 36, 52);
  return (
    <Backdrop accent={C.teal}>
      <div style={{ position: "absolute", left: 82, right: 82, top: 98, zIndex: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 850, letterSpacing: 5, color: C.teal, opacity: enter(frame, 0, 12) }}>轻松认识附近宠友</div>
        <div
          style={{
            position: "relative",
            marginTop: 22,
            fontSize: 87,
            lineHeight: 1.08,
            fontWeight: 950,
            letterSpacing: -5,
            opacity: enter(frame, 2, 18),
            translate: `0 ${rise(frame, 2, 18) * 54}px`,
          }}
        >
          <div style={{ opacity: 1 - swap * 0.72, color: C.muted, textDecoration: swap > 0.5 ? "line-through" : "none", textDecorationThickness: 8 }}>不是人找人</div>
          <div
            style={{
              marginTop: 10,
              color: C.orange,
              opacity: swap,
              translate: `${(1 - swap) * -80}px 0`,
              scale: 0.86 + swap * 0.14,
              textShadow: "0 18px 50px rgba(255,138,92,0.22)",
            }}
          >
            是宠物遇见宠物
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: -60,
          top: 610,
          width: 470,
          height: 1050,
          borderRadius: 60,
          overflow: "hidden",
          opacity: 0.76 * enter(frame, 5, 24),
          rotate: "8deg",
          filter: "saturate(0.9)",
          boxShadow: "0 28px 72px rgba(0,0,0,0.18)",
        }}
      >
        <Img src={staticFile(ASSET.map)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      <Phone
        src={ASSET.discover}
        width={540}
        height={1200}
        style={{
          position: "absolute",
          left: -82,
          top: 565,
          rotate: `${interpolate(frame, [0, 24], [-12, -5.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}deg`,
          translate: `${interpolate(frame, [0, 24], [-145, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px 0`,
          opacity: enter(frame, 7, 25),
          zIndex: 3,
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 52,
          top: 590,
          padding: "12px 18px",
          borderRadius: 999,
          background: C.white,
          color: C.teal,
          fontSize: 22,
          fontWeight: 850,
          boxShadow: "0 16px 40px rgba(41,74,70,0.18)",
          opacity: enter(frame, 34, 52),
          zIndex: 7,
        }}
      >
        当前宠友圈 + 地图
      </div>

      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          bottom: 104,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 32px",
          borderRadius: 38,
          background: C.ink,
          color: C.white,
          boxShadow: "0 28px 75px rgba(27,28,25,0.26)",
          opacity: enter(frame, 70, 92),
          translate: `0 ${rise(frame, 70, 92) * 60}px`,
          zIndex: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <MapPin size={50} />
          <div>
            <div style={{ fontSize: 31, fontWeight: 900 }}>让毛孩子先打招呼</div>
            <div style={{ marginTop: 3, fontSize: 21, color: "rgba(255,255,255,0.62)", fontWeight: 650 }}>模糊距离 · 轻松约遛</div>
          </div>
        </div>
        <div style={{ padding: "13px 20px", borderRadius: 999, background: C.orange, color: C.white, fontSize: 24, fontWeight: 900 }}>打个招呼</div>
      </div>
    </Backdrop>
  );
};

const CtaScene = ({ recruitmentLabel, cta, ctaNote }: Pick<LumiiPromoProps, "recruitmentLabel" | "cta" | "ctaNote">) => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [0, 120], [0.72, 1.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  return (
    <Backdrop accent={C.orange}>
      <div style={{ position: "absolute", left: 82, top: 104 }}>
        <Wordmark />
      </div>

      <div style={{ position: "absolute", left: 82, right: 82, top: 360, zIndex: 5 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "13px 21px",
            borderRadius: 999,
            background: C.tealSoft,
            color: C.teal,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 2,
            opacity: enter(frame, 3, 17),
            translate: `0 ${rise(frame, 3, 17) * 30}px`,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 99, background: C.teal, boxShadow: "0 0 0 7px rgba(77,182,172,0.14)" }} />
          现在，轮到你和 TA
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 101,
            lineHeight: 1.04,
            fontWeight: 950,
            letterSpacing: -6,
            color: C.ink,
            opacity: enter(frame, 7, 25),
            translate: `0 ${rise(frame, 7, 25) * 65}px`,
          }}
        >
          {recruitmentLabel}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 820,
          width: 760,
          height: 760,
          borderRadius: 999,
          translate: "-50% 0",
          scale: ring,
          border: `3px solid ${C.orange}28`,
          boxShadow: `0 0 0 48px ${C.orange}10, 0 0 0 96px ${C.orange}08`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 180,
          top: 770,
          width: 720,
          height: 720,
          borderRadius: 999,
          overflow: "hidden",
          background: C.orangeSoft,
          border: "10px solid rgba(255,255,255,0.78)",
          boxShadow: "0 48px 115px rgba(113,64,31,0.24)",
          opacity: enter(frame, 12, 31),
          scale: interpolate(frame, [12, 32], [0.76, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        }}
      >
        <Img src={staticFile(ASSET.generated)} style={{ width: "100%", height: "100%", objectFit: "contain", scale: pulse(frame, 15) }} />
        <div style={{ position: "absolute", right: 28, bottom: 28, padding: "10px 16px", borderRadius: 999, background: "rgba(255,255,255,0.9)", color: C.muted, fontSize: 20, fontWeight: 750 }}>本次生成灵伴</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 82,
          right: 82,
          bottom: 166,
          padding: "31px 40px",
          borderRadius: 46,
          background: C.orange,
          color: C.white,
          textAlign: "center",
          boxShadow: "0 30px 75px rgba(255,138,92,0.34)",
          opacity: enter(frame, 55, 77),
          translate: `0 ${rise(frame, 55, 77) * 72}px`,
          scale: interpolate(frame, [55, 77, 96], [0.9, 1.03, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 53, fontWeight: 950, letterSpacing: -2 }}>{cta}</div>
        <div style={{ marginTop: 10, fontSize: 24, fontWeight: 650, color: "rgba(255,255,255,0.82)" }}>{ctaNote}</div>
      </div>

      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 10 + frame / 90;
        const radius = 390 + (i % 2) * 55;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + Math.cos(angle) * radius,
              top: 1125 + Math.sin(angle) * radius,
              opacity: enter(frame, 24 + i * 2, 42 + i * 2) * 0.72,
              rotate: `${(angle * 180) / Math.PI + 18}deg`,
              scale: 0.55 + (i % 3) * 0.13,
            }}
          >
            <Paw color={i % 2 === 0 ? C.orange : C.teal} size={48} />
          </div>
        );
      })}
    </Backdrop>
  );
};

const AudioLayer = ({ withVoiceover }: { withVoiceover: boolean }) => {
  if (!withVoiceover) return null;
  const voiceStarts = [8, 108, 240, 358, 478, 584, 660];
  const voiceVolumes = [0.99, 0.8, 0.91, 0.89, 0.88, 0.85, 0.84];
  const sfx = [
    { file: "sfx-record-scratch.wav", from: 0, volume: 0.19 },
    { file: "sfx-shutter-modern.wav", from: 76, volume: 0.23 },
    { file: "sfx-whip.wav", from: 99, volume: 0.25 },
    { file: "sfx-whoosh.wav", from: 234, volume: 0.25 },
    { file: "sfx-whip.wav", from: 352, volume: 0.25 },
    { file: "sfx-whoosh.wav", from: 473, volume: 0.25 },
    { file: "sfx-whip.wav", from: 593, volume: 0.25 },
    { file: "sfx-ding.wav", from: 648, volume: 0.23 },
  ] as const;
  return (
    <>
      {sfx.map(({ file, from, volume }) => (
        <Sequence key={`${file}-${from}`} from={from} layout="none">
          <Audio src={staticFile(`audio/v2/sfx/${file}`)} volume={() => volume * AUDIO_MASTER_GAIN} />
        </Sequence>
      ))}
      {voiceStarts.map((from, i) => (
        <Sequence key={from} from={from} layout="none">
          <Audio
            src={staticFile(`audio/v2/voice-${String(i + 1).padStart(2, "0")}.mp3`)}
            volume={() => (voiceVolumes[i] ?? 0.85) * AUDIO_MASTER_GAIN}
          />
        </Sequence>
      ))}
    </>
  );
};

export const RecruitmentVideo: React.FC<LumiiPromoProps> = ({ recruitmentLabel, cta, ctaNote, withVoiceover }) => {
  return (
    <AbsoluteFill style={{ background: C.bone }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={112}>
          <HookScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <BirthScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <CompanionScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 12 })} />
        <TransitionSeries.Sequence durationInFrames={135}>
          <MemoryScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <SocialScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={linearTiming({ durationInFrames: 10 })} />
        <TransitionSeries.Sequence durationInFrames={185}>
          <CtaScene recruitmentLabel={recruitmentLabel} cta={cta} ctaNote={ctaNote} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <AudioLayer withVoiceover={withVoiceover} />
    </AbsoluteFill>
  );
};
