// GLSL shaders — ported from GolShader.hx with monochrome theming

export const vertexShader = `#version 300 es
precision highp float;

in vec2 aPosition;

uniform vec4 uCamera;
uniform vec4 uRawCamera;

out vec2 vPosition;
out vec2 vRawPosition;

void main() {
  gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
  vec2 pos = vec2(aPosition.x, 1.0 - aPosition.y);
  vPosition = mix(uCamera.xy, uCamera.zw, pos);
  vRawPosition = mix(uRawCamera.xy, uRawCamera.zw, pos);
}
`;

export const fragmentShader = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 vPosition;
in vec2 vRawPosition;

// Graph texture: 1024 x 2048, RGBA32UI
uniform usampler2D uGraph;
// Tiles texture: 128 x 128, RGBA32UI
uniform usampler2D uTiles;
// Top tiles texture: 16 x 16, RGBA32UI
uniform usampler2D uTopTiles;
// Pre-rendered top tiles (float texture from pass 1)
uniform sampler2D uPrerendered;
uniform vec2 uPrerenderSize;

uniform vec2 uResolution;
uniform vec4 uCamera;
uniform bool uPreRendering;
uniform float uTransition;
uniform float uCellColor; // 1.0 = light cells for dark mode, 0.0 = dark cells for light mode

out vec4 fragColor;

// Constants matching the data
const ivec2 GRAPH_TEX_SIZE = ivec2(1024, 2048);
const ivec2 GRAPH_TEX_LOG_SIZE = ivec2(10, 11);
const ivec2 TILES_TEX_SIZE = ivec2(128, 128);
const ivec2 TILES_TEX_LOG_SIZE = ivec2(7, 7);
const int OFFSET_FOR_EACH_LEVEL[10] = int[10](0, 0, 0, 0, 43566, 102445, 191663, 326396, 581726, 1009870);

uvec4 fetchPixelIndex(usampler2D tex, ivec2 size, ivec2 logSize, int index) {
  return texelFetch(tex, ivec2(index & (size.x - 1), index >> logSize.x), 0);
}

// Parse a node from the graph texture
void getNode(int level, int index, out int children[4], out int pop) {
  int pixelIndex = index + OFFSET_FOR_EACH_LEVEL[level];
  uvec4 pixel = fetchPixelIndex(uGraph, GRAPH_TEX_SIZE, GRAPH_TEX_LOG_SIZE, pixelIndex);
  int ir = int(pixel.r);
  int ig = int(pixel.g);
  children[0] = ir & 0xffffff;
  children[1] = ig & 0xffffff;
  children[2] = int(pixel.b);
  children[3] = int(pixel.a);
  pop = int((pixel.r >> 24u) | ((pixel.g >> 24u) << 8u));
}

int popcount16(int i) {
  i = (i & 0x5555) + ((i >> 1) & 0x5555);
  i = (i & 0x3333) + ((i >> 2) & 0x3333);
  i = (i & 0x0f0f) + ((i >> 4) & 0x0f0f);
  return (i & 0x00ff) + (i >> 8);
}

int popcount4(int i) {
  i = (i & 5) + ((i >> 1) & 5);
  return (i & 3) + (i >> 2);
}

