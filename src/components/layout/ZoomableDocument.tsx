import { useState } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrism from 'rehype-prism-plus';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

interface ContentLevel {
  level: number;
  content: string;
}

interface ZoomableDocumentProps {
  children: ReactNode;
  levels: ContentLevel[];
}

export function ZoomableDocument({ children, levels }: ZoomableDocumentProps) {
  const MIN_ZOOM = 1;
  const MAX_ZOOM = Math.max(levels?.length + 1 || 1, 1);
  const ZOOM_STEP = 1;
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedContent, setDisplayedContent] = useState(MIN_ZOOM);
  const getContentForZoomLevel = (level: number) => {
    if (level === 1) {
      if (typeof children === 'string') {
        return <div dangerouslySetInnerHTML={{ __html: children }} />;
      }
      return <div>{children}</div>;
    }

    const contentLevel = levels.find((l) => l.level === level);
    if (!contentLevel) return null;

    return (
      <div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings, rehypePrism]}
        >
          {contentLevel.content}
        </ReactMarkdown>
      </div>
    );
  };

  const handleZoomChange = (newLevel: number) => {
    if (newLevel < MIN_ZOOM || newLevel > MAX_ZOOM) return;
    setIsTransitioning(true);
    setZoomLevel(newLevel);
    setTimeout(() => {
      setDisplayedContent(newLevel);
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className="relative w-full">
      <div className="sticky top-4 flex items-center justify-center gap-4 z-10 mb-8">
        <div className="flex items-center gap-4 bg-[var(--color-bg)] p-2 rounded-full shadow-lg border-2 border-[var(--color-border)]">
          <button
            onClick={() => {
              const newLevel = zoomLevel + ZOOM_STEP;
              handleZoomChange(newLevel);
            }}
            disabled={zoomLevel >= MAX_ZOOM}
            className={`w-10 h-10 bg-[var(--color-bg)] text-[var(--color-ink)] font-bold rounded-full border-2 border-[var(--color-border)] transition-all duration-200 ${zoomLevel >= MAX_ZOOM ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--color-bg-code)] hover:scale-110'}`}
          >
            -
          </button>
          <div className="flex gap-2">
            {Array.from({ length: MAX_ZOOM }, (_, i) => i + 1).map((level) => (
              <button
                key={level}
                onClick={() => handleZoomChange(MAX_ZOOM - level + 1)}
                className={`w-1 h-2 rounded-full transition-all duration-200 hover:scale-150 ${MAX_ZOOM - zoomLevel + 2 <= level ? 'bg-[var(--color-border)]' : 'bg-[var(--color-link)]'}`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              const newLevel = zoomLevel - ZOOM_STEP;
              handleZoomChange(newLevel);
            }}
            disabled={zoomLevel <= MIN_ZOOM}
            className={`w-10 h-10 bg-[var(--color-bg)] text-[var(--color-ink)] font-bold rounded-full border-2 border-[var(--color-border)] transition-all duration-200 ${zoomLevel <= MIN_ZOOM ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--color-bg-code)] hover:scale-110'}`}
          >
            +
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <div
          className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
        >
          {getContentForZoomLevel(displayedContent)}
        </div>
      </div>
    </div>
  );
}
