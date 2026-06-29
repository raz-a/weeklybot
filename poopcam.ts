import { Cam, Cammer } from "./cam.js";

export type PoopCammer = Cammer;

// Keeps the original storage paths so existing save/poopcam.json data is preserved.
export const PoopCam = new Cam("./save/poopcam.json", "/poopcammers", "/total_requests");
