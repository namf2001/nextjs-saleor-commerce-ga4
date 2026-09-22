import "server-only";

import { cache } from "react";
import { CurrentUserDocument, type CurrentUserQuery } from "@/gql/graphql";

import { auth } from "@/auth";
import { fetchAuthenticatedUserIfSession } from "./fetch-authenticated-user";
import { resolveSessionUser, type SessionAuthState } from "./resolve-session-user";

export type HeaderUser = NonNullable<CurrentUserQuery["me"]> & {
	authProvider?: "keycloak" | "saleor";
};
export type HeaderAuthState = SessionAuthState<HeaderUser>;

/** Header user menu — server session (BFF cookies or Keycloak NextAuth session). */
export const getHeaderAuthState = cache(async (): Promise<HeaderAuthState> => {
	try {
		const nextAuthSession = await auth();
		if (nextAuthSession?.user) {
			const nameParts = (nextAuthSession.user.name ?? "").trim().split(" ");
			const firstName = nameParts[0] ?? "";
			const lastName = nameParts.slice(1).join(" ");
			return {
				status: "authenticated",
				user: {
					id: nextAuthSession.user.id ?? "keycloak-user",
					email: nextAuthSession.user.email ?? "",
					firstName,
					lastName,
					authProvider: "keycloak",
				} as unknown as HeaderUser,
			};
		}
	} catch {
		// Ignore NextAuth session read errors and fallback to Saleor session
	}

	const saleorAuth = await resolveSessionUser(() =>
		fetchAuthenticatedUserIfSession(CurrentUserDocument, {
			cache: "no-cache",
		}),
	);

	if (saleorAuth.status === "authenticated") {
		return {
			status: "authenticated",
			user: {
				...saleorAuth.user,
				authProvider: "saleor",
			} as unknown as HeaderUser,
		};
	}

	return saleorAuth;
});
