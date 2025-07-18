import { getEntry } from "astro:content";
import { generateOGImage } from "../../../utils/og";

export async function getStaticPaths() {
    const { getCollection } = await import("astro:content");
    const logs = await getCollection("logs");
    return logs.map((log) => ({
        params: { slug: log.id },
    }));
}

export async function GET({ params }: { params: { slug: string } }) {
    const log = await getEntry("logs", params.slug);
    if (!log) {
        return new Response(null, {
            status: 404,
        });
    }

    const date = new Date(log.data.date);
    const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return generateOGImage({
        title: log.data.title,
        description: formattedDate,
    });
}