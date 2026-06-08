import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  MapPin,
  Navigation,
  Star,
  Heart,
  Share2,
  PenLine,
  Camera,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Locate,
  Coffee,
  TreePine,
  Stethoscope,
  Hotel,
  ShieldCheck,
  Clock,
  Phone,
  Compass,
  PawPrint,
  Plus,
  ChevronUp,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { COLORS, PhoneFrame, HomeIndicator } from "./login-kit";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ---------- Photos ----------
const PHOTO_PARK =
  "https://images.unsplash.com/photo-1761532950128-501cc3a7e735?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900";
const PHOTO_PARK_B =
  "https://images.unsplash.com/photo-1764660308106-72eacd973fc8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PHOTO_CAFE =
  "https://images.unsplash.com/photo-1691067987594-b1b7f84ba55a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PHOTO_VET =
  "https://images.unsplash.com/photo-1746021375258-79fa1464ca1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";
const PHOTO_GOLDEN =
  "https://images.unsplash.com/photo-1599692392256-2d084495fe15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400";
const PHOTO_OWNER =
  "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

// ---------- Faux Amap background ----------
function FauxMap({
  height = 600,
  showMarkers = true,
  blur,
}: {
  height?: number;
  showMarkers?: boolean;
  blur?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height,
        overflow: "hidden",
        background: "#EEF2EC",
        filter: blur ? "blur(6px) saturate(0.6)" : undefined,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 390 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: "block" }}
      >
        {/* base */}
        <defs>
          <pattern
            id="hatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#E4E9E2" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="390" height="600" fill="#EEF2EC" />
        {/* park area */}
        <path
          d="M-20 110 Q 80 80, 160 130 Q 230 170, 240 260 Q 220 320, 130 320 Q 30 320, -20 260 Z"
          fill="#D7E6CC"
        />
        <path
          d="M0 110 Q 80 80, 160 130 Q 230 170, 240 260 Q 220 320, 130 320"
          fill="none"
          stroke="#BFD2B0"
          strokeWidth="1.2"
        />
        {/* second park */}
        <path
          d="M260 380 Q 330 360, 400 400 L420 510 Q 340 540, 260 510 Z"
          fill="#D7E6CC"
        />
        {/* water (river) */}
        <path
          d="M-20 420 Q 80 410, 160 440 Q 240 470, 320 460 Q 380 455, 420 470 L420 500 Q 360 490, 280 500 Q 180 510, 80 490 Q 20 480, -20 490 Z"
          fill="#C9DBE4"
        />
        {/* big roads */}
        <path
          d="M-10 230 Q 100 220, 200 240 Q 300 260, 410 250"
          stroke="#fff"
          strokeWidth="14"
          fill="none"
        />
        <path
          d="M180 -10 Q 175 100, 200 240 Q 230 380, 220 610"
          stroke="#fff"
          strokeWidth="12"
          fill="none"
        />
        <path
          d="M-10 360 Q 130 350, 260 380 Q 340 395, 410 380"
          stroke="#fff"
          strokeWidth="10"
          fill="none"
        />
        <path
          d="M40 -10 Q 50 130, 80 280 Q 110 430, 90 610"
          stroke="#fff"
          strokeWidth="8"
          fill="none"
        />
        <path
          d="M-10 540 Q 130 530, 260 555 Q 340 568, 410 555"
          stroke="#fff"
          strokeWidth="9"
          fill="none"
        />
        {/* road outlines */}
        <path
          d="M-10 230 Q 100 220, 200 240 Q 300 260, 410 250"
          stroke="#E0E5DE"
          strokeWidth="0.8"
          fill="none"
        />
        <path
          d="M180 -10 Q 175 100, 200 240 Q 230 380, 220 610"
          stroke="#E0E5DE"
          strokeWidth="0.8"
          fill="none"
        />
        {/* small roads */}
        {[
          "M30 60 L 360 80",
          "M20 160 L 370 175",
          "M30 300 L 360 305",
          "M30 470 L 360 480",
          "M100 -10 L 110 610",
          "M260 -10 L 250 610",
          "M310 -10 L 320 610",
        ].map((d) => (
          <path key={d} d={d} stroke="#F4F6F2" strokeWidth="4" fill="none" />
        ))}
        {/* building blocks */}
        {[
          { x: 250, y: 30, w: 50, h: 36 },
          { x: 310, y: 50, w: 56, h: 44 },
          { x: 250, y: 100, w: 36, h: 30 },
          { x: 300, y: 110, w: 46, h: 38 },
          { x: 250, y: 180, w: 58, h: 36 },
          { x: 320, y: 190, w: 36, h: 30 },
          { x: 30, y: 350, w: 42, h: 34 },
          { x: 110, y: 360, w: 50, h: 26 },
          { x: 30, y: 410, w: 36, h: 30 },
          { x: 280, y: 320, w: 50, h: 34 },
          { x: 130, y: 430, w: 40, h: 30 },
          { x: 270, y: 470, w: 48, h: 34 },
          { x: 50, y: 30, w: 38, h: 32 },
          { x: 100, y: 50, w: 56, h: 34 },
          { x: 30, y: 90, w: 46, h: 32 },
        ].map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill="#E7EBE3"
            stroke="#D8DDD2"
            strokeWidth="0.8"
            rx="2"
          />
        ))}
        {/* park labels */}
        <text x="80" y="225" fill="#7F9870" fontSize="10" fontWeight="600">
          云杉公园
        </text>
        <text x="290" y="450" fill="#7F9870" fontSize="9" fontWeight="600">
          滨河绿地
        </text>
        <text x="120" y="480" fill="#8AA6B5" fontSize="9" fontStyle="italic">
          望京河
        </text>
        {/* road labels */}
        <text x="100" y="246" fill="#9AA098" fontSize="8" fontWeight="500">
          阜通东大街
        </text>
        <text x="208" y="120" fill="#9AA098" fontSize="8" fontWeight="500" transform="rotate(85 208 120)">
          望京中环路
        </text>
      </svg>

      {showMarkers && (
        <>
          {/* Markers */}
          <MapMarker
            top={170}
            left={130}
            kind="park"
            label="云杉宠物友好公园"
            active
          />
          <MapMarker top={310} left={250} kind="cafe" label="暖爪咖啡" />
          <MapMarker top={420} left={90} kind="vet" label="安心宠物医院" />
          <MapMarker top={120} left={290} kind="hotel" label="宠寄家" />
          <MapMarker top={460} left={310} kind="park" label="滨河绿地" small />
          <MapMarker top={250} left={50} kind="cafe" label="毛茸咖啡" small />
          {/* You-are-here */}
          <div
            style={{
              position: "absolute",
              top: 360,
              left: 170,
            }}
          >
            <div
              style={{
                position: "relative",
                width: 22,
                height: 22,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -10,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(64,118,237,0.3) 0%, rgba(64,118,237,0) 70%)",
                  animation: "blink 1.6s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: "#4076ED",
                  border: "3px solid #fff",
                  boxShadow: "0 4px 10px -3px rgba(64,118,237,0.5)",
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MapMarker({
  top,
  left,
  kind,
  label,
  active,
  small,
}: {
  top: number;
  left: number;
  kind: "park" | "cafe" | "vet" | "hotel";
  label?: string;
  active?: boolean;
  small?: boolean;
}) {
  const map = {
    park: { bg: "#4DB6AC", Icon: TreePine },
    cafe: { bg: "#FF8A5C", Icon: Coffee },
    vet: { bg: "#E5573F", Icon: Stethoscope },
    hotel: { bg: "#C8A871", Icon: Hotel },
  }[kind];
  const Icon = map.Icon;
  const size = small ? 26 : 34;
  return (
    <div
      className="flex flex-col items-center"
      style={{
        position: "absolute",
        top,
        left,
        transform: "translate(-50%, -100%)",
      }}
    >
      {active && label && (
        <div
          style={{
            background: "#fff",
            padding: "4px 9px",
            borderRadius: 10,
            fontSize: 10.5,
            fontWeight: 700,
            color: COLORS.text,
            border: `1px solid ${COLORS.line}`,
            boxShadow: "0 6px 14px -6px rgba(0,0,0,0.25)",
            marginBottom: 4,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      )}
      <div
        className="flex items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          background: map.bg,
          border: "2.5px solid #fff",
          boxShadow: "0 6px 12px -4px rgba(0,0,0,0.35)",
          transform: active ? "scale(1.08)" : "scale(1)",
        }}
      >
        <Icon size={small ? 12 : 16} color="#fff" strokeWidth={2.4} />
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: `7px solid ${map.bg}`,
          marginTop: -2,
          filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.15))",
        }}
      />
    </div>
  );
}

