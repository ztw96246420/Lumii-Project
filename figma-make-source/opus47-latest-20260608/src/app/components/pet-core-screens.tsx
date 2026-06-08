import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  User,
  Compass,
  Search,
  Bell,
  Mic,
  Send,
  RefreshCw,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Syringe,
  Scale,
  NotebookPen,
  Camera,
  Image as ImageIcon,
  Plus,
  Check,
  Calendar,
  Clock,
  X,
  ArrowUp,
  ArrowDown,
  Smile,
  Stethoscope,
  Activity,
  PawPrint,
} from "lucide-react";
import { COLORS, PhoneFrame, HomeIndicator } from "./login-kit";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ---------- Photo refs ----------
const PET_PHOTO =
  "https://images.unsplash.com/photo-1599692392256-2d084495fe15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900";
const PET_PHOTO_REAL =
  "https://images.unsplash.com/photo-1625794084867-8ddd239946b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400";
const PET_PHOTO_ALT =
  "https://images.unsplash.com/photo-1604658768979-ca1ef26b2324?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PET_PHOTO_OUTDOOR =
  "https://images.unsplash.com/photo-1561438774-1790fe271b8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";

// ---------- Atoms ----------
function WarmBg() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(130% 60% at 50% 0%, rgba(255,217,182,0.65) 0%, rgba(255,217,182,0) 55%), radial-gradient(80% 40% at 100% 100%, rgba(77,182,172,0.14) 0%, rgba(77,182,172,0) 70%)",
        pointerEvents: "none",
      }}
    />
  );
}

function SubTopBar({
  title,
  showBack = true,
  right,
}: {
  title?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{ height: 44 }}
    >
      {showBack ? (
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,0.78)",
            border: `1px solid ${COLORS.line}`,
          }}
        >
          <ChevronLeft size={18} color={COLORS.text} />
        </div>
      ) : (
        <div style={{ width: 36 }} />
      )}
      <div
        style={{
          color: COLORS.text,
          fontSize: 16,
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

function PetAIBadge({
  size = 220,
  src = PET_PHOTO,
}: {
  size?: number;
  src?: string;
}) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: -36,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,138,92,0.3) 0%, rgba(255,138,92,0.08) 50%, rgba(255,138,92,0) 75%)",
          filter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -6,
          borderRadius: "50%",
          background:
            "conic-gradient(from 210deg, rgba(255,138,92,0.55), rgba(77,182,172,0.5), rgba(255,200,140,0.5), rgba(255,138,92,0.55))",
          filter: "blur(7px)",
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
          boxShadow: "inset 0 0 0 4px #fff, 0 28px 56px -22px rgba(180,110,60,0.55)",
        }}
      >
        <ImageWithFallback
          src={src}
          alt="奶油"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "saturate(1.18) contrast(1.05) brightness(1.03)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,240,220,0.35) 0%, rgba(255,240,220,0) 45%)",
          }}
        />
      </div>
    </div>
  );
}

function RoundAvatar({
  src,
  size = 36,
  ring,
}: {
  src: string;
  size?: number;
  ring?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: ring ? 2 : 0,
        background: ring,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid #fff",
        }}
      >
        <ImageWithFallback
          src={src}
          alt="头像"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>
  );
}

