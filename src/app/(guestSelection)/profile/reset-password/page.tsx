import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ResetPasswordClient from "./ResetPasswordClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    const user = await prisma.user.findUnique({
        where: { user_id: session.user.id },
        select: { name: true, img: true },
    });

    return (
        <ResetPasswordClient
            initialNama={user?.name ?? ""}
            initialAvatar={user?.img ?? null}
        />
    );
}