import { getCollection } from "astro:content";
import { generateOGImage } from "@utils/og";

export async function getStaticPaths() {
    const logs = await getCollection("logs");
    
    // Get all unique year-month combinations
    const yearMonths = new Set<string>();
    logs.forEach((log) => {
        const date = new Date(log.data.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        yearMonths.add(`${year}-${month}`);
    });

    return Array.from(yearMonths).map((yearMonth) => {
        const [year, month] = yearMonth.split('-');
        return {
            params: { year, month },
        };
    });
}

export async function GET({ params }: { params: { year: string; month: string } }) {
    const year = parseInt(params.year);
    const month = parseInt(params.month);
    
    const logs = await getCollection("logs", ({ data }) => !data.draft);
    const monthLogs = logs.filter((log) => {
        const date = new Date(log.data.date);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
    });

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    const monthName = monthNames[month - 1];

    return generateOGImage({
        title: `${monthName} ${year}`,
        description: `${monthLogs.length} logs from ${monthName} ${year}`,
    });
}