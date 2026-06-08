import {
  Screen1,
  Screen2,
  Screen3,
  Screen4,
  Screen5,
  Screen6,
  Screen7,
  Screen8,
  Screen9,
} from "./components/screens";
import {
  Screen10,
  Screen11,
  Screen12,
  Screen13,
  Screen14,
  Screen15,
  Screen16,
  Screen17,
  Screen18,
} from "./components/onboarding-screens";
import {
  Screen19,
  Screen20,
  Screen21,
  Screen22,
  Screen23,
  Screen24,
  Screen25,
} from "./components/ai-pet-screens";
import {
  Screen26,
  Screen27,
  Screen28,
  Screen29,
  Screen30,
  Screen31,
  Screen32,
  Screen33,
  Screen34,
} from "./components/pet-core-screens";
import {
  Screen35,
  Screen36,
  Screen37,
  Screen38,
  Screen39,
  Screen40,
  Screen41,
  Screen42,
  Screen43,
  Screen44,
} from "./components/social-screens";
import {
  Screen45,
  Screen46,
  Screen47,
  Screen48,
  Screen49,
  Screen50,
  Screen51,
  Screen52,
  Screen53,
} from "./components/map-screens";
import {
  Screen54,
  Screen55,
  Screen56,
  Screen57,
  Screen58,
  Screen59,
  Screen60,
  Screen61,
  Screen62,
  Screen63,
} from "./components/profile-screens";
import {
  Screen64,
  Screen65,
  Screen66,
  Screen67,
  Screen68,
  Screen69,
  Screen70,
  Screen71,
  Screen72,
  Screen73,
} from "./components/system-screens";
import { Screen74 } from "./components/icon-screen";
import { COLORS } from "./components/login-kit";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F2EEE6",
        padding: "56px 40px 80px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
        color: COLORS.text,
      }}
    >
      <style>{`@keyframes blink { 50% { opacity: 0 } } @keyframes spin { to { transform: rotate(360deg) } } @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div style={{ maxWidth: 1480, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.3 }}>
            Lumii 灵伴 · 登录、建档、AI 灵伴、核心首页、社交消息、地图、个人中心与全局组件库全流程
          </div>
          <div
            style={{
              color: COLORS.subText,
              fontSize: 14,
              marginTop: 8,
              lineHeight: 1.6,
            }}
          >
            iPhone 15 · 390 × 844 · 中文界面 · 暖米白底 / 暖橙主色 #FF8A5C / 柔和青绿 #4DB6AC
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, 390px)",
            gap: 56,
            justifyContent: "center",
          }}
        >
          <Screen1 />
          <Screen2 />
          <Screen3 />
          <Screen4 />
          <Screen5 />
          <Screen6 />
          <Screen7 />
          <Screen8 />
          <Screen9 />
          <Screen10 />
          <Screen11 />
          <Screen12 />
          <Screen13 />
          <Screen14 />
          <Screen15 />
          <Screen16 />
          <Screen17 />
          <Screen18 />
          <Screen19 />
          <Screen20 />
          <Screen21 />
          <Screen22 />
          <Screen23 />
          <Screen24 />
          <Screen25 />
          <Screen26 />
          <Screen27 />
          <Screen28 />
          <Screen29 />
          <Screen30 />
          <Screen31 />
          <Screen32 />
          <Screen33 />
          <Screen34 />
          <Screen35 />
          <Screen36 />
          <Screen37 />
          <Screen38 />
          <Screen39 />
          <Screen40 />
          <Screen41 />
          <Screen42 />
          <Screen43 />
          <Screen44 />
          <Screen45 />
          <Screen46 />
          <Screen47 />
          <Screen48 />
          <Screen49 />
          <Screen50 />
          <Screen51 />
          <Screen52 />
          <Screen53 />
          <Screen54 />
          <Screen55 />
          <Screen56 />
          <Screen57 />
          <Screen58 />
          <Screen59 />
          <Screen60 />
          <Screen61 />
          <Screen62 />
          <Screen63 />
          <Screen64 />
          <Screen65 />
          <Screen66 />
          <Screen67 />
          <Screen68 />
          <Screen69 />
          <Screen70 />
          <Screen71 />
          <Screen72 />
          <Screen73 />
          <Screen74 />
        </div>
      </div>
    </div>
  );
}
