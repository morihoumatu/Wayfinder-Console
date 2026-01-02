module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "script",
  },
  extends: ["eslint:recommended"],
  plugins: ["jsdoc"],
  reportUnusedDisableDirectives: true,
  rules: {
    "array-callback-return": "error",
    "block-scoped-var": "error",
    "consistent-return": "error",
    curly: ["error", "all"],
    "default-case": "error",
    "default-case-last": "error",
    eqeqeq: ["error", "always"],
    "no-alert": "error",
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "no-else-return": "error",
    "no-implicit-coercion": "error",
    "no-multi-assign": "error",
    "no-return-assign": ["error", "always"],
    "no-shadow": "error",
    "no-throw-literal": "error",
    "no-undef-init": "error",
    "no-unneeded-ternary": "error",
    "no-unused-expressions": [
      "error",
      { allowShortCircuit: false, allowTernary: false, allowTaggedTemplates: false },
    ],
    "no-unused-vars": ["error", { args: "after-used", ignoreRestSiblings: true }],
    "no-use-before-define": ["error", { functions: false, classes: true, variables: true }],
    "no-useless-call": "error",
    "no-useless-return": "error",
    "no-var": "error",
    "object-shorthand": ["error", "always"],
    "prefer-const": "error",
    "prefer-template": "error",
    "jsdoc/require-jsdoc": [
      "error",
      {
        contexts: ["FunctionDeclaration", "FunctionExpression[id]"],
      },
    ],
    "jsdoc/require-description": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-returns-description": "error",
    "max-params": ["error", 4],
    radix: ["error", "always"],
    yoda: "error",
  },
  overrides: [
    {
      files: ["app.js"],
      env: {
        browser: true,
      },
      globals: {
        google: "readonly",
      },
    },
    {
      files: ["server.js"],
      env: {
        node: true,
      },
    },
  ],
};
