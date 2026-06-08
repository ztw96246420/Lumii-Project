import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  MapPin,
  MessageCircle,
  Send,
  Mic,
  Camera,
  Image as ImageIcon,
  Bell,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  X,
  Check,
  Heart,
  Sparkles,
  Calendar,
  Clock,
  PawPrint,
  Smile,
  Flag,
  MoreHorizontal,
  Filter,
  Users,
  Navigation,
  Plus,
} from "lucide-react";
import { COLORS, PhoneFrame, HomeIndicator } from "./login-kit";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ---------- Photo refs ----------
const PET_GOLDEN =
  "https://images.unsplash.com/photo-1599692392256-2d084495fe15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PET_CORGI =
  "https://images.unsplash.com/photo-1597806999047-9456837df754?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PET_CORGI_B =
  "https://images.unsplash.com/photo-1612940960267-4549a58fb257?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PET_CAT =
  "https://images.unsplash.com/photo-1665659219608-4e22c0760dd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PET_CAT_B =
  "https://images.unsplash.com/photo-1634116273932-1fa42e745dff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PET_SHIBA =
  "https://images.unsplash.com/photo-1703955921658-9c4df7c1d627?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const OWNER_A =
  "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";
const OWNER_B =
  "https://images.unsplash.com/photo-1562337404-3044c84ac061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";
const OWNER_C =
  "https://images.unsplash.com/photo-1567516364473-233c4b6fcfbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";
const PARK_PHOTO =
  "https://images.unsplash.com/photo-1561438774-1790fe271b8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";

// ---------- Atoms ----------
function WarmBg() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(120% 50% at 50% 0%, rgba(255,217,182,0.55) 0%, rgba(255,217,182,0) 60%), radial-gradient(80% 40% at 100% 100%, rgba(77,182,172,0.12) 0%, rgba(77,182,172,0) 70%)",
        pointerEvents: "none",
      }}
    />
  );
}

function HeaderBar({
  title,
  showBack = false,
  right,
}: {
  title?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{ height: 50 }}
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
        <div
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.4,
          }}
        >
          {title}
        </div>
      )}
      {showBack && (
        <div
          style={{ color: COLORS.text, fontSize: 16, fontWeight: 600 }}
        >
          {title}
        </div>
      )}
      <div style={{ minWidth: 36, height: 36 }}>{right}</div>
    </div>
  );
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function Avatar({
  src,
  size = 36,
  ring,
  bottomRight,
}: {
  src: string;
  size?: number;
  ring?: string;
  bottomRight?: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: ring ? 2 : 0,
        background: ring,
        position: "relative",
        flexShrink: 0,
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
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {bottomRight && (
        <div
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
          }}
        >
          {bottomRight}
        </div>
      )}
    </div>
  );
}

