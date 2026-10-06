import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "next-env.d.ts",
    // Código histórico conservado sin refactorizar en Control Total v2.
    "legacy/**",
    "assets/**",
    "scripts/**",
    "tests/**",
  ]),
]);
