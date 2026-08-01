import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
    site: "https://theriverkeptflowing.com",
    output: "static",

    integrations: [
        mdx()
    ],

    build: {
        assets: "_assets"
    },

    vite: {
        build: {
            sourcemap: false
        }
    }
});