function PrimaryBtn({
  label,
  icon,
  fullWidth,
  small,
}: {
  label: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      style={{
        height: small ? 36 : 48,
        width: fullWidth ? "100%" : undefined,
        flex: fullWidth ? undefined : 1,
        borderRadius: small ? 18 : 24,
        background: COLORS.primary,
        color: "#fff",
        fontSize: small ? 12.5 : 14.5,
        fontWeight: 600,
        boxShadow: "0 12px 24px -12px rgba(255,138,92,0.7)",
        padding: small ? "0 14px" : undefined,
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function GhostBtn({
  label,
  icon,
  small,
}: {
  label: string;
  icon?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      style={{
        height: small ? 36 : 48,
        flex: 1,
        borderRadius: small ? 18 : 24,
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        color: COLORS.text,
        fontSize: small ? 12.5 : 14.5,
        fontWeight: 500,
        padding: small ? "0 14px" : undefined,
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function Tag({
  label,
  tone = "warm",
}: {
  label: string;
  tone?: "warm" | "cool" | "neutral";
}) {
  const map = {
    warm: { bg: "rgba(255,138,92,0.12)", c: COLORS.primary },
    cool: { bg: "rgba(77,182,172,0.16)", c: COLORS.accent },
    neutral: { bg: "rgba(122,121,114,0.12)", c: COLORS.subText },
  }[tone];
  return (
    <div
      style={{
        background: map.bg,
        color: map.c,
        padding: "4px 10px",
        borderRadius: 11,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

// ============================================================
// Screen 35 — Social discover
// ============================================================
export function Screen35() {
  return (
    <PhoneFrame label="35 · 社交发现页">
      <WarmBg />
      <HeaderBar
        title="发现"
        right={
          <div className="flex items-center gap-2">
            <IconChip>
              <Search size={16} color={COLORS.text} />
            </IconChip>
            <IconChip>
              <SlidersHorizontal size={16} color={COLORS.text} />
            </IconChip>
          </div>
        }
      />

      {/* Location chip */}
      <div className="px-5" style={{ marginTop: 2 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
            padding: "8px 12px",
            backdropFilter: "blur(10px)",
          }}
        >
          <MapPin size={13} color={COLORS.primary} />
          <div
            style={{
              flex: 1,
              color: COLORS.text,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            朝阳区 · 望京 · 1km 内
          </div>
          <div
            className="flex items-center gap-1"
            style={{
              color: COLORS.accent,
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(77,182,172,0.14)",
              padding: "3px 8px",
              borderRadius: 9,
            }}
          >
            <ShieldCheck size={10} />
            模糊距离
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div
        className="px-5 flex gap-2"
        style={{ marginTop: 12, overflowX: "auto" }}
      >
        <FilterChip label="全部" active />
        <FilterChip label="🐶 汪星人" />
        <FilterChip label="🐱 喵星人" />
        <FilterChip label="想交朋友" />
        <FilterChip label="可约遛" />
      </div>

      {/* Cards */}
      <div
        className="px-5"
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 12,
        }}
      >
        <PetOwnerCard
          petSrc={PET_CORGI}
          ownerSrc={OWNER_A}
          petName="麻薯"
          ownerName="小薯"
          distance="1km 内"
          breed="柯基"
          tags={[
            { label: "可约遛", tone: "warm" },
            { label: "友好", tone: "cool" },
          ]}
          bio="爱跑爱叫，公园里最积极的捡球选手"
        />
        <PetOwnerCard
          petSrc={PET_CAT}
          ownerSrc={OWNER_B}
          petName="布丁"
          ownerName="阿萌"
          distance="约 1-2km"
          breed="橘猫"
          tags={[
            { label: "只线上聊天", tone: "neutral" },
            { label: "友好", tone: "cool" },
          ]}
          bio="爱睡爱吃，最近迷上了纸箱"
        />
      </div>

      <SocialTabBar active="discover" />
      <HomeIndicator />
    </PhoneFrame>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: 16,
        background: active ? COLORS.primary : "#fff",
        color: active ? "#fff" : COLORS.text,
        border: active ? "none" : `1px solid ${COLORS.line}`,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        boxShadow: active
          ? "0 10px 20px -10px rgba(255,138,92,0.6)"
          : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function PetOwnerCard({
  petSrc,
  ownerSrc,
  petName,
  ownerName,
  distance,
  breed,
  tags,
  bio,
}: {
  petSrc: string;
  ownerSrc: string;
  petName: string;
  ownerName: string;
  distance: string;
  breed: string;
  tags: { label: string; tone: "warm" | "cool" | "neutral" }[];
  bio: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 22,
        padding: 14,
        boxShadow: "0 14px 30px -16px rgba(80,55,30,0.2)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 18,
            overflow: "hidden",
            position: "relative",
            background: "#FFEDD9",
            flexShrink: 0,
          }}
        >
          <ImageWithFallback
            src={petSrc}
            alt={petName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(1.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 6,
              bottom: 6,
            }}
          >
            <Avatar src={ownerSrc} size={28} ring="#fff" />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center justify-between">
            <div
              style={{
                color: COLORS.text,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              {petName}
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                color: COLORS.accent,
                fontSize: 10.5,
                fontWeight: 600,
                background: "rgba(77,182,172,0.14)",
                padding: "3px 8px",
                borderRadius: 9,
              }}
            >
              <MapPin size={10} />
              {distance}
            </div>
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 11.5,
              marginTop: 2,
            }}
          >
            {breed} · 主人 {ownerName}
          </div>
          <div
            style={{
              color: COLORS.text,
              fontSize: 12,
              marginTop: 6,
              lineHeight: 1.55,
              opacity: 0.78,
            }}
          >
            {bio}
          </div>
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
            {tags.map((t, i) => (
              <Tag key={`${t.label}-${i}`} label={t.label} tone={t.tone} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2" style={{ marginTop: 12 }}>
        <GhostBtn label="打个招呼" icon={<Heart size={13} color={COLORS.primary} />} small />
        <PrimaryBtn label="约遛" icon={<PawPrint size={13} />} small />
      </div>
    </div>
  );
}

function SocialTabBar({
  active,
}: {
  active: "pet" | "discover" | "map" | "msg" | "me";
}) {
  const items: {
    key: typeof active;
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    badge?: number;
  }[] = [
    { key: "pet", label: "宠物", icon: PawPrint },
    { key: "discover", label: "发现", icon: Users },
    { key: "map", label: "地图", icon: MapPin },
    { key: "msg", label: "消息", icon: MessageCircle, badge: 3 },
    { key: "me", label: "我的", icon: Smile },
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
              <div style={{ position: "relative" }}>
                <Icon size={20} color={on ? COLORS.primary : COLORS.subText} strokeWidth={on ? 2.4 : 2} />
                {it.badge && (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 14,
                      height: 14,
                      padding: "0 4px",
                      borderRadius: 7,
                      background: COLORS.danger,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      border: "1.5px solid #fff",
                    }}
                  >
                    {it.badge}
                  </div>
                )}
              </div>
              <span style={{ position: "relative" }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Screen 36 — Discover empty (filtered no results)
// ============================================================
export function Screen36() {
  return (
    <PhoneFrame label="36 · 筛选无结果">
      <WarmBg />
      <HeaderBar
        title="发现"
        right={
          <div className="flex items-center gap-2">
            <IconChip>
              <Search size={16} color={COLORS.text} />
            </IconChip>
            <IconChip>
              <SlidersHorizontal size={16} color={COLORS.text} />
            </IconChip>
          </div>
        }
      />

      <div className="px-5" style={{ marginTop: 2 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
            padding: "8px 12px",
          }}
        >
          <Filter size={13} color={COLORS.primary} />
          <div style={{ flex: 1, color: COLORS.text, fontSize: 12.5, fontWeight: 500 }}>
            已应用 3 个筛选 · 喵星人 · 可约遛 · 1km 内
          </div>
          <div
            style={{
              color: COLORS.primary,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            清除
          </div>
        </div>
      </div>

      <div
        className="px-5 flex gap-2"
        style={{ marginTop: 12, overflowX: "auto" }}
      >
        <FilterChip label="全部" />
        <FilterChip label="🐶 汪星人" />
        <FilterChip label="🐱 喵星人" active />
        <FilterChip label="想交朋友" />
        <FilterChip label="可约遛" active />
      </div>

      {/* Empty hero */}
      <div
        className="flex flex-col items-center px-8"
        style={{ marginTop: 64, textAlign: "center" }}
      >
        <div
          style={{
            position: "relative",
            width: 156,
            height: 156,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 40%, rgba(255,138,92,0.18) 0%, rgba(255,138,92,0) 70%)",
            }}
          />
          <div
            className="flex items-center justify-center mx-auto"
            style={{
              width: 130,
              height: 130,
              borderRadius: 65,
              background:
                "linear-gradient(135deg, #FFE3CB 0%, #FFD2A8 100%)",
              boxShadow: "0 14px 30px -14px rgba(180,110,60,0.35)",
              position: "absolute",
              left: 13,
              top: 13,
            }}
          >
            <Search size={48} color="#fff" strokeWidth={2.2} />
          </div>
          <div
            style={{
              position: "absolute",
              right: 12,
              top: 8,
              background: "#fff",
              padding: "4px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.subText,
              border: `1px solid ${COLORS.line}`,
            }}
          >
            0 位
          </div>
        </div>
        <div
          style={{
            color: COLORS.text,
            fontSize: 19,
            fontWeight: 700,
            marginTop: 20,
            letterSpacing: -0.3,
          }}
        >
          附近暂时没有匹配的朋友
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 13,
            marginTop: 10,
            lineHeight: 1.65,
          }}
        >
          可以试试放宽筛选条件
          <br />
          或扩大搜索范围到 3km
        </div>
        <div className="flex gap-3" style={{ marginTop: 22, width: "100%" }}>
          <GhostBtn label="清除筛选" />
          <PrimaryBtn label="扩大到 3km" icon={<Navigation size={14} />} />
        </div>
      </div>

      <SocialTabBar active="discover" />
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 37 — Location not authorized
// ============================================================
export function Screen37() {
  return (
    <PhoneFrame label="37 · 定位未授权">
      <WarmBg />
      <HeaderBar
        title="发现"
        right={
          <div className="flex items-center gap-2">
            <IconChip>
              <Search size={16} color={COLORS.text} />
            </IconChip>
            <IconChip>
              <SlidersHorizontal size={16} color={COLORS.text} />
            </IconChip>
          </div>
        }
      />

      <div className="px-5" style={{ marginTop: 2 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(229,87,63,0.08)",
            border: "1px solid rgba(229,87,63,0.22)",
            borderRadius: 14,
            padding: "10px 12px",
          }}
        >
          <ShieldAlert size={14} color={COLORS.danger} />
          <div
            style={{
              flex: 1,
              color: COLORS.danger,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            定位未授权，无法显示附近的朋友
          </div>
        </div>
      </div>

      {/* Blurred preview cards */}
      <div
        className="px-5"
        style={{
          marginTop: 14,
          filter: "blur(4px)",
          opacity: 0.5,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <PetOwnerCard
          petSrc={PET_GOLDEN}
          ownerSrc={OWNER_C}
          petName="??"
          ownerName="??"
          distance="?km"
          breed="?"
          tags={[
            { label: "??", tone: "warm" },
            { label: "??", tone: "cool" },
          ]}
          bio="开启定位后可见"
        />
      </div>

      {/* CTA panel */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 100,
          padding: "0 20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "20px 20px 18px",
            border: `1px solid ${COLORS.line}`,
            boxShadow: "0 24px 50px -18px rgba(80,55,30,0.28)",
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
                "linear-gradient(135deg, rgba(255,138,92,0.2), rgba(77,182,172,0.2))",
              marginBottom: 12,
            }}
          >
            <MapPin size={26} color={COLORS.primary} strokeWidth={2.2} />
          </div>
          <div
            style={{
              color: COLORS.text,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: -0.2,
            }}
          >
            开启定位发现附近朋友
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 12.5,
              marginTop: 8,
              lineHeight: 1.65,
            }}
          >
            我们只展示模糊距离，不会暴露精确位置
            <br />
            你可以随时关闭
          </div>

          <div
            className="flex items-start gap-2"
            style={{
              marginTop: 14,
              background: "rgba(77,182,172,0.10)",
              borderRadius: 12,
              padding: "10px 12px",
              textAlign: "left",
            }}
          >
            <ShieldCheck size={13} color={COLORS.accent} />
            <div
              style={{
                color: COLORS.accent,
                fontSize: 11.5,
                fontWeight: 500,
                lineHeight: 1.55,
                flex: 1,
              }}
            >
              你的精确位置不会向任何用户公开
            </div>
          </div>

          <div className="flex gap-2" style={{ marginTop: 14 }}>
            <GhostBtn label="暂不开启" />
            <PrimaryBtn label="去设置开启" icon={<Navigation size={13} />} />
          </div>
        </div>
      </div>

      <SocialTabBar active="discover" />
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 38 — Greet bottom sheet
// ============================================================
export function Screen38() {
  return (
    <PhoneFrame label="38 · 打招呼 Bottom Sheet">
      <WarmBg />
      <HeaderBar
        title="发现"
        right={
          <div className="flex items-center gap-2">
            <IconChip>
              <Search size={16} color={COLORS.text} />
            </IconChip>
            <IconChip>
              <SlidersHorizontal size={16} color={COLORS.text} />
            </IconChip>
          </div>
        }
      />

      <div
        className="px-5"
        style={{ marginTop: 14, opacity: 0.4, filter: "blur(1px)" }}
      >
        <PetOwnerCard
          petSrc={PET_CORGI}
          ownerSrc={OWNER_A}
          petName="麻薯"
          ownerName="小薯"
          distance="1km 内"
          breed="柯基"
          tags={[
            { label: "可约遛", tone: "warm" },
            { label: "友好", tone: "cool" },
          ]}
          bio="爱跑爱叫，公园里最积极的捡球选手"
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(27,28,25,0) 30%, rgba(27,28,25,0.42) 100%)",
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
          padding: "16px 22px 32px",
          boxShadow: "0 -24px 50px -16px rgba(80,55,30,0.28)",
        }}
      >
        <div
          className="mx-auto"
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: COLORS.line,
            marginBottom: 14,
          }}
        />
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <ImageWithFallback
              src={PET_CORGI}
              alt="麻薯"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                right: -3,
                bottom: -3,
              }}
            >
              <Avatar src={OWNER_A} size={22} ring="#fff" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: COLORS.text,
                fontSize: 15.5,
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              和麻薯打个招呼
            </div>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 11.5,
                marginTop: 2,
              }}
            >
              柯基 · 主人 小薯 · 1km 内
            </div>
          </div>
        </div>

        <div
          style={{
            color: COLORS.subText,
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          选一句话开场
        </div>
        <div className="flex flex-wrap gap-2">
          <GreetChip label="嗨～看起来麻薯超有活力！" active />
          <GreetChip label="我家奶油也喜欢公园" />
          <GreetChip label="改天一起遛弯？" />
          <GreetChip label="自定义" plus />
        </div>

        {/* Text */}
        <div
          style={{
            marginTop: 14,
            background: COLORS.bg,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "12px 14px",
            minHeight: 82,
            color: COLORS.text,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          嗨～看起来麻薯超有活力！我家是 2 岁的金毛奶油，特别想找捡球同伴
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 16,
              marginLeft: 1,
              background: COLORS.primary,
              verticalAlign: "middle",
              animation: "blink 1s infinite",
            }}
          />
        </div>

        {/* Safety */}
        <div
          className="flex items-start gap-2"
          style={{
            marginTop: 12,
            background: "rgba(77,182,172,0.10)",
            border: "1px solid rgba(77,182,172,0.22)",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          <ShieldCheck size={13} color={COLORS.accent} />
          <div
            style={{
              flex: 1,
              color: COLORS.accent,
              fontSize: 11.5,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            首次招呼后对方同意，才能继续聊天。请勿发送骚扰信息
          </div>
        </div>

        <div className="flex gap-2" style={{ marginTop: 14 }}>
          <GhostBtn label="取消" />
          <PrimaryBtn label="发送招呼" icon={<Send size={13} />} />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function GreetChip({
  label,
  active,
  plus,
}: {
  label: string;
  active?: boolean;
  plus?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1"
      style={{
        padding: "8px 12px",
        borderRadius: 14,
        background: active ? "rgba(255,138,92,0.12)" : "#fff",
        border: active
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        color: active ? COLORS.primary : COLORS.text,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
      }}
    >
      {plus && <Plus size={12} />}
      {label}
    </div>
  );
}

// ============================================================
// Screen 39 — Walk invitation page
// ============================================================
export function Screen39() {
  return (
    <PhoneFrame label="39 · 约遛邀请">
      <WarmBg />
      <HeaderBar title="约遛邀请" showBack />

      <div className="px-5" style={{ marginTop: 4 }}>
        {/* Two pets stack */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 22,
            padding: "16px 18px",
            boxShadow: "0 14px 30px -16px rgba(80,55,30,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center"
              style={{ position: "relative", width: 100 }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  overflow: "hidden",
                  border: "3px solid #fff",
                  boxShadow: "0 6px 14px -6px rgba(80,55,30,0.25)",
                }}
              >
                <ImageWithFallback
                  src={PET_GOLDEN}
                  alt="奶油"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "saturate(1.15)",
                  }}
                />
              </div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  overflow: "hidden",
                  border: "3px solid #fff",
                  marginLeft: -16,
                  boxShadow: "0 6px 14px -6px rgba(80,55,30,0.25)",
                }}
              >
                <ImageWithFallback
                  src={PET_CORGI}
                  alt="麻薯"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: -0.2,
                }}
              >
                奶油 × 麻薯
              </div>
              <div
                style={{
                  color: COLORS.subText,
                  fontSize: 11.5,
                  marginTop: 2,
                }}
              >
                金毛 × 柯基 · 一起溜达？
              </div>
            </div>
          </div>
        </div>

        {/* Time */}
        <FieldLabel>时间</FieldLabel>
        <div className="flex gap-2">
          <DateTile day="今天" date="06-02" weekday="周二" />
          <DateTile day="明天" date="06-03" weekday="周三" active />
          <DateTile day="周四" date="06-04" weekday="06-04" />
        </div>
        <div
          className="flex items-center"
          style={{
            marginTop: 10,
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
            padding: "0 14px",
            height: 48,
          }}
        >
          <Clock size={15} color={COLORS.primary} />
          <div
            style={{
              flex: 1,
              marginLeft: 10,
              color: COLORS.text,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            17:30 - 18:30
          </div>
          <ChevronRight size={15} color={COLORS.subText} />
        </div>

        {/* Place */}
        <FieldLabel>地点</FieldLabel>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", height: 110 }}>
            <ImageWithFallback
              src={PARK_PHOTO}
              alt="望京公园"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
              }}
            />
            <div
              className="absolute flex items-center gap-1"
              style={{
                left: 12,
                bottom: 12,
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <MapPin size={13} />
              望京公园 · 西门
            </div>
            <div
              className="absolute"
              style={{
                right: 12,
                top: 12,
                background: "rgba(255,255,255,0.92)",
                color: COLORS.text,
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 9px",
                borderRadius: 10,
              }}
            >
              宠物友好
            </div>
          </div>
        </div>

        {/* Message */}
        <FieldLabel>留言</FieldLabel>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "12px 14px",
            minHeight: 64,
            color: COLORS.text,
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          带个飞盘哈，奶油超爱捡飞盘 🥎
        </div>

        {/* Safety */}
        <div
          className="flex items-start gap-2"
          style={{
            marginTop: 14,
            background: "rgba(77,182,172,0.10)",
            border: "1px solid rgba(77,182,172,0.22)",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          <ShieldCheck size={13} color={COLORS.accent} />
          <div
            style={{
              flex: 1,
              color: COLORS.accent,
              fontSize: 11.5,
              fontWeight: 500,
              lineHeight: 1.55,
            }}
          >
            建议在公共宠物友好场所见面，注意人身与宠物安全
          </div>
        </div>
      </div>

      <div
        className="px-5 flex gap-2"
        style={{ position: "absolute", left: 0, right: 0, bottom: 36 }}
      >
        <GhostBtn label="保存草稿" />
        <PrimaryBtn label="发送邀请" icon={<Send size={14} />} />
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
        marginTop: 14,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function DateTile({
  day,
  date,
  weekday,
  active,
}: {
  day: string;
  date: string;
  weekday: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        height: 64,
        borderRadius: 16,
        background: active ? "rgba(255,138,92,0.12)" : "#fff",
        border: active
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          color: active ? COLORS.primary : COLORS.subText,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {day}
      </div>
      <div
        style={{
          color: COLORS.text,
          fontSize: 14,
          fontWeight: 600,
          marginTop: 2,
        }}
      >
        {date}
      </div>
      <div
        style={{
          color: COLORS.subText,
          fontSize: 10.5,
        }}
      >
        {weekday}
      </div>
    </div>
  );
}

// ============================================================
// Screen 40 — Greet requests page
// ============================================================
export function Screen40() {
  return (
    <PhoneFrame label="40 · 招呼请求">
      <WarmBg />
      <HeaderBar title="招呼请求" showBack right={<IconChip><MoreHorizontal size={16} color={COLORS.text} /></IconChip>} />

      <div className="px-5" style={{ marginTop: 4 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
            padding: "8px 12px",
          }}
        >
          <div
            className="flex items-center gap-1.5"
            style={{
              color: COLORS.primary,
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(255,138,92,0.12)",
              padding: "3px 9px",
              borderRadius: 9,
            }}
          >
            3 条新招呼
          </div>
          <div
            style={{
              flex: 1,
              color: COLORS.subText,
              fontSize: 11.5,
            }}
          >
            同意后即可开始聊天
          </div>
        </div>
      </div>

      <div
        className="px-5"
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <RequestCard
          petSrc={PET_CORGI}
          ownerSrc={OWNER_A}
          name="小薯 & 麻薯"
          tag="柯基 · 1km 内"
          msg="嗨～看起来奶油超有活力！要不约个时间一起遛？"
          time="刚刚"
          state="new"
        />
        <RequestCard
          petSrc={PET_CAT}
          ownerSrc={OWNER_B}
          name="阿萌 & 布丁"
          tag="橘猫 · 约 1-2km · 只线上聊天"
          msg="想和奶油线上做朋友～可以一起分享日常照片吗？"
          time="2 小时前"
          state="new"
        />
        <RequestCard
          petSrc={PET_SHIBA}
          ownerSrc={OWNER_C}
          name="JOJO & 豆芽"
          tag="柴犬 · 约 1-2km"
          msg="我家豆芽也喜欢望京公园，下周末有空一起吗？"
          time="昨天"
          state="accepted"
        />
      </div>

      <div className="px-5" style={{ marginTop: 14 }}>
        <div
          className="flex items-center justify-center gap-2"
          style={{
            color: COLORS.subText,
            fontSize: 12,
            padding: "10px 0",
          }}
        >
          <ShieldCheck size={12} />
          忽略的招呼不会通知对方
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function RequestCard({
  petSrc,
  ownerSrc,
  name,
  tag,
  msg,
  time,
  state,
}: {
  petSrc: string;
  ownerSrc: string;
  name: string;
  tag: string;
  msg: string;
  time: string;
  state: "new" | "accepted";
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 20,
        padding: 14,
        boxShadow: "0 10px 24px -16px rgba(80,55,30,0.2)",
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <ImageWithFallback
              src={petSrc}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ position: "absolute", right: -4, bottom: -4 }}>
            <Avatar src={ownerSrc} size={22} ring="#fff" />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center justify-between">
            <div
              style={{
                color: COLORS.text,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {name}
            </div>
            <div style={{ color: COLORS.subText, fontSize: 10.5 }}>{time}</div>
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {tag}
          </div>
          <div
            style={{
              color: COLORS.text,
              fontSize: 13,
              marginTop: 8,
              lineHeight: 1.6,
              opacity: 0.85,
            }}
          >
            {msg}
          </div>
        </div>
      </div>
      {state === "new" ? (
        <div className="flex gap-2" style={{ marginTop: 12 }}>
          <div
            className="flex items-center justify-center gap-1"
            style={{
              flex: 1,
              height: 36,
              borderRadius: 18,
              color: COLORS.subText,
              fontSize: 12.5,
              fontWeight: 500,
              background: COLORS.muted,
            }}
          >
            <X size={13} />
            忽略
          </div>
          <div
            className="flex items-center justify-center gap-1"
            style={{
              flex: 1,
              height: 36,
              borderRadius: 18,
              background: "#fff",
              border: `1px solid ${COLORS.line}`,
              color: COLORS.text,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <Flag size={12} />
            举报
          </div>
          <div
            className="flex items-center justify-center gap-1"
            style={{
              flex: 1.4,
              height: 36,
              borderRadius: 18,
              background: COLORS.primary,
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
              boxShadow: "0 8px 18px -8px rgba(255,138,92,0.65)",
            }}
          >
            <Check size={13} strokeWidth={3} />
            同意 & 聊天
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-between"
          style={{
            marginTop: 12,
            background: "rgba(77,182,172,0.10)",
            border: "1px solid rgba(77,182,172,0.22)",
            borderRadius: 14,
            padding: "8px 12px",
          }}
        >
          <div
            className="flex items-center gap-1.5"
            style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}
          >
            <Check size={13} strokeWidth={3} />
            已同意 · 已建立聊天
          </div>
          <ChevronRight size={14} color={COLORS.accent} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Screen 41 — Message list
// ============================================================
export function Screen41() {
  return (
    <PhoneFrame label="41 · 消息列表">
      <WarmBg />
      <HeaderBar
        title="消息"
        right={
          <div className="flex items-center gap-2">
            <IconChip>
              <Search size={16} color={COLORS.text} />
            </IconChip>
            <div
              className="flex items-center justify-center relative"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: "rgba(255,255,255,0.78)",
                border: `1px solid ${COLORS.line}`,
              }}
            >
              <Bell size={16} color={COLORS.text} />
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
        }
      />

      {/* Requests card */}
      <div className="px-5">
        <div
          className="flex items-center gap-3"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,138,92,0.10), rgba(77,182,172,0.10))",
            border: "1px solid rgba(255,138,92,0.22)",
            borderRadius: 18,
            padding: "12px 14px",
            boxShadow: "0 10px 22px -14px rgba(80,55,30,0.2)",
          }}
        >
          <div
            className="flex"
            style={{ width: 60 }}
          >
            <div style={{ marginLeft: -2 }}>
              <Avatar src={PET_CORGI} size={32} ring="#fff" />
            </div>
            <div style={{ marginLeft: -10 }}>
              <Avatar src={PET_CAT} size={32} ring="#fff" />
            </div>
            <div style={{ marginLeft: -10 }}>
              <Avatar src={PET_SHIBA} size={32} ring="#fff" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: COLORS.text,
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              3 条新招呼请求
            </div>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 11.5,
                marginTop: 2,
              }}
            >
              小薯、阿萌、JOJO 想和你打招呼
            </div>
          </div>
          <ChevronRight size={16} color={COLORS.subText} />
        </div>
      </div>

      {/* Conversations */}
      <div
        className="px-5"
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ChatRow
          petSrc={PET_GOLDEN}
          ownerSrc={OWNER_A}
          name="AI 灵伴 · 奶油"
          last="主人，今天我们去公园吗？🐾"
          time="09:32"
          unread={2}
          isAI
        />
        <ChatRow
          petSrc={PET_CORGI}
          ownerSrc={OWNER_A}
          name="小薯 & 麻薯"
          last="约遛邀请：望京公园 · 明天 17:30"
          time="刚刚"
          unread={1}
          invite
        />
        <ChatRow
          petSrc={PET_SHIBA}
          ownerSrc={OWNER_C}
          name="JOJO & 豆芽"
          last="哈哈我家也是 这张照片太可爱了"
          time="昨天"
        />
        <ChatRow
          petSrc={PET_CAT}
          ownerSrc={OWNER_B}
          name="阿萌 & 布丁"
          last="你发的攻略我收藏了～"
          time="周一"
          muted
        />
        <ChatRow
          petSrc={PET_CORGI_B}
          ownerSrc={OWNER_C}
          name="社区 · 望京汪喵圈"
          last="本周末有线下狗友见面会"
          time="5/28"
          group
        />
      </div>

      <SocialTabBar active="msg" />
      <HomeIndicator />
    </PhoneFrame>
  );
}

function ChatRow({
  petSrc,
  ownerSrc,
  name,
  last,
  time,
  unread,
  isAI,
  invite,
  muted,
  group,
}: {
  petSrc: string;
  ownerSrc: string;
  name: string;
  last: string;
  time: string;
  unread?: number;
  isAI?: boolean;
  invite?: boolean;
  muted?: boolean;
  group?: boolean;
}) {
  return (
    <div className="flex items-center gap-3" style={{ padding: "12px 0", borderBottom: `1px solid ${COLORS.line}` }}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            overflow: "hidden",
            border: isAI ? `2px solid ${COLORS.primary}` : "2px solid #fff",
            boxShadow: "0 4px 10px -3px rgba(80,55,30,0.2)",
          }}
        >
          <ImageWithFallback
            src={petSrc}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: isAI ? "saturate(1.18)" : "saturate(1.05)",
            }}
          />
        </div>
        {!isAI && !group && (
          <div style={{ position: "absolute", right: -3, bottom: -3 }}>
            <Avatar src={ownerSrc} size={22} ring="#fff" />
          </div>
        )}
        {isAI && (
          <div
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              right: -3,
              bottom: -3,
              width: 20,
              height: 20,
              borderRadius: 10,
              background: COLORS.primary,
              border: "2px solid #fff",
            }}
          >
            <Sparkles size={10} color="#fff" />
          </div>
        )}
        {group && (
          <div
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              right: -3,
              bottom: -3,
              width: 20,
              height: 20,
              borderRadius: 10,
              background: COLORS.accent,
              border: "2px solid #fff",
            }}
          >
            <Users size={10} color="#fff" />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1.5"
            style={{
              color: COLORS.text,
              fontSize: 14.5,
              fontWeight: 600,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 11,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {time}
          </div>
        </div>
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 4 }}
        >
          <div
            style={{
              color: muted ? COLORS.subText : COLORS.text,
              opacity: muted ? 0.6 : 0.78,
              fontSize: 12.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {invite && (
              <span
                style={{
                  color: COLORS.primary,
                  fontWeight: 600,
                  marginRight: 4,
                }}
              >
                [邀请]
              </span>
            )}
            {last}
          </div>
          <div className="flex items-center gap-1.5" style={{ marginLeft: 8 }}>
            {muted && (
              <Bell size={11} color={COLORS.subText} strokeWidth={2} style={{ opacity: 0.5 }} />
            )}
            {unread && (
              <div
                className="flex items-center justify-center"
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: "0 6px",
                  borderRadius: 9,
                  background: COLORS.primary,
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                {unread}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Screen 42 — Chat detail
// ============================================================
export function Screen42() {
  return (
    <PhoneFrame label="42 · 聊天详情">
      <WarmBg />
      {/* Chat header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 56 }}
      >
        <div className="flex items-center gap-3">
          <ChevronLeft size={22} color={COLORS.text} />
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                overflow: "hidden",
                border: "2px solid #fff",
              }}
            >
              <ImageWithFallback
                src={PET_CORGI}
                alt="麻薯"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ position: "absolute", right: -3, bottom: -3 }}>
              <Avatar src={OWNER_A} size={20} ring="#fff" />
            </div>
          </div>
          <div>
            <div
              style={{ color: COLORS.text, fontSize: 15, fontWeight: 600 }}
            >
              小薯 & 麻薯
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                color: COLORS.accent,
                fontSize: 11,
                fontWeight: 500,
                marginTop: 1,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  background: COLORS.accent,
                }}
              />
              在线 · 1km 内
            </div>
          </div>
        </div>
        <IconChip>
          <MoreHorizontal size={16} color={COLORS.text} />
        </IconChip>
      </div>

      {/* Safety strip */}
      <div className="px-4" style={{ marginTop: 0 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(77,182,172,0.10)",
            border: "1px solid rgba(77,182,172,0.22)",
            borderRadius: 12,
            padding: "8px 12px",
          }}
        >
          <ShieldCheck size={12} color={COLORS.accent} />
          <div
            style={{
              flex: 1,
              color: COLORS.accent,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            请勿转账或线下单独见面，注意宠物与人身安全
          </div>
          <Flag size={11} color={COLORS.accent} />
        </div>
      </div>

      {/* Chat content */}
      <div
        className="px-4"
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <DateChip text="今天 17:02" />

        <BubbleOther
          src={PET_CORGI}
          text="哈喽！看到奶油在公园的视频啦，麻薯也超喜欢捡飞盘 🥎"
        />

        {/* Pet card */}
        <BubbleOther
          src={PET_CORGI}
          card={
            <PetMiniCard
              petSrc={PET_CORGI}
              name="麻薯"
              breed="柯基 · 1 岁 8 个月"
              tags={["友好", "爱社交"]}
            />
          }
        />

        <BubbleMine text="哇麻薯好可爱！看起来活力满满～" />

        {/* Walk invite card */}
        <BubbleOther
          src={PET_CORGI}
          card={
            <InviteCard
              place="望京公园 · 西门"
              when="明天 17:30 - 18:30"
              status="pending"
            />
          }
        />

        <BubbleMine text="明天可以！我们准时到～" />
      </div>

      {/* Quick attachments */}
      <div
        className="px-4 flex gap-2"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 100,
          overflowX: "auto",
        }}
      >
        <AttachChip icon={<MapPin size={12} />} label="地点" />
        <AttachChip icon={<PawPrint size={12} />} label="宠物卡" />
        <AttachChip icon={<Calendar size={12} />} label="约遛" />
        <AttachChip icon={<ImageIcon size={12} />} label="相册" />
      </div>

      <ChatInput />

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
        fontSize: 10.5,
        padding: "4px 12px",
        borderRadius: 12,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
  );
}

function BubbleOther({
  src,
  text,
  card,
}: {
  src: string;
  text?: string;
  card?: React.ReactNode;
}) {
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
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {card ? (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: "18px 18px 18px 4px",
            padding: 6,
            boxShadow: "0 6px 14px -10px rgba(80,55,30,0.18)",
            maxWidth: 260,
          }}
        >
          {card}
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            padding: "10px 14px",
            borderRadius: "18px 18px 18px 4px",
            color: COLORS.text,
            fontSize: 13.5,
            lineHeight: 1.55,
            boxShadow: "0 6px 14px -10px rgba(80,55,30,0.18)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function BubbleMine({
  text,
  state,
}: {
  text: string;
  state?: "sending" | "failed" | "sent";
}) {
  return (
    <div
      className="flex items-end gap-2"
      style={{
        marginLeft: "auto",
        maxWidth: "82%",
        flexDirection: "row-reverse",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #FF9F73 0%, #FF8A5C 100%)",
          padding: "10px 14px",
          borderRadius: "18px 18px 4px 18px",
          color: "#fff",
          fontSize: 13.5,
          lineHeight: 1.55,
          boxShadow: "0 8px 18px -10px rgba(255,138,92,0.6)",
        }}
      >
        {text}
      </div>
      {state === "sending" && (
        <div
          className="flex items-center gap-1"
          style={{
            color: COLORS.subText,
            fontSize: 10.5,
            marginBottom: 4,
          }}
        >
          <Clock size={10} />
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
          <AlertCircle size={10} />
          重试
        </div>
      )}
    </div>
  );
}

function PetMiniCard({
  petSrc,
  name,
  breed,
  tags,
}: {
  petSrc: string;
  name: string;
  breed: string;
  tags: string[];
}) {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #FFF1E0 0%, #FFE3CB 100%)",
        borderRadius: 14,
        padding: 10,
        width: 240,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <ImageWithFallback
            src={petSrc}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{ color: COLORS.text, fontSize: 14, fontWeight: 700 }}
          >
            {name}
          </div>
          <div
            style={{ color: COLORS.subText, fontSize: 11, marginTop: 1 }}
          >
            {breed}
          </div>
        </div>
        <PawPrint size={16} color={COLORS.primary} />
      </div>
      <div className="flex gap-1.5" style={{ marginTop: 8 }}>
        {tags.map((t) => (
          <div
            key={t}
            style={{
              background: "#fff",
              color: COLORS.primary,
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 8,
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function InviteCard({
  place,
  when,
  status,
}: {
  place: string;
  when: string;
  status: "pending" | "accepted";
}) {
  return (
    <div
      style={{
        width: 240,
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div style={{ position: "relative", height: 96 }}>
        <ImageWithFallback
          src={PARK_PHOTO}
          alt={place}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        <div
          className="absolute flex items-center gap-1"
          style={{
            left: 10,
            top: 10,
            background: "rgba(255,255,255,0.92)",
            color: COLORS.primary,
            fontSize: 10.5,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 8,
          }}
        >
          <PawPrint size={10} />
          约遛邀请
        </div>
        <div
          className="absolute"
          style={{
            left: 10,
            bottom: 8,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {place}
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div
          className="flex items-center gap-1"
          style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}
        >
          <Calendar size={11} color={COLORS.primary} />
          {when}
        </div>
        <div className="flex gap-2" style={{ marginTop: 8 }}>
          <div
            className="flex-1 flex items-center justify-center"
            style={{
              height: 30,
              borderRadius: 15,
              background: COLORS.muted,
              color: COLORS.subText,
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            稍后再说
          </div>
          <div
            className="flex-1 flex items-center justify-center gap-1"
            style={{
              height: 30,
              borderRadius: 15,
              background: status === "accepted" ? COLORS.accent : COLORS.primary,
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            {status === "accepted" ? <Check size={11} strokeWidth={3} /> : null}
            {status === "accepted" ? "已接受" : "接受"}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: "6px 10px",
        fontSize: 11.5,
        color: COLORS.text,
        fontWeight: 500,
        boxShadow: "0 6px 14px -10px rgba(80,55,30,0.16)",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function ChatInput({ disabled }: { disabled?: boolean }) {
  return (
    <div
      className="px-4 flex items-center gap-2"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 34,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        className="flex items-center flex-1 gap-2"
        style={{
          height: 46,
          borderRadius: 23,
          background: "#fff",
          border: `1px solid ${COLORS.line}`,
          padding: "0 14px 0 16px",
          boxShadow: "0 8px 20px -12px rgba(80,55,30,0.18)",
        }}
      >
        <div style={{ flex: 1, color: COLORS.subText, fontSize: 13.5 }}>
          {disabled ? "网络恢复后即可发送…" : "说点什么…"}
        </div>
        <Mic size={17} color={COLORS.subText} />
        <Camera size={17} color={COLORS.subText} />
      </div>
      <div
        className="flex items-center justify-center"
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          background: disabled ? COLORS.muted : COLORS.primary,
          boxShadow: disabled ? "none" : "0 12px 22px -10px rgba(255,138,92,0.7)",
        }}
      >
        <Send size={16} color={disabled ? COLORS.subText : "#fff"} />
      </div>
    </div>
  );
}

// ============================================================
// Screen 43 — Send failed state
// ============================================================
export function Screen43() {
  return (
    <PhoneFrame label="43 · 消息发送失败">
      <WarmBg />
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 56 }}
      >
        <div className="flex items-center gap-3">
          <ChevronLeft size={22} color={COLORS.text} />
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                overflow: "hidden",
                border: "2px solid #fff",
              }}
            >
              <ImageWithFallback
                src={PET_CORGI}
                alt="麻薯"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>
          <div>
            <div
              style={{ color: COLORS.text, fontSize: 15, fontWeight: 600 }}
            >
              小薯 & 麻薯
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                color: COLORS.subText,
                fontSize: 11,
                marginTop: 1,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  background: COLORS.subText,
                }}
              />
              连接不稳定
            </div>
          </div>
        </div>
        <IconChip>
          <MoreHorizontal size={16} color={COLORS.text} />
        </IconChip>
      </div>

      {/* Network error banner */}
      <div className="px-4">
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(229,87,63,0.10)",
            border: "1px solid rgba(229,87,63,0.25)",
            borderRadius: 12,
            padding: "8px 12px",
          }}
        >
          <AlertCircle size={13} color={COLORS.danger} />
          <div
            style={{
              flex: 1,
              color: COLORS.danger,
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            网络不稳定，消息可能延迟送达
          </div>
          <div
            className="flex items-center gap-1"
            style={{
              color: COLORS.danger,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            <RefreshCw size={11} />
            重连
          </div>
        </div>
      </div>

      <div
        className="px-4"
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <DateChip text="今天 17:42" />
        <BubbleOther src={PET_CORGI} text="奶油今天毛色看着特别好呀～" />
        <BubbleMine text="谢谢～刚洗完澡 🛁" state="sent" />
        <BubbleMine text="对了下周末有空吗？" state="sending" />
        <BubbleMine text="想一起带它们去河边" state="failed" />

        {/* Retry inline card */}
        <div
          className="ml-auto flex items-center gap-2"
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
            padding: "10px 12px",
            marginLeft: "auto",
            boxShadow: "0 8px 18px -12px rgba(80,55,30,0.18)",
            maxWidth: "82%",
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              background: "rgba(229,87,63,0.12)",
            }}
          >
            <AlertCircle size={15} color={COLORS.danger} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: COLORS.text,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              消息未送达
            </div>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              点击重试或长按删除
            </div>
          </div>
          <div
            className="flex items-center gap-1"
            style={{
              background: COLORS.primary,
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 12,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            <RefreshCw size={11} />
            重试
          </div>
        </div>
      </div>

      <ChatInput disabled />
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 44 — Notification center
// ============================================================
export function Screen44() {
  return (
    <PhoneFrame label="44 · 通知中心">
      <WarmBg />
      <HeaderBar
        title="通知"
        showBack
        right={
          <div
            style={{
              color: COLORS.primary,
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 0",
            }}
          >
            全部已读
          </div>
        }
      />

      {/* Tabs */}
      <div
        className="px-5 flex gap-2"
        style={{ marginTop: 4, overflowX: "auto" }}
      >
        <FilterChip label="全部" active />
        <FilterChip label="互动" />
        <FilterChip label="约遛" />
        <FilterChip label="健康提醒" />
        <FilterChip label="系统" />
      </div>

      <div
        className="px-5"
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <NotifGroup label="今天" />
        <NotifItem
          icon={<PawPrint size={15} />}
          iconBg="rgba(255,138,92,0.16)"
          iconColor={COLORS.primary}
          title="小薯邀请你和麻薯一起去望京公园"
          time="刚刚"
          unread
          right={<PrimaryBtn label="查看" small />}
        />
        <NotifItem
          icon={<Heart size={15} />}
          iconBg="rgba(229,87,63,0.14)"
          iconColor={COLORS.danger}
          title="阿萌想和奶油打招呼"
          sub="嗨～想和奶油线上做朋友"
          time="2 小时前"
          unread
        />
        <NotifItem
          icon={<Sparkles size={15} />}
          iconBg="rgba(77,182,172,0.18)"
          iconColor={COLORS.accent}
          title="AI 灵伴生成了 1 条新建议"
          sub="今天可以减少 10g 主粮量"
          time="09:14"
          unread
        />

        <NotifGroup label="昨天" />
        <NotifItem
          icon={<Sparkles size={15} />}
          iconBg="rgba(77,182,172,0.18)"
          iconColor={COLORS.accent}
          title="疫苗到期提醒"
          sub="狂犬疫苗将在 12 天后到期"
          time="昨天 20:30"
        />
        <NotifItem
          icon={<MessageCircle size={15} />}
          iconBg="rgba(255,138,92,0.16)"
          iconColor={COLORS.primary}
          title="JOJO 在你的动态下留言"
          sub="豆芽也想和奶油做朋友！"
          time="昨天 18:02"
        />
        <NotifItem
          icon={<ShieldCheck size={15} />}
          iconBg="rgba(122,121,114,0.14)"
          iconColor={COLORS.subText}
          title="账号安全：在新设备登录"
          sub="iPhone · 北京 · 已确认"
          time="昨天 09:21"
        />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function NotifGroup({ label }: { label: string }) {
  return (
    <div
      style={{
        color: COLORS.subText,
        fontSize: 11.5,
        fontWeight: 600,
        padding: "10px 0 6px",
        letterSpacing: 0.3,
      }}
    >
      {label}
    </div>
  );
}

function NotifItem({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  time,
  unread,
  right,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  sub?: string;
  time: string;
  unread?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-3"
      style={{
        background: unread ? "rgba(255,138,92,0.06)" : "#fff",
        border: `1px solid ${unread ? "rgba(255,138,92,0.22)" : COLORS.line}`,
        borderRadius: 16,
        padding: "12px 14px",
        position: "relative",
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: iconBg,
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center justify-between gap-2">
          <div
            style={{
              color: COLORS.text,
              fontSize: 13.5,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {title}
          </div>
          {unread && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: COLORS.primary,
                flexShrink: 0,
              }}
            />
          )}
        </div>
        {sub && (
          <div
            style={{
              color: COLORS.subText,
              fontSize: 11.5,
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            {sub}
          </div>
        )}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 6 }}
        >
          <div style={{ color: COLORS.subText, fontSize: 10.5 }}>{time}</div>
          {right}
        </div>
      </div>
    </div>
  );
}
