import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

const RED = "#E7422D";
const TEAL = "#1D9DB8";
const CREAM = "#FEF5F4";

export const Scene5CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headS = spring({ frame: frame - 5, fps, config: { damping: 15 } });
  const headOp = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const headY = interpolate(headS, [0, 1], [50, 0]);

  const urlS = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  const urlOp = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const urlScale = interpolate(urlS, [0, 1], [0.8, 1]);

  const subOp = interpolate(frame, [65, 85], [0, 1], { extrapolateRight: "clamp" });

  const pulse = Math.sin(frame * 0.08) * 0.15 + 0.85;

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, #FFFFFF 0%, ${CREAM} 40%, #FFF8F6 100%)`,
      fontFamily,
    }}>
      {/* Large coral circle bottom-left (poster style) */}
      <div style={{
        position: "absolute", left: -200, bottom: -250,
        width: 700, height: 700, borderRadius: "50%",
        background: RED, opacity: 0.85,
      }} />

      {/* Smaller coral circle top-right */}
      <div style={{
        position: "absolute", right: -60, top: -80,
        width: 300, height: 300, borderRadius: "50%",
        background: RED, opacity: 0.15,
      }} />

      {/* Student photo on right */}
      <div style={{
        position: "absolute", right: 80, top: 140, bottom: 140,
        width: 480, borderRadius: 24, overflow: "hidden",
        opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" }),
        transform: `scale(${interpolate(
          spring({ frame: frame - 10, fps, config: { damping: 14 } }),
          [0, 1], [0.9, 1]
        )})`,
        boxShadow: "0 20px 60px rgba(231, 66, 45, 0.15)",
      }}>
        <Img src={staticFile("images/student1.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
        }} />
      </div>

      {/* Teal accent line top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 5,
        background: `linear-gradient(90deg, ${RED}, ${TEAL})`,
        transform: `scaleX(${interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" })})`,
        transformOrigin: "left",
      }} />

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "center",
        height: "100%", padding: "0 120px",
        maxWidth: "55%",
      }}>
        {/* Main heading */}
        <div style={{
          opacity: headOp,
          transform: `translateY(${headY}px)`,
        }}>
          <div style={{
            fontSize: 72, fontWeight: 800, color: "#1A1A1A",
            lineHeight: 1.15, marginBottom: 20,
          }}>
            Start Learning
            <br />
            <span style={{ color: RED }}>Today</span>
          </div>
        </div>

        {/* URL / CTA */}
        <div style={{
          opacity: urlOp,
          transform: `scale(${urlScale})`,
          marginTop: 20,
        }}>
          <div style={{
            background: RED,
            padding: "20px 56px",
            borderRadius: 60,
            boxShadow: `0 0 ${50 * pulse}px ${RED}44`,
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#FFF" }}>
              lanatutors.africa
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          opacity: subOp,
          marginTop: 28,
          fontSize: 22, color: "#666",
          fontWeight: 400,
        }}>
          Sign up free — Book your first session in minutes
        </div>

        {/* Tags */}
        <div style={{
          display: "flex", gap: 16, marginTop: 30,
          opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {["Free Consultation", "All Curricula", "Verified Teachers"].map((t, i) => (
            <div key={i} style={{
              padding: "8px 20px",
              borderRadius: 50,
              border: `2px solid ${i === 0 ? RED : TEAL}`,
              color: "#333",
              fontSize: 16,
              fontWeight: 600,
              transform: `translateY(${interpolate(
                spring({ frame: frame - 90 - i * 6, fps, config: { damping: 15 } }),
                [0, 1], [20, 0]
              )}px)`,
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 5,
        background: RED,
        transform: `scaleX(${interpolate(frame, [100, 130], [0, 1], { extrapolateRight: "clamp" })})`,
        transformOrigin: "right",
      }} />
    </AbsoluteFill>
  );
};
