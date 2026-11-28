// 2D view (pan/zoom) plus a 3D orbit camera used by 3D figures.
import type { Mat } from "./stroke.ts";

export type CamState = {
  /** 2D: centre of view in scene px and zoom. */
  cx: number; cy: number; zoom: number;
  /** 3D orbit: yaw/pitch in radians, distance and focal length (scene units). */
  yaw: number; pitch: number; dist: number; focal: number;
};

export class Camera {
  base: CamState;
  state: CamState;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.base = { cx: width / 2, cy: height / 2, zoom: 1, yaw: -0.6, pitch: 0.55, dist: 9, focal: 7 };
    this.state = { ...this.base };
  }
  reset() { this.state = { ...this.base }; }
  /** Scene px -> output px for an output of width W. */
  matrix(W: number): Mat {
    const k = (W / this.width) * this.state.zoom;
    return [k, 0, 0, k, W / 2 - this.state.cx * k, (W * this.height) / this.width / 2 - this.state.cy * k];
  }

  /** Project a 3D point (y up) to 2D scene coords around `origin`, with `unit` px per scene unit. Returns depth too. */
  project(p: [number, number, number], origin: { x: number; y: number }, unit: number) {
    const s = this.state;
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw), cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
    // yaw around y, then pitch around x
    const x1 = cy * p[0] + sy * p[2];
    const z1 = -sy * p[0] + cy * p[2];
    const y2 = cp * p[1] + sp * z1;
    const z2 = -sp * p[1] + cp * z1;
    const depth = s.dist + z2;
    const f = s.focal / Math.max(0.1, depth);
    return { x: origin.x + x1 * f * unit, y: origin.y - y2 * f * unit, depth, f };
  }
}
