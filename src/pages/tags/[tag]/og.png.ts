import { getCollection } from "astro:content";
import { generateOGImage } from "../../../utils/og";

export async function getStaticPaths() {
    const logs = await getCollection("logs");
    const posts = await getCollection("posts");
    
    const allTags = new Set<string>();
    [...logs, ...posts].forEach((item) => {
        item.data.tags?.forEach((tag: string) => allTags.add(tag));
    });

    return Array.from(allTags).map((tag) => ({
        params: { tag },
    }));
}

export async function GET({ params }: { params: { tag: string } }) {
    const logs = await getCollection("logs", ({ data }) => 
        data.tags?.includes(params.tag) && !data.draft
    );
    const posts = await getCollection("posts", ({ data }) => 
        data.tags?.includes(params.tag) && !data.draft
    );

    const totalCount = logs.length + posts.length;

    return generateOGImage({
        title: params.tag,
        description: `${totalCount} ${totalCount === 1 ? 'entry' : 'entries'} tagged with #${params.tag}`,
    });
}