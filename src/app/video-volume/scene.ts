export type Point = readonly [number, number];
export type Kind = "car" | "person";
export type Track = { id: string; kind: Kind; color: string; points: Point[] };
export const DURATION = 8;
export const WIDTH = 640;
export const HEIGHT = 320;
export const DEFAULT_YAW = 42;
export const DEFAULT_PITCH = 16;

export function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

/** Deliberately authored tracks, not predictions from a segmentation model. */
export function tracksAt(time: number): Track[] {
  const t = clamp(time);
  const car = (id: string, x: number, y: number, color: string): Track => ({
    id,
    kind: "car",
    color,
    points: [
      [x, y],
      [x + 7, y - 18],
      [x + 31, y - 22],
      [x + 47, y - 43],
      [x + 92, y - 43],
      [x + 112, y - 22],
      [x + 137, y - 16],
      [x + 141, y],
      [x + 122, y + 3],
      [x + 119, y + 12],
      [x + 101, y + 12],
      [x + 97, y + 3],
      [x + 39, y + 3],
      [x + 35, y + 12],
      [x + 17, y + 12],
      [x + 13, y + 3],
    ],
  });
  const person = (
    id: string,
    x: number,
    y: number,
    phase: number,
    color: string,
  ): Track => {
    const stride = Math.sin(t * Math.PI * 12 + phase) * 10;
    return {
      id,
      kind: "person",
      color,
      points: [
        [x - 6, y - 63],
        [x - 8, y - 72],
        [x - 4, y - 79],
        [x + 4, y - 79],
        [x + 8, y - 72],
        [x + 6, y - 63],
        [x + 13, y - 57],
        [x + 17 + stride * 0.3, y - 34],
        [x + 11 + stride * 0.3, y - 30],
        [x + 7, y - 46],
        [x + 8, y - 28],
        [x + 12 + stride, y - 3],
        [x + 7 + stride, y],
        [x, y - 21],
        [x - 7 - stride, y],
        [x - 12 - stride, y - 3],
        [x - 7, y - 28],
        [x - 7, y - 46],
        [x - 11 - stride * 0.3, y - 32],
        [x - 17 - stride * 0.3, y - 35],
        [x - 13, y - 57],
      ],
    };
  };
  return [
    car("Car 1", 20 + t * 370, 224, "#6ee7cb"),
    car("Car 2", 452 - t * 385, 270, "#f2a6d0"),
    car("Car 3 · parked", 285, 193, "#bde584"),
    person("Person 1", 55 + t * 245, 184, 0, "#f4cc76"),
    person("Person 2", 570 - t * 230, 187, 2, "#a6b5ff"),
    person("Person 3", 410 - t * 75, 300, 4, "#91d8ed"),
  ];
}

export function matchingKinds(query: string): Kind[] {
  const word = query.trim().toLowerCase();
  if (!word || word === "all" || word === "everything")
    return ["car", "person"];
  if (
    ["car", "cars", "vehicle", "vehicles", "araba", "arabalar"].includes(word)
  )
    return ["car"];
  if (
    ["person", "people", "pedestrian", "pedestrians", "insan", "yaya"].includes(
      word,
    )
  )
    return ["person"];
  return [];
}

export function createProjection(
  width: number,
  height: number,
  yaw: number,
  pitch: number,
  depth: number,
) {
  const a = (yaw * Math.PI) / 180;
  const b = (pitch * Math.PI) / 180;
  const raw = (x: number, y: number, t: number): Point => {
    const z = (t - 0.5) * depth;
    const rx = (x - WIDTH / 2) * Math.cos(a) + z * Math.sin(a);
    const rz = -(x - WIDTH / 2) * Math.sin(a) + z * Math.cos(a);
    return [rx, (y - HEIGHT / 2) * Math.cos(b) - rz * Math.sin(b)];
  };
  const corners = [0, WIDTH].flatMap((x) =>
    [0, HEIGHT].flatMap((y) => [0, 1].map((t) => raw(x, y, t))),
  );
  const spanX =
    Math.max(...corners.map((p) => p[0])) -
    Math.min(...corners.map((p) => p[0]));
  const spanY =
    Math.max(...corners.map((p) => p[1])) -
    Math.min(...corners.map((p) => p[1]));
  const scale = Math.min((width - 44) / spanX, (height - 72) / spanY);
  return (x: number, y: number, t: number): Point => {
    const [rx, ry] = raw(x, y, t);
    return [width / 2 + rx * scale, height / 2 + ry * scale];
  };
}
