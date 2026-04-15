// Type stubs for Deno globals used in Supabase Edge Functions
// These prevent TypeScript (Node mode) false positives in the IDE

declare namespace Deno {
  /**
   * Start an HTTP server.
   * https://deno.land/api?s=Deno.serve
   */
  function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;

  /**
   * Access to environment variables.
   * https://deno.land/api?s=Deno.env
   */
  namespace env {
    function get(key: string): string | undefined;
    function set(key: string, value: string): void;
    function toObject(): Record<string, string>;
  }
}
