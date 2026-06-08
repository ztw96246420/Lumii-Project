import {
  Check,
  X,
  AlertTriangle,
  Info,
  Loader2,
  PawPrint,
  Compass,
  MapPin,
  MessageCircle,
  User,
  Wifi,
  ShieldAlert,
  Sparkles,
  Upload,
  Heart,
  RefreshCw,
  Share2,
  Link2,
  Trash2,
  Star,
} from "lucide-react";
import { COLORS, PhoneFrame, HomeIndicator } from "./login-kit";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const PHOTO_CREAM =
  "https://images.unsplash.com/photo-1591160690555-5debfba289f0?auto=format&fit=crop&w=400&q=80";
const PHOTO_CORGI =
  "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=400&q=80";
const PHOTO_PARK =
  "https://images.unsplash.com/photo-1761532950128-d8a1c1f7e8d0?auto=format&fit=crop&w=400&q=80";

// ---------- Showcase Frame Wrapper ----------
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ padding: "12px 20px 14px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.2 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 4 }}>
        {subtitle}
      </div>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          color: COLORS.subText,
          padding: "0 20px 8px",
          letterSpacing: 0.4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          margin: "0 16px",
          background: "#FFFFFF",
          borderRadius: 16,
          border: `1px solid ${COLORS.line}`,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function VariantLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: COLORS.subText,
        letterSpacing: 0.4,
        marginBottom: 4,
      }}
    >
      {text}
    </div>
  );
}

// =================================================================
// COMPONENTS
// =================================================================

