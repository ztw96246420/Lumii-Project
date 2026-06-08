import { ChevronLeft, AlertCircle, Loader2, Check } from "lucide-react";

// ---------- Tokens ----------
export const COLORS = {
  bg: "#FBF7F1",
  card: "#FFFFFF",
  primary: "#FF8A5C",
  primaryPressed: "#F2774A",
  accent: "#4DB6AC",
  text: "#1B1C19",
  subText: "#7A7972",
  muted: "#EFEAE1",
  danger: "#E5573F",
  line: "#ECE7DE",
};

// ---------- Screen Frame ----------
export function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative overflow-hidden"
        style={{
          width: 390,
          height: 844,
          background: COLORS.bg,
          borderRadius: 44,
          boxShadow:
            "0 30px 60px -20px rgba(80,55,30,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <StatusBar />
        {children}
      </div>
      <div
        style={{ color: COLORS.subText, fontSize: 13, letterSpacing: 0.2 }}
      >
        {label}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div
      className="flex items-center justify-between px-7 pt-3 pb-1"
      style={{ color: COLORS.text, height: 44 }}
    >
      <span style={{ fontSize: 15, fontWeight: 600 }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
          <path
            d="M1 8h2v2H1zM5 6h2v4H5zM9 4h2v6H9zM13 1.5h2V10h-2z"
            fill="currentColor"
          />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path
            d="M8 2.5c2 0 3.9.7 5.4 2.1l1.1-1.1A9.5 9.5 0 0 0 1.5 3.5l1.1 1.1A8 8 0 0 1 8 2.5Zm0 3.2c1.2 0 2.3.4 3.2 1.2l1.1-1.1a6 6 0 0 0-8.6 0l1.1 1.1A4.7 4.7 0 0 1 8 5.7Zm0 3.1a2 2 0 0 0-1.4.6L8 10.8l1.4-1.4a2 2 0 0 0-1.4-.6Z"
            fill="currentColor"
          />
        </svg>
        <div
          className="relative"
          style={{
            width: 24,
            height: 11,
            border: `1px solid ${COLORS.text}`,
            borderRadius: 3,
            opacity: 0.9,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 1.5,
              width: 17,
              background: COLORS.text,
              borderRadius: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Top Bar ----------
export function TopBar({ title, showBack = true }: { title?: string; showBack?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{ height: 44 }}
    >
      {showBack ? (
        <button
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,0.7)",
            color: COLORS.text,
          }}
        >
          <ChevronLeft size={20} />
        </button>
      ) : (
        <div style={{ width: 36 }} />
      )}
      <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 500 }}>
        {title}
      </div>
      <div style={{ width: 36 }} />
    </div>
  );
}

// ---------- Brand Header ----------
export function BrandHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-7" style={{ marginTop: 24 }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
        <LumiiLogo />
        <div style={{ color: COLORS.text, fontSize: 17, fontWeight: 600 }}>
          Lumii 灵伴
        </div>
      </div>
      <div
        style={{
          color: COLORS.text,
          fontSize: 28,
          fontWeight: 600,
          lineHeight: 1.25,
          letterSpacing: -0.3,
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: COLORS.subText,
          fontSize: 14,
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function LumiiLogo() {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, #FFB28A 100%)`,
        boxShadow: "0 6px 14px -6px rgba(255,138,92,0.6)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 4c1.7 0 3 1.5 3 3.3 0 1.9-1.3 3.4-3 3.4S4 9.2 4 7.3C4 5.5 5.3 4 7 4Zm10 0c1.7 0 3 1.5 3 3.3 0 1.9-1.3 3.4-3 3.4s-3-1.5-3-3.4c0-1.8 1.3-3.3 3-3.3ZM4 13.5c.9-.7 2-.7 2.8 0 .8.7 1 1.9.4 2.7-.6.9-1.9 1-2.8.4-1-.7-1.3-2-.4-3.1Zm15.2 0c.9 1 .6 2.4-.3 3-.9.7-2.2.6-2.8-.3-.6-.8-.4-2 .4-2.7.8-.7 1.9-.7 2.7 0ZM12 11.5c3.3 0 6.5 2.8 6.5 5.7 0 2-1.7 2.8-3.5 2.8-1.2 0-1.9-.5-3-.5s-1.8.5-3 .5c-1.8 0-3.5-.8-3.5-2.8 0-2.9 3.2-5.7 6.5-5.7Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

// ---------- Inputs ----------
export function PhoneInput({
  value,
  placeholder = "请输入中国大陆手机号",
  error,
  focused,
}: {
  value?: string;
  placeholder?: string;
  error?: boolean;
  focused?: boolean;
}) {
  const borderColor = error
    ? COLORS.danger
    : focused
    ? COLORS.primary
    : COLORS.line;
  return (
    <div
      className="flex items-center"
      style={{
        height: 56,
        background: COLORS.card,
        borderRadius: 16,
        border: `1px solid ${borderColor}`,
        padding: "0 18px",
        boxShadow: focused
          ? `0 0 0 4px rgba(255,138,92,0.12)`
          : "0 2px 8px -4px rgba(80,55,30,0.06)",
      }}
    >
      <div
        className="flex items-center gap-1"
        style={{ color: COLORS.text, fontSize: 16, fontWeight: 500 }}
      >
        +86
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 4l3 3 3-3"
            stroke={COLORS.subText}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        style={{
          width: 1,
          height: 20,
          background: COLORS.line,
          margin: "0 14px",
        }}
      />
      <div
        style={{
          flex: 1,
          color: value ? COLORS.text : "#B8B5AC",
          fontSize: 16,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: value ? 0.5 : 0,
        }}
      >
        {value || placeholder}
      </div>
      {focused && (
        <div
          style={{
            width: 2,
            height: 22,
            background: COLORS.primary,
            borderRadius: 1,
          }}
        />
      )}
    </div>
  );
}

// ---------- Inline error ----------
export function InlineError({ text }: { text: string }) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{ marginTop: 10, color: COLORS.danger, fontSize: 13 }}
    >
      <AlertCircle size={14} />
      {text}
    </div>
  );
}

