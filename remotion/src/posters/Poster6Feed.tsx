/**
 * Poster 6: "Expert Tutors. Real Results." (1080x1080 — Meta Feed)
 * Photo: ad-photo-3.jpg (students collaborating with laptop)
 * Style: matches reference poster — photo bg, white card, accent circles
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


export const Poster6Feed = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, background: "#F5F0ED" }}>
      {/* Background photo */}
      <Img
        src={staticFile("images/ad-photo-3.jpg")}
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
          background: "linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.15) 100%)",
          zIndex: 1,
        }}
      />

      {/* Accent circles */}
      <AccentCircle size={300} top={-100} right={-60} opacity={0.8} />
      <AccentCircle size={500} bottom={-200} left={-180} opacity={0.9} />

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
              fontSize: 46,
              fontWeight: 800,
              color: DARK,
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            Expert Tutors.
            <br />
            <span style={{ color: RED }}>Real Results.</span>
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#666",
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            Vetted, experienced tutors who know
            <br />
            the Kenyan curriculum inside out.
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            {["CBC", "8-4-4", "IGCSE", "IB"].map((c) => (
              <div
                key={c}
                style={{
                  padding: "8px 20px",
                  borderRadius: 50,
                  border: `2px solid ${RED}`,
                  color: RED,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <CTAButton text="Find Your Tutor" />
        </WhiteCard>
      </div>

      {/* Footer */}
      <RedFooterBand width={1080} height={70} />
      <FooterBar width={1080} />
    </AbsoluteFill>
  );
};
