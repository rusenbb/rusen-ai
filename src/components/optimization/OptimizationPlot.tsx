"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  clamp,
  lerp,
  mapToRange,
  sampleObjectiveGrid,
  type GridSample,
  type Objective2D,
  type SimulationTrace,
  type TraceFrame,
  type Vector,
} from "@/lib/optimization";

export type PlotMode = "surface" | "contour";
export type SurfaceInteractionMode = "navigate" | "drop";

interface OptimizationPlotProps {
  objective: Objective2D;
  traces: SimulationTrace[];
  playhead: number;
  mode: PlotMode;
  height?: number;
  onStartChange?: (point: Vector) => void;
  onDropComplete?: () => void;
  focusedOptimizerId?: string;
  interactionMode?: SurfaceInteractionMode;
}

type ContourViewport = {
  x: [number, number];
  y: [number, number];
};

type ThemePalette = {
  background: string;
  border: string;
  accent: string;
  cool: string;
  warm: string;
  meshOpacity: number;
  floor: string;
  gridLine: string;
  text: string;
};

const SURFACE_WIDTH = 8;
const SURFACE_DEPTH = 8;
const SURFACE_HEIGHT = 3.4;

function createFullContourViewport(objective: Objective2D): ContourViewport {
  return {
    x: [...objective.domain.x],
    y: [...objective.domain.y],
  };
}

function clampViewportToDomain(
  objective: Objective2D,
  viewport: ContourViewport,
): ContourViewport {
  const fullWidth = objective.domain.x[1] - objective.domain.x[0];
  const fullHeight = objective.domain.y[1] - objective.domain.y[0];
  const width = clamp(viewport.x[1] - viewport.x[0], fullWidth * 0.12, fullWidth);
  const height = clamp(
    viewport.y[1] - viewport.y[0],
    fullHeight * 0.12,
    fullHeight,
  );
  const centerX = clamp(
    (viewport.x[0] + viewport.x[1]) / 2,
    objective.domain.x[0] + width / 2,
    objective.domain.x[1] - width / 2,
  );
  const centerY = clamp(
    (viewport.y[0] + viewport.y[1]) / 2,
    objective.domain.y[0] + height / 2,
    objective.domain.y[1] - height / 2,
  );

  return {
    x: [centerX - width / 2, centerX + width / 2],
    y: [centerY - height / 2, centerY + height / 2],
  };
}

function canUseWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

function useThemePalette(): ThemePalette {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark
    ? {
        background: "#0b0e12",
        border: "rgba(120, 130, 148, 0.38)",
        accent: "#f6d3a1",
        cool: "#5eead4",
        warm: "#f59e0b",
        meshOpacity: 0.92,
        floor: "#121823",
        gridLine: "rgba(161, 174, 194, 0.18)",
        text: "#f5f3ee",
      }
    : {
        background: "#f8f4ec",
        border: "rgba(142, 114, 84, 0.24)",
        accent: "#81522e",
        cool: "#115e59",
        warm: "#b45309",
        meshOpacity: 0.95,
        floor: "#efe4d1",
        gridLine: "rgba(91, 61, 37, 0.12)",
        text: "#24160f",
      };
}

function objectiveToWorld(
  objective: Objective2D,
  grid: GridSample,
  point: Vector,
  value: number,
): Vector {
  const x = mapToRange(
    point[0] ?? 0,
    objective.domain.x[0],
    objective.domain.x[1],
    -SURFACE_WIDTH / 2,
    SURFACE_WIDTH / 2,
  );
  const y = mapToRange(
    point[1] ?? 0,
    objective.domain.y[0],
    objective.domain.y[1],
    -SURFACE_DEPTH / 2,
    SURFACE_DEPTH / 2,
  );
  const z = mapToRange(
    value,
    grid.min,
    grid.max,
    -SURFACE_HEIGHT * 0.5,
    SURFACE_HEIGHT * 0.5,
  );
  return [x, y, z];
}

function worldToObjective(objective: Objective2D, point: THREE.Vector3): Vector {
  return [
    mapToRange(point.x, -SURFACE_WIDTH / 2, SURFACE_WIDTH / 2, objective.domain.x[0], objective.domain.x[1]),
    mapToRange(point.y, -SURFACE_DEPTH / 2, SURFACE_DEPTH / 2, objective.domain.y[0], objective.domain.y[1]),
  ];
}

