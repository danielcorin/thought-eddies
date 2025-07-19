import { getCollection } from "astro:content";
import type { InferGetStaticParamsType } from "astro";
import { generateOGImage } from "@utils/og";

const posts = await getCollection("posts", ({ data }) => !data.draft);
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export async function GET({ params }: { params: Params }) {
    const year = params.year;
    const yearPosts = posts.filter(
        (post) =>
            new Date(post.data.createdAt).getFullYear().toString() === year,
    );

    return generateOGImage({
        title: `Posts from ${year}`,
        description: `${yearPosts.length} ${
            yearPosts.length === 1 ? "post" : "posts"
        }`,
    });
}

export async function getStaticPaths() {
    const years = [
        ...new Set(
            posts.map((post) => new Date(post.data.createdAt).getFullYear()),
        ),
    ];

    return years.map((year) => ({
        params: { year: year.toString() },
    }));
}
