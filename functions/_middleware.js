// functions/_middleware.js (FINAL VERSION - Use this whole file)

// Mapping from level parameter to the required cookie name
const levelCookieMapping = {
    see: 'see_code',
    basic: 'basic_code',
    ktm: 'ktm_code',
};

/**
 * Cloudflare Pages Middleware to protect the MCQ page.
 * Checks for the presence of the specific valid level access cookie
 * matching the 'level' query parameter in the URL.
 */
export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // Define the path to protect
    const protectedPath = '/mcq.html';

    // Check if the requested path is the one we need to protect
    if (url.pathname.toLowerCase() === protectedPath) {

        // --- Get the intended level from the URL query parameter ---
        const requestedLevel = url.searchParams.get('level'); // e.g., 'see', 'basic', 'ktm'

        // --- Validate the requested level ---
        if (!requestedLevel || !levelCookieMapping[requestedLevel]) {
            console.log(`Middleware: Access denied to ${url.pathname}. Missing or invalid 'level' query parameter.`);
            // Redirect to home if level parameter is missing or invalid
            const homeUrl = new URL('/', url);
            return Response.redirect(homeUrl, 302);
        }

        // --- Determine the SPECIFIC cookie needed for this level ---
        const requiredCookieName = levelCookieMapping[requestedLevel]; // e.g., 'see_code'

        // --- Get cookies from the request header ---
        const cookieHeader = request.headers.get('Cookie') || '';
        const cookies = parseCookies(cookieHeader);

        // --- Check if the SPECIFIC required cookie exists AND has the value 'valid' ---
        const hasRequiredCookie = cookies[requiredCookieName] === 'valid';

        if (hasRequiredCookie) {
            // --- User has the correct specific cookie, allow access ---
            console.log(`Middleware: Access granted to ${url.pathname} for level '${requestedLevel}' via cookie '${requiredCookieName}'.`);
            // Proceed to serve mcq.html
            return await next();
        } else {
            // --- Correct specific access cookie not found, deny access ---
            console.log(`Middleware: Access denied to ${url.pathname} for level '${requestedLevel}'. Cookie '${requiredCookieName}' not found or invalid.`);
            // Redirect to the homepage
            const homeUrl = new URL('/', url);
            return Response.redirect(homeUrl, 302);
        }
    }

    // For any other path, just proceed as normal
    return await next();
}

// (Keep the parseCookies helper function as it was before)
function parseCookies(cookieString) {
    const list = {};
    if (!cookieString) return list;

    cookieString.split(';').forEach(function(cookie) {
        let parts = cookie.split('=');
        let key = parts.shift().trim();
        if (key) {
             let value = parts.join('=').trim();
            try {
                 list[key] = decodeURIComponent(value);
            } catch (e) {
                 list[key] = value;
            }
        }
    });
    return list;
}
