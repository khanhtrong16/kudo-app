// app/routes/home.tsx

import { Prisma } from "@prisma/client";
import { json, LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { Kudo } from "~/component/kudo";
import Layout from "~/component/layout";
import { RecentBar } from "~/component/recent-bar";
import { SearchBar } from "~/component/search-bar";
import { UserPanel } from "~/component/user-panel";
import { getUser, requireUserId } from "~/utils/auth.server";
import { getFilteredKudos, getRecentKudos } from "~/utils/kudo.server";
import { getOtherUsers } from "~/utils/user.server";

interface KudoWithProfile extends IKudo {
    author: {
        profile: Profile;
    };
}
export const loader: LoaderFunction = async ({ request }) => {
    const userId = await requireUserId(request);
    const users = await getOtherUsers(userId);

    const url = new URL(request.url);
    const sort = url.searchParams.get("sort");
    const filter = url.searchParams.get("filter");
    let sortOptions: Prisma.KudoOrderByWithRelationInput = {};
    if (sort) {
        if (sort === "date") {
            sortOptions = { createdAt: "desc" };
        }
        if (sort === "sender") {
            sortOptions = { author: { profile: { firstName: "asc" } } };
        }
        if (sort === "emoji") {
            sortOptions = { style: { emoji: "asc" } };
        }
    }
    let textFilter: Prisma.KudoWhereInput = {};
    if (filter) {
        textFilter = {
            OR: [
                { message: { mode: "insensitive", contains: filter } },
                {
                    author: {
                        OR: [
                            { profile: { is: { firstName: { mode: "insensitive", contains: filter } } } },
                            { profile: { is: { lastName: { mode: "insensitive", contains: filter } } } },
                        ],
                    },
                },
            ],
        };
    }
    const kudos = await getFilteredKudos(userId, sortOptions, textFilter);
    const recentKudos = await getRecentKudos();
    const user = await getUser(request);
    return json({ users, kudos, recentKudos, user });
};

export default function Home() {
    const { users, kudos, recentKudos, user } = useLoaderData<typeof loader>();
    return (
        <Layout>
            <Outlet />
            <div className="h-full flex">
                <UserPanel users={users} />
                <div className="flex-1 flex flex-col">
                    <SearchBar profile={user.profile} />
                    <div className="flex-1 flex">
                        <div className="w-full p-10 flex flex-col gap-y-4">
                            {kudos.map((kudo: KudoWithProfile) => (
                                <Kudo key={kudo.id} kudo={kudo} profile={kudo.author.profile} />
                            ))}
                        </div>
                        <RecentBar kudos={recentKudos} />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
