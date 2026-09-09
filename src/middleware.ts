import {
    defineMiddleware
} from "astro:middleware";

import {
    isRiverOsPath,
    isRiverOsPublicPath,
    RIVER_OS_SESSION_KEY
} from "./lib/river-os/access";


export const onRequest =
    defineMiddleware(
        async (
            context,
            next
        ) => {

            const pathname =
                context.url.pathname;

            if (
                !isRiverOsPath(
                    pathname
                ) ||
                isRiverOsPublicPath(
                    pathname
                )
            ) {

                return next();

            }

            const session =
                context.session;

            if (session === undefined) {

                return new Response(
                    "River OS session support is unavailable.",
                    {
                        status:
                            503,

                        headers: {
                            "cache-control":
                                "no-store"
                        }
                    }
                );

            }

            const authenticated =
                await session.get(
                    RIVER_OS_SESSION_KEY
                );

            if (authenticated !== true) {

                return context.redirect(
                    "/river-os/login",
                    303
                );

            }

            const response =
                await next();

            response.headers.set(
                "cache-control",
                "no-store"
            );

            return response;

        }
    );