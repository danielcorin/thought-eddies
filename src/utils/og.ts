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
            data: await fs.readFile(path.join(fontPath, "Inter-Medium.ttf")),
            weight: 500,
        },
        {
            name: "Inter",
            data: await fs.readFile(path.join(fontPath, "Inter-SemiBold.ttf")),
            weight: 600,
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
        const isMainPage = content.title === "Thought Eddies";

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
                        "linear-gradient(135deg, #1c1b17 0%, #2a2620 50%, #1a1814 100%)",
                    position: "relative",
                    fontFamily: "Inter",
                },
                children: [
                    // Background overlay pattern
                    {
                        type: "div",
                        props: {
                            style: {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background:
                                    "radial-gradient(circle at 20% 80%, rgba(77, 171, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(204, 204, 204, 0.08) 0%, transparent 50%)",
                                opacity: 0.6,
                            },
                        },
                    },
                    // Subtle grid pattern
                    {
                        type: "div",
                        props: {
                            style: {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundImage:
                                    "linear-gradient(rgba(74,74,74,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(74,74,74,0.2) 1px, transparent 1px)",
                                backgroundSize: "32px 32px",
                            },
                        },
                    },
                    // Main content container
                    {
                        type: "div",
                        props: {
                            style: {
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: isMainPage ? "80px 60px" : "60px 60px",
                                maxWidth: "1000px",
                                textAlign: "center",
                                position: "relative",
                                zIndex: 1,
                            },
                            children: [
                                // Main title
                                {
                                    type: "h1",
                                    props: {
                                        style: {
                                            fontSize: isMainPage
                                                ? "84px"
                                                : "68px",
                                            fontWeight: 700,
                                            margin: "0 0 " +
                                                (isMainPage ? "32px" : "24px") +
                                                " 0",
                                            background:
                                                "linear-gradient(135deg, #cccccc 0%, #ffffff 30%, #e8e8e8 70%, #cccccc 100%)",
                                            backgroundClip: "text",
                                            color: "transparent",
                                            lineHeight: 1.1,
                                            letterSpacing: "-0.02em",
                                            textShadow:
                                                "0 0 40px rgba(204,204,204,0.2)",
                                        },
                                        children: content.title,
                                    },
                                },
                                // Description
                                content.description
                                    ? {
                                        type: "p",
                                        props: {
                                            style: {
                                                fontSize: isMainPage
                                                    ? "32px"
                                                    : "28px",
                                                fontWeight: 400,
                                                margin: "0 0 " + (isMainPage
                                                    ? "40px"
                                                    : "32px") +
                                                    " 0",
                                                color: "#a8a8a8",
                                                lineHeight: 1.4,
                                                letterSpacing: "-0.01em",
                                                maxWidth: "800px",
                                            },
                                            children: content.description,
                                        },
                                    }
                                    : null,
                                // Subtitle/metadata bar
                                {
                                    type: "div",
                                    props: {
                                        style: {
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "24px",
                                            padding: "16px 32px",
                                            background:
                                                "rgba(204, 204, 204, 0.08)",
                                            backdropFilter: "blur(12px)",
                                            borderRadius: "16px",
                                            border:
                                                "1px solid rgba(74, 74, 74, 0.4)",
                                            boxShadow:
                                                "0 8px 32px rgba(0, 0, 0, 0.4)",
                                        },
                                        children: content.subtitle
                                            ? content.subtitle.split(" • ").map(
                                                (part, index, array) => [
                                                    {
                                                        type: "span",
                                                        props: {
                                                            style: {
                                                                fontSize:
                                                                    isMainPage
                                                                        ? "20px"
                                                                        : "18px",
                                                                fontWeight: 500,
                                                                color:
                                                                    "#cccccc",
                                                            },
                                                            children: part,
                                                        },
                                                    },
                                                    index < array.length - 1
                                                        ? {
                                                            type: "span",
                                                            props: {
                                                                style: {
                                                                    color:
                                                                        "#4a4a4a",
                                                                    fontSize:
                                                                        "16px",
                                                                },
                                                                children: "•",
                                                            },
                                                        }
                                                        : null,
                                                ],
                                            ).flat().filter(Boolean)
                                            : [
                                                {
                                                    type: "span",
                                                    props: {
                                                        style: {
                                                            fontSize: isMainPage
                                                                ? "20px"
                                                                : "18px",
                                                            fontWeight: 600,
                                                            color: "#cccccc",
                                                        },
                                                        children:
                                                            "Thought Eddies",
                                                    },
                                                },
                                            ],
                                    },
                                },
                            ].filter(Boolean),
                        },
                    },
                    // Decorative elements
                    {
                        type: "div",
                        props: {
                            style: {
                                position: "absolute",
                                top: "40px",
                                right: "40px",
                                width: "120px",
                                height: "120px",
                                background:
                                    "linear-gradient(135deg, rgba(77, 171, 247, 0.15) 0%, rgba(77, 171, 247, 0.08) 100%)",
                                borderRadius: "50%",
                                filter: "blur(40px)",
                            },
                        },
                    },
                    {
                        type: "div",
                        props: {
                            style: {
                                position: "absolute",
                                bottom: "40px",
                                left: "40px",
                                width: "80px",
                                height: "80px",
                                background:
                                    "linear-gradient(135deg, rgba(204, 204, 204, 0.12) 0%, rgba(168, 168, 168, 0.08) 100%)",
                                borderRadius: "50%",
                                filter: "blur(30px)",
                            },
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
            .png({ quality: 90, compressionLevel: 6 })
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