function BottomTabBar({
  active,
}: {
  active: "pet" | "discover" | "map" | "msg" | "me";
}) {
  const items: {
    key: typeof active;
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  }[] = [
    { key: "pet", label: "宠物", icon: PawPrint },
    { key: "discover", label: "发现", icon: Compass },
    { key: "map", label: "地图", icon: MapPin },
    { key: "msg", label: "消息", icon: MessageCircle },
    { key: "me", label: "我的", icon: User },
  ];
  return (
    <div
      className="absolute left-0 right-0 flex items-end justify-between"
      style={{
        bottom: 0,
        padding: "10px 14px 24px",
        background:
          "linear-gradient(180deg, rgba(251,247,241,0) 0%, rgba(251,247,241,0.92) 35%, #FBF7F1 100%)",
      }}
    >
      <div
        className="flex items-center justify-between w-full"
        style={{
          background: "rgba(255,255,255,0.85)",
          borderRadius: 28,
          padding: "8px 8px",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 16px 40px -14px rgba(80,55,30,0.2)",
          backdropFilter: "blur(20px)",
        }}
      >
        {items.map((it) => {
          const on = it.key === active;
          const Icon = it.icon;
          return (
            <div
              key={it.key}
              className="flex flex-col items-center justify-center"
              style={{
                flex: 1,
                gap: 3,
                padding: "6px 0",
                color: on ? COLORS.primary : COLORS.subText,
                fontSize: 10.5,
                fontWeight: on ? 600 : 500,
                position: "relative",
              }}
            >
              {on && (
                <div
                  style={{
                    position: "absolute",
                    inset: 4,
                    borderRadius: 18,
                    background: "rgba(255,138,92,0.10)",
                  }}
                />
              )}
              <Icon size={20} color={on ? COLORS.primary : COLORS.subText} strokeWidth={on ? 2.4 : 2} />
              <span style={{ position: "relative" }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 22,
        border: `1px solid ${COLORS.line}`,
        boxShadow: "0 12px 30px -16px rgba(80,55,30,0.18)",
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MiniIcon({
  bg,
  color,
  children,
  size = 36,
}: {
  bg: string;
  color: string;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: bg,
        color,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// Screen 26: Pet Home
// ============================================================
export function Screen26() {
  return (
    <PhoneFrame label="26 · 电子宠物首页">
      <WarmBg />
      {/* Greeting header */}
      <div
        className="flex items-center justify-between px-5"
        style={{ paddingTop: 6 }}
      >
        <div className="flex items-center gap-3">
          <RoundAvatar src={PET_PHOTO_REAL} size={42} ring={COLORS.primary} />
          <div>
            <div
              style={{ color: COLORS.subText, fontSize: 12, fontWeight: 500 }}
            >
              早安，奶油！
            </div>
            <div
              style={{
                color: COLORS.text,
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: -0.2,
                marginTop: 1,
              }}
            >
              今天也是元气满满的一天 ☀️
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-center relative"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            background: "rgba(255,255,255,0.78)",
            border: `1px solid ${COLORS.line}`,
          }}
        >
          <Bell size={17} color={COLORS.text} />
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 9,
              width: 7,
              height: 7,
              borderRadius: 4,
              background: COLORS.primary,
              border: "1.5px solid #fff",
            }}
          />
        </div>
      </div>

      {/* Stage */}
      <div
        className="flex justify-center"
        style={{ marginTop: 12, position: "relative" }}
      >
        <PetAIBadge size={224} />
        {/* Floating chat hint */}
        <div
          className="absolute flex items-center gap-2"
          style={{
            right: 26,
            top: 10,
            background: "#fff",
            padding: "8px 12px",
            borderRadius: 16,
            border: `1px solid ${COLORS.line}`,
            boxShadow: "0 10px 22px -10px rgba(80,55,30,0.22)",
            fontSize: 12,
            color: COLORS.text,
            fontWeight: 500,
            maxWidth: 150,
          }}
        >
          <span>今天想去公园散步吗？</span>
        </div>
        <div
          className="absolute flex items-center gap-1"
          style={{
            left: 36,
            bottom: 6,
            background: "rgba(77,182,172,0.16)",
            color: COLORS.accent,
            padding: "5px 11px",
            borderRadius: 14,
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: COLORS.accent,
            }}
          />
          灵伴在线
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-2"
        style={{ marginTop: 14 }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -0.3,
          }}
        >
          奶油
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          · 金毛 · 2 岁 3 个月
        </div>
      </div>

      {/* Health score card */}
      <div className="px-5" style={{ marginTop: 14 }}>
        <CardShell
          style={{
            background:
              "linear-gradient(135deg, #FFF1E0 0%, #FFE3CB 60%, #FFD7B5 100%)",
            border: "1px solid rgba(255,255,255,0.7)",
            padding: "16px 18px",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                style={{
                  color: COLORS.subText,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                今日健康分
              </div>
              <div
                className="flex items-baseline gap-2"
                style={{ marginTop: 4 }}
              >
                <div
                  style={{
                    color: COLORS.text,
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: -1,
                    lineHeight: 1,
                  }}
                >
                  92
                </div>
                <div
                  style={{
                    color: COLORS.subText,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  / 100
                </div>
                <div
                  className="flex items-center gap-1"
                  style={{
                    marginLeft: 6,
                    background: "rgba(77,182,172,0.22)",
                    color: COLORS.accent,
                    padding: "3px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <ArrowUp size={10} strokeWidth={3} />
                  +3
                </div>
              </div>
              <div
                style={{
                  color: COLORS.subText,
                  fontSize: 11.5,
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                体重稳定，运动量良好
              </div>
            </div>
            <div
              className="flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background:
                  "conic-gradient(from -90deg, #4DB6AC 0% 92%, rgba(255,255,255,0.6) 92% 100%)",
                position: "relative",
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  background: "#fff",
                }}
              >
                <Heart size={20} color={COLORS.primary} fill={COLORS.primary} />
              </div>
            </div>
          </div>
        </CardShell>
      </div>

      {/* Quick tiles */}
      <div
        className="px-5 grid"
        style={{
          marginTop: 12,
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <QuickTile
          icon={<Scale size={18} />}
          iconBg="rgba(255,138,92,0.15)"
          iconColor={COLORS.primary}
          title="今日体重"
          value="12.5 kg"
          tag="稳定"
          tagColor={COLORS.accent}
        />
        <QuickTile
          icon={<Syringe size={18} />}
          iconBg="rgba(77,182,172,0.18)"
          iconColor={COLORS.accent}
          title="疫苗提醒"
          value="狂犬疫苗"
          tag="12 天后"
          tagColor={COLORS.primary}
        />
        <QuickTile
          icon={<NotebookPen size={18} />}
          iconBg="rgba(255,138,92,0.15)"
          iconColor={COLORS.primary}
          title="健康备忘"
          value="洗澡 · 驱虫"
          tag="3 条"
          tagColor={COLORS.subText}
        />
        <QuickTile
          icon={<MapPin size={18} />}
          iconBg="rgba(77,182,172,0.18)"
          iconColor={COLORS.accent}
          title="附近伙伴"
          value="3 位狗友在线"
          tag="500m"
          tagColor={COLORS.accent}
        />
      </div>

      {/* Today small story strip */}
      <div className="px-5" style={{ marginTop: 12 }}>
        <CardShell style={{ padding: "12px 14px" }}>
          <div className="flex items-center gap-3">
            <MiniIcon
              bg="rgba(255,138,92,0.14)"
              color={COLORS.primary}
              size={38}
            >
              <Camera size={18} />
            </MiniIcon>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                记录今天的小事
              </div>
              <div
                style={{
                  color: COLORS.subText,
                  fontSize: 11.5,
                  marginTop: 2,
                }}
              >
                让 AI 灵伴更懂奶油
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.subText} />
          </div>
        </CardShell>
      </div>

      <BottomTabBar active="pet" />
      <HomeIndicator />
    </PhoneFrame>
  );
}

function QuickTile({
  icon,
  iconBg,
  iconColor,
  title,
  value,
  tag,
  tagColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  value: string;
  tag: string;
  tagColor: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "12px 13px",
        border: `1px solid ${COLORS.line}`,
        boxShadow: "0 8px 20px -14px rgba(80,55,30,0.16)",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <MiniIcon bg={iconBg} color={iconColor} size={32}>
          {icon}
        </MiniIcon>
        <div
          style={{
            color: tagColor,
            fontSize: 10.5,
            fontWeight: 600,
            background: `${tagColor === COLORS.subText ? "rgba(122,121,114,0.12)" : tagColor === COLORS.primary ? "rgba(255,138,92,0.12)" : "rgba(77,182,172,0.14)"}`,
            padding: "3px 8px",
            borderRadius: 10,
          }}
        >
          {tag}
        </div>
      </div>
      <div style={{ color: COLORS.subText, fontSize: 11.5, fontWeight: 500 }}>
        {title}
      </div>
      <div
        style={{
          color: COLORS.text,
          fontSize: 15,
          fontWeight: 600,
          marginTop: 2,
          letterSpacing: -0.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// Screen 27: AI Chat
// ============================================================
export function Screen27() {
  return (
    <PhoneFrame label="27 · 电子宠物 AI 对话">
      <WarmBg />
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 56 }}
      >
        <div className="flex items-center gap-3">
          <ChevronLeft size={22} color={COLORS.text} />
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              overflow: "hidden",
              border: "2px solid #fff",
              boxShadow: "0 4px 10px -2px rgba(80,55,30,0.18)",
              position: "relative",
            }}
          >
            <ImageWithFallback
              src={PET_PHOTO}
              alt="奶油"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "saturate(1.18)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 12,
                height: 12,
                borderRadius: 6,
                background: COLORS.accent,
                border: "2px solid #fff",
              }}
            />
          </div>
          <div>
            <div
              style={{
                color: COLORS.text,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              奶油
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                color: COLORS.accent,
                fontSize: 11.5,
                fontWeight: 500,
                marginTop: 1,
              }}
            >
              <Smile size={11} />
              在线 · 心情很好
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,0.78)",
            border: `1px solid ${COLORS.line}`,
          }}
        >
          <Sparkles size={16} color={COLORS.primary} />
        </div>
      </div>

      {/* Safety tip */}
      <div className="px-4" style={{ marginTop: 4 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(77,182,172,0.10)",
            border: "1px solid rgba(77,182,172,0.25)",
            borderRadius: 14,
            padding: "8px 12px",
            color: COLORS.accent,
            fontSize: 11.5,
            fontWeight: 500,
          }}
        >
          <Stethoscope size={13} />
          <span style={{ flex: 1 }}>
            AI 灵伴不能替代兽医，紧急情况请就医
          </span>
        </div>
      </div>

      {/* Chat scroll */}
      <div
        className="px-4"
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <DateChip text="今天 09:32" />
        <BubbleAI
          text="主人早安！我刚醒来，正在伸懒腰呢～昨天的散步好开心，今天我们要做什么？"
        />
        <BubbleUser text="今天有点下雨，估计去不了公园了" />
        <BubbleAI text="没关系呀！下雨天我们可以在家玩拉绳游戏，或者你给我读绘本，我超喜欢听你讲话的声音 🐾" />
        <BubbleUser text="对了，我中午给你吃鸡胸肉行吗？" />
        {/* AI typing */}
        <div className="flex items-end gap-2">
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              overflow: "hidden",
              border: "1.5px solid #fff",
              boxShadow: "0 3px 8px -2px rgba(80,55,30,0.18)",
            }}
          >
            <ImageWithFallback
              src={PET_PHOTO}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div
            className="flex items-center gap-1.5"
            style={{
              background: "#fff",
              border: `1px solid ${COLORS.line}`,
              padding: "10px 14px",
              borderRadius: "18px 18px 18px 4px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: COLORS.primary,
                  opacity: 0.5,
                  animation: `blink 1s ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quick topics */}
      <div
        className="px-4"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 100,
        }}
      >
        <div
          className="flex gap-2"
          style={{ overflowX: "auto", paddingBottom: 4 }}
        >
          <Topic label="今天吃什么？" icon="🍖" />
          <Topic label="健康提醒" icon="💊" />
          <Topic label="陪我聊天" icon="💛" />
          <Topic label="生成日常笔记" icon="📝" />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="px-4 flex items-center gap-2"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 34,
        }}
      >
        <div
          className="flex items-center flex-1 gap-2"
          style={{
            height: 48,
            borderRadius: 24,
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            padding: "0 14px 0 16px",
            boxShadow: "0 8px 20px -12px rgba(80,55,30,0.18)",
          }}
        >
          <div
            style={{
              flex: 1,
              color: COLORS.subText,
              fontSize: 14,
            }}
          >
            告诉奶油今天发生了什么…
          </div>
          <Mic size={18} color={COLORS.subText} />
          <Camera size={18} color={COLORS.subText} />
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: COLORS.primary,
            boxShadow: "0 12px 24px -10px rgba(255,138,92,0.7)",
          }}
        >
          <Send size={18} color="#fff" />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function DateChip({ text }: { text: string }) {
  return (
    <div
      className="mx-auto"
      style={{
        background: "rgba(122,121,114,0.12)",
        color: COLORS.subText,
        fontSize: 11,
        padding: "4px 12px",
        borderRadius: 12,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
  );
}

function BubbleAI({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2" style={{ maxWidth: "82%" }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          overflow: "hidden",
          border: "1.5px solid #fff",
          boxShadow: "0 3px 8px -2px rgba(80,55,30,0.18)",
          flexShrink: 0,
        }}
      >
        <ImageWithFallback
          src={PET_PHOTO}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.18)" }}
        />
      </div>
      <div
        style={{
          background: "#fff",
          border: `1px solid ${COLORS.line}`,
          padding: "10px 14px",
          borderRadius: "18px 18px 18px 4px",
          color: COLORS.text,
          fontSize: 14,
          lineHeight: 1.55,
          boxShadow: "0 6px 14px -10px rgba(80,55,30,0.18)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function BubbleUser({
  text,
  state,
}: {
  text: string;
  state?: "sending" | "failed";
}) {
  return (
    <div
      className="flex items-end gap-2"
      style={{ marginLeft: "auto", maxWidth: "82%", flexDirection: "row-reverse" }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #FF9F73 0%, #FF8A5C 100%)",
          padding: "10px 14px",
          borderRadius: "18px 18px 4px 18px",
          color: "#fff",
          fontSize: 14,
          lineHeight: 1.55,
          boxShadow: "0 8px 18px -10px rgba(255,138,92,0.6)",
          position: "relative",
        }}
      >
        {text}
      </div>
      {state === "sending" && (
        <div
          style={{
            color: COLORS.subText,
            fontSize: 10.5,
            marginBottom: 4,
          }}
        >
          发送中
        </div>
      )}
      {state === "failed" && (
        <div
          className="flex items-center gap-1"
          style={{
            color: COLORS.danger,
            fontSize: 10.5,
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          <AlertCircle size={11} />
          失败
        </div>
      )}
    </div>
  );
}

function Topic({ label, icon }: { label: string; icon: string }) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 18,
        padding: "8px 12px",
        fontSize: 12.5,
        color: COLORS.text,
        fontWeight: 500,
        whiteSpace: "nowrap",
        boxShadow: "0 6px 14px -10px rgba(80,55,30,0.16)",
      }}
    >
      <span>{icon}</span>
      {label}
    </div>
  );
}

// ============================================================
// Screen 28: Chat error state
// ============================================================
export function Screen28() {
  return (
    <PhoneFrame label="28 · AI 对话异常状态">
      <WarmBg />
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 56 }}
      >
        <div className="flex items-center gap-3">
          <ChevronLeft size={22} color={COLORS.text} />
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              overflow: "hidden",
              border: "2px solid #fff",
              position: "relative",
              filter: "saturate(0.5)",
            }}
          >
            <ImageWithFallback
              src={PET_PHOTO}
              alt="奶油"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 12,
                height: 12,
                borderRadius: 6,
                background: COLORS.subText,
                border: "2px solid #fff",
              }}
            />
          </div>
          <div>
            <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 600 }}>
              奶油
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                color: COLORS.subText,
                fontSize: 11.5,
                fontWeight: 500,
                marginTop: 1,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: COLORS.subText,
                }}
              />
              连接中断
            </div>
          </div>
        </div>
        <Sparkles size={16} color={COLORS.subText} />
      </div>

      <div className="px-4" style={{ marginTop: 4 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(229,87,63,0.10)",
            border: "1px solid rgba(229,87,63,0.25)",
            borderRadius: 14,
            padding: "10px 12px",
            color: COLORS.danger,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={14} />
          <span style={{ flex: 1 }}>网络不稳定，灵伴暂时无法回复</span>
          <span style={{ fontWeight: 600 }}>查看详情</span>
        </div>
      </div>

      <div
        className="px-4"
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <DateChip text="今天 10:08" />
        <BubbleAI text="主人，我们今天来做点什么好玩的事情呀？" />
        <BubbleUser text="刚刚我给奶油喂了一点点零食" state="sending" />
        <BubbleUser
          text="它好像很喜欢吃，要不要记一下？"
          state="failed"
        />

        {/* Retry block */}
        <div
          className="flex items-center justify-between"
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "12px 14px",
            marginTop: 6,
            boxShadow: "0 8px 18px -12px rgba(80,55,30,0.18)",
          }}
        >
          <div className="flex items-center gap-3">
            <MiniIcon bg="rgba(229,87,63,0.12)" color={COLORS.danger} size={34}>
              <RefreshCw size={16} />
            </MiniIcon>
            <div>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                消息发送失败
              </div>
              <div
                style={{
                  color: COLORS.subText,
                  fontSize: 11.5,
                  marginTop: 2,
                }}
              >
                点击重试，或稍后再发送
              </div>
            </div>
          </div>
          <div
            style={{
              background: COLORS.primary,
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 14,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            重试
          </div>
        </div>

        {/* AI offline card */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #FFF1E0 0%, #FFE3CB 100%)",
            border: "1px solid rgba(255,255,255,0.8)",
            borderRadius: 20,
            padding: "14px 16px",
            marginTop: 6,
          }}
        >
          <div className="flex items-start gap-3">
            <MiniIcon bg="rgba(255,138,92,0.18)" color={COLORS.primary} size={36}>
              <Sparkles size={18} />
            </MiniIcon>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                灵伴暂时离线
              </div>
              <div
                style={{
                  color: COLORS.subText,
                  fontSize: 12,
                  marginTop: 4,
                  lineHeight: 1.55,
                }}
              >
                我们已自动保存消息，网络恢复后会继续对话
              </div>
              <div
                className="flex items-center gap-1"
                style={{
                  marginTop: 10,
                  color: COLORS.primary,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={12} />
                重新连接
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disabled input */}
      <div
        className="px-4 flex items-center gap-2"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 34,
          opacity: 0.6,
        }}
      >
        <div
          className="flex items-center flex-1 gap-2"
          style={{
            height: 48,
            borderRadius: 24,
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            padding: "0 16px",
          }}
        >
          <div style={{ flex: 1, color: COLORS.subText, fontSize: 14 }}>
            网络恢复后即可发送…
          </div>
          <Mic size={18} color={COLORS.subText} />
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: COLORS.muted,
          }}
        >
          <Send size={18} color={COLORS.subText} />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 29: Health Home
// ============================================================
export function Screen29() {
  return (
    <PhoneFrame label="29 · 健康管理首页">
      <WarmBg />
      <SubTopBar
        title="奶油的健康"
        right={
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: "rgba(255,255,255,0.78)",
              border: `1px solid ${COLORS.line}`,
            }}
          >
            <Plus size={18} color={COLORS.text} />
          </div>
        }
      />

      <div
        style={{
          height: 624,
          overflow: "hidden",
          paddingBottom: 8,
        }}
      >
        {/* Score hero */}
        <div className="px-5" style={{ marginTop: 8 }}>
          <div
            style={{
              background:
                "linear-gradient(135deg, #FFE3CB 0%, #FFD2A8 60%, #FFC089 100%)",
              borderRadius: 24,
              padding: "18px 20px",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 18px 36px -16px rgba(180,110,60,0.35)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -20,
                top: -20,
                width: 140,
                height: 140,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)",
              }}
            />
            <div className="flex items-center justify-between">
              <div>
                <div
                  className="flex items-center gap-1"
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    fontWeight: 500,
                    opacity: 0.7,
                  }}
                >
                  <Heart size={12} fill={COLORS.primary} color={COLORS.primary} />
                  今日健康分
                </div>
                <div
                  className="flex items-baseline gap-2"
                  style={{ marginTop: 6 }}
                >
                  <div
                    style={{
                      fontSize: 44,
                      fontWeight: 700,
                      color: COLORS.text,
                      letterSpacing: -1.2,
                      lineHeight: 1,
                    }}
                  >
                    92
                  </div>
                  <div style={{ color: COLORS.subText, fontSize: 13 }}>
                    / 100
                  </div>
                </div>
                <div
                  style={{
                    color: COLORS.text,
                    fontSize: 12.5,
                    fontWeight: 500,
                    marginTop: 8,
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  体重稳定 · 运动适中 · 心情很好
                </div>
              </div>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  background: "rgba(255,255,255,0.9)",
                  padding: 6,
                  boxShadow: "0 10px 22px -8px rgba(180,110,60,0.35)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                  }}
                >
                  <ImageWithFallback
                    src={PET_PHOTO}
                    alt="奶油"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "saturate(1.18)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: 体重趋势 */}
        <div className="px-5" style={{ marginTop: 14 }}>
          <SectionRow
            icon={<Scale size={16} />}
            iconBg="rgba(255,138,92,0.14)"
            iconColor={COLORS.primary}
            title="体重趋势"
            sub="近 30 天稳定增长 0.4kg"
            badge="12.5kg"
            badgeColor={COLORS.accent}
            chart
          />
        </div>

        {/* Section: 疫苗计划 */}
        <div className="px-5" style={{ marginTop: 10 }}>
          <SectionRow
            icon={<Syringe size={16} />}
            iconBg="rgba(77,182,172,0.18)"
            iconColor={COLORS.accent}
            title="疫苗计划"
            sub="狂犬疫苗 · 12 天后到期"
            badge="待接种"
            badgeColor={COLORS.primary}
          />
        </div>

        {/* Section: 健康备忘 */}
        <div className="px-5" style={{ marginTop: 10 }}>
          <SectionRow
            icon={<NotebookPen size={16} />}
            iconBg="rgba(255,138,92,0.14)"
            iconColor={COLORS.primary}
            title="健康备忘"
            sub="洗澡 · 驱虫 · 体检"
            badge="3 条"
            badgeColor={COLORS.subText}
          />
        </div>

        {/* Recent timeline */}
        <div className="px-5" style={{ marginTop: 14 }}>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 8 }}
          >
            <div
              style={{
                color: COLORS.text,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              近期记录
            </div>
            <div style={{ color: COLORS.subText, fontSize: 12 }}>
              查看全部
            </div>
          </div>
          <CardShell style={{ padding: "6px 14px" }}>
            <TLRow
              dot={COLORS.primary}
              date="06-02"
              title="体重 12.5kg"
              sub="较上次 +0.1kg"
              icon={<Scale size={13} />}
            />
            <Divider />
            <TLRow
              dot={COLORS.accent}
              date="05-28"
              title="驱虫完成"
              sub="外用滴剂 · 下次 09-28"
              icon={<Check size={13} />}
            />
            <Divider />
            <TLRow
              dot="#C8A871"
              date="05-21"
              title="洗澡 · 美容"
              sub="精神状态好"
              icon={<Sparkles size={13} />}
            />
          </CardShell>
        </div>
      </div>

      <BottomTabBar active="pet" />
      <HomeIndicator />
    </PhoneFrame>
  );
}

function SectionRow({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  badge,
  badgeColor,
  chart,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  badge: string;
  badgeColor: string;
  chart?: boolean;
}) {
  return (
    <CardShell style={{ padding: "14px 16px" }}>
      <div className="flex items-center gap-3">
        <MiniIcon bg={iconBg} color={iconColor} size={40}>
          {icon}
        </MiniIcon>
        <div style={{ flex: 1 }}>
          <div className="flex items-center justify-between">
            <div
              style={{ color: COLORS.text, fontSize: 14.5, fontWeight: 600 }}
            >
              {title}
            </div>
            <div
              style={{
                color: badgeColor,
                fontSize: 11.5,
                fontWeight: 600,
                background:
                  badgeColor === COLORS.subText
                    ? "rgba(122,121,114,0.12)"
                    : badgeColor === COLORS.primary
                      ? "rgba(255,138,92,0.12)"
                      : "rgba(77,182,172,0.14)",
                padding: "3px 10px",
                borderRadius: 12,
              }}
            >
              {badge}
            </div>
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 12,
              marginTop: 3,
            }}
          >
            {sub}
          </div>
        </div>
      </div>
      {chart && <MiniChart />}
    </CardShell>
  );
}

function MiniChart() {
  const points = [22, 18, 26, 22, 28, 24, 18, 22, 16, 14, 20, 18, 12];
  const max = 30;
  const w = 320;
  const h = 56;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - (p / max) * h;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <div style={{ marginTop: 12, position: "relative" }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id="gWeight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8A5C" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF8A5C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#gWeight)" />
        <path
          d={path}
          fill="none"
          stroke="#FF8A5C"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={w} cy={h - (12 / max) * h} r="4" fill="#fff" stroke="#FF8A5C" strokeWidth="2" />
      </svg>
    </div>
  );
}

function TLRow({
  dot,
  date,
  title,
  sub,
  icon,
}: {
  dot: string;
  date: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ padding: "10px 0" }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          background: `${dot}26`,
          color: dot,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: COLORS.text,
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 11.5,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      </div>
      <div style={{ color: COLORS.subText, fontSize: 11.5 }}>{date}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: COLORS.line }} />;
}

// ============================================================
// Screen 30: Weight log
// ============================================================
export function Screen30() {
  return (
    <PhoneFrame label="30 · 体重记录">
      <WarmBg />
      <SubTopBar title="体重记录" />

      <div className="px-5" style={{ marginTop: 8 }}>
        {/* Big number */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 22,
            padding: "20px 22px",
            boxShadow: "0 14px 30px -16px rgba(80,55,30,0.18)",
          }}
        >
          <div style={{ color: COLORS.subText, fontSize: 12, fontWeight: 500 }}>
            今日体重
          </div>
          <div
            className="flex items-baseline gap-2"
            style={{ marginTop: 6 }}
          >
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: COLORS.text,
                letterSpacing: -1.2,
                lineHeight: 1,
              }}
            >
              12.5
            </div>
            <div style={{ fontSize: 14, color: COLORS.subText }}>kg</div>
            <div
              className="flex items-center gap-1"
              style={{
                marginLeft: 6,
                background: "rgba(77,182,172,0.18)",
                color: COLORS.accent,
                padding: "3px 9px",
                borderRadius: 11,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <ArrowUp size={10} strokeWidth={3} />
              0.1
            </div>
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 12,
              marginTop: 10,
              lineHeight: 1.55,
            }}
          >
            金毛 2 岁标准范围 11–14kg · 状态良好
          </div>
        </div>
      </div>

      {/* Input form */}
      <div className="px-5" style={{ marginTop: 14 }}>
        <CardShell style={{ padding: "16px 18px" }}>
          <div
            style={{
              color: COLORS.text,
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            记录新的体重
          </div>
          <div
            className="flex items-center"
            style={{
              height: 60,
              border: `1.5px solid ${COLORS.primary}`,
              borderRadius: 16,
              padding: "0 16px",
              background: "rgba(255,138,92,0.06)",
            }}
          >
            <Scale size={18} color={COLORS.primary} />
            <div
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.text,
                letterSpacing: -0.4,
              }}
            >
              12.5
              <span
                style={{
                  display: "inline-block",
                  marginLeft: 2,
                  width: 2,
                  height: 22,
                  background: COLORS.primary,
                  verticalAlign: "middle",
                  animation: "blink 1s infinite",
                }}
              />
            </div>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              kg
            </div>
          </div>
          <div
            className="flex items-center gap-2"
            style={{ marginTop: 14 }}
          >
            <div
              className="flex items-center gap-2"
              style={{
                background: COLORS.bg,
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: 12.5,
                color: COLORS.text,
                flex: 1,
              }}
            >
              <Calendar size={14} color={COLORS.subText} />
              今天 · 09:32
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                background: COLORS.bg,
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: 12.5,
                color: COLORS.text,
              }}
            >
              <Camera size={14} color={COLORS.subText} />
              照片
            </div>
          </div>
        </CardShell>
      </div>

      {/* History */}
      <div className="px-5" style={{ marginTop: 14 }}>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 8 }}
        >
          <div
            style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}
          >
            历史记录
          </div>
          <div style={{ color: COLORS.subText, fontSize: 12 }}>近 30 天</div>
        </div>
        <CardShell style={{ padding: "6px 16px" }}>
          {[
            { d: "06-02", w: "12.5 kg", delta: "+0.1", up: true },
            { d: "05-26", w: "12.4 kg", delta: "+0.2", up: true },
            { d: "05-19", w: "12.2 kg", delta: "-0.1", up: false },
            { d: "05-12", w: "12.3 kg", delta: "+0.3", up: true },
          ].map((r, i, arr) => (
            <div key={r.d}>
              <div
                className="flex items-center justify-between"
                style={{ padding: "11px 0" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: COLORS.primary,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        color: COLORS.text,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {r.w}
                    </div>
                    <div
                      style={{
                        color: COLORS.subText,
                        fontSize: 11.5,
                        marginTop: 2,
                      }}
                    >
                      {r.d}
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1"
                  style={{
                    color: r.up ? COLORS.accent : COLORS.danger,
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: r.up
                      ? "rgba(77,182,172,0.14)"
                      : "rgba(229,87,63,0.12)",
                    padding: "4px 10px",
                    borderRadius: 11,
                  }}
                >
                  {r.up ? (
                    <ArrowUp size={10} strokeWidth={3} />
                  ) : (
                    <ArrowDown size={10} strokeWidth={3} />
                  )}
                  {r.delta}
                </div>
              </div>
              {i < arr.length - 1 && <Divider />}
            </div>
          ))}
        </CardShell>
      </div>

      <div
        className="px-5"
        style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}
      >
        <div
          className="flex items-center justify-center gap-2"
          style={{
            height: 52,
            borderRadius: 26,
            background: COLORS.primary,
            color: "#fff",
            fontSize: 15.5,
            fontWeight: 600,
            boxShadow: "0 14px 28px -12px rgba(255,138,92,0.7)",
          }}
        >
          <Check size={16} strokeWidth={3} />
          保存记录
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 31: Weight trend
// ============================================================
export function Screen31() {
  return (
    <PhoneFrame label="31 · 体重趋势">
      <WarmBg />
      <SubTopBar title="体重趋势" />

      {/* Range chips */}
      <div className="flex items-center justify-center gap-2 px-5" style={{ marginTop: 4 }}>
        {["7 天", "30 天", "90 天", "1 年"].map((r, i) => (
          <div
            key={r}
            style={{
              padding: "7px 14px",
              borderRadius: 14,
              background: i === 1 ? COLORS.primary : "#fff",
              color: i === 1 ? "#fff" : COLORS.text,
              fontSize: 12.5,
              fontWeight: i === 1 ? 600 : 500,
              border: i === 1 ? "none" : `1px solid ${COLORS.line}`,
              boxShadow: i === 1 ? "0 8px 16px -8px rgba(255,138,92,0.55)" : "none",
            }}
          >
            {r}
          </div>
        ))}
      </div>

      {/* Big chart card */}
      <div className="px-5" style={{ marginTop: 14 }}>
        <CardShell style={{ padding: "18px 18px 14px" }}>
          <div className="flex items-end justify-between">
            <div>
              <div
                style={{ color: COLORS.subText, fontSize: 12, fontWeight: 500 }}
              >
                30 天平均
              </div>
              <div
                className="flex items-baseline gap-2"
                style={{ marginTop: 4 }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.text,
                    letterSpacing: -0.6,
                  }}
                >
                  12.3
                </div>
                <div style={{ color: COLORS.subText, fontSize: 13 }}>kg</div>
                <div
                  className="flex items-center gap-1"
                  style={{
                    background: "rgba(77,182,172,0.16)",
                    color: COLORS.accent,
                    padding: "3px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    marginLeft: 6,
                  }}
                >
                  <TrendingUp size={11} />
                  +0.4
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ color: COLORS.subText, fontSize: 11.5 }}
            >
              <Activity size={12} />
              健康区间
            </div>
          </div>
          <BigChart />
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: 4,
              color: COLORS.subText,
              fontSize: 10.5,
              padding: "0 4px",
            }}
          >
            {["05/04", "05/11", "05/18", "05/25", "06/01"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </CardShell>
      </div>

      {/* Stat tiles */}
      <div
        className="px-5 grid"
        style={{ marginTop: 12, gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
      >
        <StatTile label="最低" value="12.1" color={COLORS.accent} />
        <StatTile label="最高" value="12.6" color={COLORS.primary} />
        <StatTile label="波动" value="±0.25" color={COLORS.text} />
      </div>

      {/* AI insight */}
      <div className="px-5" style={{ marginTop: 14 }}>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(255,138,92,0.10), rgba(77,182,172,0.10))",
            border: "1px solid rgba(255,138,92,0.22)",
            borderRadius: 20,
            padding: "14px 16px",
          }}
        >
          <div className="flex items-start gap-3">
            <MiniIcon
              bg="#fff"
              color={COLORS.primary}
              size={36}
            >
              <Sparkles size={16} />
            </MiniIcon>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                AI 灵伴的小建议
              </div>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 12.5,
                  marginTop: 6,
                  lineHeight: 1.65,
                  opacity: 0.85,
                }}
              >
                体重稳定增长，处于金毛 2 岁健康区间。建议保持每日 30–40 分钟散步，避免高油零食。
              </div>
            </div>
          </div>
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        padding: "12px 14px",
        boxShadow: "0 8px 18px -14px rgba(80,55,30,0.16)",
      }}
    >
      <div style={{ color: COLORS.subText, fontSize: 11, fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: 19,
          fontWeight: 700,
          marginTop: 4,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BigChart() {
  const points = [12.1, 12.2, 12.15, 12.25, 12.3, 12.2, 12.35, 12.4, 12.3, 12.45, 12.5, 12.55, 12.5];
  const min = 11.8;
  const max = 12.8;
  const w = 320;
  const h = 130;
  const stepX = w / (points.length - 1);
  const mapY = (p: number) => h - ((p - min) / (max - min)) * h;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${i * stepX},${mapY(p)}`)
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <div style={{ marginTop: 14, position: "relative" }}>
      <svg width="100%" height={h + 4} viewBox={`0 0 ${w} ${h + 4}`}>
        <defs>
          <linearGradient id="gWeight2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8A5C" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF8A5C" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            x2={w}
            y1={h * g}
            y2={h * g}
            stroke={COLORS.line}
            strokeDasharray="3 4"
            strokeWidth="1"
          />
        ))}
        {/* healthy band */}
        <rect
          x="0"
          y={mapY(12.6)}
          width={w}
          height={mapY(12.0) - mapY(12.6)}
          fill="rgba(77,182,172,0.12)"
        />
        <path d={area} fill="url(#gWeight2)" />
        <path
          d={path}
          fill="none"
          stroke="#FF8A5C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) =>
          i === points.length - 1 ? (
            <g key={i}>
              <circle cx={i * stepX} cy={mapY(p)} r="6" fill="#FF8A5C" opacity="0.18" />
              <circle
                cx={i * stepX}
                cy={mapY(p)}
                r="4"
                fill="#fff"
                stroke="#FF8A5C"
                strokeWidth="2.4"
              />
            </g>
          ) : null
        )}
      </svg>
    </div>
  );
}

// ============================================================
// Screen 32: Vaccine plan
// ============================================================
export function Screen32() {
  return (
    <PhoneFrame label="32 · 疫苗计划">
      <WarmBg />
      <SubTopBar title="疫苗计划" />

      {/* Upcoming hero */}
      <div className="px-5" style={{ marginTop: 8 }}>
        <div
          style={{
            background:
              "linear-gradient(135deg, #FFE3CB 0%, #FFD2A8 100%)",
            borderRadius: 22,
            padding: "16px 18px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 14px 30px -16px rgba(180,110,60,0.3)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div
                style={{
                  color: COLORS.primary,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.7)",
                  padding: "3px 10px",
                  borderRadius: 10,
                  display: "inline-block",
                }}
              >
                即将到期
              </div>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 20,
                  fontWeight: 700,
                  marginTop: 10,
                  letterSpacing: -0.3,
                }}
              >
                狂犬疫苗
              </div>
              <div
                className="flex items-center gap-1"
                style={{ marginTop: 6, color: COLORS.text, opacity: 0.75, fontSize: 12.5 }}
              >
                <Calendar size={12} />
                2026-06-14 · 还有 12 天
              </div>
            </div>
            <div
              className="flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: "rgba(255,255,255,0.85)",
                boxShadow: "0 10px 22px -8px rgba(180,110,60,0.35)",
              }}
            >
              <Syringe size={26} color={COLORS.primary} />
            </div>
          </div>
          <div
            className="flex gap-2"
            style={{ marginTop: 14 }}
          >
            <div
              className="flex-1 flex items-center justify-center gap-1"
              style={{
                height: 40,
                borderRadius: 20,
                background: "#fff",
                color: COLORS.primary,
                fontSize: 13,
                fontWeight: 600,
                border: `1px solid ${COLORS.line}`,
              }}
            >
              <Bell size={13} />
              开启提醒
            </div>
            <div
              className="flex-1 flex items-center justify-center gap-1"
              style={{
                height: 40,
                borderRadius: 20,
                background: COLORS.primary,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 10px 20px -8px rgba(255,138,92,0.6)",
              }}
            >
              <Check size={13} strokeWidth={3} />
              标记完成
            </div>
          </div>
        </div>
      </div>

      {/* Plan list */}
      <div className="px-5" style={{ marginTop: 16 }}>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 8 }}
        >
          <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>
            全部计划
          </div>
          <div className="flex items-center gap-1" style={{ color: COLORS.primary, fontSize: 12, fontWeight: 600 }}>
            <Plus size={12} strokeWidth={3} />
            新增
          </div>
        </div>
        <CardShell style={{ padding: "4px 16px" }}>
          <VaxRow
            name="狂犬疫苗"
            date="2026-06-14"
            sub="12 天后 · 第 3 次加强"
            state="upcoming"
          />
          <Divider />
          <VaxRow
            name="犬六联疫苗"
            date="2026-03-10"
            sub="已完成 · 阳光宠物医院"
            state="done"
          />
          <Divider />
          <VaxRow
            name="体内驱虫"
            date="2026-05-28"
            sub="已完成 · 拜耳拜宠清"
            state="done"
          />
          <Divider />
          <VaxRow
            name="心丝虫预防"
            date="2026-07-01"
            sub="计划中 · 每年 1 次"
            state="planned"
          />
        </CardShell>
      </div>

      {/* Tip */}
      <div className="px-5" style={{ marginTop: 14 }}>
        <div
          className="flex items-start gap-3"
          style={{
            background: "rgba(77,182,172,0.10)",
            border: "1px solid rgba(77,182,172,0.22)",
            borderRadius: 18,
            padding: "12px 14px",
          }}
        >
          <Sparkles size={14} color={COLORS.accent} />
          <div
            style={{
              flex: 1,
              color: COLORS.text,
              fontSize: 12.5,
              lineHeight: 1.6,
              opacity: 0.88,
            }}
          >
            建议接种前 1 天减少剧烈运动，注射后观察 24 小时是否有过敏反应。
          </div>
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function VaxRow({
  name,
  date,
  sub,
  state,
}: {
  name: string;
  date: string;
  sub: string;
  state: "upcoming" | "done" | "planned";
}) {
  const map = {
    upcoming: { bg: "rgba(255,138,92,0.14)", c: COLORS.primary, t: "待接种" },
    done: { bg: "rgba(77,182,172,0.16)", c: COLORS.accent, t: "已完成" },
    planned: { bg: "rgba(122,121,114,0.14)", c: COLORS.subText, t: "计划中" },
  }[state];
  return (
    <div
      className="flex items-center gap-3"
      style={{ padding: "12px 0" }}
    >
      <MiniIcon bg={map.bg} color={map.c} size={36}>
        {state === "done" ? <Check size={16} strokeWidth={3} /> : <Syringe size={16} />}
      </MiniIcon>
      <div style={{ flex: 1 }}>
        <div
          className="flex items-center gap-2"
        >
          <div
            style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: map.c,
              fontWeight: 600,
              background: map.bg,
              padding: "2px 7px",
              borderRadius: 9,
            }}
          >
            {map.t}
          </div>
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 11.5,
            marginTop: 3,
          }}
        >
          {sub}
        </div>
      </div>
      <div style={{ color: COLORS.subText, fontSize: 11.5 }}>{date.slice(5)}</div>
    </div>
  );
}

