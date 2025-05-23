// app/routes/home/kudo.$userId.tsx

import { Color, Emoji, KudoStyle } from "@prisma/client";
import { ActionFunction, json, LoaderFunction, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { colorMap, emojiMap } from "~/component/constants";
import { Kudo } from "~/component/kudo";
import { Modal } from "~/component/modal";
import { SelectBox } from "~/component/select-box";
import { UserCircle } from "~/component/user-circle";
import { getUser, requireUserId } from "~/utils/auth.server";
import { createKudo } from "~/utils/kudo.server";
import { getUserById } from "~/utils/user.server";
export const loader: LoaderFunction = async ({ request, params }) => {
    const { userId } = params;
    if (typeof userId !== "string") {
        return redirect("/home");
    }
    const recipient = await getUserById(userId);
    const user = await getUser(request);
    return json({ recipient, user });
};
export const action: ActionFunction = async ({ request }) => {
    const userId = await requireUserId(request);

    // lay du lieu tu form
    const form = await request.formData();
    const message = form.get("message");
    const backgroundColor = form.get("backgroundColor");
    const textColor = form.get("textColor");
    const emoji = form.get("emoji");
    const recipientId = form.get("recipientId");
    // kiem tra cac gia tri co hop le khong
    if (
        typeof message !== "string" ||
        typeof recipientId !== "string" ||
        typeof backgroundColor !== "string" ||
        typeof textColor !== "string" ||
        typeof emoji !== "string"
    ) {
        return json({ error: `Invalid Form Data` }, { status: 400 });
    }
    if (!message.length) {
        return json({ error: `Please provide a message.` }, { status: 400 });
    }
    if (!recipientId.length) {
        return json({ error: `No recipient found...` }, { status: 400 });
    }
    // tao kudo
    await createKudo(message, userId, recipientId, {
        backgroundColor: backgroundColor as Color,
        textColor: textColor as Color,
        emoji: emoji as Emoji,
    });
    // chuyen huong ve trang home sau khi tao xong kudo và trả về data
    return redirect("/home");
};
// trả về 1 modal hiển thị bảng để viết kudo cho người nhận
export default function KudoModal() {
    const actionData = useActionData();
    const [formError] = useState(actionData?.error || "");
    const [formData, setFormData] = useState({
        message: "",
        style: {
            backgroundColor: "RED",
            textColor: "WHITE",
            emoji: "THUMBSUP",
        } as KudoStyle,
    });

    // ham xu ly thay doi gia tri cua form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        setFormData((data) => ({ ...data, [field]: e.target.value }));
    };
    // ham xu ly thay doi gia tri cua form style (selectBox)
    const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        setFormData((data) => ({
            ...data,
            style: {
                ...data.style,
                [field]: e.target.value,
            },
        }));
    };
    // ham xu ly lay cac gia tri cua object
    const getOptions = (data: any) =>
        Object.keys(data).reduce((acc: any[], curr) => {
            acc.push({
                name: curr.charAt(0).toUpperCase() + curr.slice(1).toLowerCase(),
                value: curr,
            });
            return acc;
        }, []);

    const colors = getOptions(colorMap);
    const emojis = getOptions(emojiMap);
    const { recipient, user } = useLoaderData<typeof loader>();
    return (
        <Modal isOpen={true} className="w-2/3 p-10">
            <div className="text-xs font-semibold text-center tracking-wide text-red-500 w-full mb-2">{formError}</div>
            <form method="post">
                <input type="hidden" value={recipient.id} name="recipientId" />
                <div className="flex flex-col md:flex-row gap-y-2 md:gap-y-0">
                    <div className="text-center flex flex-col items-center gap-y-2 pr-8">
                        <UserCircle profile={recipient.profile} className="h-24 w-24" />
                        <p className="text-blue-300">
                            {recipient.profile.firstName} {recipient.profile.lastName}
                        </p>
                        {recipient.profile.department && (
                            <span className="px-2 py-1 bg-gray-300 rounded-xl text-blue-300 w-auto">
                                {recipient.profile.department[0].toUpperCase() + recipient.profile.department.toLowerCase().slice(1)}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col gap-y-4">
                        <textarea
                            name="message"
                            className="w-full rounded-xl h-40 p-4"
                            value={formData.message}
                            onChange={(e) => handleChange(e, "message")}
                            placeholder={`Say something nice about ${recipient.profile.firstName}...`}
                        />
                        <div className="flex flex-col items-center md:flex-row md:justify-start gap-x-4">
                            {/* Select box */}
                            <SelectBox
                                options={colors}
                                name="backgroundColor"
                                value={formData.style.backgroundColor}
                                onChange={(e) => handleStyleChange(e, "backgroundColor")}
                                label="Background Color"
                                containerClassName="w-36"
                                className="w-full rounded-xl px-3 py-2 text-gray-400"
                            />
                            <SelectBox
                                options={colors}
                                name="textColor"
                                value={formData.style.textColor}
                                onChange={(e) => handleStyleChange(e, "textColor")}
                                label="Text Color"
                                containerClassName="w-36"
                                className="w-full rounded-xl px-3 py-2 text-gray-400"
                            />
                            <SelectBox
                                options={emojis}
                                label="Emoji"
                                name="emoji"
                                value={formData.style.emoji}
                                onChange={(e) => handleStyleChange(e, "emoji")}
                                containerClassName="w-36"
                                className="w-full rounded-xl px-3 py-2 text-gray-400"
                            />
                        </div>
                    </div>
                </div>
                <br />
                <p className="text-blue-600 font-semibold mb-2">Preview</p>
                <div className="flex flex-col items-center md:flex-row gap-x-24 gap-y-2 md:gap-y-0">
                    <Kudo profile={recipient.profile} kudo={formData} />
                    {/* The Preview Goes Here */}
                    <div className="flex-1" />
                    <button
                        type="submit"
                        className="rounded-xl bg-yellow-300 font-semibold text-blue-600 w-80 h-12 transition duration-300 ease-in-out hover:bg-yellow-400 hover:-translate-y-1"
                    >
                        Send
                    </button>
                </div>
            </form>
        </Modal>
    );
}
