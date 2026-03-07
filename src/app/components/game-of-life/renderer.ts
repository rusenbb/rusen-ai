// WebGL renderer for the fractal Game of Life
// Port of Main.hx rendering logic — raw WebGL, no framework

import { Graph, Node } from "./graph";
import { Frames } from "./frames";
import { Universe } from "./universe";
import { vertexShader, fragmentShader } from "./shaders";

const GRAPH_TEX_WIDTH = 1024;
const GRAPH_TEX_HEIGHT = 2048;
const TILES_TEX_WIDTH = 128;
const TILES_TEX_HEIGHT = 128;

function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: number,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vs: string,
  fs: string,
): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, compileShader(gl, vs, gl.VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  return program;
}

function createUint32Texture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data?: Uint32Array,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA32UI,
    width,
    height,
    0,
    gl.RGBA_INTEGER,
    gl.UNSIGNED_INT,
    data || null,
  );
  return tex;
}

function createPrerenderTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  return tex;
}

export class Renderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;

  private graphTexture: WebGLTexture;
  private tilesTexture: WebGLTexture;
  private topTilesTexture: WebGLTexture;
  private prerenderedTexture: WebGLTexture | null = null;
  private prerenderedFB: WebGLFramebuffer | null = null;
  private prerenderedWidth = 0;
  private prerenderedHeight = 0;

  private tilesData = new Uint32Array(TILES_TEX_WIDTH * TILES_TEX_HEIGHT * 4);
  private topTilesData = new Uint32Array(16 * 16 * 4);

  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(
    private canvas: HTMLCanvasElement,
    graph: Graph,
    private frames: Frames,
  ) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    })!;
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    // Compile shaders
    this.program = createProgram(gl, vertexShader, fragmentShader);

    // Cache uniform locations
    const uniformNames = [
      "uCamera",
      "uRawCamera",
      "uResolution",
      "uPreRendering",
      "uTransition",
      "uCellColor",
      "uGraph",
      "uTiles",
      "uTopTiles",
      "uPrerendered",
    ];
    for (const name of uniformNames) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }

    // Full-screen quad VAO
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPosition = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Create graph texture from decoded data
    const graphPixels = this.createGraphTexturePixels(graph);
    this.graphTexture = createUint32Texture(
      gl,
      GRAPH_TEX_WIDTH,
      GRAPH_TEX_HEIGHT,
      new Uint32Array(graphPixels),
    );

    // Tiles texture (updated each frame)
    this.tilesTexture = createUint32Texture(
      gl,
      TILES_TEX_WIDTH,
      TILES_TEX_HEIGHT,
    );

    // Top tiles texture (updated each frame)
    this.topTilesTexture = createUint32Texture(gl, 16, 16);

    // Set texture unit bindings
    gl.useProgram(this.program);
    gl.uniform1i(this.uniforms.uGraph, 0);
    gl.uniform1i(this.uniforms.uTiles, 1);
    gl.uniform1i(this.uniforms.uTopTiles, 2);
    gl.uniform1i(this.uniforms.uPrerendered, 3);
  }

  private createGraphTexturePixels(graph: Graph): number[] {
    const res: number[] = [];
    for (const nodesInLevel of graph.nodes) {
      for (const node of nodesInLevel) {
        this.addNodePixels(res, node);
      }
    }
    const maxInts = GRAPH_TEX_WIDTH * GRAPH_TEX_HEIGHT * 4;
    while (res.length < maxInts) {
      res.push(0);
    }
    return res;
  }

  private addNodePixels(pixels: number[], node: Node): void {
    const c1 = node.children[0];
    const c2 = node.children[1];
    const c3 = node.children[2];
    const c4 = node.children[3];
    const pop = node.pop;
    const popLow = pop & 0xff;
    const popHigh = (pop >> 8) & 0xff;
    pixels.push(c1 | (popLow << 24));
    pixels.push(c2 | (popHigh << 24));
    pixels.push(c3);
    pixels.push(c4);
  }

  private updateAnimData(frameIndices: number[]): void {
    let i = 0;
    for (const index of frameIndices) {
      for (const tile of this.frames.restoreFrame(index)) {
        for (const nodeIndex of tile) {
          this.tilesData[i++] = nodeIndex;
        }
      }
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tilesTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      TILES_TEX_WIDTH,
      TILES_TEX_HEIGHT,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_INT,
      this.tilesData,
    );
  }

  private updateTopTiles(tiles: number[][][]): void {
    if (tiles.length === 0 || tiles[0].length === 0) {
      return;
    }

    const h = tiles.length;
    const w = tiles[0].length;
    let index = 0;
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        this.topTilesData[index++] = i < h && j < w ? tiles[i][j][0] : 0;
        this.topTilesData[index++] = i < h && j < w ? tiles[i][j][1] : 0;
        this.topTilesData[index++] = 0;
        this.topTilesData[index++] = 0;
      }
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.topTilesTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      16,
      16,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_INT,
      this.topTilesData,
    );

    // Ensure pre-rendered texture is large enough
    const neededW = w * 512;
    const neededH = h * 512;
    if (
      !this.prerenderedTexture ||
      this.prerenderedWidth < neededW ||
      this.prerenderedHeight < neededH
    ) {
      if (this.prerenderedTexture) {
        gl.deleteTexture(this.prerenderedTexture);
        gl.deleteFramebuffer(this.prerenderedFB);
      }
      this.prerenderedTexture = createPrerenderTexture(gl, neededW, neededH);
      this.prerenderedFB = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.prerenderedFB);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.prerenderedTexture,
        0,
      );
      if (
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
      ) {
        throw new Error("Prerender framebuffer is incomplete");
      }
      this.prerenderedWidth = neededW;
      this.prerenderedHeight = neededH;
    }

    // Pass 1: pre-render top tiles into framebuffer
    // IMPORTANT: unbind prerendered texture from unit 3 during pass 1
    // because it's the framebuffer's color attachment — reading and writing
    // the same texture simultaneously is undefined behavior in WebGL.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.prerenderedFB);
    gl.viewport(0, 0, neededW, neededH);
    gl.useProgram(this.program);

    gl.uniform4f(this.uniforms.uCamera!, 0, 0, w / 4, h / 4);
    gl.uniform1i(this.uniforms.uPreRendering!, 1);

    // Bind all textures except prerendered (unit 3)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.graphTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tilesTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.topTilesTexture);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, null); // unbind — we're writing to it

    this.drawQuad();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private bindTextures(): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.graphTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tilesTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.topTilesTexture);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.prerenderedTexture);
  }

  private drawQuad(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  render(universe: Universe, isDark: boolean): void {
    const gl = this.gl;
    const pixelWidth = this.canvas.width || this.canvas.clientWidth;
    const pixelHeight = this.canvas.height || this.canvas.clientHeight;
    if (pixelWidth <= 0 || pixelHeight <= 0) return;
    universe.setCameraAspect(pixelWidth / pixelHeight);
    universe.normalizeZoom(pixelWidth);

    const timeFract = universe.getTimeFract();
    const transition = universe.getTransition();
    this.updateAnimData([timeFract, 0, 0, 0]);

    const viewInfo = universe.getViewInfo(pixelWidth, pixelHeight);
    this.updateTopTiles(viewInfo.visibleTiles);

    const bounds = viewInfo.cameraBounds;
    const rawBounds = viewInfo.rawCameraBounds;

    // Pass 2: render to screen (use actual pixel dimensions for viewport/shader)
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.useProgram(this.program);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.uniform4f(
      this.uniforms.uCamera!,
      bounds[0],
      bounds[1],
      bounds[2],
      bounds[3],
    );
    gl.uniform4f(
      this.uniforms.uRawCamera!,
      rawBounds[0],
      rawBounds[1],
      rawBounds[2],
      rawBounds[3],
    );
    gl.uniform2f(this.uniforms.uResolution!, pixelWidth, pixelHeight);
    gl.uniform1i(this.uniforms.uPreRendering!, 0);
    gl.uniform1f(this.uniforms.uTransition!, transition);
    gl.uniform1f(this.uniforms.uCellColor!, isDark ? 1.0 : 0.0);

    this.bindTextures();
    this.drawQuad();

    gl.disable(gl.BLEND);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteTexture(this.graphTexture);
    gl.deleteTexture(this.tilesTexture);
    gl.deleteTexture(this.topTilesTexture);
    if (this.prerenderedTexture) gl.deleteTexture(this.prerenderedTexture);
    if (this.prerenderedFB) gl.deleteFramebuffer(this.prerenderedFB);
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
  }
}
