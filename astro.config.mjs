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
        sitemap({
            filter: (page) =>
                !page.startsWith(
                    "https://theriverkeptflowing.com/sesh/studio/"
                ) &&
                !["/register", "/register/", "/login", "/login/"].includes(
                    new URL(page).pathname
                )
        })
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
