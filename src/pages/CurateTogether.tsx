import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getActivities, onActivityChange, removeActivity, type ActivityEntry } from "@/lib/activityStore";
import { Link2, Mail, X } from "lucide-react";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const CurateTogether = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>(getActivities);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onActivityChange(() => setActivities(getActivities()));
    return unsub;
  }, []);

  return (
    <div className="px-6 md:px-10 pb-20">
      <p className="font-serif text-lg md:text-xl text-foreground/80 mt-2 mb-10 max-w-xl">
        A shared log of saved and sent items
      </p>

      {activities.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">nothing here yet.</p>
          <p className="text-xs mt-2">
            explore the collection — save or send works to see them appear here.
          </p>
        </div>
      ) : (
        <div className="max-w-xl space-y-1">
          <AnimatePresence initial={false}>
            {activities.map((a) => (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => navigate(`/?artwork=${a.artworkId}`)}
                className="w-full flex items-center gap-4 py-3 px-3 rounded hover:bg-muted/50 transition-colors text-left group"
              >
                {a.artworkImage ? (
                  <img
                    src={a.artworkImage}
                    alt={a.artworkTitle}
                    className="w-12 h-12 object-cover rounded-sm bg-muted flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-sm flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm truncate text-foreground">{a.artworkTitle}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    {a.action === "saved" ? (
                      <><Link2 className="w-3 h-3" /> saved to collection</>
                    ) : (
                      <><Mail className="w-3 h-3" /> sent as postcard{a.recipientHint ? ` to ${a.recipientHint}` : ""}</>
                    )}
                    <span className="ml-auto text-foreground/30">{timeAgo(a.timestamp)}</span>
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeActivity(a.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground flex-shrink-0"
                  aria-label="Remove from feed"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CurateTogether;
