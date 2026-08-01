import { defineConfig } from "astro/config";

export default defineConfig({
    site: "https://theriverkeptflowing.com",
    output: "static",

    build: {
        assets: "_assets"
    },

    vite: {
        build: {
            sourcemap: false
        }
    }
});