// ============================================================
// Screen 33: Health note form
// ============================================================
export function Screen33() {
  return (
    <PhoneFrame label="33 · 新增健康备忘">
      <WarmBg />
      <SubTopBar
        title="新增健康备忘"
        right={
          <div
            style={{
              color: COLORS.primary,
              fontSize: 14,
              fontWeight: 600,
              padding: "8px 0",
            }}
          >
            保存
          </div>
        }
      />

      <div className="px-5" style={{ marginTop: 4 }}>
        {/* Type picker */}
        <div
          style={{
            color: COLORS.subText,
            fontSize: 12,
            marginBottom: 10,
            fontWeight: 500,
          }}
        >
          备忘类型
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          <TypeCell icon={<Scale size={18} />} label="洗澡" />
          <TypeCell icon={<Sparkles size={18} />} label="驱虫" active />
          <TypeCell icon={<Stethoscope size={18} />} label="体检" />
          <TypeCell icon={<NotebookPen size={18} />} label="其他" />
        </div>

        {/* Field: 时间 */}
        <FieldLabel>提醒时间</FieldLabel>
        <div
          className="flex items-center"
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "0 16px",
            height: 52,
          }}
        >
          <Calendar size={16} color={COLORS.primary} />
          <div
            style={{
              flex: 1,
              marginLeft: 12,
              color: COLORS.text,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            2026-09-28 · 09:00
          </div>
          <ChevronRight size={16} color={COLORS.subText} />
        </div>

        {/* Field: 重复 */}
        <FieldLabel>重复</FieldLabel>
        <div className="flex gap-2">
          {["不重复", "每月", "每 3 月", "每年"].map((r, i) => (
            <div
              key={r}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 14,
                background: i === 2 ? "rgba(255,138,92,0.12)" : "#fff",
                border: i === 2
                  ? `1.5px solid ${COLORS.primary}`
                  : `1px solid ${COLORS.line}`,
                color: i === 2 ? COLORS.primary : COLORS.text,
                fontSize: 12.5,
                fontWeight: i === 2 ? 600 : 500,
                textAlign: "center",
              }}
            >
              {r}
            </div>
          ))}
        </div>

        {/* Field: 备注 */}
        <FieldLabel>备注</FieldLabel>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "12px 16px",
            minHeight: 92,
            color: COLORS.text,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          外用滴剂 · 拜耳拜宠清
          <span style={{ color: COLORS.subText, opacity: 0.5 }}>
            ｜
          </span>
        </div>

        {/* Reminder switch */}
        <div
          className="flex items-center justify-between"
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "14px 16px",
            marginTop: 14,
          }}
        >
          <div className="flex items-center gap-3">
            <MiniIcon bg="rgba(255,138,92,0.14)" color={COLORS.primary} size={34}>
              <Bell size={15} />
            </MiniIcon>
            <div>
              <div
                style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}
              >
                到期前提醒
              </div>
              <div
                style={{ color: COLORS.subText, fontSize: 11.5, marginTop: 2 }}
              >
                提前 3 天通知
              </div>
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              background: COLORS.primary,
              padding: 2,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                background: "#fff",
                marginLeft: 18,
                boxShadow: "0 2px 4px rgba(0,0,0,0.18)",
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="px-5"
        style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}
      >
        <div
          className="flex items-center justify-center gap-2"
          style={{
            height: 52,
            borderRadius: 26,
            background: COLORS.primary,
            color: "#fff",
            fontSize: 15.5,
            fontWeight: 600,
            boxShadow: "0 14px 28px -12px rgba(255,138,92,0.7)",
          }}
        >
          <Check size={16} strokeWidth={3} />
          保存备忘
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: COLORS.subText,
        fontSize: 12,
        fontWeight: 500,
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function TypeCell({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5"
      style={{
        height: 72,
        borderRadius: 16,
        background: active ? "rgba(255,138,92,0.12)" : "#fff",
        border: active
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        color: active ? COLORS.primary : COLORS.text,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
      }}
    >
      {icon}
      {label}
    </div>
  );
}

