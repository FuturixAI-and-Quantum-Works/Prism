/** @type {import("prettier").Config} */
const config = {
  endOfLine: "lf",
  printWidth: 100,
  trailingComma: "all",
  overrides: [
    {
      files: "frontend/**/*.{js,jsx,ts,tsx}",
      options: {
        semi: false,
        singleQuote: true,
      },
    },
    {
      files: "backend/**/*.{js,jsx,ts,tsx}",
      options: {
        semi: true,
        singleQuote: false,
      },
    },
    {
      files: ["*.json", "**/*.json"],
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
    {
      files: ["*.md", "**/*.md", "*.mdx", "**/*.mdx", "*.mdc", "**/*.mdc"],
      options: {
        parser: "markdown",
        proseWrap: "preserve",
      },
    },
  ],
};

export default config;
