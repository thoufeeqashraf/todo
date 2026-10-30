import { register } from 'node:module';

register('./test-resolver.mjs', {
  parentURL: new URL('./', import.meta.url).href,
});
