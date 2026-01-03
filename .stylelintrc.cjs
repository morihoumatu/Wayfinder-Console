module.exports = {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["reports/**"],
  plugins: [
    "stylelint-order",
    "./stylelint-rules/file-purpose-comment",
    "./stylelint-rules/inline-comment",
    "./stylelint-rules/large-file",
  ],
  rules: {
    "declaration-no-important": true,
    "max-nesting-depth": 0,
    "number-max-precision": 3,
    "order/properties-alphabetical-order": true,
    "selector-max-compound-selectors": 4,
    "selector-max-id": 0,
    "project/file-purpose-comment": true,
    "project/inline-comment": true,
    "project/large-file": {
      maxLines: 300,
      maxRules: 40,
      maxSelectors: 120,
      maxDeclarations: 300,
    },
  },
};
