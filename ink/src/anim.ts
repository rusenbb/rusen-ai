// Animations. Each one is a pure function of progress applied to node state,
// so any frame can be rendered on its own (seek, snapshot, undo all work).
import type { Node, State } from "./node.ts";
import type { Camera } from "./camera.ts";
import { type Vec, arcLengths } from "./geom.ts";

export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  smooth: (t: number) => t * t * (3 - 2 * t),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  /** A hand drawing: quick start, steady middle, slows to land. */
  pen: (t: number) => {
    const a = 0.12, b = 0.85;
    if (t < a) return (t * t) / (2 * a) / (1 - a / 2 - (1 - b) / 2);
    if (t < b) return (a / 2 + (t - a)) / (1 - a / 2 - (1 - b) / 2);
    const u = t - b;
    return (a / 2 + (b - a) + u - (u * u) / (2 * (1 - b))) / (1 - a / 2 - (1 - b) / 2);
  },
};

export type Anim = {
  kind: string;
  targets: Node[];
  /** Preferred duration in seconds if the play() call doesn't set one. */
  duration: number;
  ease: Ease;
  /** Node is introduced by this animation (not visible before it starts). */
  introduces?: boolean;
  removes?: boolean;
  /** Nodes taken off the page when this starts / put on it when it ends (morph). */
  hideAtStart?: Node[];
  showAtEnd?: Node[];
  apply(p: number): void;
};

type Opts = { duration?: number; ease?: Ease };

/** Ink speed in px/s used to pace draw() when no duration is given. */
export const PEN_SPEED = 900;

export function draw(n: Node, o: Opts & { speed?: number } = {}): Anim {
  const speed = o.speed ?? PEN_SPEED;
  const dur = o.duration ?? Math.max(0.4, (n.inkLength() * n.base.scale) / speed + n.strokeCount() * 0.012);
  return {
    kind: "draw", targets: [n], duration: dur, ease: o.ease ?? ease.linear, introduces: true,
    apply: (p) => { n.state.drawn = p; },
  };
}

/** Pen runs backwards: the ink is lifted off the page. */
export function undraw(n: Node, o: Opts = {}): Anim {
  return {
    kind: "undraw", targets: [n], duration: o.duration ?? 1, ease: o.ease ?? ease.smooth, removes: true,
    apply: (p) => { n.state.drawn *= 1 - p; },
  };
}

export function fadeIn(n: Node, o: Opts = {}): Anim {
  return { kind: "fadeIn", targets: [n], duration: o.duration ?? 0.8, ease: o.ease ?? ease.smooth, introduces: true, apply: (p) => { n.state.opacity *= p; } };
}

export function fadeOut(n: Node, o: Opts = {}): Anim {
  return { kind: "fadeOut", targets: [n], duration: o.duration ?? 0.8, ease: o.ease ?? ease.smooth, removes: true, apply: (p) => { n.state.opacity *= 1 - p; } };
}

function tween(kind: string, n: Node, to: Partial<State>, o: Opts): Anim {
  return {
    kind, targets: [n], duration: o.duration ?? 1, ease: o.ease ?? ease.inOut,
    apply: (p) => {
      const s = n.state as Record<string, unknown>;
      for (const [k, v] of Object.entries(to)) {
        if (typeof v === "number") s[k] = (s[k] as number) + (v - (s[k] as number)) * p;
      }
    },
  };
}

export const moveTo = (n: Node, x: number, y: number, o: Opts = {}) => tween("moveTo", n, { x, y }, o);
export const shift = (n: Node, dx: number, dy: number, o: Opts = {}): Anim => ({
  kind: "shift", targets: [n], duration: o.duration ?? 1, ease: o.ease ?? ease.inOut,
  apply: (p) => { n.state.x += dx * p; n.state.y += dy * p; },
});
export const scaleTo = (n: Node, s: number, o: Opts = {}) => tween("scaleTo", n, { scale: s }, o);
export const rotateTo = (n: Node, r: number, o: Opts = {}) => tween("rotateTo", n, { rotation: r }, o);
export const opacityTo = (n: Node, a: number, o: Opts = {}) => tween("opacityTo", n, { opacity: a }, o);

/** Re-ink a node in another colour, blending smoothly; null returns it to its own inks. */
export function recolor(n: Node, color: string | null, o: Opts = {}): Anim {
  return {
    kind: "recolor", targets: [n], duration: o.duration ?? 0.6, ease: o.ease ?? ease.smooth,
    apply: (p) => {
      const st = n.state;
      if (color) {
        // blend from whatever tint it had (none = its own ink)
        const from = st.color && st.color !== color ? null : st.color ? st.tint : 0;
        if (from === null) { st.tint = 1 - p; if (p >= 0.5) { st.color = color; st.tint = (p - 0.5) * 2; } else st.tint = 1 - p * 2; }
        else { st.color = color; st.tint = from + (1 - from) * p; }
      } else if (st.color) st.tint *= 1 - p;
    },
  };
}

/** Briefly scale up and back, optionally in red, to point at something. */
export function indicate(n: Node, o: Opts & { color?: string; amount?: number } = {}): Anim {
  const amt = o.amount ?? 0.12;
  return {
    kind: "indicate", targets: [n], duration: o.duration ?? 0.9, ease: o.ease ?? ease.linear,
    apply: (p) => {
      const b = Math.sin(Math.PI * p);
      n.state.scale *= 1 + amt * b;
      if (o.color && p > 0.05 && p < 0.95) n.state.color = o.color;
    },
  };
}

/** Move/zoom the 2D camera, and orbit the 3D one. */
export function cameraTo(cam: Camera, to: Partial<Camera["base"]>, o: Opts = {}): Anim {
  return {
    kind: "camera", targets: [], duration: o.duration ?? 1.5, ease: o.ease ?? ease.inOut,
    apply: (p) => {
      const s = cam.state as Record<string, number>;
      for (const [k, v] of Object.entries(to)) if (typeof v === "number") s[k] = s[k] + (v - s[k]) * p;
    },
  };
}

/** Anything else: a callback that sets state from progress. */
export function custom(targets: Node[], apply: (p: number) => void, o: Opts = {}): Anim {
  return { kind: "custom", targets, duration: o.duration ?? 1, ease: o.ease ?? ease.inOut, apply };
}

/** Apply one animation to many nodes at once: s.play(...each(nodes, fadeOut)). */
export const each = (nodes: Node[], f: (n: Node) => Anim): Anim[] => nodes.map((n) => f(n));

/** Draw only part of a node (e.g. a bar that fills to 30 %). */
export function drawTo(n: Node, to: number, o: Opts & { from?: number } = {}): Anim {
  const from = o.from ?? 0;
  return { kind: "drawTo", targets: [n], duration: o.duration ?? 1, ease: o.ease ?? ease.smooth, introduces: from === 0, apply: (p) => { n.state.drawn = from + (to - from) * p; } };
}

/** Move a node along a path (scene coordinates), at constant speed. */
export function moveAlong(n: Node, path: Vec[], o: Opts = {}): Anim {
  const L = arcLengths(path);
  const total = L[L.length - 1] || 1;
  return {
    kind: "moveAlong", targets: [n], duration: o.duration ?? 2, ease: o.ease ?? ease.linear,
    apply: (p) => {
      const target = p * total;
      let i = 1;
      while (i < L.length - 1 && L[i] < target) i++;
      const t = (target - L[i - 1]) / (L[i] - L[i - 1] || 1);
      n.state.x = path[i - 1].x + (path[i].x - path[i - 1].x) * t;
      n.state.y = path[i - 1].y + (path[i].y - path[i - 1].y) * t;
    },
  };
}
