import { getCollection } from "astro:content";
import type { InferGetStaticParamsType } from "astro";
import { generateOGImage } from "../../../utils/og";

const notes = await getCollection("notes");
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export async function GET({ params }: { params: Params }) {
    const note = notes.find((note) => note.id === params.slug);
    if (!note) {
        return new Response("Note not found", { status: 404 });
    }

    const subtitle = [
        "Thought Eddies",
        note.data.createdAt
            ? new Date(note.data.createdAt).toISOString().split("T")[0]
            : null,
    ].filter(Boolean).join(" • ");

    return generateOGImage({
        title: note.data.title,
        description: note.data.description,
        subtitle,
    });
}

export async function getStaticPaths() {
    return notes.map((note) => ({
        params: { slug: note.id },
        props: note,
    }));
}
