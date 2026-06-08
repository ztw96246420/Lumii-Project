import { Loader2 } from "lucide-react";
import {
  Agreement,
  BrandHeader,
  COLORS,
  HomeIndicator,
  InlineError,
  OtpInput,
  PetMascot,
  PhoneFrame,
  PhoneInput,
  PrimaryButton,
  ResendRow,
  Toast,
  TopBar,
} from "./login-kit";

// ===== Login screen scaffolding =====
function LoginScaffold({
  children,
  agreementChecked,
  agreementShake,
  button,
  toast,
}: {
  children: React.ReactNode;
  agreementChecked: boolean;
  agreementShake?: boolean;
  button: React.ReactNode;
  toast?: string;
}) {
  return (
    <>
      <TopBar showBack />
      <BrandHeader
        title={"你好呀，\n准备好遇见你的灵伴了吗？"}
        subtitle="使用手机号快速登录，开启与猫狗的温暖陪伴"
      />
      <div className="px-7" style={{ marginTop: 32 }}>
        {children}
        {button}
        <Agreement checked={agreementChecked} shake={agreementShake} />
      </div>
      <FooterHelp />
      {toast && <Toast text={toast} />}
      <HomeIndicator />
    </>
  );
}

function FooterHelp() {
  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center gap-4"
      style={{ bottom: 38, color: COLORS.subText, fontSize: 12 }}
    >
      <span>遇到问题？</span>
      <span style={{ color: COLORS.accent }}>联系客服</span>
    </div>
  );
}

// ===== 1. Login default =====
export function Screen1() {
  return (
    <PhoneFrame label="1 · 登录页 默认">
      <LoginScaffold
        agreementChecked={false}
        button={<PrimaryButton state="disabled" label="获取验证码" />}
      >
        <PhoneInput placeholder="请输入中国大陆手机号" focused />
      </LoginScaffold>
    </PhoneFrame>
  );
}

// ===== 2. Login phone format error =====
export function Screen2() {
  return (
    <PhoneFrame label="2 · 手机号格式错误">
      <LoginScaffold
        agreementChecked={false}
        button={<PrimaryButton state="disabled" label="获取验证码" />}
      >
        <PhoneInput value="1380 0000" error />
        <InlineError text="手机号格式有误，请输入 11 位中国大陆手机号" />
      </LoginScaffold>
    </PhoneFrame>
  );
}

// ===== 3. Agreement not checked =====
export function Screen3() {
  return (
    <PhoneFrame label="3 · 未勾选协议">
      <LoginScaffold
        agreementChecked={false}
        agreementShake
        toast="请先勾选并同意用户协议"
        button={<PrimaryButton state="default" label="获取验证码" />}
      >
        <PhoneInput value="138 0013 8000" />
      </LoginScaffold>
    </PhoneFrame>
  );
}

// ===== 4. Sending code =====
export function Screen4() {
  return (
    <PhoneFrame label="4 · 验证码发送中">
      <LoginScaffold
        agreementChecked
        button={<PrimaryButton state="loading" label="获取验证码" />}
      >
        <PhoneInput value="138 0013 8000" />
      </LoginScaffold>
    </PhoneFrame>
  );
}

// ===== 5. Countdown =====
export function Screen5() {
  return (
    <PhoneFrame label="5 · 发送过频倒计时">
      <LoginScaffold
        agreementChecked
        toast="操作太频繁，请稍后再试"
        button={<PrimaryButton state="countdown" label="" countdown={59} />}
      >
        <PhoneInput value="138 0013 8000" />
      </LoginScaffold>
    </PhoneFrame>
  );
}

// ===== Verification scaffold =====
function CodeScaffold({
  otp,
  cursorIndex,
  otpError,
  resendState,
  countdown,
  inlineError,
  toast,
}: {
  otp: string;
  cursorIndex?: number;
  otpError?: boolean;
  resendState: "default" | "countdown";
  countdown?: number;
  inlineError?: string;
  toast?: string;
}) {
  return (
    <>
      <TopBar showBack />
      <div className="px-7" style={{ marginTop: 16 }}>
        <div
          style={{
            color: COLORS.text,
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: -0.3,
          }}
        >
          输入验证码
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 14,
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          已发送 6 位验证码至 <span style={{ color: COLORS.text }}>+86 138 0013 8000</span>
        </div>
        <OtpInput value={otp} error={otpError} cursorIndex={cursorIndex ?? 0} />
        {inlineError && <InlineError text={inlineError} />}
        <ResendRow state={resendState} countdown={countdown} />
        <div
          className="flex items-center justify-center"
          style={{ marginTop: 18, fontSize: 13, color: COLORS.subText }}
        >
          收不到？试试 <span style={{ color: COLORS.accent, marginLeft: 6 }}>语音验证码</span>
        </div>
      </div>
      <BottomTipCard />
      {toast && <Toast text={toast} />}
      <HomeIndicator />
    </>
  );
}

function BottomTipCard() {
  return (
    <div
      className="absolute left-5 right-5 flex items-center gap-3"
      style={{
        bottom: 40,
        background: "rgba(77,182,172,0.10)",
        borderRadius: 18,
        padding: "14px 16px",
        border: "1px solid rgba(77,182,172,0.18)",
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: "rgba(77,182,172,0.18)",
          fontSize: 18,
        }}
      >
        🐾
      </div>
      <div
        style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.5, flex: 1 }}
      >
        新朋友提示：登录后可领养一只 AI 灵伴
        <span style={{ color: COLORS.subText }}>，与你的真实毛孩子一起成长。</span>
      </div>
    </div>
  );
}

// ===== 6. OTP default =====
export function Screen6() {
  return (
    <PhoneFrame label="6 · 验证码页 默认">
      <CodeScaffold otp="" cursorIndex={0} resendState="countdown" countdown={59} />
    </PhoneFrame>
  );
}

// ===== 7. OTP wrong =====
export function Screen7() {
  return (
    <PhoneFrame label="7 · 验证码错误">
      <CodeScaffold
        otp="284716"
        otpError
        resendState="countdown"
        countdown={42}
        inlineError="验证码错误，请重新输入"
      />
    </PhoneFrame>
  );
}

// ===== 8. OTP expired =====
export function Screen8() {
  return (
    <PhoneFrame label="8 · 验证码过期">
      <CodeScaffold
        otp="284716"
        otpError
        resendState="default"
        inlineError="验证码已过期，请重新获取"
        toast="验证码已过期"
      />
    </PhoneFrame>
  );
}

// ===== 9. Login success loading =====
export function Screen9() {
  return (
    <PhoneFrame label="9 · 登录成功 loading">
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: "100%", padding: "0 32px" }}
      >
        <PetMascot size={120} />
        <div
          className="flex items-center gap-2"
          style={{ marginTop: 36, color: COLORS.text, fontSize: 17, fontWeight: 500 }}
        >
          <Loader2 size={18} className="animate-spin" color={COLORS.primary} />
          登录中...
        </div>
        <div
          style={{
            color: COLORS.subText,
            fontSize: 13,
            marginTop: 10,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          正在为你唤醒专属灵伴
          <br />
          请稍候片刻
        </div>
        <ProgressDots />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}

function ProgressDots() {
  return (
    <div
      className="flex items-center gap-2"
      style={{ marginTop: 32 }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: i === 0 ? COLORS.primary : "rgba(255,138,92,0.25)",
          }}
        />
      ))}
    </div>
  );
}
