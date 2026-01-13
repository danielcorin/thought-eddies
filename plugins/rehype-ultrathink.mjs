import { visit } from 'unist-util-visit';

const colors = [
  'rgb(235,95,87)',
  'rgb(245,139,87)',
  'rgb(250,195,95)',
  'rgb(145,200,130)',
  'rgb(130,170,220)',
  'rgb(155,130,200)',
  'rgb(200,130,180)',
  'rgb(235,95,87)',
  'rgb(245,139,87)',
  'rgb(250,195,95)',
];

export default function rehypeUltrathink() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!node.value.includes('ultrathink')) return;
      if (!parent || typeof index !== 'number') return;

      const parts = node.value.split(/(ultrathink)/gi);
      if (parts.length === 1) return;

      const newNodes = parts
        .map((part) => {
          if (part.toLowerCase() === 'ultrathink') {
            return {
              type: 'element',
              tagName: 'span',
              properties: { className: ['ultrathink'] },
              children: part.split('').map((char, i) => ({
                type: 'element',
                tagName: 'span',
                properties: { style: `color: ${colors[i]}` },
                children: [{ type: 'text', value: char }],
              })),
            };
          }
          if (part) {
            return { type: 'text', value: part };
          }
          return null;
        })
        .filter(Boolean);

      parent.children.splice(index, 1, ...newNodes);
    });
  };
}