// ---------- Shared atoms ----------
function HeaderBar({
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
      style={{ height: 50 }}
    >
      {showBack ? (
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${COLORS.line}`,
            boxShadow: "0 6px 14px -8px rgba(0,0,0,0.2)",
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
        }}
      >
        {title}
      </div>
      <div style={{ minWidth: 36 }}>{right}</div>
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
        height: small ? 38 : 50,
        width: fullWidth ? "100%" : undefined,
        flex: fullWidth ? undefined : 1,
        borderRadius: small ? 19 : 25,
        background: COLORS.primary,
        color: "#fff",
        fontSize: small ? 13 : 15,
        fontWeight: 600,
        boxShadow: "0 14px 26px -12px rgba(255,138,92,0.7)",
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
        height: small ? 38 : 50,
        flex: 1,
        borderRadius: small ? 19 : 25,
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        color: COLORS.text,
        fontSize: small ? 13 : 15,
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
  tone?: "warm" | "cool" | "neutral" | "olive";
}) {
  const map = {
    warm: { bg: "rgba(255,138,92,0.12)", c: COLORS.primary },
    cool: { bg: "rgba(77,182,172,0.16)", c: COLORS.accent },
    neutral: { bg: "rgba(122,121,114,0.12)", c: COLORS.subText },
    olive: { bg: "rgba(127,152,112,0.16)", c: "#5F7E4D" },
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

function RatingStars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= Math.round(value) ? "#FFB94B" : "transparent"}
          color={s <= Math.round(value) ? "#FFB94B" : "#E0DBD0"}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

// ============================================================
// Screen 45 — Map home
// ============================================================
export function Screen45() {
  return (
    <PhoneFrame label="45 · 宠物友好地图">
      <FauxMap height={620} />

      {/* Floating search bar */}
      <div
        className="absolute"
        style={{ top: 50, left: 16, right: 16 }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: 24,
            padding: "0 10px 0 16px",
            height: 48,
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow: "0 14px 30px -12px rgba(0,0,0,0.18)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Search size={16} color={COLORS.subText} />
          <div
            style={{
              flex: 1,
              color: COLORS.subText,
              fontSize: 13.5,
            }}
          >
            搜索公园、咖啡店、宠物医院…
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: COLORS.primary,
            }}
          >
            <SlidersHorizontal size={14} color="#fff" />
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div
        className="absolute flex gap-2"
        style={{
          top: 108,
          left: 16,
          right: 16,
          overflowX: "auto",
        }}
      >
        <MapChip label="全部" active />
        <MapChip label="🐶 汪星友好" />
        <MapChip label="🐱 喵星友好" />
        <MapChip label="🌳 公园" />
        <MapChip label="🏥 医院" />
        <MapChip label="☕ 咖啡店" />
      </div>

      {/* Right side controls */}
      <div
        className="absolute"
        style={{
          right: 16,
          top: 270,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <MapCtrl>
          <Locate size={16} color={COLORS.primary} />
        </MapCtrl>
        <MapCtrl>
          <Plus size={16} color={COLORS.text} />
        </MapCtrl>
        <MapCtrl>
          <Compass size={16} color={COLORS.text} />
        </MapCtrl>
      </div>

      {/* Bottom sheet */}
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "10px 0 26px",
          boxShadow: "0 -18px 40px -14px rgba(0,0,0,0.2)",
          maxHeight: 360,
          overflow: "hidden",
        }}
      >
        <div
          className="mx-auto"
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: COLORS.line,
            marginBottom: 10,
          }}
        />
        <div
          className="flex items-center justify-between px-5"
          style={{ marginBottom: 12 }}
        >
          <div
            style={{
              color: COLORS.text,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: -0.2,
            }}
          >
            附近宠物友好地点
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            12 个 · 综合排序
          </div>
        </div>
        <div
          className="px-5"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <PlaceCard
            photo={PHOTO_PARK}
            name="云杉宠物友好公园"
            type="公园 · 草坪 · 饮水点"
            rating={4.8}
            count={236}
            distance="320m"
            tags={[
              { label: "可遛狗", tone: "warm" },
              { label: "可拆牵引绳", tone: "olive" },
            ]}
            active
          />
          <PlaceCard
            photo={PHOTO_CAFE}
            name="暖爪咖啡"
            type="咖啡店 · 室内友好"
            rating={4.6}
            count={128}
            distance="1.1km"
            tags={[
              { label: "可带猫包", tone: "cool" },
              { label: "室内友好", tone: "warm" },
            ]}
          />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function MapCtrl({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        background: "#fff",
        boxShadow: "0 8px 18px -6px rgba(0,0,0,0.2)",
        border: `1px solid ${COLORS.line}`,
      }}
    >
      {children}
    </div>
  );
}

function MapChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        padding: "7px 14px",
        borderRadius: 16,
        background: active ? COLORS.text : "rgba(255,255,255,0.95)",
        color: active ? "#fff" : COLORS.text,
        border: active ? "none" : `1px solid ${COLORS.line}`,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap",
        boxShadow: "0 8px 18px -10px rgba(0,0,0,0.2)",
      }}
    >
      {label}
    </div>
  );
}

function PlaceCard({
  photo,
  name,
  type,
  rating,
  count,
  distance,
  tags,
  active,
}: {
  photo: string;
  name: string;
  type: string;
  rating: number;
  count: number;
  distance: string;
  tags: { label: string; tone: "warm" | "cool" | "olive" | "neutral" }[];
  active?: boolean;
}) {
  return (
    <div
      className="flex gap-3"
      style={{
        background: active ? "rgba(255,138,92,0.06)" : "#fff",
        border: active
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        borderRadius: 18,
        padding: 10,
        boxShadow: active ? "0 10px 24px -14px rgba(255,138,92,0.4)" : "none",
      }}
    >
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: 14,
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <ImageWithFallback
          src={photo}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          className="absolute flex items-center gap-0.5"
          style={{
            left: 6,
            top: 6,
            background: "rgba(255,255,255,0.92)",
            color: COLORS.text,
            fontSize: 9.5,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 7,
          }}
        >
          <Star size={8} fill="#FFB94B" color="#FFB94B" strokeWidth={0} />
          {rating}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center justify-between">
          <div
            style={{
              color: COLORS.text,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: -0.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
          <div
            className="flex items-center gap-0.5"
            style={{
              color: COLORS.accent,
              fontSize: 10.5,
              fontWeight: 700,
              background: "rgba(77,182,172,0.14)",
              padding: "2px 7px",
              borderRadius: 8,
              marginLeft: 6,
              flexShrink: 0,
            }}
          >
            <Navigation size={9} />
            {distance}
          </div>
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {type} · {count} 条点评
        </div>
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 6 }}>
          {tags.map((t, i) => (
            <Tag key={i} label={t.label} tone={t.tone} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Screen 46 — Map search & filter
// ============================================================
export function Screen46() {
  return (
    <PhoneFrame label="46 · 地图搜索与筛选">
      <FauxMap height={300} blur />
      {/* dark veil */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(27,28,25,0.32)",
          pointerEvents: "none",
        }}
      />

      {/* Search field */}
      <div className="absolute" style={{ top: 50, left: 16, right: 16 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "0 6px 0 16px",
            height: 48,
            boxShadow: "0 14px 30px -12px rgba(0,0,0,0.25)",
          }}
        >
          <Search size={16} color={COLORS.primary} />
          <div
            style={{
              flex: 1,
              color: COLORS.text,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            云杉
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
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: COLORS.muted,
            }}
          >
            <X size={14} color={COLORS.subText} />
          </div>
        </div>
      </div>

      {/* Sheet results */}
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          bottom: 0,
          top: 110,
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          padding: "16px 0 0",
          boxShadow: "0 -20px 40px -14px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        {/* Filter section */}
        <div className="px-5">
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 10 }}
          >
            <div
              style={{
                color: COLORS.text,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              筛选
            </div>
            <div
              style={{
                color: COLORS.primary,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              重置
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <MapChip label="全部" />
            <MapChip label="🌳 公园" active />
            <MapChip label="🐶 汪星友好" active />
            <MapChip label="🐱 喵星友好" />
            <MapChip label="☕ 咖啡店" />
            <MapChip label="🏥 医院" />
          </div>

          <div className="flex gap-2" style={{ marginTop: 12 }}>
            <SegmentBtn label="距离最近" active />
            <SegmentBtn label="评分最高" />
            <SegmentBtn label="点评最多" />
          </div>

          <div className="flex items-center gap-3" style={{ marginTop: 14 }}>
            <div style={{ color: COLORS.subText, fontSize: 12, fontWeight: 500 }}>
              距离
            </div>
            <div
              style={{
                flex: 1,
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
                  width: "55%",
                  borderRadius: 3,
                  background: "linear-gradient(90deg, #FF8A5C, #FFB48C)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "55%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: "#fff",
                  border: `2px solid ${COLORS.primary}`,
                  boxShadow: "0 4px 8px -2px rgba(80,55,30,0.2)",
                }}
              />
            </div>
            <div style={{ color: COLORS.primary, fontSize: 12, fontWeight: 700 }}>
              3km
            </div>
          </div>
        </div>

        {/* Results */}
        <div
          className="flex items-center justify-between px-5"
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          <div
            style={{ color: COLORS.text, fontSize: 14, fontWeight: 700 }}
          >
            搜索结果
          </div>
          <div style={{ color: COLORS.subText, fontSize: 11.5 }}>3 个匹配</div>
        </div>
        <div
          className="px-5"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <PlaceCard
            photo={PHOTO_PARK}
            name="云杉宠物友好公园"
            type="公园 · 草坪 · 饮水点"
            rating={4.8}
            count={236}
            distance="320m"
            tags={[{ label: "可遛狗", tone: "warm" }]}
          />
          <PlaceCard
            photo={PHOTO_PARK_B}
            name="云杉北门草坪"
            type="公园 · 子区域"
            rating={4.7}
            count={87}
            distance="450m"
            tags={[{ label: "草坪", tone: "olive" }]}
          />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function SegmentBtn({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "8px 0",
        borderRadius: 12,
        background: active ? COLORS.primary : COLORS.bg,
        color: active ? "#fff" : COLORS.text,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        textAlign: "center",
        boxShadow: active ? "0 8px 16px -8px rgba(255,138,92,0.55)" : "none",
      }}
    >
      {label}
    </div>
  );
}

// ============================================================
// Screen 47 — Map locate failed
// ============================================================
export function Screen47() {
  return (
    <PhoneFrame label="47 · 地图定位失败">
      <FauxMap height={620} blur showMarkers={false} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(238,242,236,0.55)",
        }}
      />

      <div className="absolute" style={{ top: 50, left: 16, right: 16 }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: 24,
            padding: "0 10px 0 16px",
            height: 48,
            boxShadow: "0 14px 30px -12px rgba(0,0,0,0.18)",
          }}
        >
          <Search size={16} color={COLORS.subText} />
          <div style={{ flex: 1, color: COLORS.subText, fontSize: 13.5 }}>
            搜索公园、咖啡店、宠物医院…
          </div>
          <SlidersHorizontal size={16} color={COLORS.subText} />
        </div>
      </div>

      {/* Error banner */}
      <div
        className="absolute"
        style={{ top: 112, left: 16, right: 16 }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            background: "#fff",
            border: "1px solid rgba(229,87,63,0.25)",
            borderRadius: 14,
            padding: "10px 12px",
            boxShadow: "0 10px 22px -14px rgba(0,0,0,0.18)",
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "rgba(229,87,63,0.14)",
            }}
          >
            <AlertCircle size={14} color={COLORS.danger} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: COLORS.text,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              定位失败
            </div>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 11,
                marginTop: 1,
              }}
            >
              请检查 GPS 与网络是否开启
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

      {/* Center hint */}
      <div
        className="absolute flex flex-col items-center"
        style={{ left: 0, right: 0, top: 280, padding: "0 40px", textAlign: "center" }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            background: "#fff",
            boxShadow: "0 14px 30px -12px rgba(0,0,0,0.2)",
          }}
        >
          <Locate size={32} color={COLORS.subText} strokeWidth={2} />
        </div>
        <div
          style={{
            color: COLORS.text,
            fontSize: 17,
            fontWeight: 700,
            marginTop: 18,
            letterSpacing: -0.3,
          }}
        >
          无法获取当前位置
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 12.5,
            marginTop: 8,
            lineHeight: 1.65,
          }}
        >
          可以手动选择城市或区域
          <br />
          或前往设置开启定位权限
        </div>
      </div>

      {/* Bottom actions */}
      <div
        className="absolute flex gap-2"
        style={{ left: 16, right: 16, bottom: 50 }}
      >
        <GhostBtn label="手动选地区" icon={<MapPin size={15} />} />
        <PrimaryBtn label="去开启定位" icon={<Navigation size={15} />} />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 48 — Place detail
// ============================================================
export function Screen48() {
  return (
    <PhoneFrame label="48 · 地点详情">
      {/* Hero */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 280,
          overflow: "hidden",
        }}
      >
        <ImageWithFallback
          src={PHOTO_PARK}
          alt="云杉宠物友好公园"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>

      <div
        className="flex items-center justify-between px-4"
        style={{ position: "absolute", left: 0, right: 0, top: 44, height: 50 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 6px 14px -6px rgba(0,0,0,0.25)",
          }}
        >
          <ChevronLeft size={18} color={COLORS.text} />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 6px 14px -6px rgba(0,0,0,0.25)",
            }}
          >
            <Share2 size={16} color={COLORS.text} />
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 6px 14px -6px rgba(0,0,0,0.25)",
            }}
          >
            <Heart size={16} color={COLORS.primary} fill={COLORS.primary} />
          </div>
        </div>
      </div>

      {/* Photo count */}
      <div
        className="absolute flex items-center gap-1"
        style={{
          left: 16,
          top: 248,
          background: "rgba(27,28,25,0.65)",
          color: "#fff",
          padding: "4px 10px",
          borderRadius: 11,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        <Camera size={11} />
        1 / 48
      </div>

      {/* Sheet */}
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: 252,
          bottom: 0,
          background: COLORS.bg,
          borderRadius: "24px 24px 0 0",
          overflow: "hidden",
        }}
      >
        <div className="px-5" style={{ paddingTop: 18 }}>
          <div className="flex items-start justify-between">
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2">
                <div
                  style={{
                    color: COLORS.text,
                    fontSize: 21,
                    fontWeight: 700,
                    letterSpacing: -0.3,
                  }}
                >
                  云杉宠物友好公园
                </div>
                <div
                  className="flex items-center gap-1"
                  style={{
                    background: "rgba(77,182,172,0.14)",
                    color: COLORS.accent,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 7px",
                    borderRadius: 8,
                  }}
                >
                  <ShieldCheck size={9} />
                  官方认证
                </div>
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                <RatingStars value={4.8} size={13} />
                <div
                  style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}
                >
                  4.8
                </div>
                <div style={{ color: COLORS.subText, fontSize: 11.5 }}>
                  · 236 条点评
                </div>
                <div
                  className="flex items-center gap-1"
                  style={{
                    color: COLORS.accent,
                    fontSize: 11,
                    fontWeight: 600,
                    marginLeft: "auto",
                  }}
                >
                  <Navigation size={11} />
                  320m
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div
            className="flex items-start gap-2"
            style={{
              marginTop: 12,
              background: "#fff",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 14,
              padding: "10px 12px",
            }}
          >
            <MapPin size={13} color={COLORS.primary} style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: COLORS.text,
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                朝阳区望京东路 8 号 · 云杉公园西门
              </div>
              <div
                className="flex items-center gap-3"
                style={{
                  marginTop: 6,
                  color: COLORS.subText,
                  fontSize: 11,
                }}
              >
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  06:00 - 22:00
                </div>
                <div className="flex items-center gap-1">
                  <Phone size={10} />
                  010-8888-8888
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.3,
                marginBottom: 8,
              }}
            >
              宠物友好特色
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag label="可遛狗" tone="warm" />
              <Tag label="草坪" tone="olive" />
              <Tag label="饮水点" tone="cool" />
              <Tag label="室内友好" tone="warm" />
              <Tag label="可带猫包" tone="cool" />
              <Tag label="可拆牵引绳区" tone="olive" />
            </div>
          </div>

          {/* Latest review preview */}
          <div
            style={{
              marginTop: 16,
              background: "#fff",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 16,
              padding: "12px 14px",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1.5px solid #fff",
                  boxShadow: "0 4px 8px -3px rgba(80,55,30,0.18)",
                }}
              >
                <ImageWithFallback
                  src={PHOTO_GOLDEN}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      color: COLORS.text,
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    奶油的主人
                  </div>
                  <RatingStars value={5} size={10} />
                </div>
                <div
                  style={{
                    color: COLORS.subText,
                    fontSize: 10.5,
                    marginTop: 1,
                  }}
                >
                  3 天前
                </div>
              </div>
            </div>
            <div
              style={{
                color: COLORS.text,
                fontSize: 12.5,
                lineHeight: 1.6,
                marginTop: 8,
                opacity: 0.85,
              }}
            >
              草坪很整洁，饮水点和便便袋都备得很齐，奶油超喜欢～
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div
        className="absolute flex gap-2 items-center px-4"
        style={{
          left: 0,
          right: 0,
          bottom: 30,
          padding: "0 16px",
        }}
      >
        <ActionCircle icon={<PenLine size={16} color={COLORS.text} />} label="写点评" />
        <PrimaryBtn label="高德导航" icon={<Navigation size={15} />} fullWidth />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function ActionCircle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        width: 52,
        height: 52,
        borderRadius: 18,
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        gap: 2,
        boxShadow: "0 8px 18px -10px rgba(80,55,30,0.2)",
      }}
    >
      {icon}
      <div style={{ color: COLORS.subText, fontSize: 9.5, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

// ============================================================
// Screen 49 — Add place / review
// ============================================================
export function Screen49() {
  return (
    <PhoneFrame label="49 · 新增地点 / 点评">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 50% at 50% 0%, rgba(255,217,182,0.5) 0%, rgba(255,217,182,0) 60%)",
          pointerEvents: "none",
        }}
      />
      <HeaderBar
        title="写一条点评"
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
        {/* Place chip */}
        <div
          className="flex items-center gap-3"
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 18,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <ImageWithFallback
              src={PHOTO_PARK}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: COLORS.text,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              云杉宠物友好公园
            </div>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              公园 · 朝阳区望京东路 8 号
            </div>
          </div>
          <ChevronRight size={15} color={COLORS.subText} />
        </div>

        {/* Rating */}
        <FieldLabel>给它打个分</FieldLabel>
        <div
          className="flex items-center justify-center gap-3"
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "16px 0",
          }}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={28}
              fill={s <= 5 ? "#FFB94B" : "transparent"}
              color={s <= 5 ? "#FFB94B" : "#E0DBD0"}
              strokeWidth={2}
            />
          ))}
          <div
            style={{
              color: COLORS.primary,
              fontSize: 14,
              fontWeight: 700,
              marginLeft: 4,
            }}
          >
            非常推荐
          </div>
        </div>

        {/* Tags */}
        <FieldLabel>这里的宠物友好特色</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <SelectChip label="可遛狗" active />
          <SelectChip label="草坪" active />
          <SelectChip label="饮水点" active />
          <SelectChip label="室内友好" />
          <SelectChip label="可带猫包" />
          <SelectChip label="可拆牵引绳" active />
          <SelectChip label="便便袋" />
          <SelectChip label="" plus />
        </div>

        {/* Review text */}
        <FieldLabel>写下你的体验</FieldLabel>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: "12px 14px",
            minHeight: 100,
            color: COLORS.text,
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          草坪很整洁，饮水点和便便袋都备得很齐，奶油超喜欢！
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

        {/* Photos */}
        <FieldLabel>添加照片（可选）</FieldLabel>
        <div className="flex gap-2">
          <PhotoSquare src={PHOTO_PARK_B} />
          <PhotoSquare src={PHOTO_GOLDEN} />
          <div
            className="flex flex-col items-center justify-center"
            style={{
              flex: 1,
              aspectRatio: "1 / 1",
              borderRadius: 14,
              border: `1.5px dashed ${COLORS.line}`,
              background: "rgba(255,255,255,0.6)",
              color: COLORS.subText,
              fontSize: 10.5,
              fontWeight: 500,
              gap: 4,
            }}
          >
            <Camera size={20} />
            添加
          </div>
        </div>

        {/* Notice */}
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
            点评需经过 24 小时人工审核，请保持真实客观
          </div>
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

function SelectChip({
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
        padding: "7px 12px",
        borderRadius: 14,
        background: active ? "rgba(255,138,92,0.12)" : "#fff",
        border: active
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        color: active ? COLORS.primary : COLORS.text,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
      }}
    >
      {plus && <Plus size={12} />}
      {label || "自定义"}
    </div>
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
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

// ============================================================
// Screen 50 — Review submitted / pending
// ============================================================
export function Screen50() {
  return (
    <PhoneFrame label="50 · 点评提交成功 等待审核">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 50% at 50% 0%, rgba(255,217,182,0.55) 0%, rgba(255,217,182,0) 65%), radial-gradient(60% 30% at 100% 100%, rgba(77,182,172,0.14) 0%, rgba(77,182,172,0) 70%)",
        }}
      />
      <HeaderBar title="提交成功" />

      <div
        className="flex flex-col items-center px-8"
        style={{ marginTop: 30, textAlign: "center" }}
      >
        {/* Big success illustration */}
        <div
          style={{
            position: "relative",
            width: 160,
            height: 160,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(77,182,172,0.28) 0%, rgba(77,182,172,0) 70%)",
            }}
          />
          <div
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #FFE3CB 0%, #FFD2A8 100%)",
              boxShadow:
                "0 22px 44px -16px rgba(180,110,60,0.45), inset 0 0 0 6px #fff",
            }}
          >
            <Clock size={56} color={COLORS.primary} strokeWidth={2.2} />
          </div>
          {/* small sparkles */}
          <Sparkles
            size={16}
            style={{ position: "absolute", top: 4, left: -4, color: COLORS.primary }}
            fill="currentColor"
          />
          <Sparkles
            size={12}
            style={{ position: "absolute", top: 20, right: 0, color: COLORS.accent }}
            fill="currentColor"
          />
          <div
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 38,
              height: 38,
              borderRadius: 19,
              background: COLORS.accent,
              border: "3px solid #fff",
              boxShadow: "0 6px 14px -4px rgba(77,182,172,0.5)",
            }}
          >
            <Check size={18} color="#fff" strokeWidth={3} />
          </div>
        </div>

        <div
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: 700,
            marginTop: 24,
            letterSpacing: -0.3,
          }}
        >
          点评已提交
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 13,
            marginTop: 10,
            lineHeight: 1.65,
          }}
        >
          为保证社区真实可信，我们需要 24 小时内
          <br />
          人工审核你的点评，通过后会通知你
        </div>

        {/* Status stepper */}
        <div
          style={{
            marginTop: 24,
            width: "100%",
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 18,
            padding: "16px 16px 12px",
            boxShadow: "0 12px 26px -16px rgba(80,55,30,0.18)",
          }}
        >
          <Step done text="已提交点评" time="刚刚" />
          <StepLine active />
          <Step active text="人工审核中" time="预计 24 小时内" />
          <StepLine />
          <Step text="通过后发布到地点" time="将通知你" />
        </div>

        <div className="flex gap-2" style={{ width: "100%", marginTop: 18 }}>
          <GhostBtn label="返回地点" icon={<MapPin size={14} />} />
          <PrimaryBtn label="再写一条" icon={<PenLine size={14} />} />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function Step({
  done,
  active,
  text,
  time,
}: {
  done?: boolean;
  active?: boolean;
  text: string;
  time: string;
}) {
  const color = done ? COLORS.accent : active ? COLORS.primary : COLORS.subText;
  return (
    <div className="flex items-center gap-3" style={{ padding: "4px 0" }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          background: done
            ? "rgba(77,182,172,0.18)"
            : active
              ? "rgba(255,138,92,0.16)"
              : COLORS.muted,
          color,
        }}
      >
        {done ? (
          <Check size={13} strokeWidth={3} />
        ) : active ? (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: color,
              animation: "blink 1.2s ease-in-out infinite",
            }}
          />
        ) : (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: color,
              opacity: 0.5,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: COLORS.text,
            fontSize: 13.5,
            fontWeight: done || active ? 600 : 500,
          }}
        >
          {text}
        </div>
        <div style={{ color: COLORS.subText, fontSize: 11, marginTop: 1 }}>
          {time}
        </div>
      </div>
    </div>
  );
}

function StepLine({ active }: { active?: boolean }) {
  return (
    <div
      style={{
        marginLeft: 11,
        width: 2,
        height: 14,
        background: active ? COLORS.primary : COLORS.line,
        opacity: active ? 0.5 : 1,
      }}
    />
  );
}

// ============================================================
// Screen 51 — Review submit failed
// ============================================================
export function Screen51() {
  return (
    <PhoneFrame label="51 · 点评提交失败">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 50% at 50% 0%, rgba(255,217,182,0.4) 0%, rgba(255,217,182,0) 65%)",
        }}
      />
      <HeaderBar title="提交失败" />

      <div
        className="flex flex-col items-center px-8"
        style={{ marginTop: 30, textAlign: "center" }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            background: "rgba(229,87,63,0.10)",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "rgba(229,87,63,0.18)",
            }}
          >
            <AlertCircle size={32} color={COLORS.danger} strokeWidth={2.2} />
          </div>
        </div>
        <div
          style={{
            color: COLORS.text,
            fontSize: 21,
            fontWeight: 700,
            marginTop: 22,
            letterSpacing: -0.3,
          }}
        >
          提交失败，请稍后再试
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 13,
            marginTop: 10,
            lineHeight: 1.65,
          }}
        >
          可能原因：网络不稳定 / 服务暂时繁忙
          <br />
          你的草稿已自动保存，可继续编辑
        </div>

        {/* Draft preview */}
        <div
          style={{
            marginTop: 22,
            width: "100%",
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 18,
            padding: "14px 16px",
            textAlign: "left",
            boxShadow: "0 10px 22px -14px rgba(80,55,30,0.18)",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 10 }}
          >
            <div
              className="flex items-center gap-2"
              style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}
            >
              <PenLine size={13} color={COLORS.primary} />
              草稿已保存
            </div>
            <div
              style={{ color: COLORS.subText, fontSize: 11 }}
            >
              刚刚
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RatingStars value={5} size={11} />
            <div
              style={{ color: COLORS.text, fontSize: 11.5, fontWeight: 600 }}
            >
              · 云杉宠物友好公园
            </div>
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 12,
              marginTop: 6,
              lineHeight: 1.55,
            }}
          >
            草坪很整洁，饮水点和便便袋都备得很齐…
          </div>
        </div>

        <div
          className="flex gap-2"
          style={{ width: "100%", marginTop: 20 }}
        >
          <GhostBtn label="保存草稿" />
          <PrimaryBtn label="重新提交" icon={<RefreshCw size={14} />} />
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 52 — Favorite toast (saved / unsaved)
// ============================================================
export function Screen52() {
  return (
    <PhoneFrame label="52 · 收藏 / 取消收藏">
      {/* Hero photo */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 280,
          overflow: "hidden",
        }}
      >
        <ImageWithFallback
          src={PHOTO_CAFE}
          alt="暖爪咖啡"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      </div>

      <div
        className="flex items-center justify-between px-4"
        style={{ position: "absolute", left: 0, right: 0, top: 44, height: 50 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 6px 14px -6px rgba(0,0,0,0.25)",
          }}
        >
          <ChevronLeft size={18} color={COLORS.text} />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 6px 14px -6px rgba(0,0,0,0.25)",
            }}
          >
            <Share2 size={16} color={COLORS.text} />
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: COLORS.primary,
              boxShadow:
                "0 10px 22px -6px rgba(255,138,92,0.65), 0 0 0 4px rgba(255,138,92,0.18)",
            }}
          >
            <Heart size={16} color="#fff" fill="#fff" />
          </div>
        </div>
      </div>

      {/* Sheet */}
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: 252,
          bottom: 0,
          background: COLORS.bg,
          borderRadius: "24px 24px 0 0",
        }}
      >
        <div className="px-5" style={{ paddingTop: 18 }}>
          <div
            style={{
              color: COLORS.text,
              fontSize: 21,
              fontWeight: 700,
              letterSpacing: -0.3,
            }}
          >
            暖爪咖啡
          </div>
          <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
            <RatingStars value={4.6} size={13} />
            <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>
              4.6
            </div>
            <div style={{ color: COLORS.subText, fontSize: 11.5 }}>
              · 128 条点评
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                color: COLORS.accent,
                fontSize: 11,
                fontWeight: 600,
                marginLeft: "auto",
              }}
            >
              <Navigation size={11} />
              1.1km
            </div>
          </div>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
            <Tag label="室内友好" tone="warm" />
            <Tag label="可带猫包" tone="cool" />
            <Tag label="饮水点" tone="cool" />
            <Tag label="自烘咖啡" tone="olive" />
          </div>
        </div>
      </div>

      {/* Toast: saved */}
      <div
        className="absolute left-1/2"
        style={{
          top: 110,
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
          minWidth: 240,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            background: COLORS.primary,
          }}
        >
          <Bookmark size={15} color="#fff" fill="#fff" />
        </div>
        <div style={{ lineHeight: 1.3, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>已收藏到「想去」</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>
            在「我的 · 收藏」中查看
          </div>
        </div>
        <div
          style={{
            color: "#FFB48C",
            fontSize: 12,
            fontWeight: 600,
            marginLeft: 4,
          }}
        >
          管理
        </div>
      </div>

      {/* Toast: unsaved (secondary) */}
      <div
        className="absolute"
        style={{
          left: 16,
          right: 16,
          bottom: 110,
          background: "#fff",
          borderRadius: 18,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 16px 36px -14px rgba(80,55,30,0.25)",
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: COLORS.muted,
          }}
        >
          <Heart size={15} color={COLORS.subText} />
        </div>
        <div style={{ flex: 1, lineHeight: 1.35 }}>
          <div
            style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}
          >
            已取消收藏 · 安心宠物医院
          </div>
          <div
            style={{ fontSize: 11, color: COLORS.subText, marginTop: 1 }}
          >
            将不再出现在「想去」列表
          </div>
        </div>
        <div
          style={{
            color: COLORS.primary,
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 12,
            background: "rgba(255,138,92,0.12)",
          }}
        >
          撤销
        </div>
      </div>

      <div
        className="absolute flex gap-2 px-4"
        style={{ left: 0, right: 0, bottom: 30 }}
      >
        <ActionCircle icon={<PenLine size={16} color={COLORS.text} />} label="写点评" />
        <PrimaryBtn label="高德导航" icon={<Navigation size={15} />} fullWidth />
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

// ============================================================
// Screen 53 — Amap navigation confirm modal
// ============================================================
export function Screen53() {
  return (
    <PhoneFrame label="53 · 高德导航确认弹窗">
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 280,
          overflow: "hidden",
        }}
      >
        <ImageWithFallback
          src={PHOTO_VET}
          alt="安心宠物医院"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>

      <div
        className="flex items-center justify-between px-4"
        style={{ position: "absolute", left: 0, right: 0, top: 44, height: 50 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            background: "rgba(255,255,255,0.92)",
          }}
        >
          <ChevronLeft size={18} color={COLORS.text} />
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            background: "rgba(255,255,255,0.92)",
          }}
        >
          <Share2 size={16} color={COLORS.text} />
        </div>
      </div>

      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: 252,
          bottom: 0,
          background: COLORS.bg,
          borderRadius: "24px 24px 0 0",
          opacity: 0.55,
        }}
      >
        <div className="px-5" style={{ paddingTop: 18 }}>
          <div
            style={{ color: COLORS.text, fontSize: 21, fontWeight: 700 }}
          >
            安心宠物医院
          </div>
        </div>
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

      {/* Modal */}
      <div
        className="absolute left-1/2"
        style={{
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 320,
          background: "#fff",
          borderRadius: 24,
          padding: "22px 20px 18px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "linear-gradient(135deg, #4CB251 0%, #2F9E40 100%)",
            boxShadow: "0 12px 24px -8px rgba(76,178,81,0.55)",
            marginBottom: 12,
          }}
        >
          <Navigation size={26} color="#fff" strokeWidth={2.4} />
        </div>
        <div
          style={{
            color: COLORS.text,
            fontSize: 17,
            fontWeight: 700,
            textAlign: "center",
            letterSpacing: -0.2,
          }}
        >
          即将打开高德地图导航
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 12.5,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 1.65,
          }}
        >
          离开 Lumii 前往高德地图
          <br />
          为「安心宠物医院」规划路线
        </div>

        {/* Place row */}
        <div
          className="flex items-center gap-3"
          style={{
            marginTop: 14,
            background: COLORS.bg,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 14,
            padding: "10px 12px",
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "rgba(229,87,63,0.14)",
              color: COLORS.danger,
            }}
          >
            <Stethoscope size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: COLORS.text,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              安心宠物医院
            </div>
            <div
              style={{
                color: COLORS.subText,
                fontSize: 11,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              朝阳区望京西路 56 号 · 1.8km
            </div>
          </div>
          <div
            className="flex items-center gap-0.5"
            style={{ color: COLORS.accent, fontSize: 11, fontWeight: 600 }}
          >
            <Navigation size={11} />
            驾车 8 分钟
          </div>
        </div>

        {/* App pick */}
        <div className="flex gap-2" style={{ marginTop: 12 }}>
          <NavAppPick label="高德地图" sub="推荐" active />
          <NavAppPick label="百度地图" />
          <NavAppPick label="苹果地图" />
        </div>

        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <div
            className="flex-1 flex items-center justify-center"
            style={{
              height: 48,
              borderRadius: 24,
              background: COLORS.muted,
              color: COLORS.text,
              fontSize: 14.5,
              fontWeight: 500,
            }}
          >
            取消
          </div>
          <div
            className="flex-1 flex items-center justify-center gap-1.5"
            style={{
              height: 48,
              borderRadius: 24,
              background: COLORS.primary,
              color: "#fff",
              fontSize: 14.5,
              fontWeight: 600,
              boxShadow: "0 12px 24px -10px rgba(255,138,92,0.7)",
            }}
          >
            <Navigation size={14} />
            打开导航
          </div>
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}

function NavAppPick({
  label,
  sub,
  active,
}: {
  label: string;
  sub?: string;
  active?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        flex: 1,
        height: 56,
        borderRadius: 14,
        background: active ? "rgba(255,138,92,0.10)" : "#fff",
        border: active
          ? `1.5px solid ${COLORS.primary}`
          : `1px solid ${COLORS.line}`,
        color: active ? COLORS.primary : COLORS.text,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        position: "relative",
      }}
    >
      {label}
      {sub && (
        <div
          style={{
            color: active ? COLORS.primary : COLORS.subText,
            fontSize: 9.5,
            fontWeight: 700,
            background: active ? "#fff" : COLORS.muted,
            padding: "1px 6px",
            borderRadius: 6,
            position: "absolute",
            top: -7,
            right: 6,
            border: active ? `1px solid ${COLORS.primary}` : "none",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
