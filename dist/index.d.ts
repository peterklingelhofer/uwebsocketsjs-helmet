import type { HttpRequest, HttpResponse } from "uWebSockets.js";
export type HelmetHeaderOptions = {
    [key: string]: string;
};
export declare function helmet(headers?: HelmetHeaderOptions): (res: HttpResponse, req: HttpRequest) => void;
