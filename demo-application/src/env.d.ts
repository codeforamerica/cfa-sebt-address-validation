// Define the type of the environment variables.
declare interface Env {
  readonly NODE_ENV: string;
  readonly NG_APP_SMARTY_API_KEY: string;

  [key: string]: unknown;
}

// Choose how to access the environment variables.
// Remove the unused options.

// 1. Use import.meta.env.YOUR_ENV_VAR in your code. (conventional)
declare interface ImportMeta {
  readonly env: Env;
}

// 2. Use _NGX_ENV_.YOUR_ENV_VAR in your code. (customizable)
// You can modify the name of the variable in angular.json.
// ngxEnv: {
//  define: '_NGX_ENV_',
// }
declare const _NGX_ENV_: Env;

// // 3. Use process.env.YOUR_ENV_VAR in your code. (deprecated)
// declare namespace NodeJS {
//   // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//   export interface ProcessEnv extends Env {}
// }
