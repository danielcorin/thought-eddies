import { getCollection } from "astro:content";
import { generateOGImage } from "../../utils/og";

const notes = await getCollection("notes", ({ data }) => !data.draft);

export async function GET() {
    const notesCount =
        notes.filter((note) => !note.id.includes("level")).length;

    return generateOGImage({
        title: "Notes",
        description: `${notesCount} notes and experiments`,
    });
}
