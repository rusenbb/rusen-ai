export type Point = readonly [number, number];
export const WIDTH = 640;
export const HEIGHT = 360;
export const DEFAULT_YAW = 42;
export const DEFAULT_PITCH = 16;
export function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function createProjection(
  width: number,
  height: number,
  yaw: number,
  pitch: number,
  depth: number,
  zoom = 1,
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
    return [width / 2 + rx * scale * zoom, height / 2 + ry * scale * zoom];
  };
}