float linearstep(float edge0, float edge1, float t) {
  return clamp((t - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float correctDensity(float rawDensity, int level, float cellState) {
  float zero = 0.002;
  float one = 0.005;
  float t = smoothstep(0.5, 1.0, float(level) / 9.0);
  float v1 = linearstep(zero, one, rawDensity);
  float v2 = linearstep(pow(zero, cellState * 2.0), pow(one, cellState * 2.0), rawDensity);
  return mix(v1, v2, t);
}

// Pre-rendering pass: traverse quadtree to get cell state (binary)
int sampleBitExact(int index, ivec2 pos) {
  if (index < 0) return 0;
  int level = 9;
  for (int iter = 0; iter < 7; iter++) {
    int size = 1 << (level - 1);
    int children[4];
    int pop;
    getNode(level, index, children, pop);
    if (pos.y < size) {
      if (pos.x < size) {
        index = children[0];
      } else {
        index = children[1];
        pos.x -= size;
      }
    } else {
      pos.y -= size;
      if (pos.x < size) {
        index = children[2];
      } else {
        index = children[3];
        pos.x -= size;
      }
    }
    level--;
  }
  int bitIndex = 15 ^ (pos.y << 2 | pos.x);
  return (index >> bitIndex) & 1;
}

// Normal pass: traverse with LOD-based density anti-aliasing
float sampleBitDensity(int index, ivec2 pos, float res, float cellState) {
  if (index < 0) return 0.0;
  int level = 9;
  float invArea = 1.0 / (512.0 * 512.0);
  float prevValue = 0.0;
  float pixelSize = 1.0;

  for (int iter = 0; iter < 7; iter++) {
    int size = 1 << (level - 1);
    int children[4];
    int pop;
    getNode(level, index, children, pop);
    float density = float(pop) * invArea;
    float value = correctDensity(density, level, cellState);
    if (iter == 0) prevValue = value;
    if (res <= pixelSize) {
      float t = (pixelSize - res) / res;
      return value + t * (prevValue - value);
    }
    prevValue = value;
    if (pos.y < size) {
      if (pos.x < size) {
        index = children[0];
      } else {
        index = children[1];
        pos.x -= size;
      }
    } else {
      pos.y -= size;
      if (pos.x < size) {
        index = children[2];
      } else {
        index = children[3];
        pos.x -= size;
      }
    }
    level--;
    res *= 0.5;
    invArea *= 4.0;
  }

  // Level 2: 4x4 packed bits
  {
    float density = float(popcount16(index)) * invArea;
    float value = correctDensity(density, level, cellState);
    if (res <= pixelSize) {
      float t = (pixelSize - res) / res;
      return value + t * (prevValue - value);
    }
    prevValue = value;
  }
  if (pos.y < 2) {
    if (pos.x < 2) {
      index = ((index >> 0xa) & 3) | (((index >> 0xe) & 3) << 2);
    } else {
      index = ((index >> 0x8) & 3) | (((index >> 0xc) & 3) << 2);
      pos.x -= 2;
    }
  } else {
    pos.y -= 2;
    if (pos.x < 2) {
      index = ((index >> 0x2) & 3) | (((index >> 0x6) & 3) << 2);
    } else {
      index = ((index >> 0x0) & 3) | (((index >> 0x4) & 3) << 2);
      pos.x -= 2;
    }
  }
  res *= 0.5;
  invArea *= 4.0;

  // Level 1: 2x2
  {
    float density = float(popcount4(index)) * invArea;
    float value = correctDensity(density, level, cellState);
    if (res <= pixelSize) {
      float t = (pixelSize - res) / res;
      return value + t * (prevValue - value);
    }
    prevValue = value;
  }
  res *= 0.5;

  // Level 0: single cell
  float value = float((index >> (3 ^ (pos.y << 1) ^ pos.x)) & 1);
  if (res <= pixelSize) {
    float t = (pixelSize - res) / res;
    return value + t * (prevValue - value);
  }
  return value;
}

int getTileNodeIndex(ivec2 pos, int pattern) {
  int rawIndex = ((pos.y << 2 | pos.x) << 10) | pattern;
  int pixelIndex = rawIndex >> 2;
  int pixelOffset = rawIndex & 3;
  uvec4 pixel = fetchPixelIndex(uTiles, TILES_TEX_SIZE, TILES_TEX_LOG_SIZE, pixelIndex);
  return int(pixel[pixelOffset]);
}

int fetchTile(ivec2 index, int channel) {
  if (index.x < 0 || index.x >= 16 || index.y < 0 || index.y >= 16)
    return -1;
  return int(texelFetch(uTopTiles, index, 0)[channel]);
}

ivec2 samplePixel(ivec2 pixCoord, ivec2 offset) {
  ivec2 size = max(ivec2(1), ivec2(uPrerenderSize));
  pixCoord += offset;
  pixCoord = ivec2(pixCoord.x, size.y - 1 - pixCoord.y);
  if (
    pixCoord.x < 0 || pixCoord.y < 0 ||
    pixCoord.x >= size.x || pixCoord.y >= size.y
  ) {
    return ivec2(0);
  }
  return ivec2(texelFetch(uPrerendered, pixCoord, 0).xy);
}

int samplePattern(ivec2 pixCoord) {
  ivec2 center = samplePixel(pixCoord, ivec2(0));
  int bit = samplePixel(pixCoord, ivec2(-1, -1)).x;
  bit |= samplePixel(pixCoord, ivec2(0, -1)).x << 1;
  bit |= samplePixel(pixCoord, ivec2(1, -1)).x << 2;
  bit |= samplePixel(pixCoord, ivec2(-1, 0)).x << 3;
  bit |= center.x << 4;
  bit |= samplePixel(pixCoord, ivec2(1, 0)).x << 5;
  bit |= samplePixel(pixCoord, ivec2(-1, 1)).x << 6;
  bit |= samplePixel(pixCoord, ivec2(0, 1)).x << 7;
  bit |= samplePixel(pixCoord, ivec2(1, 1)).x << 8;
  bit |= center.y << 9;
  bit ^= ((bit >> 4) & 1) << 9;
  return bit;
}

void main() {
  float outerRes = uResolution.x / (uCamera.z - uCamera.x);
  float innerRes = outerRes / 2048.0;
  vec2 tileCoord = vPosition * 4.0;

  if (uPreRendering) {
    // Pass 1: render cell states to framebuffer
    ivec2 tileIndex = ivec2(floor(tileCoord));
    ivec2 insideTileIndex = ivec2(fract(tileCoord) * 512.0);
    int index = fetchTile(tileIndex, 0);
    int pindex = fetchTile(tileIndex, 1);
    if (index < 0 || pindex < 0) {
      fragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    float pop = float(sampleBitExact(index, insideTileIndex));
    float ppop = float(sampleBitExact(pindex, insideTileIndex));
    fragColor = vec4(pop, ppop, 0.0, 1.0);
  } else {
    // Pass 2: sample pre-rendered, reconstruct pattern, render inner detail
    int outerPattern = samplePattern(ivec2(tileCoord * 512.0));
    vec2 insidePixelCoord = fract(tileCoord * 512.0) * 4.0;
    ivec2 innerTileIndex = ivec2(insidePixelCoord);
    float cellState = mix(
      float((outerPattern >> 9 ^ outerPattern >> 4) & 1),
      float((outerPattern >> 4) & 1),
      uTransition
    );

    int level9Index = getTileNodeIndex(innerTileIndex, outerPattern);
    float pop = sampleBitDensity(level9Index, ivec2(fract(insidePixelCoord) * 512.0), innerRes * 0.25, cellState);

    vec3 lightModeCell = vec3(0.06, 0.09, 0.14);
    vec3 darkModeCell = vec3(0.94, 0.97, 1.0);
    vec3 color = mix(lightModeCell, darkModeCell, uCellColor);
    float alpha = pop * 0.58;
    fragColor = vec4(color, alpha);
  }
}
`;
