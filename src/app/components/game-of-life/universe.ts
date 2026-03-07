// Port of Universe.hx — camera management and recursive zoom normalization

import { Level } from "./level";
import { Sampler } from "./sampler";

const PERIOD = 35328;
const TRANSITION_START = 4100;
const TRANSITION_END = 7400;

export class Universe {
  refLevel: Level;

  private camX: number;
  private camY: number;
  private camHW: number;
  private camHH: number;
  private camAspect: number;
  private timeFract: number;
  private readonly sampler: Sampler;

  constructor(sampler: Sampler, aspect: number) {
    this.sampler = sampler;
    this.refLevel = Level.generateRandomLevel(sampler);
    this.camX = 0.5;
    this.camY = 0.5;
    this.camHW = 0.5;
    this.camHH = this.camHW / aspect;
    this.camAspect = aspect;
    this.timeFract = 0;
  }

  cameraWidth(): number {
    return 2 * this.camHW;
  }

  cameraHeight(): number {
    return 2 * this.camHH;
  }

  setCameraAspect(aspect: number): void {
    this.camAspect = aspect;
    this.camHH = this.camHW / this.camAspect;
  }

  translateCamera(tx: number, ty: number): void {
    this.camX += 2 * this.camHW * tx;
    this.camY += 2 * this.camHH * ty;
    this.normalizeTranslation();
  }

  scaleCamera(scale: number): void {
    this.camHW *= scale;
    this.camHH = this.camHW / this.camAspect;
  }

  private normalizeTranslation(): void {
    const ix = Math.floor(this.camX);
    const iy = Math.floor(this.camY);
    if (ix !== 0 || iy !== 0) {
      this.camX -= ix;
      this.camY -= iy;
      this.refLevel.translate(ix, iy);
    }
  }

  normalizeZoom(resolutionX: number): void {
    while (resolutionX / (2 * this.camHW * 2048) < 2) {
      this.goUp();
    }
    while (resolutionX / (2 * this.camHW * 2048 * 2048) > 2) {
      this.goDown();
    }
  }

  getViewInfo(
    resX: number,
    resY: number
  ): {
    visibleTiles: number[][][];
    cameraBounds: number[];
    rawCameraBounds: number[];
  } {
    const marginW = (2 * this.camHW) / resX;
    const marginH = (2 * this.camHH) / resY;
    const hw = this.camHW + marginW;
    const hh = this.camHH + marginH;
    const minX = Math.floor((this.camX - hw) * 4);
    const maxX = Math.floor((this.camX + hw) * 4);
    const minY = Math.floor((this.camY - hh) * 4);
    const maxY = Math.floor((this.camY + hh) * 4);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const res: number[][][] = Array.from({ length: h }, () =>
      Array.from({ length: w }, () => [0, 0])
    );

    const time = this.refLevel.time;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const pattern = this.refLevel.getPatternOfCell(x >> 2, y >> 2);
        const tile = this.getTileFromSampler(time, pattern, x & 3, y & 3);
        const ptile = this.getTileFromSampler(
          time - 1,
          pattern,
          x & 3,
          y & 3
        );
        res[y - minY][x - minX][0] = tile;
        res[y - minY][x - minX][1] = ptile;
      }
    }

    const offX = minX / 4;
    const offY = minY / 4;
    return {
      visibleTiles: res,
      cameraBounds: [
        this.camX - this.camHW - offX,
        this.camY - this.camHH - offY,
        this.camX + this.camHW - offX,
        this.camY + this.camHH - offY,
      ],
      rawCameraBounds: [
        this.camX - this.camHW,
        this.camY - this.camHH,
        this.camX + this.camHW,
        this.camY + this.camHH,
      ],
    };
  }

  private getTileFromSampler(
    time: number,
    pattern: number,
    tileX: number,
    tileY: number
  ): number {
    return this.sampler.getTile(time, pattern, tileX, tileY);
  }

  step(speedCoeff: number): void {
    const speed =
      speedCoeff *
      Math.pow(
        PERIOD,
        Math.log(Math.max(this.camHW, this.camHH)) / Math.log(2048)
      ) *
      50;
    this.timeFract += speed;
    const delta = Math.floor(this.timeFract);
    if (delta !== 0) {
      this.timeFract -= delta;
      this.refLevel.forward(delta);
    }
  }

  getTimeFract(): number {
    return Math.floor(PERIOD * this.timeFract);
  }

  getTransition(): number {
    const timeFract = this.getTimeFract();
    return Math.max(
      0,
      Math.min(1, (timeFract - TRANSITION_START) / (TRANSITION_END - TRANSITION_START))
    );
  }

  private goUp(): void {
    this.camX += this.refLevel.posX;
    this.camY += this.refLevel.posY;
    this.camX /= 2048;
    this.camY /= 2048;
    this.camHW /= 2048;
    this.camHH /= 2048;
    this.timeFract = this.refLevel.time / PERIOD;
    this.refLevel = this.refLevel.getParent();
  }

  private goDown(): void {
    this.camX *= 2048;
    this.camY *= 2048;
    this.camX += (Math.random() * 2 - 1) * 1e-9;
    this.camY += (Math.random() * 2 - 1) * 1e-9;
    this.camHW *= 2048;
    this.camHH *= 2048;
    const posX = Math.floor(this.camX);
    const posY = Math.floor(this.camY);
    this.camX -= posX;
    this.camY -= posY;
    this.refLevel = this.refLevel.makeSubLevel(
      posX,
      posY,
      Math.floor(this.timeFract * PERIOD)
    );
    this.timeFract = TRANSITION_END / PERIOD;
  }
}
