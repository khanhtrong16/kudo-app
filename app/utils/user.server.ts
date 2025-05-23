import bcrypt from "bcryptjs";
import { RegisterForm } from "./types.server";
import { prisma } from "./prisma.server";
import { Profile } from "@prisma/client";

export async function createUser(user: RegisterForm) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const newUser = await prisma.user.create({
        data: {
            email: user.email,
            password: passwordHash,
            profile: {
                firstName: user.firstName,
                lastName: user.lastName,
            },
        },
    });
    return { id: newUser.id, email: newUser.email };
}
export const getOtherUsers = async (userId: string) => {
    return prisma.user.findMany({
        where: {
            id: { not: userId },
        },
        orderBy: {
            profile: {
                firstName: "asc",
            },
        },
    });
};
export const getUserById = async (userId: string) => {
    return await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
};
export const updateUser = async (userId: string, profile: Partial<Profile>) => {
    await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            profile: {
                update: profile,
            },
        },
    });
};
