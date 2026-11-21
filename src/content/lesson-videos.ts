import type { Track } from "../domain/types";
import supplement from "./lesson-videos.json";

type VideoSource = { title: string; provider: string; locator: string };
const sources: Record<string, VideoSource> = supplement.sources;
const lessonVideos: Record<string, string> = supplement.lessons;

export function addLessonVideos(tracks: Track[]): void {
  for (const track of tracks) {
    const attached = new Set<string>();
    for (const lesson of track.modules.flatMap((module) => module.lessons)) {
      const youtubeId = lessonVideos[lesson.id];
      if (lesson.video || !youtubeId) continue;
      const source = sources[youtubeId];
      if (!source) throw new Error(`Unknown YouTube video for ${lesson.id}`);
      const resourceId = `${track.trackId}-youtube-${youtubeId.toLowerCase()}`;
      if (!attached.has(resourceId)) {
        track.resources.push({
          id: resourceId,
          kind: "video",
          title: source.title,
          provider: source.provider,
          url: `https://www.youtube.com/watch?v=${youtubeId}`,
          access: "free",
          license: "Publisher-hosted YouTube video",
          licenseUrl: null,
          redistribution: "link-only",
          downloadUrl: null,
          verifiedOn: supplement.verifiedOn,
          notes: "",
        });
        attached.add(resourceId);
      }
      lesson.video = { resourceId, locator: source.locator };
    }
  }
}
