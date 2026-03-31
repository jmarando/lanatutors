/**
 * Poster 2: "Don't Let the Holiday Go to Waste" (1080x1920 — IG/Meta Story)
 * Photo: ad-photo-2.jpg (boy studying at desk)
 * Style: vertical story format, photo top half, card bottom half
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


export const Poster2Story = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, background: "#F5F0ED" }}>
      {/* Background photo - top portion */}
      <Img
        src={staticFile("images/ad-photo-2.jpg")}
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          height: "65%",
          objectFit: "cover",
        }}
      />

      {/* Decorative accent circles */}
      <AccentCircle size={350} top={-100} right={-100} opacity={0.8} />
      <AccentCircle size={600} bottom={-200} left={-250} opacity={0.9} />

      {/* Logo */}
      <Logo size={100} />

      {/* Content card - bottom area */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 50,
          right: 50,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <GradCapBadge size={72} />
        <WhiteCard
          style={{
            marginTop: -20,
            paddingTop: 60,
            textAlign: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: DARK,
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Don't Let the
            <br />
            Holiday{" "}
            <span style={{ color: RED }}>Go to</span>
            <br />
            <span style={{ color: RED }}>Waste</span>
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#666",
              lineHeight: 1.5,
              marginBottom: 32,
              maxWidth: 700,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            2 weeks is all it takes to close gaps
            <br />
            from last term. 1-on-1 expert revision.
          </div>
          <CTAButton text="Book a Free Assessment" />
        </WhiteCard>
      </div>

      {/* Footer */}
      <RedFooterBand width={1080} height={80} />
      <FooterBar width={1080} />
    </AbsoluteFill>
  );
};
