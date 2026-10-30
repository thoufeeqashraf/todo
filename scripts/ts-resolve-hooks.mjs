import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

function fileHref(filePath) {
  const withExt = path.extname(filePath) ? filePath : `${filePath}.ts`;
  return pathToFileURL(withExt).href;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(fileHref(path.join(srcRoot, specifier.slice(2))), context);
  }
  const parent = context.parentURL ?? '';
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  if (relative && !path.extname(specifier) && parent.includes('/src/')) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      return nextResolve(specifier, context);
    }
  }
  return nextResolve(specifier, context);
}
