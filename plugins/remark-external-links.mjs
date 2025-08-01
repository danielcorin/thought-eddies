import { visit } from 'unist-util-visit';

export default function remarkExternalLinks() {
  return (tree) => {
    visit(tree, 'link', (node, index, parent) => {
      const url = node.url;

      // Check if it's an external link
      if (
        url &&
        (url.startsWith('http://') ||
          url.startsWith('https://') ||
          url.startsWith('//'))
      ) {
        // Skip if it's a local link (same domain)
        if (url.includes('danielcorin.com') || url.includes('localhost')) {
          return;
        }

        // Add attributes to open in new tab
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.target = '_blank';
        node.data.hProperties.rel = 'noopener noreferrer';

        // Create the icon node
        const iconNode = {
          type: 'html',
          value:
            '<span class="external-link-icon" aria-hidden="true" style="display: inline-block; vertical-align: baseline; position: relative; top: 0.125em; margin-left: 0.25rem;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"></path></svg></span>',
        };

        // Insert the icon after the link
        if (parent && typeof index === 'number') {
          parent.children.splice(index + 1, 0, iconNode);
        }
      }
    });
  };
}
