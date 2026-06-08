import {
  ChevronLeft,
  Sparkles,
  RefreshCw,
  Heart,
  Check,
  X,
  AlertCircle,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";
import { COLORS, PhoneFrame, HomeIndicator } from "./login-kit";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ---------- Photo refs ----------
const PHOTO_ORIGINAL =
  "https://images.unsplash.com/photo-1625794084867-8ddd239946b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=720";
const PHOTO_AI_MAIN =
  "https://images.unsplash.com/photo-1599692392256-2d084495fe15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900";
const PHOTO_CAND_A =
  "https://images.unsplash.com/photo-1599692392256-2d084495fe15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PHOTO_CAND_B =
  "https://images.unsplash.com/photo-1611003228941-98852ba62227?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PHOTO_CAND_C =
  "https://images.unsplash.com/photo-1611003229186-80e40cd54966?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";

// ---------- Shared local atoms ----------
function FlowTopBar({ title, right }: { title?: string; right?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{ height: 44 }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: "rgba(255,255,255,0.7)",
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <ChevronLeft size={18} color={COLORS.text} />
      </div>
      <div
        style={{
          color: COLORS.text,
          fontSize: 15.5,
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </div>
      <div style={{ width: 36, height: 36 }}>{right}</div>
    </div>
  );
}

function OriginalThumb({ size = 64 }: { size?: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: size / 2,
        background: "#fff",
        padding: 3,
        boxShadow: "0 6px 16px -6px rgba(80,55,30,0.25)",
        border: `1px solid ${COLORS.line}`,
      }}
    >
      <ImageWithFallback
        src={PHOTO_ORIGINAL}
        alt="豆豆原始照片"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          filter: "saturate(0.92)",
        }}
      />
      <div
        className="flex items-center justify-center"
        style={{
          position: "absolute",
          right: -2,
          bottom: -2,
          width: 22,
          height: 22,
          borderRadius: 11,
          background: "rgba(27,28,25,0.85)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 500,
        }}
      >
        原图
      </div>
    </div>
  );
}

function AIPetHero({
  size = 250,
  src = PHOTO_AI_MAIN,
  badge = true,
}: {
  size?: number;
  src?: string;
  badge?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
      }}
    >
      {/* Glow halo */}
      <div
        style={{
          position: "absolute",
          inset: -30,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,138,92,0.28) 0%, rgba(255,138,92,0.08) 50%, rgba(255,138,92,0) 75%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />
      {/* Soft inner ring */}
      <div
        style={{
          position: "absolute",
          inset: -6,
          borderRadius: "50%",
          background:
            "conic-gradient(from 210deg, rgba(255,138,92,0.55), rgba(77,182,172,0.5), rgba(255,200,140,0.5), rgba(255,138,92,0.55))",
          filter: "blur(6px)",
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#FFEDD9",
          boxShadow:
            "0 26px 56px -22px rgba(180,110,60,0.55), inset 0 0 0 4px #fff",
        }}
      >
        <ImageWithFallback
          src={src}
          alt="AI 灵伴形象"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            filter: "saturate(1.18) contrast(1.05) brightness(1.03)",
          }}
        />
        {/* Cartoon-ish soft overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,240,220,0.35) 0%, rgba(255,240,220,0) 45%), radial-gradient(circle at 80% 90%, rgba(255,138,92,0.12) 0%, rgba(255,138,92,0) 55%)",
            pointerEvents: "none",
          }}
        />
      </div>
      {badge && (
        <div
          className="flex items-center gap-1"
          style={{
            position: "absolute",
            left: "50%",
            bottom: -10,
            transform: "translateX(-50%)",
            background: "#fff",
            padding: "6px 14px",
            borderRadius: 18,
            boxShadow: "0 8px 20px -8px rgba(80,55,30,0.22)",
            border: `1px solid ${COLORS.line}`,
            color: COLORS.primary,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <Sparkles size={12} />
          AI 灵伴 · 豆豆
        </div>
      )}
      {/* Sparkles */}
      <Spark style={{ top: 14, left: -6 }} size={14} />
      <Spark style={{ top: -4, right: 28 }} size={10} />
      <Spark style={{ bottom: 36, right: -8 }} size={12} />
    </div>
  );
}

