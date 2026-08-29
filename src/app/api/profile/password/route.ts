import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { passwordLama, passwordBaru } = await req.json();

    if (!passwordLama || !passwordBaru) {
        return NextResponse.json({ message: "Data tidak lengkap" }, { status: 400 });
    }

    if (passwordBaru.length < 6) {
        return NextResponse.json(
            { message: "Password baru minimal 6 karakter" },
            { status: 400 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { user_id: session.user.id },
    });

    if (!user) {
        return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(passwordLama, user.password);
    if (!isValid) {
        return NextResponse.json({ message: "WrongOldPassword" }, { status: 400 });
    }

    const hashedNew = await bcrypt.hash(passwordBaru, 10);

    await prisma.user.update({
        where: { user_id: session.user.id },
        data: { password: hashedNew },
    });

    return NextResponse.json({ message: "Password berhasil diubah" });
}