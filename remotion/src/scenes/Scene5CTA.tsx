import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

const RED = "#ED3F27";
const TEAL = "#1D9DB8";

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

  // Pulsing glow on CTA
  const pulse = Math.sin(frame * 0.08) * 0.15 + 0.85;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(160deg, #0D1B2A 0%, #1A1A1A 40%, #0D1B2A 100%)",
      fontFamily,
    }}>
      {/* Radial glow behind CTA */}
      <div style={{
        position: "absolute",
        width: 800, height: 800,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${RED}22 0%, transparent 70%)`,
        left: "50%", top: "50%",
        transform: `translate(-50%, -50%) scale(${pulse * 1.5})`,
      }} />

      {/* Teal accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: TEAL,
        transform: `scaleX(${interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" })})`,
        transformOrigin: "left",
      }} />

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", textAlign: "center",
      }}>
        {/* Main heading */}
        <div style={{
          opacity: headOp,
          transform: `translateY(${headY}px)`,
        }}>
          <div style={{
            fontSize: 72, fontWeight: 800, color: "#FFF",
            lineHeight: 1.15, marginBottom: 20,
          }}>
            Start Learning
            <br />
            <span style={{ color: RED }}>Today</span>
          </div>
        </div>

        {/* URL / CTA button */}
        <div style={{
          opacity: urlOp,
          transform: `scale(${urlScale})`,
          marginTop: 30,
        }}>
          <div style={{
            background: RED,
            padding: "24px 72px",
            borderRadius: 60,
            boxShadow: `0 0 ${60 * pulse}px ${RED}66`,
          }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#FFF" }}>
              lanatutors.lovable.app
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          opacity: subOp,
          marginTop: 36,
          fontSize: 24, color: "rgba(255,255,255,0.6)",
          fontWeight: 400,
        }}>
          Sign up free — Book your first session in minutes
        </div>

        {/* Tags */}
        <div style={{
          display: "flex", gap: 20, marginTop: 40,
          opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {["Free Consultation", "All Curricula", "Verified Teachers"].map((t, i) => (
            <div key={i} style={{
              padding: "10px 24px",
              borderRadius: 50,
              border: `1.5px solid ${i === 0 ? RED : TEAL}55`,
              color: "rgba(255,255,255,0.7)",
              fontSize: 18,
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
        position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${RED}, ${TEAL})`,
        transform: `scaleX(${interpolate(frame, [100, 130], [0, 1], { extrapolateRight: "clamp" })})`,
        transformOrigin: "right",
      }} />
    </AbsoluteFill>
  );
};
