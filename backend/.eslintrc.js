module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': 'warn',
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', 'jest.config.js'],
  overrides: [
    {
      // Spec files need tsconfig.spec.json which includes them
      files: ['**/*.spec.ts'],
      parserOptions: {
        project: 'tsconfig.spec.json',
        tsconfigRootDir: __dirname,
      },
      rules: {
        // Test files commonly use floating promises in assertions
        '@typescript-eslint/no-floating-promises': 'off',
      },
    },
  ],
};
