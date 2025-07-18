import { getCollection } from "astro:content";
import { generateOGImage } from "../../utils/og";

export async function GET() {
    const logs = await getCollection("logs");
    const posts = await getCollection("posts");
    
    const allTags = new Set<string>();
    [...logs, ...posts].forEach((item) => {
        item.data.tags?.forEach((tag: string) => allTags.add(tag));
    });

    return generateOGImage({
        title: "Tags",
        description: `Browse content by ${allTags.size} tags`,
    });
}