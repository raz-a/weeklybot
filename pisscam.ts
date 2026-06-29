import { Cam, Cammer } from "./cam.js";

export type PissCammer = Cammer;

// Keeps the original storage paths so existing save/pisscam.json data is preserved.
export const PissCam = new Cam("./save/pisscam.json", "/pisscammers", "/total_requests");
