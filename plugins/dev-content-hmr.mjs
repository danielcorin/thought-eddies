import { fileURLToPath } from 'node:url';

const dataStoreId = '\0astro:data-layer-content';
const dataStorePath = fileURLToPath(
  new URL('../.astro/data-store.json', import.meta.url)
);

// Astro 7.1.6 invalidates content only in the SSR environment. Cloudflare's
// prerenderEnvironment: 'node' serves static routes in a separate environment,
// which also needs fresh content and a cleared getStaticPaths() cache.
export default function devContentHmr() {
  return {
    name: 'dev-content-hmr',
    apply: 'serve',
    resolveId(id) {
      // Vite appends .js to this internal entry's URL during full reloads.
      // Accept that URL until Astro is upgraded to a compatible release with
      // https://github.com/withastro/astro/pull/17685 (released in 7.2.3).
      if (id === 'astro:server-app.js') {
        return this.resolve('astro:server-app');
      }
    },
    configureServer(server) {
      const onStoreChange = (event, path) => {
        if (path !== dataStorePath || !['add', 'change'].includes(event))
          return;
        const environment = server.environments.prerender;
        if (!environment?.runner) return;

        const module = environment.moduleGraph.getModuleById(dataStoreId);
        if (module) {
          environment.moduleGraph.invalidateModule(
            module,
            undefined,
            Date.now(),
            true
          );
        }
        const evaluated = environment.runner.evaluatedModules;
        const runnerModule = evaluated.getModuleById(dataStoreId);
        // The content runtime keeps a singleton store. Its importers must also
        // be re-evaluated so pages don't retain that old store through closures.
        const seen = new Set();
        const invalidate = (module) => {
          if (!module || seen.has(module.id)) return;
          seen.add(module.id);
          for (const id of module.importers)
            invalidate(evaluated.getModuleById(id));
          evaluated.invalidateModule(module);
        };
        invalidate(runnerModule);

        environment.hot.send('astro:content-changed', {});
      };

      server.watcher.on('all', onStoreChange);
      server.httpServer?.once('close', () => {
        server.watcher.off('all', onStoreChange);
      });
    },
  };
}
