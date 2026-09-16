import "server-only";

import { cache } from "react";
import { CurrentUserDocument, type CurrentUserQuery } from "@/gql/graphql";

import { auth } from "@/auth";
import { fetchAuthenticatedUserIfSession } from "./fetch-authenticated-user";
import { resolveSessionUser, type SessionAuthState } from "./resolve-session-user";

export type HeaderUser = NonNullable<CurrentUserQuery["me"]>;
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
				} as unknown as HeaderUser,
			};
		}
	} catch {
		// Ignore NextAuth session read errors and fallback to Saleor session
	}

	return resolveSessionUser(() =>
		fetchAuthenticatedUserIfSession(CurrentUserDocument, {
			cache: "no-cache",
		}),
	);
});
