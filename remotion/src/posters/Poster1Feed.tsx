/**
 * Poster 1: "April Holiday Revision Packages" (1080x1080 — Meta Feed)
 * Photo: parent-child.jpg (parent helping child study)
 * Style: matches reference poster layout with photo bg, white card overlay, accent circles
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


export const Poster1Feed = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, background: "#F5F0ED" }}>
      {/* Background photo */}
      <Img
        src={staticFile("images/ad-photo-4.jpg")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Slight overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 100%)",
          zIndex: 1,
        }}
      />

      {/* Decorative accent circles */}
      <AccentCircle size={300} top={-80} right={-60} opacity={0.85} />
      <AccentCircle size={500} bottom={-180} left={-180} opacity={0.9} />

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
              fontSize: 44,
              fontWeight: 800,
              color: DARK,
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            April Holiday{" "}
            <span style={{ color: RED }}>Revision</span>
            <br />
            Packages
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#666",
              lineHeight: 1.5,
              marginBottom: 28,
              maxWidth: 700,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Give your child the academic boost
            <br />
            they deserve with Lana Tutors.
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#888",
              marginBottom: 24,
            }}
          >
            1-on-1 online tutoring. CBC, 8-4-4, IGCSE & IB. From KES 1,500/hr.
          </div>
          <CTAButton text="Book Now" />
        </WhiteCard>
      </div>

      {/* Footer */}
      <RedFooterBand width={1080} height={70} />
      <FooterBar width={1080} />
    </AbsoluteFill>
  );
};
