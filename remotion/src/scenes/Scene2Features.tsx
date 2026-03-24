import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

const RED = "#ED3F27";
const TEAL = "#1D9DB8";

const features = [
  { icon: "🛡️", title: "Verified Tutors", desc: "Background-checked teachers from top Kenyan schools" },
  { icon: "📅", title: "Flexible Scheduling", desc: "Book sessions 7 days a week, any time zone" },
  { icon: "🎥", title: "Online & In-Person", desc: "Learn from anywhere via video or meet in Kenya" },
  { icon: "🎯", title: "Personalized Plans", desc: "CBC, IGCSE, American & 8-4-4 curricula" },
];

export const Scene2Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headY = interpolate(
    spring({ frame, fps, config: { damping: 20 } }),
    [0, 1], [-40, 0]
  );

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(160deg, #FFFFFF 0%, #F8F6F4 100%)",
      fontFamily,
    }}>
      {/* Teal accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 5,
        background: `linear-gradient(90deg, ${TEAL}, ${RED})`,
      }} />

      {/* Section header */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0,
        textAlign: "center",
        opacity: headOp,
        transform: `translateY(${headY}px)`,
      }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: TEAL, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>
          WHY LANA TUTORS
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: "#1A1A1A" }}>
          Key Features
        </div>
      </div>

      {/* Feature cards grid */}
      <div style={{
        position: "absolute", top: 300, left: 120, right: 120,
        display: "flex", gap: 36,
      }}>
        {features.map((f, i) => {
          const delay = 30 + i * 18;
          const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
          const cardOp = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const cardY = interpolate(s, [0, 1], [60, 0]);
          const cardScale = interpolate(s, [0, 1], [0.9, 1]);

          return (
            <div key={i} style={{
              flex: 1,
              background: "#FFF",
              borderRadius: 20,
              padding: "48px 32px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
              border: `2px solid ${i === 0 ? RED : i === 1 ? TEAL : "#EEE"}`,
              opacity: cardOp,
              transform: `translateY(${cardY}px) scale(${cardScale})`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>{f.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", marginBottom: 12 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 18, color: "#666", lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
