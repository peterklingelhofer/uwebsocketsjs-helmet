/// <reference types="node" />
import { HelmetOptions } from "helmet";
import http from "http";
export declare function fetchHelmetHeaders(helmetOptions: HelmetOptions): Promise<http.IncomingHttpHeaders>;
