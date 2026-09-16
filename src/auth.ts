import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Keycloak({
			clientId: process.env.KEYCLOAK_CLIENT_ID || "saleor-storefront",
			clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
			issuer: process.env.KEYCLOAK_ISSUER || "http://localhost:8085/realms/saleor",
		}),
	],
	callbacks: {
		async jwt({ token, account }) {
			if (account) {
				token.accessToken = account.access_token;
				token.idToken = account.id_token;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.sub) {
				session.user.id = token.sub;
			}
			return session;
		},
	},
	secret:
		process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "keycloak-super-secret-jwt-key-32-chars-min",
});
