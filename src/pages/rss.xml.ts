import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context: { site: string }) {
    const notes = await getCollection("notes", ({ data }) => !data.draft);
    return rss({
        title: "Thought Eddies",
        description: "An experimental digital garden",
        site: context.site,
        items: notes.map((note) => ({
            title: note.data.title,
            pubDate: note.data.createdAt,
            description: note.data.description,
            link: `/notes/${note.id}/`,
        })),
    });
}
