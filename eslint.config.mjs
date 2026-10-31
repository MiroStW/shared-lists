import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";

export default defineConfig([
  globalIgnores([
    "build/**",
    "public/sw.js",
    "node_modules/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  // eslint-config-next already registers the `import` plugin, so only the
  // rule sets of its flat presets are added here.
  {
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.typescript.rules,
    },
  },
  {
    rules: {
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowTernary: true },
      ],
      "arrow-body-style": "off",
      "no-else-return": "off",
      "import/no-unresolved": "off",
      "import/extensions": "off",
      "import/order": "off",
      "import/prefer-default-export": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // React Compiler rules new in eslint-plugin-react-hooks 7; existing
      // components violate them and need a refactor, not a lint fix.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: [
      "next.config.js",
      "playwright.config.js",
      "scripts/**/*.js",
      "e2e/**/*.js",
    ],
    languageOptions: { sourceType: "commonjs" },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
]);
