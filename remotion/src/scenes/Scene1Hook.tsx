import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });

const RED = "#ED3F27";
const TEAL = "#1D9DB8";
const CREAM = "#F1EDEA";

export const Scene1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Red bar sweep
  const barWidth = interpolate(frame, [0, 20], [0, 100], { extrapolateRight: "clamp" });

  // Title reveal
  const titleY = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } }),
    [0, 1], [80, 0]
  );
  const titleOp = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });

  // Subtitle
  const subOp = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(
    spring({ frame: frame - 40, fps, config: { damping: 20 } }),
    [0, 1], [40, 0]
  );

  // Tagline
  const tagOp = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });

  // Teal accent circle
  const circleScale = spring({ frame: frame - 5, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 50%, #0D1B2A 100%)`,
      fontFamily,
    }}>
      {/* Red accent bar top */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: `${barWidth}%`, height: 6,
        background: `linear-gradient(90deg, ${RED}, ${TEAL})`,
      }} />

      {/* Teal circle accent */}
      <div style={{
        position: "absolute", right: 120, top: 140,
        width: 400, height: 400, borderRadius: "50%",
        border: `3px solid ${TEAL}`,
        opacity: 0.15,
        transform: `scale(${circleScale})`,
      }} />

      {/* Small red dot */}
      <div style={{
        position: "absolute", left: 180, top: 280,
        width: 16, height: 16, borderRadius: "50%",
        background: RED,
        opacity: interpolate(frame, [15, 25], [0, 0.8], { extrapolateRight: "clamp" }),
        transform: `scale(${spring({ frame: frame - 15, fps, config: { damping: 8 } })})`,
      }} />

      {/* Main content */}
      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "flex-start",
        padding: "0 160px", height: "100%",
      }}>
        <div style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
        }}>
          <div style={{
            fontSize: 28, fontWeight: 700,
            color: TEAL, letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
          }}>
            INTRODUCING
          </div>
          <div style={{
            fontSize: 110, fontWeight: 800,
            color: "#FFFFFF",
            lineHeight: 1,
            marginBottom: 8,
          }}>
            Lana Tutors
          </div>
        </div>

        <div style={{
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          marginTop: 30,
        }}>
          <div style={{
            fontSize: 38, fontWeight: 400,
            color: CREAM,
            maxWidth: 800,
            lineHeight: 1.4,
          }}>
            Your Trusted Tutoring Partner
          </div>
        </div>

        <div style={{
          opacity: tagOp,
          marginTop: 30,
          display: "flex", gap: 16,
        }}>
          {["Online", "Verified", "Personalized"].map((tag, i) => (
            <div key={i} style={{
              padding: "10px 28px",
              borderRadius: 50,
              border: `2px solid ${i === 0 ? RED : i === 1 ? TEAL : "#555"}`,
              color: "#FFF",
              fontSize: 20,
              fontWeight: 700,
              opacity: interpolate(frame, [75 + i * 8, 90 + i * 8], [0, 1], { extrapolateRight: "clamp" }),
              transform: `translateX(${interpolate(
                spring({ frame: frame - 75 - i * 8, fps, config: { damping: 15 } }),
                [0, 1], [-30, 0]
              )}px)`,
            }}>
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* Red accent bar bottom */}
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: `${interpolate(frame, [30, 50], [0, 60], { extrapolateRight: "clamp" })}%`,
        height: 6,
        background: RED,
      }} />
    </AbsoluteFill>
  );
};
