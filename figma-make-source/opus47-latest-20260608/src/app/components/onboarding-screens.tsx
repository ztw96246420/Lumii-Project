import {
  MapPin,
  Camera,
  Bell,
  ChevronRight,
  Check,
  X,
  Plus,
  Loader2,
  AlertTriangle,
  Sparkles,
  Settings,
  PawPrint,
  Compass,
  MessageCircle,
  User,
} from "lucide-react";
import {
  COLORS,
  HomeIndicator,
  PhoneFrame,
  PetMascot,
  TopBar,
  PrimaryButton,
} from "./login-kit";

// ---------- Shared bits ----------
function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-7" style={{ marginTop: 8 }}>
      <div
        style={{
          color: COLORS.text,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: -0.3,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            color: COLORS.subText,
            fontSize: 14,
            marginTop: 10,
            lineHeight: 1.55,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ---------- Permission row ----------
type PermState = "off" | "on" | "loading" | "denied";

function PermissionRow({
  icon,
  iconBg,
  title,
  desc,
  state,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
  state: PermState;
}) {
  return (
    <div
      className="flex items-start gap-3"
      style={{
        background: COLORS.card,
        borderRadius: 20,
        padding: 16,
        boxShadow: "0 2px 10px -6px rgba(80,55,30,0.08)",
        border: `1px solid ${COLORS.line}`,
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: iconBg,
          color: "#fff",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="flex items-center justify-between gap-2"
          style={{ marginBottom: 4 }}
        >
          <div
            style={{ color: COLORS.text, fontSize: 15, fontWeight: 500 }}
          >
            {title}
          </div>
          <PermControl state={state} />
        </div>
        <div
          style={{ color: COLORS.subText, fontSize: 12.5, lineHeight: 1.55 }}
        >
          {desc}
        </div>
        {state === "denied" && (
          <div
            className="flex items-center gap-1"
            style={{
              marginTop: 10,
              color: COLORS.danger,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={12} />
            已被系统拒绝，去系统设置开启
            <ChevronRight size={12} />
          </div>
        )}
      </div>
    </div>
  );
}

function PermControl({ state }: { state: PermState }) {
  if (state === "loading") {
    return (
      <div
        className="flex items-center gap-1"
        style={{ color: COLORS.subText, fontSize: 12 }}
      >
        <Loader2 size={12} className="animate-spin" />
        授权中
      </div>
    );
  }
  if (state === "on") {
    return (
      <div
        className="flex items-center gap-1"
        style={{ color: COLORS.accent, fontSize: 12, fontWeight: 500 }}
      >
        <Check size={14} />
        已开启
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div
        style={{
          fontSize: 12,
          padding: "4px 10px",
          borderRadius: 12,
          background: "rgba(229,87,63,0.10)",
          color: COLORS.danger,
          fontWeight: 500,
        }}
      >
        去设置
      </div>
    );
  }
  // off — toggle
  return (
    <div
      style={{
        width: 40,
        height: 24,
        borderRadius: 12,
        background: COLORS.muted,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}

// ---------- Screen 10. Permission intro ----------
export function Screen10() {
  return (
    <PhoneFrame label="10 · 权限引导页">
      <TopBar showBack />
      <div className="px-7 flex items-center gap-3" style={{ marginTop: 4 }}>
        <PetMascot size={64} />
        <div>
          <div style={{ color: COLORS.text, fontSize: 20, fontWeight: 600 }}>
            为你的灵伴准备一个家
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 12.5,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            打开下列权限，体验更完整的陪伴
          </div>
        </div>
      </div>
      <div
        className="px-5 flex flex-col gap-3"
        style={{ marginTop: 28 }}
      >
        <PermissionRow
          icon={<MapPin size={20} />}
          iconBg="linear-gradient(135deg,#FF8A5C,#FFB28A)"
          title="定位权限"
          desc="发现附近养宠朋友、宠物友好餐厅与公园"
          state="off"
        />
        <PermissionRow
          icon={<Camera size={20} />}
          iconBg="linear-gradient(135deg,#4DB6AC,#7ED2C9)"
          title="照片与相机"
          desc="为灵伴拍照、识别毛色五官，生成专属形象"
          state="off"
        />
        <PermissionRow
          icon={<Bell size={20} />}
          iconBg="linear-gradient(135deg,#F2B441,#FFD37A)"
          title="消息通知"
          desc="不错过灵伴的呼唤、好友互动与陪伴提醒"
          state="off"
        />
      </div>
      <div className="px-7" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <PrimaryButton label="一键开启全部权限" />
        <div
          className="flex items-center justify-center"
          style={{ marginTop: 14, color: COLORS.subText, fontSize: 13 }}
        >
          稍后再说
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ---------- Screen 11. Location denied ----------
export function Screen11() {
  return (
    <PhoneFrame label="11 · 定位权限被拒">
      <TopBar showBack />
      <PageTitle title="开启定位，发现附近的它们" />
      <div className="px-5" style={{ marginTop: 24 }}>
        <DeniedHero
          icon={<MapPin size={36} color="#fff" />}
          gradient="linear-gradient(135deg,#FF8A5C,#FFB28A)"
          tip="附近的猫狗朋友与宠物友好场所将无法显示"
        />
      </div>
      <div className="px-5 flex flex-col gap-3" style={{ marginTop: 22 }}>
        <PermissionRow
          icon={<MapPin size={20} />}
          iconBg="linear-gradient(135deg,#FF8A5C,#FFB28A)"
          title="定位权限"
          desc="发现附近养宠朋友、宠物友好餐厅与公园"
          state="denied"
        />
        <PermissionRow
          icon={<Camera size={20} />}
          iconBg="linear-gradient(135deg,#4DB6AC,#7ED2C9)"
          title="照片与相机"
          desc="为灵伴拍照、识别毛色五官，生成专属形象"
          state="on"
        />
        <PermissionRow
          icon={<Bell size={20} />}
          iconBg="linear-gradient(135deg,#F2B441,#FFD37A)"
          title="消息通知"
          desc="不错过灵伴的呼唤、好友互动与陪伴提醒"
          state="on"
        />
      </div>
      <div className="px-7" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <SettingsButton text="去系统设置开启定位" />
        <div
          className="flex items-center justify-center"
          style={{ marginTop: 14, color: COLORS.subText, fontSize: 13 }}
        >
          暂不开启，继续使用
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ---------- Screen 12. Photo/camera denied ----------
export function Screen12() {
  return (
    <PhoneFrame label="12 · 相册/相机权限被拒">
      <TopBar showBack />
      <PageTitle title="开启相机，为灵伴留下样子" />
      <div className="px-5" style={{ marginTop: 24 }}>
        <DeniedHero
          icon={<Camera size={36} color="#fff" />}
          gradient="linear-gradient(135deg,#4DB6AC,#7ED2C9)"
          tip="无法上传宠物照片、生成专属灵伴形象"
        />
      </div>
      <div className="px-5 flex flex-col gap-3" style={{ marginTop: 22 }}>
        <PermissionRow
          icon={<MapPin size={20} />}
          iconBg="linear-gradient(135deg,#FF8A5C,#FFB28A)"
          title="定位权限"
          desc="发现附近养宠朋友、宠物友好餐厅与公园"
          state="on"
        />
        <PermissionRow
          icon={<Camera size={20} />}
          iconBg="linear-gradient(135deg,#4DB6AC,#7ED2C9)"
          title="照片与相机"
          desc="为灵伴拍照、识别毛色五官，生成专属形象"
          state="denied"
        />
        <PermissionRow
          icon={<Bell size={20} />}
          iconBg="linear-gradient(135deg,#F2B441,#FFD37A)"
          title="消息通知"
          desc="不错过灵伴的呼唤、好友互动与陪伴提醒"
          state="loading"
        />
      </div>
      <div className="px-7" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <SettingsButton text="去系统设置开启相机" />
        <div
          className="flex items-center justify-center"
          style={{ marginTop: 14, color: COLORS.subText, fontSize: 13 }}
        >
          暂不开启，继续使用
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ---------- Screen 13. Notification denied ----------
export function Screen13() {
  return (
    <PhoneFrame label="13 · 通知权限被拒">
      <TopBar showBack />
      <PageTitle title="开启通知，不错过它的呼唤" />
      <div className="px-5" style={{ marginTop: 24 }}>
        <DeniedHero
          icon={<Bell size={36} color="#fff" />}
          gradient="linear-gradient(135deg,#F2B441,#FFD37A)"
          tip="灵伴的撒娇、提醒、好友互动将无法收到"
        />
      </div>
      <div className="px-5 flex flex-col gap-3" style={{ marginTop: 22 }}>
        <PermissionRow
          icon={<MapPin size={20} />}
          iconBg="linear-gradient(135deg,#FF8A5C,#FFB28A)"
          title="定位权限"
          desc="发现附近养宠朋友、宠物友好餐厅与公园"
          state="on"
        />
        <PermissionRow
          icon={<Camera size={20} />}
          iconBg="linear-gradient(135deg,#4DB6AC,#7ED2C9)"
          title="照片与相机"
          desc="为灵伴拍照、识别毛色五官，生成专属形象"
          state="on"
        />
        <PermissionRow
          icon={<Bell size={20} />}
          iconBg="linear-gradient(135deg,#F2B441,#FFD37A)"
          title="消息通知"
          desc="不错过灵伴的呼唤、好友互动与陪伴提醒"
          state="denied"
        />
      </div>
      <div className="px-7" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <SettingsButton text="去系统设置开启通知" />
        <div
          className="flex items-center justify-center"
          style={{ marginTop: 14, color: COLORS.subText, fontSize: 13 }}
        >
          暂不开启，继续使用
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

function DeniedHero({
  icon,
  gradient,
  tip,
}: {
  icon: React.ReactNode;
  gradient: string;
  tip: string;
}) {
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 24,
        padding: "22px 18px",
        border: `1px solid ${COLORS.line}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 4px 14px -8px rgba(80,55,30,0.1)",
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0 relative"
        style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          background: gradient,
        }}
      >
        {icon}
        <div
          className="flex items-center justify-center"
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 26,
            height: 26,
            borderRadius: 13,
            background: COLORS.danger,
            border: "2px solid #fff",
          }}
        >
          <X size={14} color="#fff" strokeWidth={3} />
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: COLORS.text,
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          权限当前已关闭
        </div>
        <div
          style={{ color: COLORS.subText, fontSize: 12.5, lineHeight: 1.55 }}
        >
          {tip}
        </div>
      </div>
    </div>
  );
}

function SettingsButton({ text }: { text: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{
        height: 52,
        borderRadius: 26,
        background: COLORS.primary,
        color: "#fff",
        fontSize: 16,
        fontWeight: 500,
        boxShadow: "0 10px 22px -10px rgba(255,138,92,0.65)",
      }}
    >
      <Settings size={16} />
      {text}
    </div>
  );
}

// ---------- Screen 14. Empty no pet ----------
export function Screen14() {
  return (
    <PhoneFrame label="14 · 未添加宠物空状态">
      <TopBar title="我的宠物" showBack={false} />
      <div
        className="flex flex-col items-center justify-center px-8"
        style={{ height: 620, textAlign: "center" }}
      >
        <div
          style={{
            position: "relative",
            width: 200,
            height: 200,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 100,
              background:
                "radial-gradient(circle at 50% 40%, rgba(255,138,92,0.16), rgba(255,138,92,0) 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }}
          >
            <PetMascot size={130} />
          </div>
          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 14,
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "#fff",
              border: `2px dashed ${COLORS.primary}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={14} color={COLORS.primary} />
          </div>
        </div>
        <div style={{ color: COLORS.text, fontSize: 19, fontWeight: 600 }}>
          还没有添加你的毛孩子
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 13.5,
            marginTop: 10,
            lineHeight: 1.6,
          }}
        >
          告诉 Lumii 你家的猫咪或狗狗
          <br />
          我们会为它生成一个专属 AI 灵伴
        </div>
      </div>
      <div className="px-7" style={{ position: "absolute", left: 0, right: 0, bottom: 110 }}>
        <PrimaryButton label="添加我的宠物" />
      </div>
      <FloatingTabBar active="pet" />
      <HomeIndicator />
    </PhoneFrame>
  );
}

function FloatingTabBar({
  active,
}: {
  active: "pet" | "discover" | "map" | "msg" | "me";
}) {
  const items: {
    key: typeof active;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
  }[] = [
    { key: "pet", label: "宠物", Icon: PawPrint },
    { key: "discover", label: "发现", Icon: Compass },
    { key: "map", label: "地图", Icon: MapPin },
    { key: "msg", label: "消息", Icon: MessageCircle },
    { key: "me", label: "我的", Icon: User },
  ];
  return (
    <div
      className="absolute left-4 right-4 flex items-center justify-between"
      style={{
        bottom: 24,
        height: 60,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 22,
        backdropFilter: "blur(20px)",
        boxShadow: "0 16px 40px -12px rgba(80,55,30,0.18)",
        border: "1px solid rgba(255,255,255,0.8)",
        padding: "0 10px",
      }}
    >
      {items.map((it) => {
        const on = it.key === active;
        const Icon = it.Icon;
        return (
          <div
            key={it.key}
            className="flex flex-col items-center justify-center"
            style={{
              color: on ? COLORS.primary : COLORS.subText,
              fontSize: 10,
              fontWeight: on ? 600 : 400,
              gap: 3,
              flex: 1,
            }}
          >
            <Icon size={20} color={on ? COLORS.primary : COLORS.subText} />
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Screen 15. Pet basic info ----------
export function Screen15() {
  return (
    <PhoneFrame label="15 · 宠物基础信息">
      <TopBar title="添加宠物 1/2" />
      <PageTitle
        title="告诉我们它是谁"
        subtitle="这些信息将用于生成它的专属 AI 灵伴"
      />
      <div className="px-7 flex flex-col gap-5" style={{ marginTop: 24 }}>
        <FormField label="宠物昵称">
          <Input value="豆豆" />
        </FormField>
        <FormField label="宠物类型">
          <div className="flex gap-3">
            <TypePick label="狗狗" icon="🐶" active />
            <TypePick label="猫咪" icon="🐱" />
          </div>
        </FormField>
        <FormField label="品种">
          <SelectField value="金毛寻回犬" />
        </FormField>
        <FormField label="当前体重">
          <Input value="12.5" suffix="kg" />
        </FormField>
      </div>
      <div className="px-7" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <PrimaryButton label="下一步：上传它的照片" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          color: COLORS.subText,
          fontSize: 12.5,
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Input({ value, suffix }: { value?: string; suffix?: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        height: 52,
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        padding: "0 16px",
        color: COLORS.text,
        fontSize: 16,
      }}
    >
      <div style={{ flex: 1 }}>{value}</div>
      {suffix && <div style={{ color: COLORS.subText, fontSize: 14 }}>{suffix}</div>}
    </div>
  );
}

function SelectField({ value }: { value: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        height: 52,
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        padding: "0 16px",
        color: COLORS.text,
        fontSize: 16,
      }}
    >
      <div style={{ flex: 1 }}>{value}</div>
      <ChevronRight size={18} color={COLORS.subText} />
    </div>
  );
}

function TypePick({
  label,
  icon,
  active,
}: {
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        flex: 1,
        height: 64,
        borderRadius: 18,
        background: active ? "rgba(255,138,92,0.10)" : COLORS.card,
        border: active
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        padding: "0 16px",
        color: active ? COLORS.primary : COLORS.text,
        fontSize: 15,
        fontWeight: active ? 600 : 500,
        position: "relative",
      }}
    >
      <span style={{ fontSize: 26 }}>{icon}</span>
      {label}
      {active && (
        <div
          className="flex items-center justify-center"
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: COLORS.primary,
          }}
        >
          <Check size={12} color="#fff" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

// ---------- Screen 16. Upload photo ----------
export function Screen16() {
  return (
    <PhoneFrame label="16 · 上传宠物照片">
      <TopBar title="添加宠物 2/2" />
      <PageTitle
        title="给豆豆来一张正脸照"
        subtitle="清晰、光线自然、能看到完整面部"
      />
      <div className="px-5" style={{ marginTop: 22 }}>
        <UploadBox>
          <PetMascot size={150} />
          <div
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              top: 14,
              bottom: 14,
              border: `2px dashed rgba(255,138,92,0.55)`,
              borderRadius: 28,
              pointerEvents: "none",
            }}
          />
          <div
            className="absolute"
            style={{
              left: 0,
              right: 0,
              bottom: 18,
              textAlign: "center",
              color: COLORS.subText,
              fontSize: 12.5,
            }}
          >
            请将宠物正脸放入框内
          </div>
        </UploadBox>
        <TipsList />
      </div>
      <div className="px-5 flex gap-3" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <GhostButton icon={<Camera size={16} />} label="相册选择" />
        <SolidButton icon={<Camera size={16} />} label="立即拍照" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

function UploadBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        height: 340,
        borderRadius: 28,
        background:
          "linear-gradient(180deg, #FFF4EA 0%, #FBEEDF 100%)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 18px -10px rgba(180,110,60,0.25)",
      }}
    >
      {/* corner brackets */}
      {[
        { top: 18, left: 18, rot: 0 },
        { top: 18, right: 18, rot: 90 },
        { bottom: 18, right: 18, rot: 180 },
        { bottom: 18, left: 18, rot: 270 },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...c,
            width: 22,
            height: 22,
            borderTop: `3px solid ${COLORS.primary}`,
            borderLeft: `3px solid ${COLORS.primary}`,
            borderRadius: 4,
            transform: `rotate(${c.rot}deg)`,
          } as any}
        />
      ))}
      {children}
    </div>
  );
}

function TipsList() {
  const tips = [
    "光线明亮、自然光最佳",
    "完整露出五官与毛色",
    "避免逆光、过曝或模糊",
  ];
  return (
    <div
      style={{
        marginTop: 18,
        background: COLORS.card,
        borderRadius: 18,
        padding: "14px 16px",
        border: `1px solid ${COLORS.line}`,
      }}
    >
      {tips.map((t, i) => (
        <div
          key={i}
          className="flex items-center gap-2"
          style={{
            color: COLORS.text,
            fontSize: 13,
            padding: "4px 0",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: "rgba(77,182,172,0.18)",
              color: COLORS.accent,
            }}
          >
            <Check size={11} strokeWidth={3} />
          </div>
          {t}
        </div>
      ))}
    </div>
  );
}

function GhostButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{
        flex: 1,
        height: 52,
        borderRadius: 26,
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        color: COLORS.text,
        fontSize: 15,
        fontWeight: 500,
      }}
    >
      {icon}
      {label}
    </div>
  );
}
function SolidButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{
        flex: 1,
        height: 52,
        borderRadius: 26,
        background: COLORS.primary,
        color: "#fff",
        fontSize: 15,
        fontWeight: 500,
        boxShadow: "0 10px 22px -10px rgba(255,138,92,0.65)",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

// ---------- Screen 17. Upload failed ----------
export function Screen17() {
  return (
    <PhoneFrame label="17 · 上传失败 未识别">
      <TopBar title="识别结果" />
      <div className="px-5" style={{ marginTop: 14 }}>
        <div
          style={{
            position: "relative",
            height: 320,
            borderRadius: 28,
            overflow: "hidden",
            background:
              "linear-gradient(180deg, #E8E3D8 0%, #C8C0AF 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* blurred shape mimicking a bad photo */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 40% 40%, #A89A82 0%, #7B6E59 100%)",
              filter: "blur(8px)",
              opacity: 0.6,
            }}
          />
          <div
            className="absolute flex items-center justify-center"
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 10px 24px -8px rgba(0,0,0,0.25)",
            }}
          >
            <AlertTriangle size={30} color={COLORS.danger} />
          </div>
          <div
            className="absolute"
            style={{
              left: 16,
              top: 16,
              background: "rgba(229,87,63,0.94)",
              color: "#fff",
              padding: "5px 12px",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            识别失败
          </div>
        </div>
        <div
          style={{
            marginTop: 22,
            background: COLORS.card,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 20,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              color: COLORS.text,
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            未检测到清晰宠物主体
          </div>
          <div
            style={{ color: COLORS.subText, fontSize: 13, lineHeight: 1.6 }}
          >
            试试以下方式：
          </div>
          <div style={{ marginTop: 10 }}>
            {["保持光线明亮、避免逆光", "镜头距离宠物 30-80cm", "完整露出面部，不要被遮挡"].map(
              (t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2"
                  style={{
                    fontSize: 13,
                    color: COLORS.text,
                    padding: "3px 0",
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      background: COLORS.primary,
                    }}
                  />
                  {t}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <div className="px-5 flex gap-3" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <GhostButton icon={<Camera size={16} />} label="重新选择" />
        <SolidButton icon={<Camera size={16} />} label="重新拍照" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ---------- Screen 18. Recognition detail ----------
export function Screen18() {
  return (
    <PhoneFrame label="18 · 上传识别详情">
      <TopBar title="识别结果" />
      <div className="px-5" style={{ marginTop: 10 }}>
        <div
          style={{
            position: "relative",
            height: 280,
            borderRadius: 28,
            overflow: "hidden",
            background:
              "linear-gradient(135deg,#F8D9B7 0%, #E2A56A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PetMascot size={170} />
          <div
            className="absolute flex items-center gap-1"
            style={{
              left: 14,
              top: 14,
              background: "rgba(77,182,172,0.95)",
              color: "#fff",
              padding: "5px 12px",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <Sparkles size={12} />
            识别成功
          </div>
          <div
            className="absolute"
            style={{
              right: 14,
              top: 14,
              background: "rgba(255,255,255,0.92)",
              color: COLORS.text,
              padding: "5px 12px",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            质量 96%
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            background: COLORS.card,
            borderRadius: 20,
            border: `1px solid ${COLORS.line}`,
            padding: 16,
          }}
        >
          <DetailRow label="宠物主体" value="狗狗 · 金毛寻回犬" />
          <Divider />
          <DetailRow label="毛色特征" value="金黄色 · 浅金腹毛 · 浓密" />
          <Divider />
          <DetailRow label="五官特征" value="圆润鼻头 · 杏仁眼 · 垂耳" />
          <Divider />
          <DetailRow label="表情气质" value="温顺亲人 · 微笑张嘴" />
        </div>

        <FeatureChips />
      </div>
      <div className="px-7" style={{ position: "absolute", left: 0, right: 0, bottom: 40 }}>
        <PrimaryButton label="确认并生成灵伴" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "10px 0" }}
    >
      <div style={{ color: COLORS.subText, fontSize: 13 }}>{label}</div>
      <div
        style={{
          color: COLORS.text,
          fontSize: 14,
          fontWeight: 500,
          maxWidth: 220,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: COLORS.line }} />;
}

function FeatureChips() {
  const chips = ["亲人", "活泼", "微笑脸", "温暖毛色"];
  return (
    <div
      className="flex flex-wrap gap-2"
      style={{ marginTop: 14 }}
    >
      {chips.map((c) => (
        <div
          key={c}
          style={{
            padding: "6px 12px",
            borderRadius: 14,
            background: "rgba(77,182,172,0.12)",
            color: COLORS.accent,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          # {c}
        </div>
      ))}
    </div>
  );
}
