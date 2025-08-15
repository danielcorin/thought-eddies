<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:custom="http://example.com/custom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
        <style type="text/css">
          :root {
            /* Light theme colors */
            --color-bg-note-light: #f4f1e4;
            --color-bg-code-note-light: #e8e5d8;
            --color-ink-light-theme: #2d3436;
            --color-ink-light-light: #636e72;
            --color-accent-light: #0984e3;
            --color-link-light: var(--color-accent-light);
            --color-border-light: #b4b4b4;

            /* Dark mode colors */
            --color-bg-note-dark: #1c1b17;
            --color-bg-code-note-dark: #2a2925;
            --color-ink-dark: #cccccc;
            --color-ink-light-dark: #a8a8a8;
            --color-accent-dark: #4dabf7;
            --color-link-dark: var(--color-accent-dark);
            --color-border-dark: #4a4a4a;

            /* Default to light theme */
            --color-bg: var(--color-bg-note-light);
            --color-bg-code: var(--color-bg-code-note-light);
            --color-ink: var(--color-ink-light-theme);
            --color-ink-light: var(--color-ink-light-light);
            --color-accent: var(--color-accent-light);
            --color-link: var(--color-link-light);
            --color-border: var(--color-border-light);

            /* Typography */
            --font-primary: 'Futura';
            --font-prose: 'Inter', Georgia, serif;
            --font-mono: 'JetBrains Mono', monospace;

            /* Spacing */
            --spacing-xs: 0.5rem;
            --spacing-sm: 0.75rem;
            --spacing-md: 1rem;
            --spacing-lg: 2rem;
            --spacing-xl: 3rem;

            /* Font Sizes */
            --text-xs: 0.75rem;
            --text-sm: 0.875rem;
            --text-base: 1rem;
            --text-lg: 1.125rem;
            --text-xl: 1.25rem;
            --text-2xl: 1.5rem;
            --text-3xl: 1.875rem;
            --text-4xl: 2.25rem;
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --color-bg: var(--color-bg-note-dark);
              --color-bg-code: var(--color-bg-code-note-dark);
              --color-ink: var(--color-ink-dark);
              --color-ink-light: var(--color-ink-light-dark);
              --color-accent: var(--color-accent-dark);
              --color-link: var(--color-link-dark);
              --color-border: var(--color-border-dark);
            }
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            min-height: 100vh;
            background-image: radial-gradient(
              color-mix(in srgb, var(--color-border) 60%, transparent) 1px,
              transparent 1px
            );
            background-size: 20px 20px;
            background-position: 0 0;
            background-color: var(--color-bg);
            color: var(--color-ink);
            font-family: var(--font-prose);
            line-height: 1.6;
          }

          .content-wrapper {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--spacing-lg);
            color: var(--color-ink-light);
          }

          .header {
            padding: var(--spacing-xl) 0 var(--spacing-lg);
            text-align: center;
          }

          h1 {
            font-family: var(--font-primary);
            font-size: var(--text-4xl);
            line-height: 1.1;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            color: var(--color-ink);
          }

          .description {
            color: var(--color-ink-light);
            font-size: var(--text-lg);
            margin-bottom: var(--spacing-md);
          }

          .subscribe-info {
            background: var(--color-bg-code);
            border-radius: 4px;
            padding: var(--spacing-lg);
            margin-bottom: var(--spacing-xl);
          }

          .subscribe-info h2 {
            font-family: var(--font-primary);
            font-size: var(--text-2xl);
            font-weight: 600;
            margin-bottom: var(--spacing-md);
            color: var(--color-ink);
          }

          .feed-url {
            background: var(--color-bg);
            padding: var(--spacing-md);
            border-radius: 4px;
            font-family: var(--font-mono);
            font-size: var(--text-base);
            word-break: break-all;
            margin: var(--spacing-md) 0;
            color: var(--color-ink);
          }

          .items {
            max-width: 90ch;
            margin: 0 auto;
          }

          .item {
            background: var(--color-bg-code);
            border-radius: 4px;
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-md);
          }

          .item-title {
            font-family: var(--font-primary);
            font-size: var(--text-2xl);
            font-weight: 600;
            margin-bottom: var(--spacing-xs);
          }

          .item-title a {
            color: var(--color-ink);
            text-decoration: none;
            transition: opacity 0.2s;
          }

          .item-title a:hover {
            opacity: 0.8;
            color: var(--color-link);
          }

          .item-meta {
            font-family: var(--font-mono);
            font-size: var(--text-base);
            color: var(--color-ink-light);
          }

          a {
            color: var(--color-ink);
            text-decoration: underline;
            transition: opacity 0.2s;
          }

          a:hover {
            opacity: 0.8;
            color: var(--color-link);
          }

          a:focus-visible {
            outline: 2px solid var(--color-accent);
            outline-offset: 2px;
          }

          p {
            font-size: var(--text-base);
            margin-bottom: var(--spacing-md);
          }

          @media (max-width: 640px) {
            .content-wrapper {
              padding: 0 var(--spacing-md);
            }

            h1 {
              font-size: var(--text-3xl);
            }

            .subscribe-info {
              padding: var(--spacing-md);
            }

            .subscribe-info h2 {
              font-size: var(--text-xl);
            }

            .item-title {
              font-size: var(--text-xl);
            }
          }
        </style>
        <script type="text/javascript">
          // Apply theme based on system preference
          (function() {
            const root = document.documentElement;
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (prefersDark) {
              root.style.setProperty('--color-bg', 'var(--color-bg-note-dark)');
              root.style.setProperty('--color-bg-code', 'var(--color-bg-code-note-dark)');
              root.style.setProperty('--color-ink', 'var(--color-ink-dark)');
              root.style.setProperty('--color-ink-light', 'var(--color-ink-light-dark)');
              root.style.setProperty('--color-accent', 'var(--color-accent-dark)');
              root.style.setProperty('--color-link', 'var(--color-link-dark)');
              root.style.setProperty('--color-border', 'var(--color-border-dark)');
            }
            
            // Listen for theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
              if (e.matches) {
                root.style.setProperty('--color-bg', 'var(--color-bg-note-dark)');
                root.style.setProperty('--color-bg-code', 'var(--color-bg-code-note-dark)');
                root.style.setProperty('--color-ink', 'var(--color-ink-dark)');
                root.style.setProperty('--color-ink-light', 'var(--color-ink-light-dark)');
                root.style.setProperty('--color-accent', 'var(--color-accent-dark)');
                root.style.setProperty('--color-link', 'var(--color-link-dark)');
                root.style.setProperty('--color-border', 'var(--color-border-dark)');
              } else {
                root.style.setProperty('--color-bg', 'var(--color-bg-note-light)');
                root.style.setProperty('--color-bg-code', 'var(--color-bg-code-note-light)');
                root.style.setProperty('--color-ink', 'var(--color-ink-light-theme)');
                root.style.setProperty('--color-ink-light', 'var(--color-ink-light-light)');
                root.style.setProperty('--color-accent', 'var(--color-accent-light)');
                root.style.setProperty('--color-link', 'var(--color-link-light)');
                root.style.setProperty('--color-border', 'var(--color-border-light)');
              }
            });
          })();
        </script>
      </head>
      <body>
        <div class="content-wrapper">
          <div class="header">
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p class="description"><xsl:value-of select="/rss/channel/description"/></p>
            <p><a href="{/rss/channel/link}">Visit Website</a></p>
          </div>

          <div class="subscribe-info">
            <h2>Subscribe to this feed</h2>
            <p>Copy the URL below and paste it into your RSS reader:</p>
            <div class="feed-url">
              <xsl:choose>
                <xsl:when test="contains(/rss/channel/title, 'Posts')">
                  <xsl:value-of select="/rss/channel/link"/>posts/rss.xml
                </xsl:when>
                <xsl:when test="contains(/rss/channel/title, 'Logs')">
                  <xsl:value-of select="/rss/channel/link"/>logs/rss.xml
                </xsl:when>
                <xsl:when test="contains(/rss/channel/title, 'Today I Learned')">
                  <xsl:value-of select="/rss/channel/link"/>til/rss.xml
                </xsl:when>
                <xsl:when test="contains(/rss/channel/title, 'Garden')">
                  <xsl:value-of select="/rss/channel/link"/>garden/rss.xml
                </xsl:when>
                <xsl:when test="contains(/rss/channel/title, 'Projects')">
                  <xsl:value-of select="/rss/channel/link"/>projects/rss.xml
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="/rss/channel/link"/>rss.xml
                </xsl:otherwise>
              </xsl:choose>
            </div>
            <p>New to RSS? <a href="https://aboutfeeds.com/">Learn more about feeds</a>.</p>
          </div>

          <div class="items">
            <xsl:for-each select="/rss/channel/item">
              <article class="item">
                <h2 class="item-title">
                  <a href="{link}"><xsl:value-of select="title"/></a>
                </h2>
                <div class="item-meta">
                  <xsl:variable name="monthName" select="substring(pubDate, 9, 3)"/>
                  <xsl:variable name="day" select="substring(pubDate, 6, 2)"/>
                  <xsl:variable name="year" select="substring(pubDate, 13, 4)"/>
                  <xsl:variable name="month">
                    <xsl:choose>
                      <xsl:when test="$monthName = 'Jan'">01</xsl:when>
                      <xsl:when test="$monthName = 'Feb'">02</xsl:when>
                      <xsl:when test="$monthName = 'Mar'">03</xsl:when>
                      <xsl:when test="$monthName = 'Apr'">04</xsl:when>
                      <xsl:when test="$monthName = 'May'">05</xsl:when>
                      <xsl:when test="$monthName = 'Jun'">06</xsl:when>
                      <xsl:when test="$monthName = 'Jul'">07</xsl:when>
                      <xsl:when test="$monthName = 'Aug'">08</xsl:when>
                      <xsl:when test="$monthName = 'Sep'">09</xsl:when>
                      <xsl:when test="$monthName = 'Oct'">10</xsl:when>
                      <xsl:when test="$monthName = 'Nov'">11</xsl:when>
                      <xsl:when test="$monthName = 'Dec'">12</xsl:when>
                    </xsl:choose>
                  </xsl:variable>
                  <xsl:value-of select="concat($year, '-', $month, '-', $day)"/>
                </div>
              </article>
            </xsl:for-each>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>