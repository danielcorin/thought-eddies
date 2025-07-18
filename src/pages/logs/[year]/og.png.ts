import { getCollection } from "astro:content";
import { generateOGImage } from "../../../utils/og";

export async function getStaticPaths() {
    const logs = await getCollection("logs");
    const years = [
        ...new Set(logs.map((log) => new Date(log.data.date).getFullYear())),
    ];

    return years.map((year) => ({
        params: { year: year.toString() },
    }));
}

export async function GET({ params }: { params: { year: string } }) {
    const year = parseInt(params.year);
    const logs = await getCollection("logs", ({ data }) => !data.draft);
    const yearLogs = logs.filter(
        (log) => new Date(log.data.date).getFullYear() === year
    );

    return generateOGImage({
        title: `Logs ${year}`,
        description: `${yearLogs.length} logs from ${year}`,
    });
}