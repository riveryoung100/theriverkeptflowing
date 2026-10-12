import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { handleFoodPublicMenuRequest } from "../../../lib/food/public-menu-runtime";

export const prerender = false;
export const ALL: APIRoute = ({ request }) => handleFoodPublicMenuRequest(request.method, () => env);
