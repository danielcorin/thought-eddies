import fs from "fs/promises";
import path from "path";
import satori from "satori";
import sharp from "sharp";

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

export interface OGContent {
    title: string;
    description?: string;
    subtitle?: string;
}

export async function generateOGImage(content: OGContent): Promise<Response> {
    try {
        const fonts = await loadFonts();

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
                                fontSize: content.title === "Thought Eddies"
                                    ? "72px"
                                    : "64px",
                                fontWeight: 700,
                                margin: content.title === "Thought Eddies"
                                    ? "0 0 32px 0"
                                    : "0 0 24px 0",
                                textAlign: "center",
                                lineHeight: 1.1,
                            },
                            children: content.title,
                        },
                    },
                    content.description
                        ? {
                            type: "p",
                            props: {
                                style: {
                                    fontSize: content.title === "Thought Eddies"
                                        ? "36px"
                                        : "32px",
                                    margin: content.title === "Thought Eddies"
                                        ? "0 0 32px 0"
                                        : "0 0 24px 0",
                                    opacity: 0.9,
                                    textAlign: "center",
                                },
                                children: content.description,
                            },
                        }
                        : null,
                    {
                        type: "div",
                        props: {
                            style: {
                                fontSize: content.title === "Thought Eddies"
                                    ? "24px"
                                    : "20px",
                                opacity: 0.75,
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                            },
                            children: content.subtitle
                                ? content.subtitle.split(" • ").map((
                                    part,
                                    index,
                                    array,
                                ) => [
                                    {
                                        type: "span",
                                        props: { children: part },
                                    },
                                    index < array.length - 1
                                        ? {
                                            type: "span",
                                            props: { children: "•" },
                                        }
                                        : null,
                                ]).flat().filter(Boolean)
                                : [
                                    {
                                        type: "span",
                                        props: { children: "Thought Eddies" },
                                    },
                                ],
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
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch (error) {
        console.error("OG Image Error:", error);
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
