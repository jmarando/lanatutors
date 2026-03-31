/**
 * Poster 3: "April Holiday Revision" (1200x628 — Google Display / Performance Max)
 * Photo: ad-photo-6.jpg (tutor at whiteboard)
 * Style: horizontal banner, photo right, copy left
 */
import { AbsoluteFill, Img, staticFile } from "remotion";
import {
  RED,
  DARK,
  GradCapBadge,
  CTAButton,
  AccentCircle,
  FONT_FAMILY,
} from "./shared";


export const Poster3Display = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, background: "#FFFFFF" }}>
      {/* Right side photo */}
      <Img
        src={staticFile("images/ad-photo-6.jpg")}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "50%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Accent circles */}
      <AccentCircle size={250} bottom={-100} right={350} opacity={0.15} />
      <AccentCircle size={120} top={20} right={540} opacity={0.1} />

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 36,
          zIndex: 10,
        }}
      >
        <Img
          src={staticFile("images/lana-tutors-logo-hd.png")}
          style={{ width: 120, height: 50, objectFit: "contain" }}
        />
      </div>

      {/* Left side copy */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "52%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 50px",
          zIndex: 5,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <GradCapBadge size={48} />
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: DARK,
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          April Holiday{" "}
          <span style={{ color: RED }}>Revision</span>
        </div>
        <div
          style={{
            fontSize: 16,
            color: "#666",
            lineHeight: 1.5,
            marginBottom: 8,
          }}
        >
          Expert Online Tutors | All Curricula
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#888",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          1-on-1 sessions from KES 1,500/hr. Book your free assessment call today.
        </div>
        <CTAButton text="Book Now" width={200} />
      </div>

      {/* Bottom red bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 1200,
          height: 6,
          background: RED,
          zIndex: 10,
        }}
      />

      {/* URL */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 30,
          fontSize: 14,
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          zIndex: 10,
        }}
      >
        lanatutors.africa
      </div>
    </AbsoluteFill>
  );
};
