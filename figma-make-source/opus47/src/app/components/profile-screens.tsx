import {
  ChevronRight,
  Bell,
  Shield,
  Settings,
  PawPrint,
  Users,
  LogOut,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  MessageCircle,
  UserX,
  Flag,
  Trash2,
  Phone,
  Mail,
  KeyRound,
  Smartphone,
  Check,
  Clock,
  Heart,
  Edit3,
  Plus,
  Camera,
} from "lucide-react";
import { COLORS, PhoneFrame, TopBar, HomeIndicator } from "./login-kit";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const PHOTO_OWNER =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80";
const PHOTO_CREAM =
  "https://images.unsplash.com/photo-1591160690555-5debfba289f0?auto=format&fit=crop&w=600&q=80";
const PHOTO_CAT =
  "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?auto=format&fit=crop&w=600&q=80";
const PHOTO_CORGI =
  "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=600&q=80";

// ---------- Atoms ----------
function Section({
  title,
  children,
  footnote,
}: {
  title?: string;
  children: React.ReactNode;
  footnote?: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && (
        <div
          style={{
            fontSize: 12,
            color: COLORS.subText,
            padding: "0 20px 8px",
            letterSpacing: 0.4,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          margin: "0 16px",
          background: "#FFFFFF",
          borderRadius: 16,
          border: `1px solid ${COLORS.line}`,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      {footnote && (
        <div
          style={{
            fontSize: 11,
            color: COLORS.subText,
            padding: "8px 20px 0",
            lineHeight: 1.6,
          }}
        >
          {footnote}
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  right,
  danger,
  iconBg,
  onLast,
  sub,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  right?: React.ReactNode;
  danger?: boolean;
  iconBg?: string;
  onLast?: boolean;
  sub?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderBottom: onLast ? "none" : `1px solid ${COLORS.line}`,
        minHeight: 52,
      }}
    >
      {icon && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: iconBg || "#F4EFE6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: danger ? COLORS.danger : COLORS.text,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            color: danger ? COLORS.danger : COLORS.text,
          }}
        >
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {value && (
        <div style={{ fontSize: 14, color: COLORS.subText }}>{value}</div>
      )}
      {right !== undefined ? (
        right
      ) : (
        <ChevronRight size={16} color={COLORS.subText} />
      )}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: on ? COLORS.accent : "#D9D5CB",
        position: "relative",
        transition: "all .2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}

function PrimaryBtn({
  label,
  danger,
  ghost,
}: {
  label: string;
  danger?: boolean;
  ghost?: boolean;
}) {
  const bg = danger
    ? COLORS.danger
    : ghost
      ? "transparent"
      : COLORS.primary;
  const color = ghost ? COLORS.text : "#FFFFFF";
  const border = ghost ? `1px solid ${COLORS.line}` : "none";
  return (
    <div
      style={{
        background: bg,
        color,
        border,
        borderRadius: 14,
        padding: "14px 0",
        textAlign: "center",
        fontSize: 15,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
}

function PetMini({
  photo,
  name,
  meta,
  active,
}: {
  photo: string;
  name: string;
  meta: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: active ? "#FFF7F0" : "#FFFFFF",
        borderRadius: 14,
        border: `1px solid ${active ? "#FFD9C2" : COLORS.line}`,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: active ? `2px solid ${COLORS.primary}` : "none",
        }}
      >
        <ImageWithFallback
          src={photo}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{name}</div>
          {active && (
            <div
              style={{
                fontSize: 10,
                color: COLORS.primary,
                background: "#FFE6D6",
                padding: "1px 6px",
                borderRadius: 6,
              }}
            >
              当前
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 2 }}>
          {meta}
        </div>
      </div>
      {active ? (
        <Check size={18} color={COLORS.primary} />
      ) : (
        <div
          style={{
            fontSize: 12,
            color: COLORS.accent,
            border: `1px solid ${COLORS.accent}`,
            padding: "4px 10px",
            borderRadius: 8,
          }}
        >
          切换
        </div>
      )}
    </div>
  );
}

// ====================== Screen 54: 我的页 ======================
export function Screen54() {
  return (
    <PhoneFrame label="54 · 我的">
      <div
        style={{
          padding: "8px 0 0",
          height: "calc(100% - 44px)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>我的</div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "#FFFFFF",
              border: `1px solid ${COLORS.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Settings size={18} color={COLORS.text} />
          </div>
        </div>

        {/* User header card */}
        <div
          style={{
            margin: "16px 16px 18px",
            padding: 18,
            background:
              "linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 60%, #FFD7BF 100%)",
            borderRadius: 22,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -30,
              top: -20,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.4)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid #FFFFFF",
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
              }}
            >
              <ImageWithFallback
                src={PHOTO_OWNER}
                alt="user"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                奶油的铲屎官
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.subText,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Phone size={11} /> 138 **** 4521
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 8,
                  fontSize: 11,
                  background: "rgba(255,255,255,0.7)",
                  padding: "3px 8px",
                  borderRadius: 10,
                  color: COLORS.text,
                }}
              >
                <Shield size={10} color={COLORS.accent} /> 已实名 · Lv.3
              </div>
            </div>
            <Edit3 size={18} color={COLORS.subText} />
          </div>
        </div>

        {/* Current pet card */}
        <div style={{ padding: "0 16px", marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              color: COLORS.subText,
              padding: "0 4px 8px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>当前宠物</span>
            <span style={{ color: COLORS.accent }}>多宠管理 ›</span>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 18,
              border: `1px solid ${COLORS.line}`,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${COLORS.primary}`,
              }}
            >
              <ImageWithFallback
                src={PHOTO_CREAM}
                alt="cream"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>奶油</div>
                <div
                  style={{
                    fontSize: 10,
                    background: "#E8F5F3",
                    color: COLORS.accent,
                    padding: "1px 6px",
                    borderRadius: 6,
                  }}
                >
                  ♀ 金毛
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.subText,
                  marginTop: 4,
                }}
              >
                3 岁 2 个月 · 26.4 kg · 已绝育
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {["疫苗齐全", "活泼", "对小孩友好"].map((t) => (
                  <div
                    key={t}
                    style={{
                      fontSize: 10,
                      color: COLORS.subText,
                      background: "#F4EFE6",
                      padding: "2px 7px",
                      borderRadius: 6,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.subText} />
          </div>
        </div>

        {/* Menu entries */}
        <div style={{ padding: "0 16px" }}>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              border: `1px solid ${COLORS.line}`,
              overflow: "hidden",
            }}
          >
            <Row
              icon={<PawPrint size={16} color={COLORS.primary} />}
              iconBg="#FFE6D6"
              label="宠物档案"
              value="奶油"
            />
            <Row
              icon={<Users size={16} color={COLORS.accent} />}
              iconBg="#E8F5F3"
              label="多宠管理"
              value="3 只"
            />
            <Row
              icon={<Bell size={16} color="#C99B3E" />}
              iconBg="#FBF2D9"
              label="通知中心"
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      background: COLORS.danger,
                      color: "#FFF",
                      borderRadius: 10,
                      padding: "1px 6px",
                    }}
                  >
                    3
                  </div>
                  <ChevronRight size={16} color={COLORS.subText} />
                </div>
              }
            />
            <Row
              icon={<Settings size={16} color={COLORS.text} />}
              iconBg="#EFEAE1"
              label="设置与隐私"
            />
            <Row
              icon={<Shield size={16} color={COLORS.accent} />}
              iconBg="#E8F5F3"
              label="安全中心"
              onLast
            />
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ====================== Screen 55: 宠物档案详情 ======================
export function Screen55() {
  return (
    <PhoneFrame label="55 · 宠物档案详情">
      <TopBar title="宠物档案" />
      <div
        style={{
          height: "calc(100% - 44px - 50px)",
          overflow: "hidden",
        }}
      >
        {/* Hero */}
        <div style={{ position: "relative", height: 220 }}>
          <ImageWithFallback
            src={PHOTO_CREAM}
            alt="cream"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              padding: "6px 10px",
              borderRadius: 10,
              color: "#FFFFFF",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Camera size={12} /> 更换
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 18,
              color: "#FFFFFF",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700 }}>奶油</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              金毛 · ♀ · 3 岁 2 个月
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: 16,
              bottom: 14,
              background: "#FFFFFF",
              color: COLORS.primary,
              fontSize: 12,
              padding: "5px 12px",
              borderRadius: 10,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Edit3 size={12} /> 编辑
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              { l: "体重", v: "26.4 kg" },
              { l: "生日", v: "2023.04" },
              { l: "体型", v: "大型" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 12,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: COLORS.subText }}>{s.l}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <Section title="基础信息">
            <Row label="昵称" right={<span style={{ fontSize: 14, color: COLORS.subText }}>奶油</span>} />
            <Row label="品种" right={<span style={{ fontSize: 14, color: COLORS.subText }}>金毛寻回犬</span>} />
            <Row label="性别 / 绝育" right={<span style={{ fontSize: 14, color: COLORS.subText }}>♀ / 已绝育</span>} />
            <Row label="毛色" right={<span style={{ fontSize: 14, color: COLORS.subText }}>奶油金</span>} onLast />
          </Section>

          <Section title="健康">
            <Row
              icon={<Heart size={14} color={COLORS.accent} />}
              iconBg="#E8F5F3"
              label="疫苗与驱虫"
              value="齐全"
            />
            <Row
              icon={<Clock size={14} color="#C99B3E" />}
              iconBg="#FBF2D9"
              label="健康备忘"
              value="2 条"
              onLast
            />
          </Section>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ====================== Screen 56: 多宠管理 ======================
export function Screen56() {
  const pets = [
    { name: "奶油", meta: "金毛 · ♀ · 3 岁", photo: PHOTO_CREAM, active: true },
    { name: "拿铁", meta: "英短 · ♂ · 2 岁", photo: PHOTO_CAT },
    { name: "可可", meta: "柯基 · ♀ · 5 岁", photo: PHOTO_CORGI },
  ];
  return (
    <PhoneFrame label="56 · 多宠管理">
      <TopBar title="多宠管理" />
      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, color: COLORS.subText, padding: "8px 4px 4px" }}>
          已添加 3 / 5 只
        </div>
        {pets.map((p) => (
          <PetMini key={p.name} {...p} />
        ))}

        <div
          style={{
            marginTop: 8,
            padding: "16px",
            background: "#FFFFFF",
            border: `1.5px dashed ${COLORS.line}`,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: COLORS.primary,
          }}
        >
          <Plus size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>添加新宠物</span>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "#FFF7F0",
            border: "1px solid #FFE0CC",
            borderRadius: 12,
            fontSize: 12,
            color: COLORS.subText,
            lineHeight: 1.6,
            display: "flex",
            gap: 8,
          }}
        >
          <PawPrint size={14} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            每只宠物拥有独立健康与社交档案。切换当前宠物会同时改变首页与社交资料。
          </span>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ====================== Screen 57: 编辑宠物资料 ======================
export function Screen57() {
  function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${COLORS.line}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ width: 80, fontSize: 14, color: COLORS.subText }}>{label}</div>
        <div style={{ flex: 1, fontSize: 15, color: COLORS.text }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: COLORS.subText }}>{sub}</div>}
        <ChevronRight size={14} color={COLORS.subText} style={{ marginLeft: 6 }} />
      </div>
    );
  }
  return (
    <PhoneFrame label="57 · 编辑宠物资料">
      <TopBar title="编辑宠物资料" />
      <div style={{ padding: "12px 0", height: "calc(100% - 44px - 50px - 90px)", overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0 18px" }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid #FFFFFF",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
            >
              <ImageWithFallback
                src={PHOTO_CREAM}
                alt="cream"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: COLORS.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #FFFFFF",
              }}
            >
              <Camera size={14} color="#FFF" />
            </div>
          </div>
          <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 8 }}>
            点击更换头像
          </div>
        </div>

        <div
          style={{
            margin: "0 16px",
            background: "#FFFFFF",
            borderRadius: 16,
            border: `1px solid ${COLORS.line}`,
            overflow: "hidden",
          }}
        >
          <Field label="昵称" value="奶油" />
          <Field label="品种" value="金毛寻回犬" />
          <Field label="生日" value="2023 年 04 月 12 日" />
          <Field label="性别" value="♀ 女生" />
          <Field label="绝育" value="已绝育" />
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center" }}>
            <div style={{ width: 80, fontSize: 14, color: COLORS.subText }}>体重</div>
            <div style={{ flex: 1, fontSize: 15 }}>26.4</div>
            <div style={{ fontSize: 14, color: COLORS.subText }}>kg</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: COLORS.subText, padding: "10px 20px", lineHeight: 1.6 }}>
          准确的资料能让 AI 灵伴更懂它，也能让附近的朋友更安心约遛。
        </div>
      </div>

      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <PrimaryBtn label="保存" />
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: COLORS.danger,
            padding: "6px 0",
          }}
        >
          删除该宠物档案
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ====================== Screen 58: 设置与隐私 ======================
export function Screen58() {
  return (
    <PhoneFrame label="58 · 设置与隐私">
      <TopBar title="设置与隐私" />
      <div style={{ padding: "8px 0", overflow: "hidden" }}>
        <Section title="隐私" footnote="开启「模糊定位」后，附近的人只能看到 1 公里范围内的大致位置，不会显示精确坐标。">
          <Row
            icon={<MapPin size={15} color={COLORS.accent} />}
            iconBg="#E8F5F3"
            label="模糊定位"
            sub="只显示 1 公里范围"
            right={<Toggle on />}
          />
          <Row
            icon={<Eye size={15} color={COLORS.text} />}
            iconBg="#EFEAE1"
            label="附近可见"
            sub="允许出现在附近的人列表"
            right={<Toggle on />}
          />
          <Row
            icon={<MessageCircle size={15} color={COLORS.primary} />}
            iconBg="#FFE6D6"
            label="互动消息提醒"
            right={<Toggle on />}
            onLast
          />
        </Section>

        <Section title="通用">
          <Row
            icon={<Bell size={15} color="#C99B3E" />}
            iconBg="#FBF2D9"
            label="通知"
            value="开启"
          />
          <Row
            icon={<Settings size={15} color={COLORS.subText} />}
            iconBg="#EFEAE1"
            label="语言"
            value="简体中文"
            onLast
          />
        </Section>

        <Section title="安全与账号">
          <Row icon={<Lock size={15} color={COLORS.accent} />} iconBg="#E8F5F3" label="账号安全" />
          <Row
            icon={<Shield size={15} color={COLORS.accent} />}
            iconBg="#E8F5F3"
            label="黑名单与举报"
          />
          <Row
            icon={<LogOut size={15} color={COLORS.danger} />}
            iconBg="#FBE4DE"
            label="退出登录"
            danger
            right={<span />}
            onLast
          />
        </Section>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ====================== Screen 59: 账号安全 ======================
export function Screen59() {
  return (
    <PhoneFrame label="59 · 账号安全">
      <TopBar title="账号安全" />
      <div style={{ padding: "8px 0" }}>
        <div
          style={{
            margin: "8px 16px 18px",
            padding: 14,
            background:
              "linear-gradient(135deg, #E8F5F3 0%, #DDEFEC 100%)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={20} color={COLORS.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>账号已实名 · 安全等级高</div>
            <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 2 }}>
              上次登录：iPhone 15 · 上海
            </div>
          </div>
        </div>

        <Section title="登录方式">
          <Row
            icon={<Phone size={15} color={COLORS.text} />}
            iconBg="#EFEAE1"
            label="手机号"
            value="138 **** 4521"
          />
          <Row
            icon={<Mail size={15} color={COLORS.text} />}
            iconBg="#EFEAE1"
            label="邮箱"
            value="未绑定"
          />
          <Row
            icon={<KeyRound size={15} color={COLORS.primary} />}
            iconBg="#FFE6D6"
            label="登录密码"
            value="已设置"
            onLast
          />
        </Section>

        <Section title="登录与设备">
          <Row
            icon={<Smartphone size={15} color={COLORS.accent} />}
            iconBg="#E8F5F3"
            label="登录设备"
            value="2 台"
          />
          <Row
            icon={<EyeOff size={15} color={COLORS.text} />}
            iconBg="#EFEAE1"
            label="登录保护"
            right={<Toggle on />}
            onLast
          />
        </Section>

        <Section title="危险操作">
          <Row
            icon={<Trash2 size={15} color={COLORS.danger} />}
            iconBg="#FBE4DE"
            label="注销账号"
            danger
            onLast
          />
        </Section>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ====================== Screen 60: 举报与安全中心 ======================
export function Screen60() {
  function ActionCard({
    icon,
    color,
    bg,
    title,
    sub,
  }: {
    icon: React.ReactNode;
    color: string;
    bg: string;
    title: string;
    sub: string;
  }) {
    return (
      <div
        style={{
          padding: 14,
          background: "#FFFFFF",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 2 }}>
            {sub}
          </div>
        </div>
        <ChevronRight size={16} color={COLORS.subText} />
      </div>
    );
  }
  return (
    <PhoneFrame label="60 · 安全中心">
      <TopBar title="安全中心" />
      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            padding: 16,
            background:
              "linear-gradient(135deg, #FFF1E2 0%, #FFE3D1 100%)",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={22} color={COLORS.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Lumii 守护你的每一次出门</div>
            <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 4, lineHeight: 1.5 }}>
              遇到不安全的人或地点，可以随时举报或拉黑
            </div>
          </div>
        </div>

        <ActionCard
          icon={<Flag size={18} />}
          color={COLORS.primary}
          bg="#FFE6D6"
          title="举报用户或地点"
          sub="不当行为、虚假地点、骚扰等"
        />
        <ActionCard
          icon={<UserX size={18} />}
          color={COLORS.text}
          bg="#EFEAE1"
          title="拉黑用户"
          sub="阻止对方查看你和你的宠物"
        />
        <ActionCard
          icon={<Shield size={18} />}
          color={COLORS.accent}
          bg="#E8F5F3"
          title="黑名单管理"
          sub="已拉黑 2 人"
        />
        <ActionCard
          icon={<AlertTriangle size={18} />}
          color="#C99B3E"
          bg="#FBF2D9"
          title="紧急求助指南"
          sub="走失、受伤、宠物医院 24h 联系方式"
        />

        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "#FFFFFF",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            fontSize: 12,
            color: COLORS.subText,
            lineHeight: 1.7,
            display: "flex",
            gap: 8,
          }}
        >
          <Shield size={14} color={COLORS.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            所有举报会在 24 小时内由人工与算法共同审核。情节严重的，将立刻封禁并通知警方。
          </span>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ====================== Screen 61: 黑名单管理 ======================
export function Screen61() {
  const blocked = [
    { name: "@咖啡的主人", time: "2026.05.18 拉黑", reason: "骚扰私信" },
    { name: "@匿名用户", time: "2026.04.02 拉黑", reason: "虚假约遛地点" },
  ];
  return (
    <PhoneFrame label="61 · 黑名单管理">
      <TopBar title="黑名单" />
      <div style={{ padding: "8px 0" }}>
        <div
          style={{
            margin: "8px 16px 14px",
            padding: 12,
            background: "#FFFFFF",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            fontSize: 12,
            color: COLORS.subText,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>已拉黑 {blocked.length} 人</span>
          <span style={{ color: COLORS.accent }}>清除全部</span>
        </div>

        <div style={{ margin: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {blocked.map((b) => (
            <div
              key={b.name}
              style={{
                background: "#FFFFFF",
                border: `1px solid ${COLORS.line}`,
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "#EFEAE1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserX size={18} color={COLORS.subText} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: COLORS.subText, marginTop: 2 }}>
                  {b.time} · {b.reason}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.primary,
                  border: `1px solid ${COLORS.primary}`,
                  padding: "4px 12px",
                  borderRadius: 10,
                }}
              >
                解除
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            margin: "20px 16px 0",
            padding: 12,
            background: "#FFF7F0",
            border: "1px solid #FFE0CC",
            borderRadius: 12,
            fontSize: 12,
            color: COLORS.subText,
            lineHeight: 1.6,
            display: "flex",
            gap: 8,
          }}
        >
          <AlertTriangle size={14} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            拉黑后，对方将无法看到你的资料、宠物和位置，也无法向你发消息。
          </span>
        </div>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

// ====================== Screen 62: 退出登录确认 ======================
export function Screen62() {
  return (
    <PhoneFrame label="62 · 退出登录确认">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(20,18,14,0.45)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {/* faux bg */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
          <div style={{ padding: "60px 20px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>
              设置与隐私
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            background: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: "26px 20px 20px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: "#E5E0D5",
              borderRadius: 2,
              margin: "0 auto 18px",
            }}
          />

          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: "#FBE4DE",
              margin: "0 auto 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogOut size={26} color={COLORS.danger} />
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            确定要退出登录吗？
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              color: COLORS.subText,
              marginTop: 8,
              lineHeight: 1.6,
              padding: "0 12px",
            }}
          >
            退出后，本机将不再接收奶油的健康提醒与 AI 灵伴消息。重新登录后所有数据仍会保留。
          </div>

          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <PrimaryBtn label="确认退出" danger />
            <PrimaryBtn label="取消" ghost />
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ====================== Screen 63: 注销账号流程 ======================
export function Screen63() {
  return (
    <PhoneFrame label="63 · 注销账号">
      <TopBar title="注销账号" />
      <div style={{ padding: "12px 16px", height: "calc(100% - 44px - 50px - 110px)", overflow: "hidden" }}>
        <div
          style={{
            background: "#FBE4DE",
            border: "1px solid #F5C7BD",
            borderRadius: 16,
            padding: 16,
            display: "flex",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} color={COLORS.danger} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.danger }}>
              这是不可恢复的操作
            </div>
            <div style={{ fontSize: 12, color: COLORS.text, marginTop: 6, lineHeight: 1.6 }}>
              注销后，奶油及所有宠物档案、健康数据、AI 灵伴记忆将永久删除。
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: COLORS.subText, padding: "16px 4px 8px" }}>
          注销前请确认：
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {[
            "已导出或保存宠物健康记录",
            "已与社交联系人妥善告别",
            "已了解 30 天冷静期后才会彻底删除",
          ].map((t, i, arr) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderBottom: i === arr.length - 1 ? "none" : `1px solid ${COLORS.line}`,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `1.5px solid ${i < 2 ? COLORS.accent : COLORS.line}`,
                  background: i < 2 ? COLORS.accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i < 2 && <Check size={12} color="#FFF" />}
              </div>
              <div style={{ fontSize: 14 }}>{t}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: "#FFFFFF",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 13, color: COLORS.subText, marginBottom: 8 }}>
            30 天冷静期
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              color: COLORS.subText,
            }}
          >
            <Clock size={14} color="#C99B3E" />
            <span>
              提交后 30 天内重新登录可恢复账号，超过 30 天数据将不可找回
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <PrimaryBtn label="我已了解，继续注销" danger />
        <PrimaryBtn label="再想想" ghost />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
