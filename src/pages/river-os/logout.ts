import type {
    APIRoute
} from "astro";


export const prerender =
    false;


export const POST:
APIRoute =
async ({
    session,
    redirect
}) => {

    if (
        session !==
        undefined
    ) {

        session.destroy();

    }

    return redirect(
        "/river-os/login",
        303
    );

};