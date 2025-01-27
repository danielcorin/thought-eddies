/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-astro", "@ianvs/prettier-plugin-sort-imports"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
    {
      files: "*.mdx",
      options: {
        parser: "mdx",
      },
    },
  ],
};
