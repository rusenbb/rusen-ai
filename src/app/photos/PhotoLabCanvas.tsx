"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { createGpuUniformsMap, rootPassthrough, shaderRendererGPU } from "shaders/core";
import type { GpuShaderDefinition } from "shaders/core";
import ascii from "shaders/core/Ascii";
import brightnessContrast from "shaders/core/BrightnessContrast";
import dither from "shaders/core/Dither";
import grayscale from "shaders/core/Grayscale";
import halftone from "shaders/core/Halftone";
import imageTexture from "shaders/core/ImageTexture";
import particleField from "shaders/core/ParticleField";

export type EffectMode = "ascii" | "dither" | "newsprint" | "particles";
export type LabStatus = "loading" | "ready" | "unavailable";
type Renderer = ReturnType<typeof shaderRendererGPU>;

type Props = {
  mode: EffectMode;
  source: string;
  width: number;
  height: number;
  detail: number;
  contrast: number;
  animate: boolean;
  onStatus: (status: LabStatus) => void;
};

function effectProps(mode: EffectMode, detail: number, animate: boolean) {
  const density = detail / 100;
  switch (mode) {
    case "ascii":
      return {
        characters: "@%#*+=-:. ",
        // Use the local system font; named fonts trigger a remote font request.
        fontFamily: "monospace",
        cellSize: 44 - density * 34,
        spacing: 1,
      };
    case "dither":
      return {
        pattern: "bayer4",
        pixelSize: 9 - density * 8,
        colorA: "#080808",
        colorB: "#eeeae0",
      };
    case "newsprint":
      return { frequency: 35 + density * 180, paperColor: "#eeeae0" };
    case "particles":
      return {
        count: Math.round(2500 + density * 13500),
        depth: 0.22,
        particleSize: 0.85,
        wobble: animate ? 0.08 : 0,
        cursorMode: animate ? "push" : "none",
        cursorStrength: 0.65,
        cursorRadius: 0.14,
        depthShading: 0.2,
      };
  }
}

const effects = { ascii, dither, newsprint: halftone, particles: particleField };

/** Media uploads finish asynchronously. Wake a static renderer when pixels arrive. */
function withMediaUpdates(definition: GpuShaderDefinition, uploaded: () => void): GpuShaderDefinition {
  return {
    ...definition,
    fragment: (params) => definition.fragment({
      ...params,
      createMediaTexture: (options) => {
        const texture = params.createMediaTexture(options);
        return {
          ...texture,
          write: (source) => {
            texture.write(source);
            uploaded();
          },
        };
      },
    }),
  };
}

function register(
  renderer: Renderer,
  id: string,
  definition: GpuShaderDefinition,
  parent: string | null,
  props: Record<string, unknown> = {},
) {
  const values = Object.fromEntries(
    Object.entries(definition.props).map(([key, config]) => [key, props[key] ?? config.default]),
  );
  renderer.registerNode(
    id, definition.fragment, parent, null,
    createGpuUniformsMap(definition, values, id), definition,
  );
}

/** The public core API lets static treatments sleep and caps particle animation.
 * No telemetry collector is started, and the renderer lives only while Lab is open. */
export default function PhotoLabCanvas(props: Props) {
  const { mode, source, width, height, detail, contrast, animate, onStatus } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const settings = useEffectEvent(() => ({ width, height, detail, contrast, animate }));
  const report = useEffectEvent(onStatus);

  const update = useEffectEvent((renderer: Renderer) => {
    const current = settings();
    for (const [key, value] of Object.entries(effectProps(mode, current.detail, current.animate))) {
      renderer.updateUniformValue("treatment", key, value);
    }
    renderer.updateUniformValue("contrast", "contrast", current.contrast / 100);
    renderer.resize(current.width, current.height);
    // Bound the backing buffer on large/high-DPI screens without changing image fit.
    renderer.setResolutionScale(Math.min(
      1, 1200 / (Math.max(current.width, current.height) * (window.devicePixelRatio || 1)),
    ));
    if (document.hidden) renderer.stopAnimation();
    else if (mode === "particles" && current.animate) renderer.startAnimation();
    else {
      renderer.stopAnimation();
      void renderer.renderAndWait().catch(() => {
        if (rendererRef.current === renderer) report("unavailable");
      });
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let failed = false;
    let imageReady = false;
    let pendingDraw: number | null = null;
    const renderer = shaderRendererGPU();
    const fail = () => {
      if (!disposed) {
        failed = true;
        report("unavailable");
      }
    };
    renderer.setOnUnavailable(fail);
    renderer.setOnDeviceLost(() => {
      renderer.cleanup();
      rendererRef.current = null;
      fail();
    });
    const loadingTimeout = window.setTimeout(() => {
      if (!imageReady && !disposed) {
        renderer.cleanup();
        rendererRef.current = null;
        fail();
      }
    }, 15000);
    const uploaded = () => {
      if (disposed || failed || pendingDraw !== null) return;
      pendingDraw = requestAnimationFrame(() => {
        pendingDraw = null;
        if (disposed || failed) return;
        renderer.stopAnimation();
        void renderer.renderAndWait().then(() => {
          if (imageReady && !disposed && !failed) {
            window.clearTimeout(loadingTimeout);
            report("ready");
          }
          if (!disposed && !failed) update(renderer);
        }).catch(fail);
      });
    };

    async function initialize() {
      try {
        await renderer.initialize({ canvas: canvas!, observeElement: false, colorSpace: "srgb" });
        if (disposed) {
          renderer.cleanup();
          return;
        }
        renderer.stopAnimation();
        if (renderer.getFailureReason()) return;
        renderer.setFrameRateCap(30);
        const current = settings();
        register(renderer, "root", rootPassthrough, null);
        register(renderer, "treatment", withMediaUpdates(effects[mode], uploaded), "root",
          effectProps(mode, current.detail, current.animate));
        // Preserve the photograph's colors in the particle field; prints use luminance.
        if (mode !== "particles") register(renderer, "grayscale", grayscale, "treatment");
        register(renderer, "contrast", brightnessContrast,
          mode === "particles" ? "treatment" : "grayscale", { contrast: current.contrast / 100 });
        register(renderer, "image", withMediaUpdates(imageTexture, () => {
          imageReady = true;
          uploaded();
        }), "contrast", { url: source, objectFit: "fill" });
        rendererRef.current = renderer;
        update(renderer);
      } catch {
        renderer.cleanup();
        fail();
      }
    }

    void initialize();
    const visibilityChanged = () => {
      if (rendererRef.current === renderer) update(renderer);
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      disposed = true;
      window.clearTimeout(loadingTimeout);
      if (pendingDraw !== null) cancelAnimationFrame(pendingDraw);
      document.removeEventListener("visibilitychange", visibilityChanged);
      if (rendererRef.current === renderer) rendererRef.current = null;
      renderer.cleanup();
    };
  }, [mode, source]);

  useEffect(() => {
    if (rendererRef.current) update(rendererRef.current);
  }, [detail, contrast, animate, width, height]);

  return <canvas ref={canvasRef} className="photo-lab-canvas" aria-hidden="true" />;
}
