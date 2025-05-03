// app/routes/home/profile.tsx

import { Department } from "@prisma/client";
import { ActionFunction, json, LoaderFunction, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { departments } from "~/component/constants";
import { FormField } from "~/component/form-field";
import { ImageUploader } from "~/component/image-uploader";
import { Modal } from "~/component/modal";
import { SelectBox } from "~/component/select-box";
import { getUser, requireUserId } from "~/utils/auth.server";
import { updateUser } from "~/utils/user.server";
import { validateName } from "~/utils/validators.server";

export const loader: LoaderFunction = async ({ request }) => {
    const user = await getUser(request);
    return json({ user });
};
export const action: ActionFunction = async ({ request }) => {
    const userId = await requireUserId(request);
    // lấy giá trị từ form
    const form = await request.formData();
    let firstName = form.get("firstName");
    let lastName = form.get("lastName");
    let department = form.get("department");
    // validate form
    if (typeof firstName !== "string" || typeof lastName !== "string" || typeof department !== "string") {
        return json({ error: `Invalid Form Data` }, { status: 400 });
    }

    // validate form
    const errors = {
        firstName: validateName(firstName),
        lastName: validateName(lastName),
        department: validateName(department),
    };
    // neu co loi thi tra ve loi
    if (Object.values(errors).some(Boolean)) return json({ errors, fields: { department, firstName, lastName } }, { status: 400 });
    // cap nhat user
    await updateUser(userId, {
        firstName,
        lastName,
        department: department as Department,
    });

    return redirect("/home");
};
export default function ProfileSettings() {
    const { user } = useLoaderData<typeof loader>();
    const fetcher = useFetcher(); // Sử dụng fetcher để gửi URL về action /avatar
    const [isUploading, setIsUploading] = useState(false); // Thêm state để quản lý trạng thái upload

    // Lấy thông tin Cloudinary (nên lấy từ loader hoặc biến môi trường được expose an toàn)
    // Ví dụ tạm thời hardcode, bạn nên thay bằng cách lấy từ process.env nếu expose qua loader
    const CLOUDINARY_CLOUD_NAME = "dtbkqynzn"; // Thay bằng Cloud Name của bạn
    const CLOUDINARY_UPLOAD_PRESET = "kudo-app"; // Thay bằng tên Upload Preset unsigned của bạn

    const [formData, setFormData] = useState({
        firstName: user?.profile?.firstName,
        lastName: user?.profile?.lastName,
        department: user?.profile?.department || "MARKETING",
        profilePicture: user?.profile?.profilePicture || "",
    });

    // Cập nhật hàm handleFileUpload
    const handleFileUpload = async (file: File) => {
        if (!file) return;

        setIsUploading(true); // Bắt đầu upload

        const formDataApi = new FormData(); // Tạo FormData để gửi lên Cloudinary
        formDataApi.append("file", file);
        formDataApi.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            // Gọi trực tiếp API Cloudinary từ client
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formDataApi, // Gửi file và upload preset
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
            }

            const data = await response.json();
            const uploadedUrl = data.secure_url; // Lấy URL an toàn từ Cloudinary

            // Cập nhật state ngay lập tức để hiển thị ảnh mới
            setFormData((prev) => ({ ...prev, profilePicture: uploadedUrl }));

            // Gửi *chỉ URL* về server Remix action (/avatar) để lưu vào DB
            fetcher.submit(
                { imageUrl: uploadedUrl }, // Dữ liệu gửi đi chỉ chứa URL
                { method: "post", action: "/avatar" } // Route action của bạn
            );
        } catch (error) {
            console.error("Upload error:", error);
            // Thêm xử lý lỗi hiển thị cho người dùng ở đây nếu cần
        } finally {
            setIsUploading(false); // Kết thúc upload
        }
    };
    // xư lý input change
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
        setFormData((form) => ({ ...form, [field]: event.target.value }));
    };
    return (
        <Modal isOpen={true} className="w-1/3">
            <div className="p-3">
                <h2 className="text-4xl font-semibold text-blue-600 text-center mb-4">Your Profile</h2>
                <div className="flex">
                    <div className="w-1/3">
                        {/* Truyền trạng thái isUploading nếu ImageUploader cần hiển thị loading */}
                        <ImageUploader onChange={handleFileUpload} imageUrl={formData.profilePicture || ""} />
                        {isUploading && <p className="text-center text-sm text-gray-500">Đang tải lên...</p>}
                        {/* Hiển thị trạng thái lưu từ fetcher */}
                        {fetcher.state !== "idle" && <p className="text-center text-sm text-gray-500">Đang lưu...</p>}
                        {fetcher.data?.error && <p className="text-center text-sm text-red-500">Lỗi: {fetcher.data.error}</p>}
                    </div>
                    {/* <div className="w-1/3">
                        <ImageUploader onChange={handleFileUpload} imageUrl={formData.profilePicture || ""} />
                    </div> */}
                    <div className="flex-1">
                        <form method="post">
                            <FormField
                                htmlFor="firstName"
                                label="First Name"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange(e, "firstName")}
                            />
                            <FormField
                                htmlFor="lastName"
                                label="Last Name"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange(e, "lastName")}
                            />
                            <SelectBox
                                className="w-full rounded-xl px-3 py-2 text-gray-400"
                                id="department"
                                label="Department"
                                name="department"
                                options={departments}
                                value={formData.department}
                                onChange={(e) => handleInputChange(e, "department")}
                            />
                            <div className="w-full text-right mt-4">
                                <button className="rounded-xl bg-yellow-300 font-semibold text-blue-600 px-16 py-2 transition duration-300 ease-in-out hover:bg-yellow-400 hover:-translate-y-1">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
