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
            weight: 400 as const,
        },
        {
            name: "Inter",
            data: await fs.readFile(path.join(fontPath, "Inter-Bold.ttf")),
            weight: 700 as const,
        },
    ];

    return fontsCache;
}

export async function GET() {
    try {
        const fonts = await loadFonts();

        // Simple inline element instead of component
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
                                fontSize: "80px",
                                fontWeight: 700,
                                margin: "0 0 24px 0",
                                textAlign: "center",
                                lineHeight: 1.1,
                            },
                            children: "Thought Eddies",
                        },
                    },
                    {
                        type: "p",
                        props: {
                            style: {
                                fontSize: "40px",
                                margin: "0 0 24px 0",
                                opacity: 0.9,
                                textAlign: "center",
                            },
                            children: "An Experimental Digital Garden",
                        },
                    },
                    {
                        type: "div",
                        props: {
                            style: {
                                fontSize: "24px",
                                opacity: 0.75,
                            },
                            children: "thoughteddies.com",
                        },
                    },
                ],
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

export async function SVG(component: any) {
    const fontPath = path.join(process.cwd(), "src/assets/fonts/og");

    return await satori(component as any, {
        width: 1200,
        height: 630,
        fonts: [
            {
                name: "Inter",
                data: await fs.readFile(
                    path.join(fontPath, "Inter-Regular.ttf"),
                ),
                weight: 400,
            },
            {
                name: "Inter",
                data: await fs.readFile(path.join(fontPath, "Inter-Bold.ttf")),
                weight: 700,
            },
        ],
    });
}

export async function PNG(component: any) {
    return await sharp(Buffer.from(await SVG(component)))
        .png()
        .toBuffer();
}
