import { getCollection } from "astro:content";
import type { InferGetStaticParamsType } from "astro";
import { generateOGImage } from "../../../utils/og";

const notes = await getCollection("notes", ({ data }) => !data.draft);
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export async function GET({ params }: { params: Params }) {
    const year = params.year;
    const yearNotes = notes.filter(
        (note) =>
            new Date(note.data.createdAt).getFullYear().toString() === year,
    );

    return generateOGImage({
        title: `Notes from ${year}`,
        description: `${yearNotes.length} ${
            yearNotes.length === 1 ? "note" : "notes"
        }`,
    });
}

export async function getStaticPaths() {
    const years = [
        ...new Set(
            notes.map((note) => new Date(note.data.createdAt).getFullYear()),
        ),
    ];

    return years.map((year) => ({
        params: { year: year.toString() },
    }));
}
