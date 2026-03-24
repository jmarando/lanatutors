import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Features } from "./scenes/Scene2Features";
import { Scene3Users } from "./scenes/Scene3Users";
import { Scene4Stats } from "./scenes/Scene4Stats";
import { Scene5CTA } from "./scenes/Scene5CTA";

const BRAND = {
  red: "#ED3F27",
  teal: "#1D9DB8",
  cream: "#F1EDEA",
  dark: "#1A1A1A",
  white: "#FFFFFF",
};

export const MainVideo = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.dark }}>
      {/* Persistent animated background shapes */}
      <AbsoluteFill style={{ overflow: "hidden", opacity: 0.08 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const size = 300 + i * 120;
          const x = interpolate(
            frame,
            [0, 900],
            [200 + i * 300, 400 + i * 250]
          );
          const y = interpolate(
            frame,
            [0, 900],
            [100 + i * 150, 300 + i * 100]
          );
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: "50%",
                background: i % 2 === 0 ? BRAND.red : BRAND.teal,
                left: x,
                top: y,
                filter: "blur(80px)",
              }}
            />
          );
        })}
      </AbsoluteFill>

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene2Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene3Users />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4Stats />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={265}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
