import { getCollection } from "astro:content";
import { generateOGImage } from "../../utils/og";

const logs = await getCollection("logs", ({ data }) => !data.draft);

export async function GET() {
    const logsCount = logs.length;

    return generateOGImage({
        title: "Logs",
        description: `${logsCount} daily logs and reflections`,
    });
}