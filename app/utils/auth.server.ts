import { json, redirect } from "@remix-run/react";
import { prisma } from "./prisma.server";
import { LoginForm, RegisterForm } from "./types.server";
import { createUser } from "./user.server";
import bcrypt from "bcryptjs";
import { createCookieSessionStorage } from "@remix-run/node";

// khoi tao session check session secret có tồn tại hay không
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set");
}
// khởi tạo session storage để quản lý session
const storage = createCookieSessionStorage({
    cookie: {
        name: "kudos-session",
        secure: process.env.NODE_ENV === "production",
        secrets: [sessionSecret],
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
    },
});
// Hàm xử lí logic đăng kí
export async function Register(user: RegisterForm) {
    const exists = await prisma.user.count({ where: { email: user.email } });
    if (exists) {
        return json({ error: `User already exists with that email` }, { status: 400 });
    }

    const newUser = await createUser(user);
    if (!newUser) {
        return json(
            {
                error: `Something went wrong trying to create a new user.`,
                fields: { email: user.email, password: user.password },
            },
            { status: 400 }
        );
    }
    return createUserSession(newUser.id, "/");
}
// Hàm xử lí logic đăng nhập
export async function Login({ email, password }: LoginForm) {
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) return json({ error: `Incorrect login` }, { status: 400 });
    return createUserSession(user.id, "/");
}

export async function createUserSession(userId: string, redirectTo: string) {
    const session = await storage.getSession();
    session.set("userId", userId);
    return redirect(redirectTo, {
        headers: {
            "Set-Cookie": await storage.commitSession(session),
        },
    });
}
// Hàm bắt buộc người dùng phải đăng nhập, nếu không sẽ redirect đến trang login
export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
    const session = await getUserSession(request); // Lấy session từ cookie
    const userId = session.get("userId"); // Lấy userId từ session

    // Nếu không có userId hoặc kiểu dữ liệu không hợp lệ, redirect đến trang login
    if (!userId || typeof userId !== "string") {
        const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
        throw redirect(`/login?${searchParams}`);
    }

    // Trả về userId nếu hợp lệ
    return userId;
}
// Hàm lấy session từ request cookie
function getUserSession(request: Request) {
    return storage.getSession(request.headers.get("Cookie"));
}
// Hàm lấy userId từ session, trả về null nếu không tồn tại
async function getUserId(request: Request) {
    const session = await getUserSession(request);
    const userId = session.get("userId");
    if (!userId || typeof userId !== "string") return null;
    return userId;
}

// Hàm lấy thông tin user từ database dựa trên userId trong session
export async function getUser(request: Request) {
    const userId = await getUserId(request);
    // Nếu không có userId, trả về null (người dùng chưa đăng nhập)
    if (typeof userId !== "string") {
        return null;
    }
    try {
        // Truy vấn người dùng từ database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, profile: true }, // Chỉ lấy những trường cần thiết
        });
        return user;
    } catch {
        // Nếu có lỗi (ví dụ user không còn tồn tại), thực hiện logout
        throw logout(request);
    }
}

// Hàm đăng xuất người dùng: huỷ session và redirect về trang login
export async function logout(request: Request) {
    const session = await getUserSession(request);
    return redirect("/login", {
        headers: {
            "Set-Cookie": await storage.destroySession(session), // Xoá cookie session
        },
    });
}
