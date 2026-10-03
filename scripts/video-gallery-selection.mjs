/** Select whole predicted tracks by observation count; never synthesize a missing mask. */
export function selectPersistentTracks(data, minimumObservations = 0) {
  const tracks = new Map();
  for (const frame of data.frames)
    for (const object of frame.objects) {
      const track = tracks.get(object.id) ?? {
        id: object.id,
        label: object.label,
        observations: 0,
      };
      track.observations++;
      tracks.set(object.id, track);
    }
  const excluded = [...tracks.values()].filter(
    (track) => track.observations < minimumObservations,
  );
  const ids = new Set(excluded.map((track) => track.id));
  data.trackSelection = { minimumObservations, excluded };
  for (const frame of data.frames)
    frame.objects = frame.objects.filter((object) => !ids.has(object.id));
  return data;
}
