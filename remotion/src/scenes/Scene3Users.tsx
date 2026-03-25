import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

const RED = "#E7422D";
const TEAL = "#1D9DB8";
const CREAM = "#FEF5F4";

const testimonials = [
  { name: "Sarah W.", grade: "Form 4", quote: "My Chemistry went from D+ to B in 2 months!", photo: "student1.jpg" },
  { name: "David O.", grade: "Form 3", quote: "Online classes are so convenient. My tutor makes Math fun!", photo: "student2.jpg" },
  { name: "Brian K.", grade: "Grade 8", quote: "I'm now confident in all my subjects!", photo: "student3.jpg" },
];

export const Scene3Users = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${CREAM} 0%, #FFFFFF 50%, ${CREAM} 100%)`,
      fontFamily,
    }}>
      {/* Coral circle accent */}
      <div style={{
        position: "absolute", right: -100, bottom: -100,
        width: 500, height: 500, borderRadius: "50%",
        background: RED, opacity: 0.08,
      }} />

      {/* Header */}
      <div style={{
        position: "absolute", top: 70, left: 0, right: 0,
        textAlign: "center",
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(
          spring({ frame, fps, config: { damping: 20 } }), [0, 1], [-30, 0]
        )}px)`,
      }}>
        <div style={{ fontSize: 22, color: RED, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
          REAL RESULTS
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#1A1A1A" }}>
          Happy Students
        </div>
      </div>

      {/* Testimonial cards with photos */}
      <div style={{
        position: "absolute", top: 280, left: 100, right: 100,
        display: "flex", gap: 36,
      }}>
        {testimonials.map((t, i) => {
          const delay = 25 + i * 18;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
          const op = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const y = interpolate(s, [0, 1], [50, 0]);

          return (
            <div key={i} style={{
              flex: 1,
              background: "#FFF",
              border: "1px solid #EEE",
              borderRadius: 24,
              padding: "0",
              opacity: op,
              transform: `translateY(${y}px)`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}>
              {/* Student photo */}
              <div style={{ width: "100%", height: 280, overflow: "hidden" }}>
                <Img src={staticFile(`images/${t.photo}`)} style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  transform: `scale(${interpolate(frame, [delay, delay + 60], [1.1, 1], { extrapolateRight: "clamp" })})`,
                }} />
              </div>
              <div style={{ padding: "28px 32px" }}>
                {/* Stars */}
                <div style={{ fontSize: 20, marginBottom: 12, letterSpacing: 2 }}>
                  ⭐⭐⭐⭐⭐
                </div>
                {/* Quote */}
                <div style={{
                  fontSize: 20, color: "#333", lineHeight: 1.5,
                  fontWeight: 400, marginBottom: 16,
                  fontStyle: "italic",
                }}>
                  &ldquo;{t.quote}&rdquo;
                </div>
                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ color: "#1A1A1A", fontWeight: 700, fontSize: 18 }}>{t.name}</div>
                  <div style={{ color: RED, fontSize: 14, fontWeight: 600 }}>• {t.grade}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
