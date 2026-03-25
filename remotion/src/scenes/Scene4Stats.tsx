import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });

const RED = "#E7422D";
const TEAL = "#1D9DB8";
const CREAM = "#FEF5F4";

const stats = [
  { value: "50+", label: "Verified Tutors", color: RED },
  { value: "500+", label: "Happy Students", color: TEAL },
  { value: "All", label: "Curricula Covered", color: RED },
];

export const Scene4Stats = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${RED} 0%, #D63A28 100%)`,
      fontFamily,
    }}>
      {/* Photo background with overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.15,
      }}>
        <Img src={staticFile("images/parent-child.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
        }} />
      </div>

      {/* Decorative circles */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: "absolute",
          width: 500 + i * 200,
          height: 500 + i * 200,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.12)",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${spring({
            frame: frame - i * 5, fps, config: { damping: 20 },
          })})`,
        }} />
      ))}

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", gap: 60,
      }}>
        <div style={{
          fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.9)",
          letterSpacing: 6, textTransform: "uppercase",
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          BY THE NUMBERS
        </div>

        <div style={{ display: "flex", gap: 120 }}>
          {stats.map((s, i) => {
            const delay = 10 + i * 12;
            const sp = spring({ frame: frame - delay, fps, config: { damping: 10 } });
            const op = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: "clamp" });
            const scale = interpolate(sp, [0, 1], [0.5, 1]);

            return (
              <div key={i} style={{
                textAlign: "center",
                opacity: op,
                transform: `scale(${scale})`,
              }}>
                <div style={{
                  fontSize: 120, fontWeight: 800, color: "#FFF",
                  lineHeight: 1,
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: 22, color: "rgba(255,255,255,0.9)",
                  fontWeight: 400, marginTop: 12,
                }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
