import { useState, useCallback, useEffect } from "react";
import { useT } from "@/contexts/LanguageContext";
import FloatingFooter from "@/components/FloatingFooter";
import { getPosts, addPost, updatePost, deletePost, isAdmin, toggleAdmin, initPosts, exportPostsJson, type BlogPost } from "@/lib/blogStore";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Journal = () => {
  const t = useT();
  const [posts, setPosts] = useState<BlogPost[]>(getPosts);
  const [admin, setAdmin] = useState(isAdmin);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { document.title = "Field Notes | Reel Museum"; return () => { document.title = "Reel Museum"; }; }, []);

  useEffect(() => {
    initPosts().then(refresh);
  }, []);

  const refresh = () => setPosts(getPosts());

  const handleExport = () => {
    const blob = new Blob([exportPostsJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "journal-posts.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleTripleClick = useCallback(() => {
    const next = toggleAdmin();
    setAdmin(next);
  }, []);

  const handleSave = (form: { title: string; body: string; imageUrl: string }) => {
    if (editing) {
      updatePost(editing.id, form);
    } else {
      addPost(form);
    }
    setEditing(null);
    setCreating(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    deletePost(id);
    setSelectedPost(null);
    refresh();
  };

  const showForm = creating || editing !== null;

  return (
    <div className="px-6 md:px-10 pb-20 opacity-100">
      <p
        className="font-serif text-lg md:text-xl text-foreground/80 mt-2 mb-10 max-w-xl select-none"
        onClick={(e) => {
          if (e.detail === 3) handleTripleClick();
        }}
      >
        {t.journal.heading}
      </p>
      <p className="font-serif text-sm md:text-base text-foreground/60 -mt-8 mb-10 max-w-xl select-none">
        {t.journal.emailUs} <a href="mailto:info@reelmuseum.com" className="underline hover:text-foreground transition-colors">info@reelmuseum.com</a>
      </p>


      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="mb-4 break-inside-avoid bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow group relative"
            onClick={() => setSelectedPost(post)}
          >
            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full object-cover"
                loading="lazy"
              />
            )}
            <div className="p-4">
              <h3 className="font-medium text-foreground text-sm mb-1">{post.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-sm text-foreground/70 line-clamp-3">{post.body}</p>
            </div>
            {admin && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  onClick={(e) => { e.stopPropagation(); setEditing(post); }}
                >
                  <Pencil className="w-3.5 h-3.5 text-foreground" />
                </button>
                <button
                  className="p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {admin && !showForm && (
        <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3">
          <button
            onClick={handleExport}
            title="Export posts to JSON (then replace public/journal-posts.json in the repo)"
            className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center shadow hover:scale-105 transition-transform"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Post detail modal */}
      <Dialog open={selectedPost !== null} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPost && (
            <div>
              {selectedPost.imageUrl && (
                <img src={selectedPost.imageUrl} alt={selectedPost.title} className="w-full rounded-md mb-4 object-cover max-h-80" />
              )}
              <h2 className="text-xl font-medium text-foreground mb-1">{selectedPost.title}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {new Date(selectedPost.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{selectedPost.body}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit form modal */}
      <Dialog open={showForm} onOpenChange={() => { setCreating(false); setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <PostForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setCreating(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
      <FloatingFooter />
    </div>
  );
};

function PostForm({ initial, onSave, onCancel }: {
  initial: BlogPost | null;
  onSave: (form: { title: string; body: string; imageUrl: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave({ title, body, imageUrl }); }}
      className="flex flex-col gap-4"
    >
      <h3 className="text-lg font-medium text-foreground">{initial ? "edit post" : "new post"}</h3>
      <input
        placeholder="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <textarea
        placeholder="write something..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={6}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[120px]"
      />
      <input
        placeholder="image url (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>cancel</Button>
        <Button type="submit">{initial ? "save" : "publish"}</Button>
      </div>
    </form>
  );
}

export default Journal;