function valueToColor(value: number, min: number, max: number, palette: ThemePalette): THREE.Color {
  const t = clamp((value - min) / Math.max(1e-9, max - min), 0, 1);
  const shadow = new THREE.Color(palette.cool);
  const mid = new THREE.Color(palette.background);
  const highlight = new THREE.Color(palette.warm);
  const color = t < 0.5 ? shadow.clone().lerp(mid, t * 2) : mid.clone().lerp(highlight, (t - 0.5) * 2);
  return color;
}

function valueToCss(value: number, min: number, max: number): string {
  const t = clamp((value - min) / Math.max(1e-9, max - min), 0, 1);
  const hue = lerp(178, 24, t);
  const lightness = lerp(38, 62, 1 - t * 0.25);
  const saturation = lerp(58, 80, 1 - Math.abs(t - 0.5));
  return `hsl(${hue}deg ${saturation}% ${lightness}%)`;
}

function frameAt(trace: SimulationTrace, playhead: number): TraceFrame {
  const index = Math.min(
    trace.frames.length - 1,
    Math.max(0, Math.round(playhead * Math.max(0, trace.frames.length - 1))),
  );
  return trace.frames[index] ?? trace.frames[trace.frames.length - 1]!;
}

function buildContourLines(
  canvas: CanvasRenderingContext2D,
  grid: GridSample,
  width: number,
  height: number,
  palette: ThemePalette,
): void {
  const levels = 10;
  const thresholdStep = (grid.max - grid.min) / levels;

  canvas.lineWidth = 1;
  canvas.strokeStyle = palette.gridLine;

  for (let levelIndex = 1; levelIndex < levels; levelIndex += 1) {
    const threshold = grid.min + thresholdStep * levelIndex;
    canvas.beginPath();

    for (let row = 0; row < grid.values.length - 1; row += 1) {
      for (let col = 0; col < (grid.values[row]?.length ?? 0) - 1; col += 1) {
        const topLeft = grid.values[row]?.[col] ?? threshold;
        const topRight = grid.values[row]?.[col + 1] ?? threshold;
        const bottomLeft = grid.values[row + 1]?.[col] ?? threshold;
        const bottomRight = grid.values[row + 1]?.[col + 1] ?? threshold;
        const mask =
          (topLeft > threshold ? 1 : 0) |
          (topRight > threshold ? 2 : 0) |
          (bottomRight > threshold ? 4 : 0) |
          (bottomLeft > threshold ? 8 : 0);

        if (mask === 0 || mask === 15) continue;

        const x0 = (col / (grid.values.length - 1)) * width;
        const y0 = (row / (grid.values.length - 1)) * height;
        const x1 = ((col + 1) / (grid.values.length - 1)) * width;
        const y1 = ((row + 1) / (grid.values.length - 1)) * height;

        switch (mask) {
          case 1:
          case 14:
            canvas.moveTo(x0, (y0 + y1) / 2);
            canvas.lineTo((x0 + x1) / 2, y0);
            break;
          case 2:
          case 13:
            canvas.moveTo((x0 + x1) / 2, y0);
            canvas.lineTo(x1, (y0 + y1) / 2);
            break;
          case 3:
          case 12:
            canvas.moveTo(x0, (y0 + y1) / 2);
            canvas.lineTo(x1, (y0 + y1) / 2);
            break;
          case 4:
          case 11:
            canvas.moveTo(x1, (y0 + y1) / 2);
            canvas.lineTo((x0 + x1) / 2, y1);
            break;
          case 5:
            canvas.moveTo(x0, (y0 + y1) / 2);
            canvas.lineTo((x0 + x1) / 2, y0);
            canvas.moveTo(x1, (y0 + y1) / 2);
            canvas.lineTo((x0 + x1) / 2, y1);
            break;
          case 6:
          case 9:
            canvas.moveTo((x0 + x1) / 2, y0);
            canvas.lineTo((x0 + x1) / 2, y1);
            break;
          case 7:
          case 8:
            canvas.moveTo(x0, (y0 + y1) / 2);
            canvas.lineTo((x0 + x1) / 2, y1);
            break;
          case 10:
            canvas.moveTo((x0 + x1) / 2, y0);
            canvas.lineTo(x0, (y0 + y1) / 2);
            canvas.moveTo(x1, (y0 + y1) / 2);
            canvas.lineTo((x0 + x1) / 2, y1);
            break;
        }
      }
    }
    canvas.stroke();
  }
}

