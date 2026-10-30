export function redirect(url: string): never {
  const error = new Error(`NEXT_REDIRECT:${url}`);
  (error as Error & { digest: string }).digest = `NEXT_REDIRECT;replace;${url};307`;
  throw error;
}
