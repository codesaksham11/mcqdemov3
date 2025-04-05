// functions/api/validate-code.js

// Define the correct codes mapping. DO NOT store secrets directly here long-term.
// We retrieve them from environment variables below.
const levelCookieMapping = {
    see: { envVar: 'SEE_CODE', cookieName: 'see_code' },
    basic: { envVar: 'BASIC_CODE', cookieName: 'basic_code' },
    ktm: { envVar: 'KTM_CODE', cookieName: 'ktm_code' },
};

/**
 * Handles POST requests to /api/validate-code
 * Expects JSON body: { level: "see|basic|ktm", code: "user_entered_code" }
 * Responds with JSON: { success: true } or { success: false, message: "..." }
 * On success, sets a secure HttpOnly cookie.
 */
export async function onRequestPost(context) {
    const { request, env } = context; // env provides access to environment variables

    try {
        // 1. Check Content-Type and Parse Request Body
        if (request.headers.get("Content-Type") !== "application/json") {
            return new Response(JSON.stringify({ success: false, message: 'Invalid request format. Expected JSON.' }), {
                status: 415, // Unsupported Media Type
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const { level, code } = body;

        // 2. Basic Input Validation
        if (!level || !code || typeof code !== 'string' || !levelCookieMapping[level]) {
            return new Response(JSON.stringify({ success: false, message: 'Invalid input. Missing level, code, or level is unsupported.' }), {
                status: 400, // Bad Request
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 3. Get the Correct Secret Code from Environment Variables
        const mapping = levelCookieMapping[level];
        const secretCode = env[mapping.envVar]; // Access env variable (e.g., env.SEE_CODE)

        if (!secretCode) {
             console.error(`Environment variable ${mapping.envVar} not set!`);
             // Don't reveal to the user *which* variable is missing
             return new Response(JSON.stringify({ success: false, message: 'Server configuration error.' }), {
                status: 500, // Internal Server Error
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 4. Compare Submitted Code with Secret Code
        if (code === secretCode) {
            // SUCCESS! Code matches.
            console.log(`Successful validation for level: ${level}`);

            // Prepare the secure cookie
            const cookieName = mapping.cookieName;
            const maxAgeSeconds = 60 * 60 * 24 * 7; // Cookie expiry: 7 days
            const cookieHeaderString = `${cookieName}=valid; HttpOnly; Secure; Path=/; Max-Age=${maxAgeSeconds}`;
            // Explanation:
            // - HttpOnly: Prevents client-side JS from accessing the cookie. CRUCIAL FOR SECURITY.
            // - Secure: Sends the cookie only over HTTPS. CRUCIAL FOR SECURITY.
            // - Path=/: Makes the cookie available on all pages of your site.
            // - Max-Age: How long the cookie lasts (in seconds). Alternatively, use 'Expires=...' with a date.

            return new Response(JSON.stringify({ success: true }), {
                status: 200, // OK
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': cookieHeaderString // Instruct the browser to set the cookie
                },
            });

        } else {
            // FAILURE! Code does not match.
            console.log(`Failed validation attempt for level: ${level}`);
            return new Response(JSON.stringify({ success: false, message: 'Incorrect code.' }), {
                status: 401, // Unauthorized
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        console.error("Error processing validation request:", error);
        // Check if it was a JSON parsing error
        if (error instanceof SyntaxError) {
             return new Response(JSON.stringify({ success: false, message: 'Invalid JSON body.' }), {
                status: 400, // Bad Request
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // General server error
        return new Response(JSON.stringify({ success: false, message: 'An unexpected error occurred.' }), {
            status: 500, // Internal Server Error
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Optional: Handle other methods like GET if someone tries to access the URL directly
export async function onRequestGet(context) {
    return new Response(JSON.stringify({ message: 'Please use POST with level and code.' }), {
        status: 405, // Method Not Allowed
        headers: { 'Content-Type': 'application/json', 'Allow': 'POST' },
    });
}
// You might combine POST/GET/etc using a single `onRequest` function and checking `context.request.method`
