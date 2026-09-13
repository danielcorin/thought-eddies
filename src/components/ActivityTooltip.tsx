import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export interface ActivityTooltipAnchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  id: string;
  anchor: ActivityTooltipAnchor;
  children: ReactNode;
  onDismiss: () => void;
}

export default function ActivityTooltip({
  id,
  anchor,
  children,
  onDismiss,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const box = element.current?.getBoundingClientRect();
    if (!box) return;
    const above = anchor.top - box.height - 10;
    setPosition({
      left: Math.max(
        8,
        Math.min(
          window.innerWidth - box.width - 8,
          anchor.left + anchor.width / 2 - box.width / 2
        )
      ),
      top: Math.max(
        8,
        Math.min(
          window.innerHeight - box.height - 8,
          above >= 8 ? above : anchor.top + anchor.height + 10
        )
      ),
    });
  }, [anchor, children]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('keydown', escape);
    };
  }, [onDismiss]);

  return createPortal(
    <div
      id={id}
      ref={element}
      role="tooltip"
      className="activity-tooltip"
      style={{ ...position, visibility: position ? 'visible' : 'hidden' }}
    >
      {children}
    </div>,
    document.body
  );
}
