import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";

const authOptions: NextAuthOptions = {
    providers: [
        // AzureADProvider({
        //     clientId: process.env.AZURE_AD_CLIENT_ID || "",
        //     clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
        //     tenantId: process.env.AZURE_AD_TENANT_ID,
        // }),
        CredentialsProvider({
            name: "Guest Access",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "admin" },
                password: { label: "Password", type: "password", placeholder: "admin" }
            },
            async authorize(credentials, req) {
                // Simple dummy check
                if (credentials?.username === "admin" && credentials?.password === "admin") {
                    return { id: "1", name: "Guest Admin", email: "admin@journal.local" }
                }
                return null
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Allows signed in user to access the app
            // To restrict to specific domains (e.g. binus.edu), uncomment the lines below:

            /*
            const allowedDomains = ["binus.edu", "binus.ac.id", "outlook.com"];
            const email = user.email?.toLowerCase();
            if (email) {
               const domain = email.split("@")[1];
               if (allowedDomains.includes(domain)) {
                 return true;
               }
            }
            return false; // Return false to deny access
            */

            return true;
        },
        async redirect({ url, baseUrl }) {
            // Trust the client-provided callback URL (essential for VPS with no NEXTAUTH_URL set)
            if (url.startsWith("/")) return `${baseUrl}${url}`
            // Allow any URL that starts with http/https
            else if (url.startsWith("http")) return url
            return baseUrl
        }
    },
    pages: {
        signIn: '/login', // Custom login page
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
