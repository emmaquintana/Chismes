import { Lucia, Session, User } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import prisma from "./db";
import { cache } from "react";
import { cookies } from "next/headers";

const adapter = new PrismaAdapter(prisma.session, prisma.users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		// this sets cookies with super long expiration
		// since Next.js doesn't allow Lucia to extend cookie expiration when rendering pages
		expires: false,
		attributes: {
			// set to `true` when using HTTPS
			secure: process.env.NODE_ENV === "production"
		}
	},
    getUserAttributes: (attributes) => {
		return {
			// attributes has the type of DatabaseUserAttributes
			username: attributes.username,
			firstName: attributes.firstName ?? "Anonimo",
			lastName: attributes.lastName,
			email: attributes.email,
			gender: (attributes.gender==='M') ? "Masculino" : (attributes.gender==='F') ? 'Femenino' : (attributes.gender==='O') ? "Otro" : "-",
			createdAt: attributes.createdAt,
			follows: attributes.follows,
			followers: attributes.followers,
			birthdate: attributes.birthdate
		};
	}
});

export const validateRequest = cache(
	async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
		const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
		if (!sessionId) {
			return {
				user: null,
				session: null
			};
		}

		const result = await lucia.validateSession(sessionId);
		// next.js throws when you attempt to set cookie when rendering page
		try {
			if (result.session && result.session.fresh) {
				const sessionCookie = lucia.createSessionCookie(result.session.id);
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
			if (!result.session) {
				const sessionCookie = lucia.createBlankSessionCookie();
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
		} catch {}
		return result;
	}
);

// IMPORTANT!
declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
	firstName: string;
	lastName: string;
	email: string;
	gender: string;
	status: string;
	createdAt: string;
	follows: number;
	followers: number;
	birthdate: Date;
}

export type SignUpInputs = {
	username: string,
	password: string,
	confirmPassword: string,
	email: string,
	birthdate: any,
	firstName: string,
	lastName: string,
	gender: "masc" | "fem" | "other" | "noAnswer";
}

export type SignInInputs = {
	username: string,
	password: string
}