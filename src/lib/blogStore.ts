export interface BlogPost {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "blog_posts";
const ADMIN_KEY   = "blog_admin";

// Always fetch the committed JSON and merge in any new posts.
// Local/admin posts are preserved — only posts not already in localStorage are added.
export async function initPosts(): Promise<void> {
  try {
    const res = await fetch("/journal-posts.json");
    if (!res.ok) return;
    const shared: BlogPost[] = await res.json();
    if (!Array.isArray(shared) || shared.length === 0) return;
    const local = readPosts();
    // JSON is authoritative for published posts. Keep only local drafts not yet in the JSON.
    const sharedIds = new Set(shared.map(p => p.id));
    const localDrafts = local.filter(p => !sharedIds.has(p.id));
    writePosts([...shared, ...localDrafts]);
  } catch { /* silently ignore — localStorage data remains intact */ }
}

function readPosts(): BlogPost[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writePosts(posts: BlogPost[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    // Quota exceeded — evict the ephemeral artwork cache (safe to lose) and retry
    try {
      localStorage.removeItem("reel_cache_v1");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch { /* still can't write */ }
  }
}

export function getPosts(): BlogPost[] {
  return readPosts().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addPost(post: Omit<BlogPost, "id" | "createdAt" | "updatedAt">): BlogPost {
  const now = new Date().toISOString();
  const newPost: BlogPost = { ...post, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  writePosts([...readPosts(), newPost]);
  return newPost;
}

export function updatePost(id: string, updates: Partial<Pick<BlogPost, "title" | "body" | "imageUrl">>): BlogPost | null {
  const posts = readPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...updates, updatedAt: new Date().toISOString() };
  writePosts(posts);
  return posts[idx];
}

export function deletePost(id: string) {
  writePosts(readPosts().filter((p) => p.id !== id));
}

export function isAdmin(): boolean {
  return localStorage.getItem(ADMIN_KEY) === "true";
}

export function toggleAdmin(): boolean {
  const next = !isAdmin();
  localStorage.setItem(ADMIN_KEY, String(next));
  return next;
}

// Exports current posts as a JSON string for committing to /public/journal-posts.json
export function exportPostsJson(): string {
  return JSON.stringify(getPosts(), null, 2);
}
