import { withAuth } from "next-auth/middleware";

export default withAuth({
    // Matches the pages config in `[...nextauth]`
    pages: {
        signIn: "/login",
    },
});

export const config = {
    // Protect all routes except:
    // - api/auth (NextAuth routes)
    // - login (Login page)
    // - _next (Next.js internals)
    // - static files (images, favicon, etc)
    matcher: [
        "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
    ],
};
