import { Composition } from "remotion";
import { Poster1Feed } from "./posters/Poster1Feed";
import { Poster2Story } from "./posters/Poster2Story";
import { Poster3Display } from "./posters/Poster3Display";
import { Poster4Feed } from "./posters/Poster4Feed";
import { Poster5Story } from "./posters/Poster5Story";
import { Poster6Feed } from "./posters/Poster6Feed";

export const PosterRoot = () => (
  <>
    <Composition
      id="april-poster-1-feed"
      component={Poster1Feed}
      durationInFrames={1}
      fps={1}
      width={1080}
      height={1080}
    />
    <Composition
      id="april-poster-2-story"
      component={Poster2Story}
      durationInFrames={1}
      fps={1}
      width={1080}
      height={1920}
    />
    <Composition
      id="april-poster-3-display"
      component={Poster3Display}
      durationInFrames={1}
      fps={1}
      width={1200}
      height={628}
    />
    <Composition
      id="april-poster-4-feed"
      component={Poster4Feed}
      durationInFrames={1}
      fps={1}
      width={1080}
      height={1080}
    />
    <Composition
      id="april-poster-5-story"
      component={Poster5Story}
      durationInFrames={1}
      fps={1}
      width={1080}
      height={1920}
    />
    <Composition
      id="april-poster-6-feed"
      component={Poster6Feed}
      durationInFrames={1}
      fps={1}
      width={1080}
      height={1080}
    />
  </>
);
