import { type UserDetailsFragment } from "@/gql/graphql";

type Props = {
	user: UserDetailsFragment;
};

export const UserInfo = ({ user }: Props) => {
	const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

	return (
		<div className="truncate text-xs text-muted-foreground">
			{userName ? (
				<span className="mb-0.5 block truncate font-medium text-foreground">{userName}</span>
			) : null}
			{userName !== user.email && user.email ? <span className="block truncate">{user.email}</span> : null}
		</div>
	);
};
