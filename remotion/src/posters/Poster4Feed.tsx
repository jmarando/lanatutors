/**
 * Poster 4: "Make This Holiday Count" (1080x1080 — Meta Feed, Parent-Focused)
 * Photo: ad-photo-1.jpg (parent helping child)
 * Style: matches reference poster — full photo bg, white card, accent circles
 */
import { AbsoluteFill, Img, staticFile } from "remotion";
import {
  RED,
  DARK,
  Logo,
  GradCapBadge,
  CTAButton,
  FooterBar,
  RedFooterBand,
  AccentCircle,
  WhiteCard,
  FONT_FAMILY,
} from "./shared";


export const Poster4Feed = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, background: "#F5F0ED" }}>
      {/* Background photo */}
      <Img
        src={staticFile("images/ad-photo-1.jpg")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.2) 100%)",
          zIndex: 1,
        }}
      />

      {/* Accent circles */}
      <AccentCircle size={280} top={-60} right={-80} opacity={0.8} />
      <AccentCircle size={480} bottom={-160} left={-200} opacity={0.9} />

      {/* Logo */}
      <Logo size={110} />

      {/* Content card */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 60,
          right: 60,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <GradCapBadge size={68} />
        <WhiteCard
          style={{
            marginTop: -20,
            paddingTop: 56,
            textAlign: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: DARK,
              lineHeight: 1.15,
              marginBottom: 16,
            }}
          >
            Make This{" "}
            <span style={{ color: RED }}>Holiday</span>
            <br />
            Count
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#666",
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            Personalised revision plans with
            <br />
            Kenya's top tutors.
          </div>
          <CTAButton text="Get Started" />
        </WhiteCard>
      </div>

      {/* Footer */}
      <RedFooterBand width={1080} height={70} />
      <FooterBar width={1080} />
    </AbsoluteFill>
  );
};
