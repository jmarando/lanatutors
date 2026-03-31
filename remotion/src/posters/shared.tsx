import React from "react";
import { Img, staticFile } from "remotion";

export const RED = "#E7422D";
export const DARK = "#1A1A1A";
export const CREAM = "#FEF5F4";
export const FONT_FAMILY = "'Liberation Sans', 'Helvetica Neue', Arial, sans-serif";

// Lana Tutors logo in top-left with white rounded background
export const Logo: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <div
    style={{
      position: "absolute",
      top: 40,
      left: 40,
      width: size,
      height: size,
      borderRadius: 20,
      background: "#FFFFFF",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    }}
  >
    <Img
      src={staticFile("images/lana-tutors-logo-hd.png")}
      style={{ width: size * 0.8, height: size * 0.8, objectFit: "contain" }}
    />
  </div>
);

// Graduation cap badge icon (red circle with white cap)
export const GradCapBadge: React.FC<{ size?: number }> = ({ size = 72 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: RED,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 16px rgba(231, 66, 45, 0.3)",
    }}
  >
    <svg
      width={size * 0.5}
      height={size * 0.5}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
    </svg>
  </div>
);

// CTA button pill
export const CTAButton: React.FC<{ text: string; width?: number }> = ({
  text,
  width,
}) => (
  <div
    style={{
      background: DARK,
      color: "#FFFFFF",
      padding: "18px 48px",
      borderRadius: 50,
      fontSize: 24,
      fontWeight: 700,
      textAlign: "center",
      width: width || "auto",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    }}
  >
    {text}
  </div>
);

// Footer bar with tagline and URL
export const FooterBar: React.FC<{ width: number }> = ({ width }) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 40px",
      zIndex: 10,
    }}
  >
    <div style={{ fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: 400 }}>
      Your trusted tutoring partner
    </div>
    <div
      style={{
        fontSize: 18,
        color: "rgba(255,255,255,0.95)",
        fontWeight: 700,
      }}
    >
      lanatutors.africa
    </div>
  </div>
);

// Red footer band
export const RedFooterBand: React.FC<{ width: number; height?: number }> = ({
  width,
  height = 80,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width,
      height,
      background: RED,
      zIndex: 5,
    }}
  />
);

// Large decorative coral circle
export const AccentCircle: React.FC<{
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  opacity?: number;
}> = ({ size, top, left, right, bottom, opacity = 0.9 }) => (
  <div
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: "50%",
      background: RED,
      opacity,
      top,
      left,
      right,
      bottom,
      zIndex: 1,
    }}
  />
);

// White card overlay with rounded corners
export const WhiteCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: "#FFFFFF",
      borderRadius: 30,
      padding: "48px 40px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
      zIndex: 10,
      ...style,
    }}
  >
    {children}
  </div>
);
