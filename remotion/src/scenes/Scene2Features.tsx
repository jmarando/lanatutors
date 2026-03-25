import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

const RED = "#E7422D";
const TEAL = "#1D9DB8";
const CREAM = "#FEF5F4";

const features = [
  { icon: "🛡️", title: "Verified Tutors", desc: "Background-checked from top Kenyan schools" },
  { icon: "📅", title: "Flexible Scheduling", desc: "Book 7 days a week, any time zone" },
  { icon: "🎥", title: "Online & In-Person", desc: "Learn from anywhere via video" },
  { icon: "🎯", title: "All Curricula", desc: "CBC, IGCSE, American & 8-4-4" },
];

export const Scene2Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headY = interpolate(
    spring({ frame, fps, config: { damping: 20 } }),
    [0, 1], [-40, 0]
  );

  // Group photo with subtle zoom
  const photoZoom = interpolate(frame, [0, 210], [1, 1.08]);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, #FFFFFF 0%, ${CREAM} 100%)`,
      fontFamily,
    }}>
      {/* Coral accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 5,
        background: `linear-gradient(90deg, ${RED}, ${TEAL})`,
      }} />

      {/* Coral half-circle left */}
      <div style={{
        position: "absolute", left: -120, top: "50%",
        width: 300, height: 300, borderRadius: "50%",
        background: RED, opacity: 0.12,
        transform: "translateY(-50%)",
      }} />

      {/* Photo strip on left */}
      <div style={{
        position: "absolute", left: 80, top: 100, bottom: 100,
        width: 420, borderRadius: 24, overflow: "hidden",
        opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
        boxShadow: "0 16px 48px rgba(0,0,0,0.1)",
      }}>
        <Img src={staticFile("images/group-students.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${photoZoom})`,
        }} />
      </div>

      {/* Section header */}
      <div style={{
        position: "absolute", top: 100, left: 560, right: 80,
        opacity: headOp,
        transform: `translateY(${headY}px)`,
      }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: RED, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>
          WHY LANA TUTORS
        </div>
      </div>

      {/* Feature cards - 2x2 grid on right */}
      <div style={{
        position: "absolute", top: 190, left: 560, right: 80,
        display: "flex", flexWrap: "wrap", gap: 24,
      }}>
        {features.map((f, i) => {
          const delay = 20 + i * 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
          const cardOp = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const cardY = interpolate(s, [0, 1], [40, 0]);

          return (
            <div key={i} style={{
              width: "calc(50% - 12px)",
              background: "#FFF",
              borderRadius: 20,
              padding: "32px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              borderLeft: `4px solid ${i % 2 === 0 ? RED : TEAL}`,
              opacity: cardOp,
              transform: `translateY(${cardY}px)`,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A", marginBottom: 8 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 16, color: "#666", lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
