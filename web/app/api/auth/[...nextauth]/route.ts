import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID || "",
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
            tenantId: process.env.AZURE_AD_TENANT_ID,
        }),
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
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url
            return baseUrl
        }
    },
    pages: {
        signIn: '/login', // Custom login page
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
