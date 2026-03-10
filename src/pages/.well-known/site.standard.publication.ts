import type { APIRoute } from 'astro';

export const prerender = true;

// AT-URI of the publication record created by scripts/standard_site.py
// Update this after running: python scripts/standard_site.py setup --handle danielcorin.com --password <app-password>
const AT_URI =
  'at://did:plc:mracrip6qu3vw46nbewg44sm/site.standard.publication/self';

export const GET: APIRoute = () => {
  return new Response(AT_URI, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