export default function OptimizationPlot({
  objective,
  traces,
  playhead,
  mode,
  height = 560,
  onStartChange,
  onDropComplete,
  focusedOptimizerId,
  interactionMode = "drop",
}: OptimizationPlotProps) {
  const palette = useThemePalette();
  const grid = useMemo(() => sampleObjectiveGrid(objective, 72), [objective]);
  const surfaceHostRef = useRef<HTMLDivElement>(null);
  const contourCanvasRef = useRef<HTMLCanvasElement>(null);
  const resourcesRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
    dynamicGroup: THREE.Group;
    resizeObserver: ResizeObserver;
    animationFrame: number;
  } | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const [canvasRect, setCanvasRect] = useState({ width: 0, height });
  const [surfaceSupported] = useState(canUseWebGL);
  const [surfaceFailed, setSurfaceFailed] = useState(false);
  const [contourViewport, setContourViewport] = useState<ContourViewport>(
    () => createFullContourViewport(objective),
  );
  const contourDragRef = useRef<{
    mode: SurfaceInteractionMode;
    startClientX: number;
    startClientY: number;
    viewport: ContourViewport;
  } | null>(null);
  const effectiveMode: PlotMode =
    mode === "surface" && surfaceSupported && !surfaceFailed
      ? "surface"
      : "contour";
  const contourObjective = useMemo(
    () => ({ ...objective, domain: contourViewport }),
    [contourViewport, objective],
  );
  const contourGrid = useMemo(
    () => sampleObjectiveGrid(contourObjective, 72),
    [contourObjective],
  );
  const contourAtFullDomain =
    contourViewport.x[0] === objective.domain.x[0] &&
    contourViewport.x[1] === objective.domain.x[1] &&
    contourViewport.y[0] === objective.domain.y[0] &&
    contourViewport.y[1] === objective.domain.y[1];

  useEffect(() => {
    setContourViewport(createFullContourViewport(objective));
  }, [objective]);

  const updateStartFromCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = contourCanvasRef.current;
      if (!canvas || !onStartChange) return;
      const rect = canvas.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);
      onStartChange([
        lerp(contourViewport.x[0], contourViewport.x[1], x),
        lerp(contourViewport.y[1], contourViewport.y[0], y),
      ]);
    },
    [contourViewport.x, contourViewport.y, onStartChange],
  );

  useEffect(() => {
    if (effectiveMode !== "surface") return;
    const host = surfaceHostRef.current;
    if (!host) return;

    try {
      host.innerHTML = "";
      const width = host.clientWidth || 800;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(palette.background);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(7.2, -7.8, 5.6);
      camera.up.set(0, 0, 1);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.target.set(0, 0, -0.2);
      controls.minDistance = 6;
      controls.maxDistance = 18;

      const ambient = new THREE.HemisphereLight("#fffdf8", "#1c222f", 1.4);
      scene.add(ambient);
      const directional = new THREE.DirectionalLight("#ffffff", 1.3);
      directional.position.set(8, -10, 9);
      scene.add(directional);

      const plane = new THREE.PlaneGeometry(
        SURFACE_WIDTH,
        SURFACE_DEPTH,
        grid.values.length - 1,
        grid.values.length - 1,
      );
      const colors = new Float32Array((grid.values.length * grid.values.length) * 3);
      const positions = plane.attributes.position as THREE.BufferAttribute;

      let colorIndex = 0;
      for (let row = 0; row < grid.values.length; row += 1) {
        const y = grid.yValues[row] ?? 0;
        for (let col = 0; col < grid.values[row]!.length; col += 1) {
          const x = grid.xValues[col] ?? 0;
          const value = grid.values[row]?.[col] ?? 0;
          const world = objectiveToWorld(objective, grid, [x, y], value);
          const vertexIndex = row * grid.values.length + col;
          positions.setXYZ(
            vertexIndex,
            world[0] ?? 0,
            world[1] ?? 0,
            world[2] ?? 0,
          );
          const color = valueToColor(value, grid.min, grid.max, palette);
          colors[colorIndex++] = color.r;
          colors[colorIndex++] = color.g;
          colors[colorIndex++] = color.b;
        }
      }
      plane.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      plane.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.05,
        roughness: 0.66,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: palette.meshOpacity,
      });
      const mesh = new THREE.Mesh(plane, material);
      scene.add(mesh);

      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(plane),
        new THREE.LineBasicMaterial({
          color: palette.accent,
          transparent: true,
          opacity: 0.18,
        }),
      );
      scene.add(wire);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(5.9, 60),
        new THREE.MeshBasicMaterial({
          color: palette.floor,
          transparent: true,
          opacity: 0.42,
        }),
      );
      floor.position.set(0, 0, -SURFACE_HEIGHT * 0.58);
      scene.add(floor);

      const dynamicGroup = new THREE.Group();
      scene.add(dynamicGroup);

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const nextWidth = entry.contentRect.width;
        camera.aspect = nextWidth / height;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, height);
        setCanvasRect({ width: nextWidth, height });
      });
      resizeObserver.observe(host);

      let animationFrame = 0;
      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(animate);
      };
      animate();

      resourcesRef.current = {
        scene,
        camera,
        renderer,
        controls,
        mesh,
        dynamicGroup,
        resizeObserver,
        animationFrame,
      };

      return () => {
        if (!resourcesRef.current) return;
        window.cancelAnimationFrame(resourcesRef.current.animationFrame);
        resourcesRef.current.resizeObserver.disconnect();
        plane.dispose();
        material.dispose();
        renderer.dispose();
        host.innerHTML = "";
        resourcesRef.current = null;
      };
    } catch (error) {
      console.warn("[optimization-plot] surface renderer unavailable", error);
      host.innerHTML = "";
      window.setTimeout(() => setSurfaceFailed(true), 0);
      return;
    }
  }, [effectiveMode, grid, height, objective, palette]);

  useEffect(() => {
    if (effectiveMode !== "surface" || !resourcesRef.current) return;

    const { dynamicGroup } = resourcesRef.current;
    while (dynamicGroup.children.length > 0) {
      const child = dynamicGroup.children.pop();
      if (!child) continue;
      dynamicGroup.remove(child);
    }

    const basePlane = -SURFACE_HEIGHT * 0.58;
    const axis = new THREE.AxesHelper(2.8);
    axis.position.set(-SURFACE_WIDTH * 0.58, -SURFACE_DEPTH * 0.58, basePlane);
    dynamicGroup.add(axis);

    for (const trace of traces) {
      const frame = frameAt(trace, playhead);
      const frameIndex = frame.index;
      const path = trace.frames.slice(0, frameIndex + 1).map((entry) => {
        const [x, y, z] = objectiveToWorld(objective, grid, entry.point, objective.value(entry.point));
        return new THREE.Vector3(x, y, z + 0.08);
      });
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(path);
      const pathMaterial = new THREE.LineBasicMaterial({
        color: trace.color,
        transparent: true,
        opacity:
          focusedOptimizerId && focusedOptimizerId !== trace.optimizerId ? 0.28 : 0.92,
      });
      const line = new THREE.Line(pathGeometry, pathMaterial);
      dynamicGroup.add(line);

      const pointGeometry = new THREE.SphereGeometry(
        focusedOptimizerId && focusedOptimizerId === trace.optimizerId ? 0.14 : 0.1,
        16,
        16,
      );
      const pointMaterial = new THREE.MeshStandardMaterial({
        color: trace.color,
        emissive: trace.color,
        emissiveIntensity:
          focusedOptimizerId && focusedOptimizerId === trace.optimizerId ? 0.18 : 0.08,
      });
      const point = new THREE.Mesh(pointGeometry, pointMaterial);
      const current = objectiveToWorld(objective, grid, frame.point, objective.value(frame.point));
      point.position.set(current[0] ?? 0, current[1] ?? 0, (current[2] ?? 0) + 0.14);
      dynamicGroup.add(point);

      if (frame.overlay?.points && frame.overlay.points.length > 0) {
        const overlayPositions = frame.overlay.points.flatMap((candidate) => {
          const world = objectiveToWorld(
            objective,
            grid,
            candidate,
            objective.value(candidate),
          );
          return [world[0] ?? 0, world[1] ?? 0, (world[2] ?? 0) + 0.12];
        });
        const overlayGeometry = new THREE.BufferGeometry();
        overlayGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(overlayPositions, 3),
        );
        const overlay = new THREE.Points(
          overlayGeometry,
          new THREE.PointsMaterial({
            size: 0.08,
            color: trace.color,
            transparent: true,
            opacity: 0.72,
          }),
        );
        dynamicGroup.add(overlay);
      }

      if (frame.overlay?.simplex && frame.overlay.simplex.length > 1) {
        const simplexPoints = frame.overlay.simplex.map((candidate) => {
          const world = objectiveToWorld(
            objective,
            grid,
            candidate,
            objective.value(candidate),
          );
          return new THREE.Vector3(world[0] ?? 0, world[1] ?? 0, (world[2] ?? 0) + 0.16);
        });
        simplexPoints.push(simplexPoints[0]!.clone());
        const simplex = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(simplexPoints),
          new THREE.LineBasicMaterial({ color: trace.color, transparent: true, opacity: 0.66 }),
        );
        dynamicGroup.add(simplex);
      }

      if (frame.overlay?.segments) {
        for (const segment of frame.overlay.segments) {
          const from = objectiveToWorld(
            objective,
            grid,
            segment.from,
            objective.value(segment.from),
          );
          const to = objectiveToWorld(
            objective,
            grid,
            segment.to,
            objective.value(segment.to),
          );
          const segmentLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(from[0] ?? 0, from[1] ?? 0, (from[2] ?? 0) + 0.16),
              new THREE.Vector3(to[0] ?? 0, to[1] ?? 0, (to[2] ?? 0) + 0.16),
            ]),
            new THREE.LineBasicMaterial({
              color: segment.accepted === false ? "#94a3b8" : trace.color,
              transparent: true,
              opacity: 0.8,
            }),
          );
          dynamicGroup.add(segmentLine);
        }
      }

      if (frame.overlay?.covariance) {
        const ellipsePoints: THREE.Vector3[] = [];
        for (let angle = 0; angle <= Math.PI * 2 + 1e-6; angle += Math.PI / 20) {
          const x =
            (frame.overlay.covariance.center[0] ?? 0) +
            Math.cos(angle) *
              (frame.overlay.covariance.axisA[0] ?? 0) *
              (frame.overlay.covariance.radii[0] ?? 0) +
            Math.sin(angle) *
              (frame.overlay.covariance.axisB[0] ?? 0) *
              (frame.overlay.covariance.radii[1] ?? 0);
          const y =
            (frame.overlay.covariance.center[1] ?? 0) +
            Math.cos(angle) *
              (frame.overlay.covariance.axisA[1] ?? 0) *
              (frame.overlay.covariance.radii[0] ?? 0) +
            Math.sin(angle) *
              (frame.overlay.covariance.axisB[1] ?? 0) *
              (frame.overlay.covariance.radii[1] ?? 0);
          const world = objectiveToWorld(objective, grid, [x, y], objective.value([x, y]));
          ellipsePoints.push(
            new THREE.Vector3(world[0] ?? 0, world[1] ?? 0, (world[2] ?? 0) + 0.14),
          );
        }
        dynamicGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(ellipsePoints),
            new THREE.LineBasicMaterial({
              color: trace.color,
              transparent: true,
              opacity: 0.68,
            }),
          ),
        );
      }
    }
  }, [effectiveMode, focusedOptimizerId, grid, objective, playhead, traces]);

  const handleSurfacePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        !onStartChange ||
        !resourcesRef.current ||
        effectiveMode !== "surface" ||
        interactionMode !== "drop"
      ) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycasterRef.current.setFromCamera(
        pointerRef.current,
        resourcesRef.current.camera,
      );
      const intersections = raycasterRef.current.intersectObject(
        resourcesRef.current.mesh,
      );
      const firstHit = intersections[0];
      if (!firstHit) return;
      onStartChange(worldToObjective(objective, firstHit.point));
      onDropComplete?.();
    },
    [effectiveMode, interactionMode, objective, onDropComplete, onStartChange],
  );

  useEffect(() => {
    if (effectiveMode !== "contour") return;
    const canvas = contourCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth || 900;
    const resolvedHeight = canvas.clientHeight || height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = resolvedHeight * dpr;
    context.scale(dpr, dpr);

    context.clearRect(0, 0, width, resolvedHeight);
    context.fillStyle = palette.background;
    context.fillRect(0, 0, width, resolvedHeight);

    const rows = contourGrid.values.length;
    const cols = contourGrid.values[0]?.length ?? 0;
    for (let row = 0; row < rows - 1; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        const value = contourGrid.values[row]?.[col] ?? 0;
        context.fillStyle = valueToCss(value, contourGrid.min, contourGrid.max);
        const x0 = (col / (cols - 1)) * width;
        const y0 = (row / (rows - 1)) * resolvedHeight;
        const x1 = ((col + 1) / (cols - 1)) * width;
        const y1 = ((row + 1) / (rows - 1)) * resolvedHeight;
        context.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      }
    }

    buildContourLines(context, contourGrid, width, resolvedHeight, palette);

    for (const trace of traces) {
      const frame = frameAt(trace, playhead);
      const frameIndex = frame.index;
      context.strokeStyle = trace.color;
      context.lineWidth =
        focusedOptimizerId === trace.optimizerId ? 3 : focusedOptimizerId ? 1.6 : 2.4;
      context.globalAlpha =
        focusedOptimizerId && focusedOptimizerId !== trace.optimizerId ? 0.3 : 0.92;
      context.beginPath();
      trace.frames.slice(0, frameIndex + 1).forEach((entry, index) => {
        const x = mapToRange(
          entry.point[0] ?? 0,
          contourViewport.x[0],
          contourViewport.x[1],
          0,
          width,
        );
        const y = mapToRange(
          entry.point[1] ?? 0,
          contourViewport.y[0],
          contourViewport.y[1],
          resolvedHeight,
          0,
        );
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();

      const currentX = mapToRange(
        frame.point[0] ?? 0,
        contourViewport.x[0],
        contourViewport.x[1],
        0,
        width,
      );
      const currentY = mapToRange(
        frame.point[1] ?? 0,
        contourViewport.y[0],
        contourViewport.y[1],
        resolvedHeight,
        0,
      );
      context.fillStyle = trace.color;
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(currentX, currentY, focusedOptimizerId === trace.optimizerId ? 7 : 5, 0, Math.PI * 2);
      context.fill();

      if (frame.overlay?.points) {
        context.fillStyle = trace.color;
        context.globalAlpha = 0.5;
        for (const point of frame.overlay.points) {
          const x = mapToRange(
            point[0] ?? 0,
            contourViewport.x[0],
            contourViewport.x[1],
            0,
            width,
          );
          const y = mapToRange(
            point[1] ?? 0,
            contourViewport.y[0],
            contourViewport.y[1],
            resolvedHeight,
            0,
          );
          context.beginPath();
          context.arc(x, y, 3.2, 0, Math.PI * 2);
          context.fill();
        }
      }

      if (frame.overlay?.simplex && frame.overlay.simplex.length > 1) {
        context.strokeStyle = trace.color;
        context.globalAlpha = 0.65;
        context.lineWidth = 1.2;
        context.beginPath();
        frame.overlay.simplex.forEach((point, index) => {
          const x = mapToRange(
            point[0] ?? 0,
            contourViewport.x[0],
            contourViewport.x[1],
            0,
            width,
          );
          const y = mapToRange(
            point[1] ?? 0,
            contourViewport.y[0],
            contourViewport.y[1],
            resolvedHeight,
            0,
          );
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        const first = frame.overlay.simplex[0];
        if (first) {
          context.lineTo(
            mapToRange(first[0] ?? 0, contourViewport.x[0], contourViewport.x[1], 0, width),
            mapToRange(first[1] ?? 0, contourViewport.y[0], contourViewport.y[1], resolvedHeight, 0),
          );
        }
        context.stroke();
      }
    }

    context.globalAlpha = 1;
    context.strokeStyle = palette.border;
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, width - 1, resolvedHeight - 1);
  }, [
    contourGrid,
    contourViewport.x,
    contourViewport.y,
    effectiveMode,
    focusedOptimizerId,
    height,
    palette,
    playhead,
    traces,
  ]);

  const handleContourPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = contourCanvasRef.current;
      if (!canvas) return;
      if (interactionMode === "drop") {
        updateStartFromCanvas(event.clientX, event.clientY);
        onDropComplete?.();
        contourDragRef.current = null;
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      contourDragRef.current = {
        mode: interactionMode,
        startClientX: event.clientX,
        startClientY: event.clientY,
        viewport: contourViewport,
      };
    },
    [contourViewport, interactionMode, onDropComplete, updateStartFromCanvas],
  );

  const handleContourPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const dragState = contourDragRef.current;
      const canvas = contourCanvasRef.current;
      if (!dragState || !canvas) return;

      if (dragState.mode === "drop") {
        updateStartFromCanvas(event.clientX, event.clientY);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dx = ((event.clientX - dragState.startClientX) / rect.width) *
        (dragState.viewport.x[1] - dragState.viewport.x[0]);
      const dy = ((event.clientY - dragState.startClientY) / rect.height) *
        (dragState.viewport.y[1] - dragState.viewport.y[0]);

      setContourViewport(
        clampViewportToDomain(objective, {
          x: [dragState.viewport.x[0] - dx, dragState.viewport.x[1] - dx],
          y: [dragState.viewport.y[0] + dy, dragState.viewport.y[1] + dy],
        }),
      );
    },
    [objective, updateStartFromCanvas],
  );

  const clearContourDrag = useCallback(() => {
    contourDragRef.current = null;
  }, []);

  const handleContourWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      if (interactionMode !== "navigate") return;
      const canvas = contourCanvasRef.current;
      if (!canvas) return;

      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cursorX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const cursorY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const factor = event.deltaY > 0 ? 1.12 : 0.9;
      const width = contourViewport.x[1] - contourViewport.x[0];
      const height = contourViewport.y[1] - contourViewport.y[0];
      const anchorX = lerp(contourViewport.x[0], contourViewport.x[1], cursorX);
      const anchorY = lerp(contourViewport.y[1], contourViewport.y[0], cursorY);
      const nextWidth = width * factor;
      const nextHeight = height * factor;
      const nextViewport = clampViewportToDomain(objective, {
        x: [
          anchorX - nextWidth * cursorX,
          anchorX + nextWidth * (1 - cursorX),
        ],
        y: [
          anchorY - nextHeight * (1 - cursorY),
          anchorY + nextHeight * cursorY,
        ],
      });
      setContourViewport(nextViewport);
    },
    [contourViewport, interactionMode, objective],
  );

  return (
    <div className="rounded-[1.35rem] border border-neutral-300/70 bg-white/85 shadow-[0_24px_80px_rgba(36,22,15,0.08)] dark:border-neutral-700/70 dark:bg-neutral-950/70">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200/70 px-4 py-3 dark:border-neutral-800/80">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
            Main Surface
          </p>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            {effectiveMode === "surface"
              ? interactionMode === "drop"
                ? "Drop mode: click the 3D surface to place the start point."
                : "Navigation mode: orbit the 3D surface without moving the start point."
              : surfaceSupported
                ? surfaceFailed
                  ? "The 3D renderer failed here, so the plot safely fell back to contour mode."
                  : interactionMode === "drop"
                    ? "Plan view, drop mode: drag to reposition the start point."
                    : "Plan view, navigation mode: drag to pan and use the wheel to zoom."
                : "WebGL is unavailable here, so this plot falls back to contour mode."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {effectiveMode === "contour" && !contourAtFullDomain ? (
            <button
              type="button"
              onClick={() => setContourViewport(createFullContourViewport(objective))}
              className="rounded-full border border-neutral-300/80 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-600 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
            >
              Reset view
            </button>
          ) : null}
          <div className="rounded-full border border-neutral-300/80 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
            {effectiveMode === "surface" ? "x / y / z + color" : "x / y + contour"}
          </div>
        </div>
      </div>

      {effectiveMode === "surface" ? (
        <div
          ref={surfaceHostRef}
          className="w-full"
          style={{ height }}
          onPointerDown={handleSurfacePointer}
        />
      ) : (
        <canvas
          ref={contourCanvasRef}
          className={`block w-full ${
            interactionMode === "drop" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
          }`}
          style={{ height }}
          onPointerDown={handleContourPointerDown}
          onPointerMove={handleContourPointerMove}
          onPointerUp={clearContourDrag}
          onPointerLeave={clearContourDrag}
          onPointerCancel={clearContourDrag}
          onWheel={handleContourWheel}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/70 px-4 py-3 text-xs text-neutral-600 dark:border-neutral-800/80 dark:text-neutral-400">
        <span>
          View x: {contourViewport.x[0].toFixed(1)} to {contourViewport.x[1].toFixed(1)}
        </span>
        <span>
          View y: {contourViewport.y[0].toFixed(1)} to {contourViewport.y[1].toFixed(1)}
        </span>
        <span>{canvasRect.width > 0 ? `${Math.round(canvasRect.width)}px live plot` : "Live plot"}</span>
      </div>
    </div>
  );
}
