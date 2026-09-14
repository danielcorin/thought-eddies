export default function devDependencyCache() {
  return {
    name: 'dev-dependency-cache',
    apply: 'serve',
    configEnvironment: {
      order: 'post',
      handler(name) {
        if (name !== 'client') return;

        // The Cloudflare adapter enables ignoreOutdatedRequests. Serving a new
        // bundle under an old ?v= URL can mix cached React with a renderer that
        // imports a different React instance, causing invalid hook calls.
        // Restore Vite's stale-bundle checks in the browser environment.
        return { optimizeDeps: { ignoreOutdatedRequests: false } };
      },
    },
  };
}
