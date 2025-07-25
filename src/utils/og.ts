import fs from 'fs/promises';
import path from 'path';
import satori from 'satori';
import sharp from 'sharp';

// Cache fonts globally to avoid re-reading files
let fontsCache: { name: string; data: Buffer; weight: number }[] | null = null;

async function loadFonts() {
  if (fontsCache) return fontsCache;

  const fontPath = path.join(process.cwd(), 'src/assets/fonts/og');

  fontsCache = [
    {
      name: 'Inter',
      data: await fs.readFile(path.join(fontPath, 'Inter-Regular.ttf')),
      weight: 400,
    },
    {
      name: 'Inter',
      data: await fs.readFile(path.join(fontPath, 'Inter-Medium.ttf')),
      weight: 500,
    },
    {
      name: 'Inter',
      data: await fs.readFile(path.join(fontPath, 'Inter-SemiBold.ttf')),
      weight: 600,
    },
    {
      name: 'Inter',
      data: await fs.readFile(path.join(fontPath, 'Inter-Bold.ttf')),
      weight: 700,
    },
  ];

  return fontsCache;
}

export interface OGContent {
  title: string;
  description?: string;
  subtitle?: string;
  category?: string;
  date?: string;
}

export async function generateOGImage(content: OGContent): Promise<Response> {
  try {
    const fonts = await loadFonts();
    const isMainPage = content.title === 'Thought Eddies';

    const element = {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(135deg, #1c1b17 0%, #2a2620 50%, #1a1814 100%)',
          position: 'relative',
          fontFamily: 'Inter',
        },
        children: [
          // Background overlay pattern
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'radial-gradient(circle at 20% 80%, rgba(77, 171, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(204, 204, 204, 0.08) 0%, transparent 50%)',
                opacity: 0.6,
              },
            },
          },
          // Subtle dot pattern (matching site CSS)
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  'radial-gradient(rgba(74,74,74,0.8) 2px, transparent 2px)',
                backgroundSize: '24px 24px',
              },
            },
          },
          // Header with site name
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '60px',
                left: '60px',
                right: '60px',
                display: 'flex',
                alignItems: 'center',
              },
              children: {
                type: 'span',
                props: {
                  style: {
                    fontSize: '32px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    color: '#cccccc',
                    textTransform: 'uppercase',
                  },
                  children: 'Thought Eddies',
                },
              },
            },
          },
          // Main content - centered
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: '120px 60px',
                position: 'relative',
                zIndex: 1,
              },
              children: isMainPage
                ? [
                    // Main page title
                    {
                      type: 'h1',
                      props: {
                        style: {
                          fontSize: '96px',
                          fontWeight: 700,
                          margin: '0 0 32px 0',
                          background:
                            'linear-gradient(135deg, #cccccc 0%, #ffffff 30%, #e8e8e8 70%, #cccccc 100%)',
                          backgroundClip: 'text',
                          color: 'transparent',
                          lineHeight: 1.2,
                          letterSpacing: '-0.02em',
                          textShadow: '0 0 40px rgba(204,204,204,0.2)',
                          textAlign: 'center',
                        },
                        children: content.title,
                      },
                    },
                    // Main page description
                    content.description
                      ? {
                          type: 'p',
                          props: {
                            style: {
                              fontSize: '36px',
                              fontWeight: 400,
                              margin: '0',
                              color: '#a8a8a8',
                              lineHeight: 1.4,
                              letterSpacing: '-0.01em',
                              textAlign: 'center',
                            },
                            children: content.description,
                          },
                        }
                      : null,
                  ].filter(Boolean)
                : [],
            },
          },
          // Bottom section with title and metadata (for non-main pages)
          !isMainPage
            ? {
                type: 'div',
                props: {
                  style: {
                    position: 'absolute',
                    bottom: '60px',
                    left: '60px',
                    right: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                  },
                  children: [
                    // Title
                    {
                      type: 'h1',
                      props: {
                        style: {
                          fontSize: '64px',
                          fontWeight: 700,
                          margin: '0',
                          background:
                            'linear-gradient(135deg, #cccccc 0%, #ffffff 30%, #e8e8e8 70%, #cccccc 100%)',
                          backgroundClip: 'text',
                          color: 'transparent',
                          lineHeight: 1.2,
                          letterSpacing: '-0.02em',
                          textShadow: '0 0 40px rgba(204,204,204,0.2)',
                        },
                        children: content.title,
                      },
                    },
                    // Description
                    content.description
                      ? {
                          type: 'p',
                          props: {
                            style: {
                              fontSize: '28px',
                              fontWeight: 400,
                              margin: '0',
                              color: '#a8a8a8',
                              lineHeight: 1.4,
                              letterSpacing: '-0.01em',
                              maxWidth: '900px',
                            },
                            children: content.description,
                          },
                        }
                      : null,
                    // Metadata row
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '20px',
                          flexWrap: 'wrap',
                        },
                        children: [
                          // Category
                          content.category
                            ? {
                                type: 'span',
                                props: {
                                  style: {
                                    fontSize: '22px',
                                    fontWeight: 500,
                                    color: '#cccccc',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  },
                                  children: content.category,
                                },
                              }
                            : null,
                          // Separator
                          content.category && content.date
                            ? {
                                type: 'span',
                                props: {
                                  style: {
                                    color: '#4a4a4a',
                                    fontSize: '22px',
                                  },
                                  children: '•',
                                },
                              }
                            : null,
                          // Date
                          content.date
                            ? {
                                type: 'span',
                                props: {
                                  style: {
                                    fontSize: '22px',
                                    fontWeight: 400,
                                    color: '#a8a8a8',
                                  },
                                  children: content.date,
                                },
                              }
                            : null,
                        ].filter(Boolean),
                      },
                    },
                  ].filter(Boolean),
                },
              }
            : null,
          // Decorative elements
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '40px',
                right: '40px',
                width: '120px',
                height: '120px',
                background:
                  'linear-gradient(135deg, rgba(77, 171, 247, 0.15) 0%, rgba(77, 171, 247, 0.08) 100%)',
                borderRadius: '50%',
                filter: 'blur(40px)',
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '40px',
                left: '40px',
                width: '80px',
                height: '80px',
                background:
                  'linear-gradient(135deg, rgba(204, 204, 204, 0.12) 0%, rgba(168, 168, 168, 0.08) 100%)',
                borderRadius: '50%',
                filter: 'blur(30px)',
              },
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
      .png({ quality: 90, compressionLevel: 6 })
      .toBuffer();

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('OG Image Error:', error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    );
  }
}
