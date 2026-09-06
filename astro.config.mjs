import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
    site: "https://theriverkeptflowing.com",
    output: "static",

    adapter: cloudflare({
        imageService: "passthrough",
        prerenderEnvironment: "node"
    }),

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
