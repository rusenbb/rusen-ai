declare module "upng-js" {
  interface DecodedPng {
    width: number;
    height: number;
  }

  interface UPNGApi {
    decode(buffer: ArrayBuffer): DecodedPng;
    toRGBA8(decoded: DecodedPng): ArrayBuffer[];
  }

  const UPNG: UPNGApi;
  export default UPNG;
}
