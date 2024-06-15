import type { HttpRequest, HttpResponse } from "uWebSockets.js";
import type { HelmetHeaderOptions } from ".";

export declare function helmet(headers?: HelmetHeaderOptions): (res: HttpResponse, req: HttpRequest) => void;
