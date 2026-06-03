import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// Flat config (ESLint 9/10). Replaces the legacy .eslintrc.js.
export default tseslint.config(
  { ignores: ["dist", "node_modules", "jest.config.js", "eslint.config.mjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "on",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": "warn",
    },
  },
  {
    // Spec files aren't in the main tsconfig; lint them without type info.
    files: ["**/*.spec.ts"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { "@typescript-eslint/no-floating-promises": "off" },
  },
);
