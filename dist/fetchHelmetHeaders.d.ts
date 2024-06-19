/// <reference types="node" />
import http from "http";
import type { HelmetHeaderOptions } from ".";
export declare function fetchHelmetHeaders(helmetOptions: HelmetHeaderOptions): Promise<http.IncomingHttpHeaders>;