// ---------- Agreement ----------
export function Agreement({
  checked,
  shake,
}: {
  checked: boolean;
  shake?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-2"
      style={{
        marginTop: 18,
        color: shake ? COLORS.danger : COLORS.subText,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 18,
          height: 18,
          marginTop: 2,
          borderRadius: 9,
          border: `1.5px solid ${
            shake ? COLORS.danger : checked ? COLORS.primary : "#C8C4BA"
          }`,
          background: checked ? COLORS.primary : "transparent",
        }}
      >
        {checked && <Check size={11} color="#fff" strokeWidth={3} />}
      </div>
      <div>
        我已阅读并同意
        <span style={{ color: COLORS.primary }}>《用户协议》</span>
        <span style={{ color: COLORS.primary }}>《隐私政策》</span>
      </div>
    </div>
  );
}

// ---------- Primary Button ----------
type ButtonState = "default" | "disabled" | "loading" | "countdown";

export function PrimaryButton({
  state = "default",
  label,
  countdown,
}: {
  state?: ButtonState;
  label: string;
  countdown?: number;
}) {
  let bg = COLORS.primary;
  let color = "#fff";
  let content: React.ReactNode = label;
  let shadow = "0 10px 22px -10px rgba(255,138,92,0.65)";

  if (state === "disabled") {
    bg = "#F1D9CB";
    color = "#fff";
    shadow = "none";
  } else if (state === "countdown") {
    bg = COLORS.muted;
    color = COLORS.subText;
    content = `${countdown}s 后重试`;
    shadow = "none";
  } else if (state === "loading") {
    content = (
      <span className="flex items-center justify-center gap-2">
        <Loader2 size={18} className="animate-spin" />
        发送中...
      </span>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        height: 52,
        borderRadius: 26,
        background: bg,
        color,
        fontSize: 16,
        fontWeight: 500,
        marginTop: 28,
        boxShadow: shadow,
      }}
    >
      {content}
    </div>
  );
}

