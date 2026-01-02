module.exports = {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-order"],
  rules: {
    "declaration-no-important": true,
    "max-nesting-depth": 0,
    "number-max-precision": 3,
    "order/properties-alphabetical-order": true,
    "selector-max-compound-selectors": 4,
    "selector-max-id": 0,
  },
};