// ============================================================
// Screen 34: Publish today's note
// ============================================================
export function Screen34() {
  return (
    <PhoneFrame label="34 · 发布今日小事">
      <WarmBg />
      <SubTopBar
        title="今日小事"
        right={
          <div
            style={{
              color: COLORS.primary,
              fontSize: 14,
              fontWeight: 600,
              padding: "8px 0",
            }}
          >
            发布
          </div>
        }
      />

      <div className="px-5" style={{ marginTop: 4 }}>
        {/* Pet chip */}
        <div
          className="flex items-center gap-3"
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 18,
            padding: "10px 14px",
            boxShadow: "0 10px 22px -14px rgba(80,55,30,0.18)",
          }}
        >
          <RoundAvatar src={PET_PHOTO} size={38} />
          <div style={{ flex: 1 }}>
            <div
              style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}
            >
              奶油的日常
            </div>
            <div
              style={{ color: COLORS.subText, fontSize: 11.5, marginTop: 2 }}
            >
              主人记录 · 仅自己可见
            </div>
          </div>
          <ChevronRight size={16} color={COLORS.subText} />
        </div>

        {/* Text area */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 18,
            padding: "14px 16px",
            marginTop: 12,
            minHeight: 130,
          }}
        >
          <div
            style={{
              color: COLORS.text,
              fontSize: 15,
              lineHeight: 1.65,
            }}
          >
            奶油今天第一次成功捡回飞盘！
            <br />
            它叼着飞盘小跑回来的样子又骄傲又可爱～
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 16,
                background: COLORS.primary,
                verticalAlign: "middle",
                marginLeft: 1,
                animation: "blink 1s infinite",
              }}
            />
          </div>
        </div>

        {/* Photo strip */}
        <div
          className="flex gap-2"
          style={{ marginTop: 12 }}
        >
          <PhotoSquare src={PET_PHOTO_OUTDOOR} />
          <PhotoSquare src={PET_PHOTO_ALT} />
          <div
            className="flex flex-col items-center justify-center"
            style={{
              flex: 1,
              aspectRatio: "1 / 1",
              borderRadius: 14,
              border: `1.5px dashed ${COLORS.line}`,
              color: COLORS.subText,
              fontSize: 11,
              fontWeight: 500,
              background: "rgba(255,255,255,0.5)",
              gap: 4,
            }}
          >
            <ImageIcon size={20} />
            添加
          </div>
        </div>

        {/* Mood + tag chips */}
        <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
          <Chip icon="😄" label="心情：开心" />
          <Chip icon="🏞️" label="地点：望京公园" />
          <Chip icon="🥎" label="#捡飞盘" />
          <Chip icon="🐾" label="#日常" />
        </div>

        {/* AI summary card */}
        <div
          style={{
            marginTop: 16,
            background:
              "linear-gradient(135deg, rgba(255,138,92,0.10), rgba(77,182,172,0.10))",
            border: "1px solid rgba(255,138,92,0.22)",
            borderRadius: 20,
            padding: "14px 16px",
          }}
        >
          <div className="flex items-start gap-3">
            <MiniIcon bg="#fff" color={COLORS.primary} size={34}>
              <Sparkles size={15} />
            </MiniIcon>
            <div style={{ flex: 1 }}>
              <div
                className="flex items-center justify-between"
              >
                <div
                  style={{
                    color: COLORS.text,
                    fontSize: 13.5,
                    fontWeight: 600,
                  }}
                >
                  AI 灵伴帮你润色
                </div>
                <div
                  style={{
                    color: COLORS.primary,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  采用
                </div>
              </div>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 12.5,
                  marginTop: 6,
                  lineHeight: 1.65,
                  opacity: 0.85,
                }}
              >
                "今天奶油在望京公园第一次完整地把飞盘叼了回来——小跑、回头、邀功，三连击直接萌翻。"
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="flex items-center justify-between px-5"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 36,
          height: 56,
          background: "rgba(255,255,255,0.92)",
          borderRadius: 28,
          margin: "0 16px",
          padding: "0 18px",
          border: `1px solid ${COLORS.line}`,
          boxShadow: "0 16px 36px -14px rgba(80,55,30,0.22)",
        }}
      >
        <div className="flex items-center gap-4">
          <Camera size={20} color={COLORS.text} />
          <ImageIcon size={20} color={COLORS.text} />
          <Smile size={20} color={COLORS.text} />
        </div>
        <div
          className="flex items-center gap-1"
          style={{
            background: COLORS.primary,
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 16,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 10px 22px -10px rgba(255,138,92,0.65)",
          }}
        >
          <Send size={13} />
          发布
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function PhotoSquare({ src }: { src: string }) {
  return (
    <div
      style={{
        flex: 1,
        aspectRatio: "1 / 1",
        borderRadius: 14,
        overflow: "hidden",
        border: "2px solid #fff",
        boxShadow: "0 8px 18px -10px rgba(80,55,30,0.22)",
        position: "relative",
      }}
    >
      <ImageWithFallback
        src={src}
        alt="照片"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: "6px 12px",
        fontSize: 12,
        color: COLORS.text,
        fontWeight: 500,
      }}
    >
      <span>{icon}</span>
      {label}
    </div>
  );
}
