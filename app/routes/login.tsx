import { ActionFunction, json, LoaderFunction, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { FormField } from "~/component/form-field";
import Layout from "~/component/layout";
import { getUser, Login, Register } from "~/utils/auth.server";
import { validateEmail, validateName, validatePassword } from "~/utils/validators.server";

export const loader: LoaderFunction = async ({ request }) => {
    return (await getUser(request)) ? redirect("/") : null;
};
// ham xu ly form
export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();
    const action = formData.get("_action");
    const email = formData.get("email");
    const password = formData.get("password");
    let firstName = formData.get("firstName");
    let lastName = formData.get("lastName");
    // validate form
    if (typeof action !== "string" || typeof email !== "string" || typeof password !== "string") {
        return json({ error: `Invalid Form Data`, form: action }, { status: 400 });
    }

    if (action === "register" && (typeof firstName !== "string" || typeof lastName !== "string")) {
        return json({ error: `Invalid Form Data`, form: action }, { status: 400 });
    }
    // validate email, password, firstName, lastName
    const errors = {
        email: validateEmail(email),
        password: validatePassword(password),
        ...(action === "register"
            ? {
                  firstName: validateName((firstName as string) || ""),
                  lastName: validateName((lastName as string) || ""),
              }
            : {}),
    };

    if (Object.values(errors).some(Boolean)) return json({ errors, fields: { email, password, firstName, lastName }, form: action }, { status: 400 });
    // xu ly action(login or register)
    switch (action) {
        case "login": {
            return await Login({ email, password });
        }
        case "register": {
            firstName = firstName as string;
            lastName = lastName as string;
            return await Register({ email, password, firstName, lastName });
        }
        default:
            return json({ error: `Invalid Form Data` }, { status: 400 });
    }
};
export default function Index() {
    const actionData = useActionData();
    const [formData, setFormData] = useState({
        email: actionData?.fields?.email || "",
        password: actionData?.fields?.password || "",
        firstName: actionData?.fields?.firstName || "",
        lastName: actionData?.fields?.lastName || "",
    });
    const [action, setAction] = useState("login");
    const firstLoad = useRef(true);
    // lay du lieu tu action vao state validate form
    const [errors, setErrors] = useState(actionData?.errors || {});
    const [formError, setFormError] = useState(actionData?.error || "");
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
        setFormData((form) => ({ ...form, [field]: event.target.value }));
    };
    useEffect(() => {
        if (!firstLoad.current) {
            const newState = {
                email: "",
                password: "",
                firstName: "",
                lastName: "",
            };
            setErrors({});
            setFormError("");
            setFormData(newState);
        }
    }, [action]);
    useEffect(() => {
        firstLoad.current = false;
    }, []);
    useEffect(() => {
        if (actionData) {
            setErrors(actionData.errors || {});
            setFormError(actionData.error || "");
        }
    }, [actionData]);

    return (
        <Layout>
            <div className="h-full justify-center items-center flex flex-col gap-y-4">
                <button
                    onClick={() => setAction(action == "login" ? "register" : "login")}
                    className="absolute top-8 right-8 rounded-xl bg-yellow-300 font-semibold text-blue-600 px-3 py-2 transition duration-300 ease-in-out hover:bg-yellow-400 hover:-translate-y-1"
                >
                    {action === "login" ? "Sign Up" : "Sign In"}
                </button>
                <h2 className="text-5xl font-extrabold text-yellow-300">Welcome to Kudos!</h2>
                <p className="font-semibold text-slate-300">{action === "login" ? "Log In To Give Some Praise!" : "Sign Up To Get Started!"}</p>
                <Form method="POST" className="rounded-2xl bg-gray-200 p-6 w-96">
                    <div className="text-xs font-semibold text-center tracking-wide text-red-500 w-full">{formError}</div>
                    <FormField
                        htmlFor="email"
                        label="Email"
                        value={formData.email}
                        onChange={(e) => handleInputChange(e, "email")}
                        error={errors?.email}
                    />
                    <FormField
                        htmlFor="password"
                        type="password"
                        label="Password"
                        value={formData.password}
                        onChange={(e) => handleInputChange(e, "password")}
                        error={errors?.password}
                    />
                    {/* Kiểm tra nếu action là "register" thì hiển thị các trường First Name và Last Name */}
                    {action === "register" && (
                        <>
                            <FormField
                                htmlFor="firstName"
                                label="First Name"
                                onChange={(e) => handleInputChange(e, "firstName")}
                                value={formData.firstName}
                                error={errors?.firstName}
                            />
                            <FormField
                                htmlFor="lastName"
                                label="Last Name"
                                onChange={(e) => handleInputChange(e, "lastName")}
                                value={formData.lastName}
                                error={errors?.lastName}
                            />
                        </>
                    )}
                    <div className="w-full text-center">
                        <button
                            type="submit"
                            // tra ve _action de xu ly action(login or register)
                            name="_action"
                            value={action}
                            className="rounded-xl mt-2 bg-yellow-300 px-3 py-2 text-blue-600 font-semibold transition duration-300 ease-in-out hover:bg-yellow-400 hover:-translate-y-1"
                        >
                            {action === "login" ? "Sign In" : "Sign Up"}
                        </button>
                    </div>
                </Form>
            </div>
        </Layout>
    );
}
