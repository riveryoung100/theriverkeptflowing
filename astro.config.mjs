import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
    site: "https://theriverkeptflowing.com",
    output: "static",

    integrations: [
        mdx(),
        sitemap()
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
