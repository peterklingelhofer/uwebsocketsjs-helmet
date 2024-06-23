# uWebSockets.js Helmet

A zero-dependency security middleware for [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) similar to [Helmet](https://github.com/helmetjs/helmet) for Express and [@fastify/helmet](https://github.com/fastify/fastify-helmet) for Fastify.

## Installation

Install the package using npm:
```sh
npm i peterklingelhofer/uwebsocketsjs-helmet#0.0.3
```

Install the package using pnpm:

```sh
pnpm add peterklingelhofer/uwebsocketsjs-helmet#0.0.3
```

Install the package using yarn:

```sh
yarn add peterklingelhofer/uwebsocketsjs-helmet#0.0.3
```

Install the package using bun:

```sh
bun add peterklingelhofer/uwebsocketsjs-helmet#0.0.3
```

## Basic Usage
```ts
import { App } from "uWebSockets.js";
import { helmet } from "uwebsocketsjs-helmet";

const app = App();

app.any("/*", (res, req) => {
  helmet()(res, req); // Apply helmet headers
  res.end();
});

app.listen(9001, (token) => {
  if (token) {
    console.log("Listening to port 9001");
  } else {
    console.log("Failed to listen to port 9001");
  }
});
```

## Custom Headers
```ts
import { App } from "uWebSockets.js";
import { helmet } from "uwebsocketsjs-helmet";

import { App } from "uWebSockets.js";
import { helmet, HelmetHeaderOptions } from "uwebsocketsjs-helmet";

const customHeaders: HelmetHeaderOptions = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
  "X-Frame-Options": "SAMEORIGIN",
};

const app = App();

app.any("/*", (res, req) => {
  // Apply custom helmet headers
  helmet(customHeaders)(res, req);

  res.end("Hello from uWebSockets.js with custom security headers!");
});

app.listen(9001, (token) => {
  if (token) {
    console.log("Listening to port 9001");
  } else {
    console.log("Failed to listen to port 9001");
  }
});

```

## Note on installing uWebSockets.js
Installing uWebSockets.js for the first time can be a little unintuitive. Find your desired release tag in the [uWebSockets.js repository
](https://github.com/uNetworking/uWebSockets.js) and replace the `#v20.44.0` in the commands below with your desired release tag.


Install the package using npm:
```sh
npm i uWebSockets.js@uNetworking/uWebSockets.js#v20.44.0
```

Install the package using pnpm:

```sh
pnpm add uWebSockets.js@uNetworking/uWebSockets.js#v20.44.0
```

Install the package using yarn:

```sh
yarn add uWebSockets.js@uNetworking/uWebSockets.js#v20.44.0
```

Install the package using bun:

```sh
bun add uWebSockets.js@uNetworking/uWebSockets.js#v20.44.0
```
