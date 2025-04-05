// functions/_middleware.js

/**
 * Cloudflare Pages Middleware to protect the MCQ page.
 * Checks for the presence of a valid level access cookie.
 */
export async function onRequest(context) {
    const { request, next, env } = context; // 'env' holds environment variables if needed later
    const url = new URL(request.url);

    // Define the path(s) to protect
    const protectedPath = '/mcq.html';

    // --- Check if the requested path is the one we need to protect ---
    if (url.pathname.toLowerCase() === protectedPath) {
        // --- Get cookies from the request header ---
        const cookieHeader = request.headers.get('Cookie') || '';
        const cookies = parseCookies(cookieHeader);

        // --- Check if ANY valid level cookie exists ---
        // We check for specific cookies that should have been set securely
        // by the '/api/validate-code' function upon successful validation.
        // Here, we assume the function sets the cookie value to 'valid' for simplicity.
        const hasValidSeeCookie = cookies['see_code'] === 'valid';
        const hasValidBasicCookie = cookies['basic_code'] === 'valid';
        const hasValidKtmCookie = cookies['ktm_code'] === 'valid';

        if (hasValidSeeCookie || hasValidBasicCookie || hasValidKtmCookie) {
            // --- User has a valid cookie for at least one level, allow access ---
            console.log(`Middleware: Access granted to ${url.pathname} via cookie.`);
            // Proceed to serve the requested page (mcq.html)
            return await next();
        } else {
            // --- No valid access cookie found, deny access ---
            console.log(`Middleware: Access denied to ${url.pathname}. No valid cookie found.`);

            // Option 1: Redirect to the homepage
            const homeUrl = new URL('/', url); // Get base URL (/) relative to current request URL
            return Response.redirect(homeUrl, 302); // 302 Found (Temporary Redirect)

            // Option 2: Show an "Access Denied" message (Less user-friendly)
            // return new Response('Access Denied: A valid access code is required for this test level.', {
            //     status: 403, // Forbidden
            //     headers: { 'Content-Type': 'text/plain' }
            // });
        }
    }

    // --- For any other path, just proceed as normal ---
    // Pass the request to the next function or serve the static asset
    return await next();
}

/**
 * Helper function to parse cookie string into an object.
 * @param {string} cookieString - The cookie header string.
 * @returns {object} - An object of key-value pairs for cookies.
 */
function parseCookies(cookieString) {
    const list = {};
    if (!cookieString) return list;

    cookieString.split(';').forEach(function(cookie) {
        let parts = cookie.split('=');
        let key = parts.shift().trim();
        if (key) {
             let value = parts.join('=').trim();
            try {
                 // Decode URI components just in case
                 list[key] = decodeURIComponent(value);
            } catch (e) {
                 // If decoding fails (e.g., malformed cookie), store raw value
                 list[key] = value;
            }

        }
    });

    return list;
}
