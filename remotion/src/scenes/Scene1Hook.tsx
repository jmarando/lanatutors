import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });

const RED = "#E7422D";
const TEAL = "#1D9DB8";
const CREAM = "#FEF5F4";

export const Scene1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barWidth = interpolate(frame, [0, 15], [0, 100], { extrapolateRight: "clamp" });

  const titleY = interpolate(
    spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 120 } }),
    [0, 1], [80, 0]
  );
  const titleOp = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });

  const subOp = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(
    spring({ frame: frame - 25, fps, config: { damping: 20 } }),
    [0, 1], [40, 0]
  );

  const tagOp = interpolate(frame, [45, 60], [0, 1], { extrapolateRight: "clamp" });

  const photoScale = spring({ frame: frame - 3, fps, config: { damping: 14 } });
  const photoOp = interpolate(frame, [3, 18], [0, 1], { extrapolateRight: "clamp" });

  const circleScale = spring({ frame: frame - 2, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, #FFFFFF 0%, ${CREAM} 50%, #FFF8F6 100%)`,
      fontFamily,
    }}>
      <div style={{
        position: "absolute", right: -150, bottom: -200,
        width: 700, height: 700, borderRadius: "50%",
        background: RED,
        opacity: interpolate(frame, [0, 10], [0, 0.9], { extrapolateRight: "clamp" }),
        transform: `scale(${circleScale})`,
      }} />

      <div style={{
        position: "absolute", right: 200, top: -80,
        width: 250, height: 250, borderRadius: "50%",
        background: RED,
        opacity: interpolate(frame, [5, 15], [0, 0.25], { extrapolateRight: "clamp" }),
        transform: `scale(${spring({ frame: frame - 5, fps, config: { damping: 15 } })})`,
      }} />

      <div style={{
        position: "absolute", top: 0, left: 0,
        width: `${barWidth}%`, height: 6,
        background: `linear-gradient(90deg, ${RED}, ${TEAL})`,
      }} />

      <div style={{
        position: "absolute", right: 80, top: 120,
        width: 550, height: 650,
        borderRadius: 30,
        overflow: "hidden",
        opacity: photoOp,
        transform: `scale(${interpolate(photoScale, [0, 1], [0.85, 1])})`,
        boxShadow: "0 20px 60px rgba(231, 66, 45, 0.2)",
      }}>
        <Img src={staticFile("images/tutor-student.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
        }} />
      </div>

      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "flex-start",
        padding: "0 120px", height: "100%",
        maxWidth: "55%",
      }}>
        <div style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
        }}>
          <div style={{
            fontSize: 28, fontWeight: 700,
            color: RED, letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
          }}>
            INTRODUCING
          </div>
          <div style={{
            fontSize: 100, fontWeight: 800,
            color: "#1A1A1A",
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
            fontSize: 36, fontWeight: 400,
            color: "#444",
            maxWidth: 600,
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
              background: i === 0 ? RED : "transparent",
              border: `2px solid ${i === 0 ? RED : i === 1 ? TEAL : "#CCC"}`,
              color: i === 0 ? "#FFF" : "#333",
              fontSize: 20,
              fontWeight: 700,
              opacity: interpolate(frame, [48 + i * 5, 58 + i * 5], [0, 1], { extrapolateRight: "clamp" }),
              transform: `translateX(${interpolate(
                spring({ frame: frame - 48 - i * 5, fps, config: { damping: 15 } }),
                [0, 1], [-30, 0]
              )}px)`,
            }}>
              {tag}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0,
        width: `${interpolate(frame, [20, 35], [0, 60], { extrapolateRight: "clamp" })}%`,
        height: 6,
        background: RED,
      }} />
    </AbsoluteFill>
  );
};
