// Bluesky comments via public API, inspired by https://natalie.sh/posts/bluesky-comments/
import { useEffect, useState } from 'react';

interface Author {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface Post {
  uri: string;
  author: Author;
  record: {
    text: string;
    createdAt: string;
  };
  likeCount?: number;
  repostCount?: number;
}

interface ThreadPost {
  $type: string;
  post: Post;
  replies?: ThreadPost[];
}

interface BlueskyCommentsProps {
  uri: string;
}

const MAX_DEPTH = 4;

function getBlueskyPostUrl(uri: string): string {
  const parts = uri.replace('at://', '').split('/');
  const did = parts[0];
  const rkey = parts[2];
  return `https://bsky.app/profile/${did}/post/${rkey}`;
}

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function Comment({ thread, depth }: { thread: ThreadPost; depth: number }) {
  const { post } = thread;
  const postUrl = getBlueskyPostUrl(post.uri);
  const replies = thread.replies ?? [];

  return (
    <div
      style={{
        marginLeft: depth > 0 ? '1.5rem' : 0,
        paddingLeft: depth > 0 ? '1rem' : 0,
        borderLeft: depth > 0 ? '2px solid var(--color-border)' : 'none',
        marginTop: '1rem',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}
      >
        {post.author.avatar ? (
          <img
            src={post.author.avatar}
            alt=""
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              background: 'var(--color-bg-code)',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <a
              href={`https://bsky.app/profile/${post.author.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontWeight: 600,
                color: 'var(--color-ink)',
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
              }}
            >
              {post.author.displayName || post.author.handle}
            </a>
            <a
              href={`https://bsky.app/profile/${post.author.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-ink-light)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-mono)',
                textDecoration: 'none',
              }}
            >
              @{post.author.handle}
            </a>
          </div>
          <p
            style={{
              margin: '0.25rem 0',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {post.record.text}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '0.25rem',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-ink-light)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-ink-light)',
                textDecoration: 'none',
              }}
            >
              {relativeTime(post.record.createdAt)}
            </a>
            {(post.likeCount ?? 0) > 0 && <span>{post.likeCount} likes</span>}
            {(post.repostCount ?? 0) > 0 && (
              <span>{post.repostCount} reposts</span>
            )}
          </div>
        </div>
      </div>
      {depth < MAX_DEPTH &&
        replies
          .filter(
            (r): r is ThreadPost =>
              r.$type === 'app.bsky.feed.defs#threadViewPost'
          )
          .map((reply) => (
            <Comment key={reply.post.uri} thread={reply} depth={depth + 1} />
          ))}
    </div>
  );
}

const DEFAULT_DID = 'did:plc:mracrip6qu3vw46nbewg44sm';

function resolveUri(input: string): string {
  if (input.startsWith('at://')) return input;
  return `at://${DEFAULT_DID}/app.bsky.feed.post/${input}`;
}

export default function BlueskyComments({ uri: rawUri }: BlueskyCommentsProps) {
  const uri = resolveUri(rawUri);
  const [thread, setThread] = useState<ThreadPost | null>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchThread() {
      try {
        const params = new URLSearchParams({ uri, depth: '6' });
        const res = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?${params}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.thread?.$type === 'app.bsky.feed.defs#threadViewPost') {
          setThread(data.thread);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(true);
      } finally {
        setLoaded(true);
      }
    }

    fetchThread();
    return () => controller.abort();
  }, [uri]);

  if (error) return null;

  const postUrl = getBlueskyPostUrl(uri);

  if (!loaded || !thread) {
    return (
      <section
        style={{
          marginTop: 'var(--spacing-xl)',
          paddingTop: 'var(--spacing-lg)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: '0 0 0.5rem 0',
          }}
        >
          Comments
        </h2>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-ink-light)',
            margin: 0,
          }}
        >
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent)' }}
          >
            Reply on Bluesky
          </a>{' '}
          to join the conversation.
        </p>
      </section>
    );
  }

  const replies = (thread.replies ?? [])
    .filter(
      (r): r is ThreadPost => r.$type === 'app.bsky.feed.defs#threadViewPost'
    )
    .sort((a, b) => (b.post.likeCount ?? 0) - (a.post.likeCount ?? 0));

  if (replies.length === 0) {
    return (
      <section
        style={{
          marginTop: 'var(--spacing-xl)',
          paddingTop: 'var(--spacing-lg)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: '0 0 0.5rem 0',
          }}
        >
          Comments
        </h2>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-ink-light)',
            margin: 0,
          }}
        >
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent)' }}
          >
            Reply on Bluesky
          </a>{' '}
          to join the conversation.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        marginTop: 'var(--spacing-xl)',
        paddingTop: 'var(--spacing-lg)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--color-ink)',
          margin: '0 0 0.5rem 0',
        }}
      >
        Comments
      </h2>
      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-ink-light)',
          margin: '0 0 1rem 0',
        }}
      >
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)' }}
        >
          Reply on Bluesky
        </a>{' '}
        to join the conversation.
      </p>
      <div>
        {replies.map((reply) => (
          <Comment key={reply.post.uri} thread={reply} depth={0} />
        ))}
      </div>
    </section>
  );
}
