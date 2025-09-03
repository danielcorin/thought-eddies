import { visit } from 'unist-util-visit';

export default function rehypeFormatFootnotes() {
  return (tree) => {
    // Find all footnote reference links and add brackets
    visit(tree, 'element', (node) => {
      // Look for <a> tags with data-footnote-ref attribute
      if (
        node.tagName === 'a' &&
        node.properties &&
        node.properties.dataFootnoteRef !== undefined
      ) {
        // Wrap the text content in brackets
        if (
          node.children &&
          node.children.length > 0 &&
          node.children[0].type === 'text'
        ) {
          node.children[0].value = `[${node.children[0].value}]`;
        }
      }
    });
  };
}
