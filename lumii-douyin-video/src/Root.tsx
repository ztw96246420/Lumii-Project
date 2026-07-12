import "./index.css";
import { Composition } from "remotion";
import { RecruitmentVideo } from "./RecruitmentVideo";

export type LumiiPromoProps = {
  recruitmentLabel: string;
  cta: string;
  ctaNote: string;
  withVoiceover: boolean;
};

const LumiiRecruitment: React.FC<LumiiPromoProps> = (props) => {
  return <RecruitmentVideo {...props} />;
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LumiiRecruitment"
      component={LumiiRecruitment}
      durationInFrames={780}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        recruitmentLabel: "首批体验用户招募中",
        cta: "评论「灵伴」申请内测",
        ctaNote: "猫咪 / 狗狗家长均可 · 一起参与灵伴共创",
        withVoiceover: true,
      }}
    />
  );
};
