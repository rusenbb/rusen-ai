import manifest from "@/content/video-volume.json";
/** Gallery metadata is bundled; media and predictions load only for the selected clip. */
export const videoVolumeClips = manifest.map((clip) => {
  if (
    !/^[a-z]+$/.test(clip.id) ||
    !clip.title ||
    !clip.author ||
    !clip.license ||
    !clip.source.startsWith("https://commons.wikimedia.org/wiki/File:") ||
    !clip.licenseUrl.startsWith("https://creativecommons.org/licenses/") ||
    clip.width !== 640 ||
    clip.height !== 360 ||
    clip.fps !== 12 ||
    clip.frameCount !== 36 ||
    clip.duration !== 3 ||
    !clip.labels.length ||
    ![clip.video, clip.poster, clip.atlas, clip.analysis].every((path) =>
      path.startsWith(`/video-volume/${clip.id}/`),
    )
  )
    throw new Error(`Invalid video gallery metadata: ${clip.id}`);
  return clip;
});