function Spark({
  style,
  size = 12,
}: {
  style?: React.CSSProperties;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        color: COLORS.primary,
        ...style,
      }}
    >
      <Sparkles size={size} fill="currentColor" />
    </div>
  );
}

function FeatureTag({
  label,
  tone = "warm",
}: {
  label: string;
  tone?: "warm" | "cool";
}) {
  const isWarm = tone === "warm";
  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: 14,
        background: isWarm
          ? "rgba(255,138,92,0.12)"
          : "rgba(77,182,172,0.14)",
        color: isWarm ? COLORS.primary : COLORS.accent,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </div>
  );
}

function PrimaryCTA({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{
        height: 54,
        borderRadius: 27,
        background: COLORS.primary,
        color: "#fff",
        fontSize: 16,
        fontWeight: 600,
        boxShadow: "0 14px 28px -12px rgba(255,138,92,0.7)",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function GhostCTA({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{
        height: 54,
        borderRadius: 27,
        background: "rgba(255,255,255,0.7)",
        border: `1px solid ${COLORS.line}`,
        color: COLORS.text,
        fontSize: 15.5,
        fontWeight: 500,
        backdropFilter: "blur(10px)",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function PageBg() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 60% at 50% 0%, rgba(255,217,182,0.55) 0%, rgba(255,217,182,0) 60%), radial-gradient(80% 50% at 100% 100%, rgba(77,182,172,0.16) 0%, rgba(77,182,172,0) 70%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ---------- Screen 19: AI generating ----------
export function Screen19() {
  return (
    <PhoneFrame label="19 · AI 灵伴生成中">
      <PageBg />
      <FlowTopBar title="生成灵伴" />

      <div
        className="flex flex-col items-center"
        style={{ marginTop: 24, padding: "0 28px", textAlign: "center" }}
      >
        <div style={{ position: "relative", marginTop: 30 }}>
          {/* Animated ring */}
          <div
            style={{
              position: "absolute",
              inset: -16,
              borderRadius: "50%",
              background:
                "conic-gradient(from 0deg, rgba(255,138,92,0) 0%, rgba(255,138,92,0.85) 35%, rgba(77,182,172,0.85) 70%, rgba(255,138,92,0) 100%)",
              filter: "blur(2px)",
              animation: "blink 2.4s linear infinite",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 240,
              height: 240,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#FBEEDD",
              boxShadow: "inset 0 0 0 5px #fff, 0 18px 36px -16px rgba(180,110,60,0.4)",
            }}
          >
            <ImageWithFallback
              src={PHOTO_AI_MAIN}
              alt="生成中预览"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "saturate(1.15) contrast(1.04) blur(2.5px)",
                opacity: 0.92,
              }}
            />
            {/* Scan sweep */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "42%",
                height: 2,
                background:
                  "linear-gradient(90deg, rgba(255,138,92,0), rgba(255,138,92,0.9), rgba(255,138,92,0))",
                boxShadow: "0 0 18px 6px rgba(255,138,92,0.55)",
              }}
            />
            {/* Soft particles */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 25% 30%, rgba(255,255,255,0.6) 0 2px, transparent 3px), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.5) 0 1.5px, transparent 2.5px), radial-gradient(circle at 65% 75%, rgba(255,255,255,0.55) 0 2px, transparent 3px), radial-gradient(circle at 30% 70%, rgba(255,255,255,0.5) 0 1.5px, transparent 2.5px)",
              }}
            />
          </div>
          {/* Original thumb on top-left */}
          <div style={{ position: "absolute", left: -10, top: -6 }}>
            <OriginalThumb size={62} />
          </div>
          {/* AI badge */}
          <div
            className="flex items-center gap-1"
            style={{
              position: "absolute",
              right: -8,
              bottom: 14,
              background: "#fff",
              padding: "6px 12px",
              borderRadius: 14,
              boxShadow: "0 8px 18px -8px rgba(80,55,30,0.22)",
              color: COLORS.primary,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Wand2 size={12} />
            AI 转化中
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            color: COLORS.text,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -0.2,
          }}
        >
          正在生成你的小灵伴
        </div>
        <div
          style={{
            marginTop: 10,
            color: COLORS.subText,
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          正在捕捉毛色、五官和表情特征
          <br />
          这个过程大约需要 20 秒
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 28,
            width: "100%",
            height: 6,
            borderRadius: 4,
            background: "rgba(255,138,92,0.16)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "62%",
              height: "100%",
              borderRadius: 4,
              background:
                "linear-gradient(90deg, #FFB48C 0%, #FF8A5C 60%, #FF6F3B 100%)",
              boxShadow: "0 0 12px rgba(255,138,92,0.6)",
            }}
          />
        </div>

        {/* Steps */}
        <div
          style={{
            marginTop: 22,
            width: "100%",
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 18,
            padding: "14px 16px",
            backdropFilter: "blur(10px)",
            textAlign: "left",
          }}
        >
          <StepRow text="识别宠物主体与五官位置" done />
          <StepRow text="捕捉毛色、纹理与体态" active />
          <StepRow text="生成真实卡通化灵伴形象" />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function StepRow({
  text,
  done,
  active,
}: {
  text: string;
  done?: boolean;
  active?: boolean;
}) {
  const color = done ? COLORS.accent : active ? COLORS.primary : COLORS.subText;
  return (
    <div
      className="flex items-center gap-3"
      style={{ padding: "7px 0", fontSize: 13.5, color: COLORS.text }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: done
            ? "rgba(77,182,172,0.18)"
            : active
              ? "rgba(255,138,92,0.16)"
              : COLORS.muted,
          color,
        }}
      >
        {done ? (
          <Check size={12} strokeWidth={3} />
        ) : active ? (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              background: color,
              animation: "blink 1.2s ease-in-out infinite",
            }}
          />
        ) : (
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              background: color,
              opacity: 0.5,
            }}
          />
        )}
      </div>
      <span style={{ opacity: done || active ? 1 : 0.6 }}>{text}</span>
    </div>
  );
}