// ---------- Button ----------
function LumiiButton({
  variant,
  loading,
  disabled,
  label,
}: {
  variant: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: COLORS.primary, color: "#FFFFFF", border: "none" },
    secondary: {
      background: "#FFF1E5",
      color: COLORS.primary,
      border: "none",
    },
    ghost: {
      background: "transparent",
      color: COLORS.text,
      border: `1px solid ${COLORS.line}`,
    },
    danger: { background: COLORS.danger, color: "#FFFFFF", border: "none" },
  };
  const s = styles[variant];
  const dis = disabled
    ? { background: "#EFEAE1", color: "#B8B3A8", border: "none" }
    : {};
  return (
    <div
      style={{
        ...s,
        ...dis,
        height: 44,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {loading && (
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
      )}
      {loading ? "处理中…" : label}
    </div>
  );
}

// ---------- Input ----------
function LumiiInput({
  state,
  value,
  placeholder,
  error,
}: {
  state: "default" | "focus" | "filled" | "error" | "disabled";
  value?: string;
  placeholder?: string;
  error?: string;
}) {
  const borders = {
    default: COLORS.line,
    focus: COLORS.primary,
    filled: COLORS.line,
    error: COLORS.danger,
    disabled: COLORS.line,
  };
  const bg = state === "disabled" ? "#F4EFE6" : "#FFFFFF";
  const valColor = state === "disabled" ? "#B8B3A8" : COLORS.text;
  return (
    <div>
      <div
        style={{
          height: 46,
          borderRadius: 12,
          border: `1.5px solid ${borders[state]}`,
          background: bg,
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 14, color: value ? valColor : "#B8B3A8", flex: 1 }}>
          {value || placeholder}
        </span>
        {state === "focus" && (
          <div
            style={{
              width: 2,
              height: 18,
              background: COLORS.primary,
              animation: "blink 1.1s steps(1) infinite",
            }}
          />
        )}
        {state === "error" && <AlertTriangle size={14} color={COLORS.danger} />}
        {state === "filled" && <Check size={14} color={COLORS.accent} />}
      </div>
      {error && (
        <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ---------- Toast ----------
function LumiiToast({
  type,
  text,
}: {
  type: "success" | "error" | "warning" | "info";
  text: string;
}) {
  const config = {
    success: { bg: "#E8F5F3", color: COLORS.accent, icon: <Check size={14} /> },
    error: { bg: "#FBE4DE", color: COLORS.danger, icon: <X size={14} /> },
    warning: {
      bg: "#FBF2D9",
      color: "#C99B3E",
      icon: <AlertTriangle size={14} />,
    },
    info: { bg: "#EFEAE1", color: COLORS.text, icon: <Info size={14} /> },
  }[type];
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "#FFFFFF",
        borderRadius: 14,
        boxShadow: "0 4px 14px rgba(80,55,30,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          background: config.bg,
          color: config.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {config.icon}
      </div>
      <span style={{ fontSize: 13 }}>{text}</span>
    </div>
  );
}

// ---------- Tag ----------
function LumiiTag({
  variant,
  label,
}: {
  variant: "default" | "selected" | "health" | "distance" | "status";
  label: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: "#F4EFE6", color: COLORS.subText },
    selected: { background: COLORS.primary, color: "#FFFFFF" },
    health: { background: "#E8F5F3", color: COLORS.accent },
    distance: { background: "#EFEAE1", color: COLORS.text },
    status: { background: "#FBF2D9", color: "#C99B3E" },
  };
  return (
    <div
      style={{
        ...styles[variant],
        fontSize: 11,
        padding: "3px 9px",
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 22,
      }}
    >
      {label}
    </div>
  );
}

// ---------- Toggle ----------
function LumiiToggle({
  state,
}: {
  state: "on" | "off" | "loading" | "disabled";
}) {
  const bg =
    state === "on"
      ? COLORS.accent
      : state === "disabled"
        ? "#EFEAE1"
        : "#D9D5CB";
  const left = state === "on" ? 20 : 2;
  return (
    <div
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: bg,
        position: "relative",
        opacity: state === "disabled" ? 0.6 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {state === "loading" && (
          <Loader2
            size={12}
            color={COLORS.subText}
            style={{ animation: "spin 1s linear infinite" }}
          />
        )}
      </div>
    </div>
  );
}

// =================================================================
// Screen 64 · Button
// =================================================================
export function Screen64() {
  return (
    <PhoneFrame label="64 · Button 按钮">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="按钮 Button" subtitle="6 种状态 / 主按钮 · 次按钮 · 幽灵 · 危险 · 禁用 · 加载" />

        <Group title="主要按钮 · PRIMARY">
          <LumiiButton variant="primary" label="确认提交" />
          <LumiiButton variant="primary" loading label="" />
        </Group>

        <Group title="次要 / 幽灵 · SECONDARY / GHOST">
          <LumiiButton variant="secondary" label="再考虑一下" />
          <LumiiButton variant="ghost" label="跳过" />
        </Group>

        <Group title="危险与禁用 · DANGER / DISABLED">
          <LumiiButton variant="danger" label="删除宠物档案" />
          <LumiiButton variant="primary" disabled label="未填写完整" />
        </Group>

        <div
          style={{
            margin: "0 16px",
            padding: 12,
            background: "#FFF7F0",
            border: "1px solid #FFE0CC",
            borderRadius: 12,
            fontSize: 11,
            color: COLORS.subText,
            lineHeight: 1.6,
          }}
        >
          统一高度 44 · 圆角 14 · 中文字号 14 · 主色 #FF8A5C
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 65 · Input
// =================================================================
export function Screen65() {
  return (
    <PhoneFrame label="65 · Input 输入框">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="输入框 Input" subtitle="5 种状态 / 默认 · 聚焦 · 已填 · 错误 · 禁用" />

        <Group title="默认与聚焦">
          <VariantLabel text="默认" />
          <LumiiInput state="default" placeholder="请输入宠物昵称" />
          <VariantLabel text="聚焦" />
          <LumiiInput state="focus" value="奶" />
        </Group>

        <Group title="已填与错误">
          <VariantLabel text="已填" />
          <LumiiInput state="filled" value="奶油" />
          <VariantLabel text="错误" />
          <LumiiInput
            state="error"
            value="138****"
            error="手机号格式不正确，请重新输入"
          />
        </Group>

        <Group title="禁用">
          <LumiiInput state="disabled" value="已绑定 · 不可修改" />
        </Group>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 66 · Toast + Tag + Toggle
// =================================================================
export function Screen66() {
  return (
    <PhoneFrame label="66 · Toast · Tag · Toggle">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="提示 · 标签 · 开关" subtitle="Toast / Tag / Toggle 全部状态预览" />

        <Group title="Toast 提示">
          <LumiiToast type="success" text="资料已保存" />
          <LumiiToast type="error" text="发送失败，请重试" />
          <LumiiToast type="warning" text="即将到达冷静期截止" />
          <LumiiToast type="info" text="奶油的疫苗下月需要续打" />
        </Group>

        <Group title="Tag 标签">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <LumiiTag variant="default" label="温顺" />
            <LumiiTag variant="selected" label="已选" />
            <LumiiTag variant="health" label="疫苗齐全" />
            <LumiiTag variant="distance" label="1km 内" />
            <LumiiTag variant="status" label="审核中" />
          </div>
        </Group>

        <Group title="Toggle 开关">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13 }}>开启</span>
            <LumiiToggle state="on" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13 }}>关闭</span>
            <LumiiToggle state="off" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13 }}>请求中</span>
            <LumiiToggle state="loading" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#B8B3A8" }}>不可用</span>
            <LumiiToggle state="disabled" />
          </div>
        </Group>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 67 · Dialog × 3
// =================================================================
function Dialog({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  buttons,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  buttons: { label: string; style: "primary" | "danger" | "ghost" }[];
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 20,
        padding: "20px 18px 16px",
        width: 290,
        boxShadow: "0 14px 30px rgba(80,55,30,0.12)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: iconBg,
          color: iconColor,
          margin: "0 auto 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ textAlign: "center", fontSize: 16, fontWeight: 700 }}>
        {title}
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: COLORS.subText,
          marginTop: 6,
          lineHeight: 1.6,
        }}
      >
        {desc}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {buttons.map((b) => {
          const map = {
            primary: { bg: COLORS.primary, color: "#FFF", border: "none" },
            danger: { bg: COLORS.danger, color: "#FFF", border: "none" },
            ghost: {
              bg: "transparent",
              color: COLORS.text,
              border: `1px solid ${COLORS.line}`,
            },
          };
          const s = map[b.style];
          return (
            <div
              key={b.label}
              style={{
                flex: 1,
                background: s.bg,
                color: s.color,
                border: s.border,
                height: 40,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {b.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Screen67() {
  return (
    <PhoneFrame label="67 · Dialog 弹窗">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="弹窗 Dialog" subtitle="单按钮 / 双按钮 / 危险确认" />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
          <Dialog
            icon={<Check size={22} />}
            iconBg="#E8F5F3"
            iconColor={COLORS.accent}
            title="保存成功"
            desc="奶油的健康档案已同步到云端"
            buttons={[{ label: "好的", style: "primary" }]}
          />
          <Dialog
            icon={<Info size={22} />}
            iconBg="#FFE6D6"
            iconColor={COLORS.primary}
            title="是否打开高德地图？"
            desc="即将跳转至外部应用进行导航"
            buttons={[
              { label: "取消", style: "ghost" },
              { label: "打开", style: "primary" },
            ]}
          />
          <Dialog
            icon={<AlertTriangle size={22} />}
            iconBg="#FBE4DE"
            iconColor={COLORS.danger}
            title="确认删除该宠物档案？"
            desc="删除后健康记录和 AI 灵伴记忆将无法找回"
            buttons={[
              { label: "再想想", style: "ghost" },
              { label: "确认删除", style: "danger" },
            ]}
          />
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 68 · Bottom Sheet × 3
// =================================================================
function Sheet({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        padding: "12px 14px 14px",
        width: 320,
        border: `1px solid ${COLORS.line}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 4,
          background: "#E5E0D5",
          borderRadius: 2,
          margin: "0 auto 10px",
        }}
      />
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, padding: "0 4px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SheetRow({
  icon,
  label,
  color,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 8px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderTop: `1px solid ${COLORS.line}`,
      }}
    >
      <div style={{ color: danger ? COLORS.danger : color || COLORS.text }}>{icon}</div>
      <span style={{ fontSize: 14, color: danger ? COLORS.danger : COLORS.text }}>
        {label}
      </span>
    </div>
  );
}

export function Screen68() {
  return (
    <PhoneFrame label="68 · BottomSheet 底部弹层">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="底部弹层" subtitle="选择器 / 操作菜单 / 分享面板" />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "4px 0" }}>
          <Sheet title="选择品种">
            {["金毛", "拉布拉多", "柯基", "英短"].map((b, i) => (
              <div
                key={b}
                style={{
                  padding: "12px 8px",
                  borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: i === 0 ? COLORS.primary : COLORS.text,
                  fontWeight: i === 0 ? 600 : 400,
                }}
              >
                <span>{b}</span>
                {i === 0 && <Check size={16} color={COLORS.primary} />}
              </div>
            ))}
          </Sheet>

          <Sheet title="更多操作">
            <SheetRow icon={<Star size={16} />} label="收藏地点" />
            <SheetRow icon={<Share2 size={16} />} label="分享给朋友" />
            <SheetRow icon={<Trash2 size={16} />} label="删除该记录" danger />
          </Sheet>

          <Sheet title="分享到">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                paddingTop: 6,
              }}
            >
              {[
                { i: <MessageCircle size={18} color="#FFF" />, l: "微信", bg: "#4DB6AC" },
                { i: <Share2 size={18} color="#FFF" />, l: "朋友圈", bg: "#FF8A5C" },
                { i: <User size={18} color="#FFF" />, l: "Lumii 好友", bg: "#C99B3E" },
                { i: <Link2 size={18} color="#FFF" />, l: "复制链接", bg: "#1B1C19" },
              ].map((it) => (
                <div key={it.l} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: it.bg,
                      margin: "0 auto 6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {it.i}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.subText }}>{it.l}</div>
                </div>
              ))}
            </div>
          </Sheet>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 69 · TabBar
// =================================================================
function TabBarDemo({ activeIdx }: { activeIdx: number }) {
  const tabs = [
    { i: PawPrint, l: "宠物" },
    { i: Compass, l: "发现" },
    { i: MapPin, l: "地图" },
    { i: MessageCircle, l: "消息" },
    { i: User, l: "我的" },
  ];
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        border: `1px solid ${COLORS.line}`,
        padding: "8px 6px",
        display: "flex",
      }}
    >
      {tabs.map((t, i) => {
        const Icon = t.i;
        const active = i === activeIdx;
        return (
          <div
            key={t.l}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "4px 0",
            }}
          >
            <Icon size={20} color={active ? COLORS.primary : COLORS.subText} />
            <span
              style={{
                fontSize: 10,
                color: active ? COLORS.primary : COLORS.subText,
                fontWeight: active ? 600 : 400,
              }}
            >
              {t.l}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Screen69() {
  return (
    <PhoneFrame label="69 · TabBar 底部导航">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="底部导航 TabBar" subtitle="5 个主入口 / 当前选中态对比" />

        <Group title="选中：宠物">
          <TabBarDemo activeIdx={0} />
        </Group>
        <Group title="选中：发现">
          <TabBarDemo activeIdx={1} />
        </Group>
        <Group title="选中：地图">
          <TabBarDemo activeIdx={2} />
        </Group>
        <Group title="选中：消息（带未读）">
          <div style={{ position: "relative" }}>
            <TabBarDemo activeIdx={3} />
            <div
              style={{
                position: "absolute",
                top: 6,
                left: "calc(60% + 8px)",
                width: 16,
                height: 16,
                borderRadius: 8,
                background: COLORS.danger,
                color: "#FFF",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #FFFFFF",
              }}
            >
              3
            </div>
          </div>
        </Group>
        <Group title="选中：我的">
          <TabBarDemo activeIdx={4} />
        </Group>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 70 · Card 卡片
// =================================================================
export function Screen70() {
  return (
    <PhoneFrame label="70 · Card 卡片">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="卡片 Card" subtitle="普通 · 宠物 · 地点 · 消息" />

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 普通卡片 */}
          <VariantLabel text="普通卡片" />
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>今日健康提醒</div>
            <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 6, lineHeight: 1.6 }}>
              别忘了奶油下周二要打疫苗加强针
            </div>
          </div>

          {/* 宠物卡片 */}
          <VariantLabel text="宠物卡片" />
          <div
            style={{
              background:
                "linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 100%)",
              borderRadius: 16,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #FFFFFF",
              }}
            >
              <ImageWithFallback
                src={PHOTO_CREAM}
                alt="cream"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>奶油</div>
              <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 2 }}>
                金毛 · 3 岁 · 26.4kg
              </div>
            </div>
            <Heart size={18} color={COLORS.primary} />
          </div>

          {/* 地点卡片 */}
          <VariantLabel text="地点卡片" />
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 16,
              padding: 12,
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <ImageWithFallback
                src={PHOTO_PARK}
                alt="park"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>世纪公园</div>
              <div style={{ fontSize: 11, color: COLORS.subText, marginTop: 4 }}>
                浦东 · 0.8km · 评分 4.8
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <LumiiTag variant="health" label="允许遛狗" />
                <LumiiTag variant="distance" label="有水池" />
              </div>
            </div>
          </div>

          {/* 消息卡片 */}
          <VariantLabel text="消息卡片" />
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 14,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                overflow: "hidden",
              }}
            >
              <ImageWithFallback
                src={PHOTO_CORGI}
                alt="corgi"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>可可的主人</div>
                <div style={{ fontSize: 11, color: COLORS.subText }}>14:32</div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.subText,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                周六一起去世纪公园好不好～
              </div>
            </div>
            <div
              style={{
                background: COLORS.danger,
                color: "#FFF",
                fontSize: 10,
                borderRadius: 9,
                padding: "1px 6px",
              }}
            >
              2
            </div>
          </div>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 71 · Empty States
// =================================================================
function EmptyBlock({
  icon,
  title,
  desc,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta?: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: "20px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: "#F4EFE6",
          margin: "0 auto 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.subText,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      <div
        style={{
          fontSize: 12,
          color: COLORS.subText,
          marginTop: 4,
          lineHeight: 1.6,
        }}
      >
        {desc}
      </div>
      {cta && (
        <div
          style={{
            marginTop: 12,
            display: "inline-block",
            background: COLORS.primary,
            color: "#FFFFFF",
            fontSize: 13,
            padding: "8px 18px",
            borderRadius: 12,
            fontWeight: 600,
          }}
        >
          {cta}
        </div>
      )}
    </div>
  );
}

export function Screen71() {
  return (
    <PhoneFrame label="71 · Empty State 空状态">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="空状态" subtitle="无宠物 / 无消息 / 无附近 / 无地点 / 无健康记录" />

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <EmptyBlock
            icon={<PawPrint size={26} />}
            title="还没有添加宠物"
            desc="添加第一个小家伙，开启它的专属档案"
            cta="添加宠物"
          />
          <EmptyBlock
            icon={<MessageCircle size={26} />}
            title="还没有消息"
            desc="收到的招呼和聊天会出现在这里"
          />
          <EmptyBlock
            icon={<Compass size={26} />}
            title="附近暂时没有同类宠物"
            desc="试着调大搜索范围，或换个时间再看看"
            cta="调整范围"
          />
          <EmptyBlock
            icon={<MapPin size={26} />}
            title="没有符合条件的地点"
            desc="试试去掉筛选条件，或换个关键词搜索"
          />
          <EmptyBlock
            icon={<Heart size={26} />}
            title="还没有健康记录"
            desc="记录一次体重，让奶油的健康曲线动起来"
            cta="记一次体重"
          />
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 72 · Error States
// =================================================================
function ErrorBlock({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  cta,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.subText,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          color: COLORS.primary,
          border: `1px solid ${COLORS.primary}`,
          padding: "5px 12px",
          borderRadius: 10,
          flexShrink: 0,
          fontWeight: 600,
        }}
      >
        {cta}
      </div>
    </div>
  );
}

export function Screen72() {
  return (
    <PhoneFrame label="72 · Error State 错误页">
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="错误状态" subtitle="网络 / 权限 / AI 生成 / 上传 失败" />

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <ErrorBlock
            icon={<Wifi size={20} />}
            iconBg="#EFEAE1"
            iconColor={COLORS.text}
            title="网络连接失败"
            desc="检查 Wi-Fi 或移动数据后再试"
            cta="重试"
          />
          <ErrorBlock
            icon={<ShieldAlert size={20} />}
            iconBg="#FBF2D9"
            iconColor="#C99B3E"
            title="缺少定位权限"
            desc="开启定位才能找到附近的宠物和友好地点"
            cta="去设置"
          />
          <ErrorBlock
            icon={<Sparkles size={20} />}
            iconBg="#FFE6D6"
            iconColor={COLORS.primary}
            title="AI 灵伴生成失败"
            desc="可能是网络波动，再来一次就好"
            cta="重新生成"
          />
          <ErrorBlock
            icon={<Upload size={20} />}
            iconBg="#FBE4DE"
            iconColor={COLORS.danger}
            title="照片上传失败"
            desc="单张照片不能大于 10MB，已为你保留草稿"
            cta="重新上传"
          />

          <div
            style={{
              marginTop: 4,
              padding: 14,
              background:
                "linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 100%)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <RefreshCw size={18} color={COLORS.primary} />
            <span style={{ fontSize: 12, color: COLORS.subText, lineHeight: 1.5 }}>
              所有错误页都保留用户输入，避免重复填写
            </span>
          </div>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// =================================================================
// Screen 73 · Loading & Skeleton
// =================================================================
function SkeletonLine({ w, h = 12 }: { w: number | string; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        background:
          "linear-gradient(90deg, #F0EBE0 0%, #E5E0D5 50%, #F0EBE0 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s linear infinite",
      }}
    />
  );
}

export function Screen73() {
  return (
    <PhoneFrame label="73 · Loading & Skeleton">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ overflow: "hidden" }}>
        <PageHeader title="加载状态" subtitle="页面 Loading · 按钮 Loading · 卡片骨架" />

        <Group title="页面 Loading">
          <div
            style={{
              padding: "30px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Loader2
              size={32}
              color={COLORS.primary}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <div style={{ fontSize: 12, color: COLORS.subText }}>
              正在为你召唤奶油…
            </div>
          </div>
        </Group>

        <Group title="按钮 Loading">
          <LumiiButton variant="primary" loading label="" />
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: `1px solid ${COLORS.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              color: COLORS.subText,
            }}
          >
            <Loader2
              size={14}
              style={{ animation: "spin 1s linear infinite" }}
            />
            刷新中…
          </div>
        </Group>

        <Group title="卡片骨架 Skeleton">
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "4px 0",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background:
                  "linear-gradient(90deg, #F0EBE0 0%, #E5E0D5 50%, #F0EBE0 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s linear infinite",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonLine w="60%" h={14} />
              <SkeletonLine w="40%" h={10} />
            </div>
          </div>
          <SkeletonLine w="100%" h={12} />
          <SkeletonLine w="85%" h={12} />
          <SkeletonLine w="70%" h={12} />
        </Group>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
