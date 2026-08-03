import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import {
    defineConfig,
    globalIgnores
} from "eslint/config";

export default defineConfig([

    globalIgnores([
        "dist/**",
        "node_modules/**",
        ".astro/**",
        ".wrangler/**",
        "coverage/**",
        "public/**"
    ]),


    {
        files: [
            "**/*.{js,mjs,cjs,ts,mts,cts}"
        ],

        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended
        ],

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },


    ...eslintPluginAstro.configs.recommended,


    {
        files: [
            "**/*.astro"
        ],

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    }

]);