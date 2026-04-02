export function shouldShowPost(post: { data: { draft?: boolean } }): boolean {
  return import.meta.env.DEV || !post.data.draft;
}
