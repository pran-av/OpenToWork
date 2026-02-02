/// <reference lib="deno.ns" />

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

