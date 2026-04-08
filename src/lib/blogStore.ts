export interface BlogPost {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "blog_posts";
const ADMIN_KEY = "blog_admin";

function readPosts(): BlogPost[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writePosts(posts: BlogPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
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