// ---------- OTP ----------
export function OtpInput({
  value,
  error,
  cursorIndex = 0,
}: {
  value: string;
  error?: boolean;
  cursorIndex?: number;
}) {
  const chars = value.padEnd(6, " ").split("").slice(0, 6);
  return (
    <div className="flex justify-between" style={{ marginTop: 28 }}>
      {chars.map((c, i) => {
        const filled = c.trim().length > 0;
        const active = i === cursorIndex && !filled;
        const borderColor = error
          ? COLORS.danger
          : active
          ? COLORS.primary
          : filled
          ? COLORS.text
          : COLORS.line;
        return (
          <div
            key={i}
            className="flex items-center justify-center relative"
            style={{
              width: 46,
              height: 56,
              borderRadius: 14,
              background: COLORS.card,
              border: `1px solid ${borderColor}`,
              color: error ? COLORS.danger : COLORS.text,
              fontSize: 22,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              boxShadow: active
                ? "0 0 0 4px rgba(255,138,92,0.12)"
                : "0 2px 8px -4px rgba(80,55,30,0.06)",
            }}
          >
            {filled ? c : ""}
            {active && (
              <div
                style={{
                  position: "absolute",
                  width: 2,
                  height: 24,
                  background: COLORS.primary,
                  borderRadius: 1,
                  animation: "blink 1s steps(2) infinite",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Resend ----------
export function ResendRow({
  state,
  countdown,
}: {
  state: "default" | "countdown";
  countdown?: number;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1"
      style={{ marginTop: 24, fontSize: 13 }}
    >
      <span style={{ color: COLORS.subText }}>没有收到验证码？</span>
      {state === "countdown" ? (
        <span style={{ color: "#B8B5AC" }}>{countdown}s 后重新发送</span>
      ) : (
        <span style={{ color: COLORS.primary, fontWeight: 500 }}>
          重新发送
        </span>
      )}
    </div>
  );
}

// ---------- Toast ----------
export function Toast({ text }: { text: string }) {
  return (
    <div
      className="absolute left-1/2"
      style={{
        transform: "translateX(-50%)",
        top: 110,
        background: "rgba(27,28,25,0.92)",
        color: "#fff",
        fontSize: 13,
        padding: "10px 18px",
        borderRadius: 20,
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 24px -10px rgba(0,0,0,0.4)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

// ---------- Home Indicator ----------
export function HomeIndicator() {
  return (
    <div
      className="absolute left-1/2"
      style={{
        bottom: 8,
        transform: "translateX(-50%)",
        width: 134,
        height: 5,
        borderRadius: 3,
        background: COLORS.text,
        opacity: 0.85,
      }}
    />
  );
}

// ---------- Mascot ----------
export function PetMascot({ size = 96 }: { size?: number }) {
  // Real-cartoonized golden retriever face badge
  return (
    <div
      className="flex items-center justify-center mx-auto"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background:
          "radial-gradient(circle at 35% 30%, #FFE6CF 0%, #F2C28A 60%, #C98A4A 100%)",
        boxShadow:
          "inset 0 -8px 16px rgba(120,70,30,0.25), 0 12px 24px -10px rgba(180,110,60,0.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ears */}
      <div
        style={{
          position: "absolute",
          left: -4,
          top: 18,
          width: 28,
          height: 42,
          background:
            "linear-gradient(160deg, #B97640 0%, #8A5226 100%)",
          borderRadius: "60% 40% 50% 50% / 70% 50% 50% 30%",
          transform: "rotate(-18deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -4,
          top: 18,
          width: 28,
          height: 42,
          background:
            "linear-gradient(200deg, #B97640 0%, #8A5226 100%)",
          borderRadius: "40% 60% 50% 50% / 50% 70% 30% 50%",
          transform: "rotate(18deg)",
        }}
      />
      {/* eyes */}
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: "46%",
          width: 9,
          height: 9,
          borderRadius: 5,
          background: "#1B1C19",
          boxShadow: "inset 1px -1px 0 rgba(255,255,255,0.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "30%",
          top: "46%",
          width: 9,
          height: 9,
          borderRadius: 5,
          background: "#1B1C19",
          boxShadow: "inset 1px -1px 0 rgba(255,255,255,0.6)",
        }}
      />
      {/* nose */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "60%",
          transform: "translateX(-50%)",
          width: 12,
          height: 9,
          borderRadius: "50%",
          background: "#2A1810",
        }}
      />
      {/* mouth */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "70%",
          transform: "translateX(-50%)",
          width: 18,
          height: 8,
          borderBottom: "2px solid #2A1810",
          borderRadius: "0 0 18px 18px",
        }}
      />
      {/* tongue */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "76%",
          transform: "translateX(-50%)",
          width: 8,
          height: 6,
          background: "#F08C8C",
          borderRadius: "0 0 4px 4px",
        }}
      />
      {/* highlight cheek */}
      <div
        style={{
          position: "absolute",
          left: "20%",
          top: "58%",
          width: 16,
          height: 10,
          borderRadius: "50%",
          background: "rgba(255,180,140,0.5)",
          filter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "20%",
          top: "58%",
          width: 16,
          height: 10,
          borderRadius: "50%",
          background: "rgba(255,180,140,0.5)",
          filter: "blur(3px)",
        }}
      />
    </div>
  );
}
