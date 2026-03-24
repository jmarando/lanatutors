import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

const RED = "#ED3F27";
const TEAL = "#1D9DB8";

const testimonials = [
  { name: "Sarah W.", grade: "Form 4", quote: "My Chemistry went from D+ to B in 2 months!", stars: 5 },
  { name: "David O.", grade: "Form 3", quote: "Online classes are so convenient. My tutor makes Math fun!", stars: 5 },
  { name: "Brian K.", grade: "Grade 8", quote: "I'm now confident in all my subjects!", stars: 5 },
];

export const Scene3Users = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0D1B2A 0%, #1A1A1A 100%)",
      fontFamily,
    }}>
      {/* Header */}
      <div style={{
        position: "absolute", top: 70, left: 0, right: 0,
        textAlign: "center",
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(
          spring({ frame, fps, config: { damping: 20 } }), [0, 1], [-30, 0]
        )}px)`,
      }}>
        <div style={{ fontSize: 22, color: TEAL, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
          REAL RESULTS
        </div>
        <div style={{ fontSize: 60, fontWeight: 800, color: "#FFF" }}>
          Happy Students
        </div>
      </div>

      {/* Testimonial cards */}
      <div style={{
        position: "absolute", top: 300, left: 100, right: 100,
        display: "flex", gap: 40,
      }}>
        {testimonials.map((t, i) => {
          const delay = 25 + i * 20;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
          const op = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const x = interpolate(s, [0, 1], [i === 0 ? -80 : i === 2 ? 80 : 0, 0]);
          const scale = interpolate(s, [0, 1], [0.85, 1]);

          return (
            <div key={i} style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: "44px 36px",
              opacity: op,
              transform: `translateX(${x}px) scale(${scale})`,
            }}>
              {/* Stars */}
              <div style={{ fontSize: 24, marginBottom: 20, letterSpacing: 4 }}>
                {"⭐".repeat(t.stars)}
              </div>
              {/* Quote */}
              <div style={{
                fontSize: 24, color: "#FFF", lineHeight: 1.6,
                fontWeight: 400, marginBottom: 28,
                fontStyle: "italic",
              }}>
                "{t.quote}"
              </div>
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: i === 0 ? RED : i === 1 ? TEAL : "#555",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFF", fontSize: 20, fontWeight: 700,
                }}>
                  {t.name[0]}
                </div>
                <div>
                  <div style={{ color: "#FFF", fontWeight: 700, fontSize: 20 }}>{t.name}</div>
                  <div style={{ color: "#888", fontSize: 16 }}>{t.grade}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
