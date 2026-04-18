import nextConfig from "eslint-config-next";
import security from "eslint-plugin-security";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/**",
      "storybook-static/**",
      "src/generated/**",
    ],
  },
];

export default config;
