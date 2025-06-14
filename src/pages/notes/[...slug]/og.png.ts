import fs from "fs/promises";
import path from "path";
import satori from "satori";
import sharp from "sharp";
import { getCollection } from "astro:content";
import type { InferGetStaticParamsType } from "astro";

// Cache fonts globally to avoid re-reading files
let fontsCache: { name: string; data: Buffer; weight: number }[] | null = null;

async function loadFonts() {
    if (fontsCache) return fontsCache;

    const fontPath = path.join(process.cwd(), "src/assets/fonts/og");

    fontsCache = [
        {
            name: "Inter",
            data: await fs.readFile(path.join(fontPath, "Inter-Regular.ttf")),
            weight: 400,
        },
        {
            name: "Inter",
            data: await fs.readFile(path.join(fontPath, "Inter-Bold.ttf")),
            weight: 700,
        },
    ];

    return fontsCache;
}

const notes = await getCollection("notes");
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export async function GET({ params }: { params: Params }) {
    try {
        const note = notes.find((note) => note.id === params.slug);
        if (!note) {
            return new Response("Note not found", { status: 404 });
        }

        const fonts = await loadFonts();

        // Create simple inline element
        const element = {
            type: "div",
            props: {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                        "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
                    color: "white",
                    fontFamily: "Inter",
                    padding: "48px",
                },
                children: [
                    {
                        type: "h1",
                        props: {
                            style: {
                                fontSize: "64px",
                                fontWeight: 700,
                                margin: "0 0 24px 0",
                                textAlign: "center",
                                lineHeight: 1.1,
                            },
                            children: note.data.title,
                        },
                    },
                    note.data.description
                        ? {
                            type: "p",
                            props: {
                                style: {
                                    fontSize: "32px",
                                    margin: "0 0 24px 0",
                                    opacity: 0.9,
                                    textAlign: "center",
                                },
                                children: note.data.description,
                            },
                        }
                        : null,
                    {
                        type: "div",
                        props: {
                            style: {
                                fontSize: "20px",
                                opacity: 0.75,
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                            },
                            children: [
                                {
                                    type: "span",
                                    props: { children: "Thought Eddies" },
                                },
                                note.data.createdAt
                                    ? {
                                        type: "span",
                                        props: {
                                            children:
                                                new Date(note.data.createdAt)
                                                    .toISOString().split(
                                                        "T",
                                                    )[0],
                                        },
                                    }
                                    : null,
                            ].filter(Boolean),
                        },
                    },
                ].filter(Boolean),
            },
        };

        const svg = await satori(element as any, {
            width: 1200,
            height: 630,
            fonts: fonts as any,
        });

        const png = await sharp(Buffer.from(svg))
            .png({ quality: 80, compressionLevel: 6 })
            .toBuffer();

        return new Response(png, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400", // Cache for 24 hours
            },
        });
    } catch (error) {
        console.error("Notes OG Image Error:", error);
        return new Response(
            `Error: ${
                error instanceof Error ? error.message : "Unknown error"
            }`,
            {
                status: 500,
                headers: {
                    "Content-Type": "text/plain",
                },
            },
        );
    }
}

export async function getStaticPaths() {
    return notes.map((note) => ({
        params: { slug: note.id },
        props: note,
    }));
}
