// app/routes/avatar.tsx
import { ActionFunction, json } from "@remix-run/node";
import { requireUserId } from "~/utils/auth.server";
// import { uploadAvatar } from "~/utils/s3.server";
import { prisma } from "~/utils/prisma.server";

export const action: ActionFunction = async ({ request }) => {
    const userId = await requireUserId(request); // Giữ lại nếu cần biết user nào đang cập nhật avatar
    try {
        const formData = await request.formData();
        const imageUrl = formData.get("imageUrl")?.toString(); // Lấy URL từ form data client gửi lên

        if (!imageUrl || typeof imageUrl !== "string") {
            return json({ error: "Image URL is required." }, { status: 400 });
        }

        // Chỉ cần lưu URL đã nhận được
        await prisma.user.update({
            data: {
                profile: {
                    update: {
                        profilePicture: imageUrl, // Lưu URL Cloudinary
                    },
                },
            },
            where: {
                id: userId,
            },
        });

        // Trả về thành công (có thể kèm URL nếu client cần)
        return json({ success: true, imageUrl });
    } catch (error) {
        console.error("Avatar update action error:", error);
        // Kiểm tra lỗi cụ thể nếu cần
        return json({ error: "Failed to update avatar." }, { status: 500 });
    }
};
