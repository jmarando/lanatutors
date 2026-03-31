/**
 * Poster 5: "Results That Speak for Themselves" (1080x1920 — IG/Meta Story)
 * Photo: ad-photo-5.jpg (happy girl with A grade)
 * Style: vertical story, celebratory/results focused
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


export const Poster5Story = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, background: "#FEF5F4" }}>
      {/* Background photo - top portion */}
      <Img
        src={staticFile("images/ad-photo-5.jpg")}
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          height: "60%",
          objectFit: "cover",
          objectPosition: "center top",
        }}
      />

      {/* Accent circles */}
      <AccentCircle size={320} top={-80} right={-120} opacity={0.75} />
      <AccentCircle size={550} bottom={-180} left={-220} opacity={0.9} />

      {/* Logo */}
      <Logo size={100} />

      {/* Content card */}
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
              fontSize: 50,
              fontWeight: 800,
              color: DARK,
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Results That{" "}
            <span style={{ color: RED }}>Speak</span>
            <br />
            <span style={{ color: RED }}>for Themselves</span>
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#666",
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            95% of our students improve their
            <br />
            grades within one term.
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 40,
              marginBottom: 28,
            }}
          >
            {[
              { val: "200+", label: "Students" },
              { val: "50+", label: "Tutors" },
              { val: "95%", label: "Pass Rate" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: RED }}>
                  {s.val}
                </div>
                <div style={{ fontSize: 14, color: "#888" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <CTAButton text="Book Assessment Call" />
        </WhiteCard>
      </div>

      {/* Footer */}
      <RedFooterBand width={1080} height={80} />
      <FooterBar width={1080} />
    </AbsoluteFill>
  );
};
