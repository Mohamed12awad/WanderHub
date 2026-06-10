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
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        // `ignoreRestSiblings` allows the common `const { id, ...rest } = body`
        // pattern used across services to strip read-only fields before a write.
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": "warn",
    },
  },
  {
    // Spec files aren't in the main tsconfig; lint them without type info.
    files: ["**/*.spec.ts"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      // Test mocks legitimately use `any`; typing them is churn, not safety.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
