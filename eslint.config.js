import js from '@eslint/js';
import react from 'eslint-plugin-react';

export default [
  js.config({
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      semi: "error",
      "react/prop-types": "off"
    },
  }),
  react.config({}),
];