// ---------- Screen 20: Result default ----------
export function Screen20() {
  return (
    <PhoneFrame label="20 · 生成结果 默认">
      <PageBg />
      <FlowTopBar
        title="遇见你的小灵伴"
        right={
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${COLORS.line}`,
            }}
          >
            <Heart size={16} color={COLORS.primary} fill={COLORS.primary} />
          </div>
        }
      />

      {/* Original photo small chip */}
      <div
        className="flex items-center gap-3"
        style={{
          position: "absolute",
          left: 20,
          top: 76,
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 30,
          padding: "6px 14px 6px 6px",
          boxShadow: "0 10px 22px -12px rgba(80,55,30,0.22)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            overflow: "hidden",
            border: "2px solid #fff",
          }}
        >
          <ImageWithFallback
            src={PHOTO_ORIGINAL}
            alt="原图"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.95)",
            }}
          />
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 11.5,
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          基于你上传的
          <br />
          <span style={{ color: COLORS.text, fontWeight: 600 }}>豆豆的照片</span>
        </div>
      </div>

      {/* Hero */}
      <div
        className="flex justify-center"
        style={{ marginTop: 130 }}
      >
        <AIPetHero size={260} />
      </div>

      {/* Title block */}
      <div
        className="flex flex-col items-center"
        style={{ marginTop: 38, padding: "0 28px", textAlign: "center" }}
      >
        <div
          style={{
            color: COLORS.text,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -0.4,
          }}
        >
          豆豆
        </div>
        <div
          style={{
            marginTop: 8,
            color: COLORS.subText,
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          一只温柔亲人的金毛灵伴已经准备好陪你
        </div>

        <div
          className="flex flex-wrap items-center justify-center gap-2"
          style={{ marginTop: 18 }}
        >
          <FeatureTag label="真实卡通化" tone="warm" />
          <FeatureTag label="保留毛色" tone="cool" />
          <FeatureTag label="亲和表情" tone="warm" />
        </div>
      </div>

      {/* CTAs */}
      <div
        className="flex flex-col gap-3 px-7"
        style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}
      >
        <PrimaryCTA label="保存并设为电子灵伴" icon={<Heart size={16} />} />
        <GhostCTA label="重新生成" icon={<RefreshCw size={15} />} />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ---------- Screen 21: Multi candidates ----------
export function Screen21() {
  return (
    <PhoneFrame label="21 · 生成结果 多候选">
      <PageBg />
      <FlowTopBar title="挑一个你最喜欢的" />

      <div className="flex items-center justify-center gap-2" style={{ marginTop: 4 }}>
        <Sparkles size={12} color={COLORS.accent} />
        <div style={{ color: COLORS.subText, fontSize: 12.5 }}>
          AI 为豆豆生成了 3 个不同风格的灵伴
        </div>
      </div>

      {/* Big selected */}
      <div className="flex justify-center" style={{ marginTop: 24 }}>
        <AIPetHero size={230} badge={false} />
      </div>

      <div
        className="flex items-center justify-center gap-2"
        style={{ marginTop: 26 }}
      >
        <FeatureTag label="真实卡通化" tone="warm" />
        <FeatureTag label="亲和表情" tone="cool" />
      </div>

      {/* Candidate row */}
      <div
        style={{
          marginTop: 22,
          padding: "0 24px",
        }}
      >
        <div
          style={{
            color: COLORS.subText,
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 10,
            letterSpacing: 0.3,
          }}
        >
          其他候选
        </div>
        <div className="flex gap-3">
          <Candidate src={PHOTO_CAND_A} active />
          <Candidate src={PHOTO_CAND_B} />
          <Candidate src={PHOTO_CAND_C} />
        </div>
      </div>

      <div
        className="flex flex-col gap-3 px-7"
        style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}
      >
        <PrimaryCTA label="保存并设为电子灵伴" icon={<Heart size={16} />} />
        <GhostCTA label="重新生成" icon={<RefreshCw size={15} />} />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function Candidate({ src, active }: { src: string; active?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        aspectRatio: "1 / 1",
        borderRadius: 22,
        padding: 4,
        background: active
          ? "linear-gradient(135deg, #FF8A5C, #4DB6AC)"
          : "transparent",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 18,
          overflow: "hidden",
          background: "#FFEDD9",
          border: active ? "2px solid #fff" : `1px solid ${COLORS.line}`,
          position: "relative",
        }}
      >
        <ImageWithFallback
          src={src}
          alt="候选"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: active
              ? "saturate(1.18) contrast(1.05)"
              : "saturate(1.05) brightness(0.97)",
          }}
        />
        {active && (
          <div
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              width: 22,
              height: 22,
              borderRadius: 11,
              background: COLORS.primary,
              border: "2px solid #fff",
            }}
          >
            <Check size={11} color="#fff" strokeWidth={3} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Screen 22: Feedback panel ----------
export function Screen22() {
  return (
    <PhoneFrame label="22 · 不满意反馈面板">
      <PageBg />
      <FlowTopBar title="遇见你的小灵伴" />

      {/* Faded hero in back */}
      <div
        className="flex justify-center"
        style={{ marginTop: 26, opacity: 0.5, filter: "blur(1px)" }}
      >
        <AIPetHero size={180} badge={false} />
      </div>

      {/* Dim overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(27,28,25,0) 0%, rgba(27,28,25,0.18) 35%, rgba(27,28,25,0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          padding: "18px 22px 30px",
          boxShadow: "0 -20px 50px -20px rgba(80,55,30,0.25)",
        }}
      >
        <div
          className="mx-auto"
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: COLORS.line,
            marginBottom: 16,
          }}
        />
        <div
          style={{
            color: COLORS.text,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: -0.2,
          }}
        >
          告诉我们哪里不满意
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 13,
            marginTop: 6,
            lineHeight: 1.55,
          }}
        >
          可选择多个，我们将据此优化下一次生成
        </div>

        <div
          className="flex flex-wrap gap-2"
          style={{ marginTop: 16 }}
        >
          <FeedbackChip label="不像我的宠物" selected />
          <FeedbackChip label="毛色更浅" />
          <FeedbackChip label="毛色更深" selected />
          <FeedbackChip label="耳朵更像" />
          <FeedbackChip label="眼睛更像" selected />
          <FeedbackChip label="胖瘦调整" />
          <FeedbackChip label="卡通程度调整" />
        </div>

        {/* Cartoon slider */}
        <div
          style={{
            marginTop: 18,
            background: COLORS.bg,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "14px 16px",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 10 }}
          >
            <div style={{ color: COLORS.text, fontSize: 13.5, fontWeight: 500 }}>
              卡通程度
            </div>
            <div style={{ color: COLORS.primary, fontSize: 12, fontWeight: 600 }}>
              偏真实
            </div>
          </div>
          <div
            style={{
              position: "relative",
              height: 6,
              borderRadius: 3,
              background: COLORS.muted,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "38%",
                borderRadius: 3,
                background:
                  "linear-gradient(90deg, #FF8A5C, #FFB48C)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "38%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 22,
                height: 22,
                borderRadius: 11,
                background: "#fff",
                border: `2px solid ${COLORS.primary}`,
                boxShadow: "0 4px 10px -2px rgba(80,55,30,0.2)",
              }}
            />
          </div>
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: 8,
              fontSize: 11,
              color: COLORS.subText,
            }}
          >
            <span>真实</span>
            <span>卡通</span>
          </div>
        </div>

        <div className="flex gap-3" style={{ marginTop: 18 }}>
          <div style={{ flex: 1 }}>
            <GhostCTA label="取消" />
          </div>
          <div style={{ flex: 1.4 }}>
            <PrimaryCTA label="按反馈重新生成" icon={<RefreshCw size={15} />} />
          </div>
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function FeedbackChip({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <div
      style={{
        padding: "9px 14px",
        borderRadius: 18,
        background: selected ? "rgba(255,138,92,0.12)" : "#fff",
        border: selected
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        color: selected ? COLORS.primary : COLORS.text,
        fontSize: 13,
        fontWeight: selected ? 600 : 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {selected && <Check size={12} strokeWidth={3} />}
      {label}
    </div>
  );
}

// ---------- Screen 23: Regenerate confirm modal ----------
export function Screen23() {
  return (
    <PhoneFrame label="23 · 重新生成确认弹窗">
      <PageBg />
      <FlowTopBar title="遇见你的小灵伴" />
      <div
        className="flex justify-center"
        style={{ marginTop: 26, opacity: 0.4, filter: "blur(2px)" }}
      >
        <AIPetHero size={180} badge={false} />
      </div>

      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(27,28,25,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Dialog */}
      <div
        className="absolute left-1/2"
        style={{
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 312,
          background: "#fff",
          borderRadius: 24,
          padding: "26px 22px 20px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45)",
          textAlign: "center",
        }}
      >
        <div
          className="mx-auto flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background:
              "linear-gradient(135deg, rgba(255,138,92,0.18), rgba(77,182,172,0.18))",
            marginBottom: 14,
          }}
        >
          <RefreshCw size={24} color={COLORS.primary} strokeWidth={2.2} />
        </div>
        <div
          style={{
            color: COLORS.text,
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: -0.2,
          }}
        >
          要重新生成灵伴形象吗？
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 13,
            marginTop: 8,
            lineHeight: 1.6,
            padding: "0 4px",
          }}
        >
          当前形象将被替换
          <br />
          每天可重新生成 3 次，今天还剩 2 次
        </div>

        <div
          className="flex items-center gap-2"
          style={{
            marginTop: 14,
            background: COLORS.bg,
            borderRadius: 12,
            padding: "10px 12px",
            color: COLORS.subText,
            fontSize: 12,
            textAlign: "left",
          }}
        >
          <AlertCircle size={14} color={COLORS.accent} />
          <span style={{ flex: 1 }}>建议先告诉我们哪里不满意，生成会更准</span>
        </div>

        <div className="flex gap-3" style={{ marginTop: 18 }}>
          <div
            className="flex items-center justify-center"
            style={{
              flex: 1,
              height: 48,
              borderRadius: 24,
              background: COLORS.muted,
              color: COLORS.text,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            取消
          </div>
          <div
            className="flex items-center justify-center gap-1.5"
            style={{
              flex: 1.2,
              height: 48,
              borderRadius: 24,
              background: COLORS.primary,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 10px 22px -10px rgba(255,138,92,0.7)",
            }}
          >
            <RefreshCw size={14} />
            重新生成
          </div>
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ---------- Screen 24: Save success ----------
export function Screen24() {
  return (
    <PhoneFrame label="24 · 保存成功 Toast">
      <PageBg />
      <FlowTopBar title="遇见你的小灵伴" />
      <div className="flex justify-center" style={{ marginTop: 130 }}>
        <AIPetHero size={260} />
      </div>
      <div
        className="flex flex-col items-center"
        style={{ marginTop: 38, padding: "0 28px", textAlign: "center" }}
      >
        <div
          style={{ color: COLORS.text, fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}
        >
          豆豆
        </div>
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          style={{ marginTop: 16 }}
        >
          <FeatureTag label="真实卡通化" tone="warm" />
          <FeatureTag label="保留毛色" tone="cool" />
          <FeatureTag label="亲和表情" tone="warm" />
        </div>
      </div>

      {/* Success toast */}
      <div
        className="absolute left-1/2"
        style={{
          top: 96,
          transform: "translateX(-50%)",
          background: "rgba(27,28,25,0.92)",
          color: "#fff",
          borderRadius: 22,
          padding: "12px 18px 12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 18px 38px -14px rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
          minWidth: 220,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            background: COLORS.accent,
          }}
        >
          <Check size={16} color="#fff" strokeWidth={3} />
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>已保存为你的电子灵伴</div>
          <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 2 }}>
            可在「我的宠物」中查看
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 px-7"
        style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}
      >
        <PrimaryCTA label="开始与豆豆互动" icon={<Heart size={16} />} />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ---------- Screen 25: Save failed ----------
export function Screen25() {
  return (
    <PhoneFrame label="25 · 保存失败 Toast">
      <PageBg />
      <FlowTopBar title="遇见你的小灵伴" />
      <div className="flex justify-center" style={{ marginTop: 130 }}>
        <AIPetHero size={260} />
      </div>
      <div
        className="flex flex-col items-center"
        style={{ marginTop: 38, padding: "0 28px", textAlign: "center" }}
      >
        <div
          style={{ color: COLORS.text, fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}
        >
          豆豆
        </div>
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          style={{ marginTop: 16 }}
        >
          <FeatureTag label="真实卡通化" tone="warm" />
          <FeatureTag label="保留毛色" tone="cool" />
          <FeatureTag label="亲和表情" tone="warm" />
        </div>
      </div>

      {/* Error toast */}
      <div
        className="absolute"
        style={{
          left: 16,
          right: 16,
          top: 92,
          background: "#fff",
          color: COLORS.text,
          borderRadius: 20,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 18px 38px -14px rgba(80,55,30,0.32)",
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: "rgba(229,87,63,0.14)",
          }}
        >
          <X size={18} color={COLORS.danger} strokeWidth={3} />
        </div>
        <div style={{ flex: 1, lineHeight: 1.4 }}>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}
          >
            保存失败，请检查网络
          </div>
          <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 2 }}>
            网络连接异常，灵伴形象未上传
          </div>
        </div>
        <div
          style={{
            color: COLORS.primary,
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 12,
            background: "rgba(255,138,92,0.12)",
          }}
        >
          重试
        </div>
      </div>

      <div
        className="flex flex-col gap-3 px-7"
        style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}
      >
        <PrimaryCTA label="重试保存" icon={<RefreshCw size={15} />} />
        <GhostCTA label="稍后再说" />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}
