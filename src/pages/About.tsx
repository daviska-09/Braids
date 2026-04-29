import { useEffect } from "react";

const About = () => {
  useEffect(() => {
    document.title = "About | Reel Museum";
    return () => { document.title = "Reel Museum"; };
  }, []);

  return (
    <div className="px-6 md:px-10 pb-20 max-w-2xl">
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mt-2 mb-8">About</h1>
      <div className="space-y-5 text-sm md:text-base text-foreground/80 leading-relaxed">
        <p>
          On every inhabited continent, in every civilisation in the world, humans have spun thread
          and stitched.
        </p>
        <p>
          We scroll reels on Instagram and threads on X without pausing on the words themselves.
          That etymology is not accidental. The language of digital communities is woven through
          with textile metaphors and that tells us something about what cloth has meant to human
          societies for as long as those societies have existed.
        </p>
        <p>
          The spindle whorl (whorl pictured) is among our earliest mechanical tools. It predates
          most of the technologies we think of as foundational. Long before states, before codified
          law, before most of what ends up in the history books, someone was spinning thread. The
          people who did that work (overwhelmingly women, across most of human history) rarely made
          it into history books. Their labour built empires, clothed armies, hoisted sails and
          generated the wealth that funded merchants, cities and industries.
        </p>
        <p>Reel Museum is a free textile and tools archive resource.</p>
        <p>
          We are an open source research tool for creators, designers, artists, technologists,
          crafters and historians. It draws from the permanent textile and artefact collections of
          Europeana, the Metropolitan Museum of Art, the Art Institute of Chicago, and a growing
          body of primary archive material across Europe, surfacing textiles and craft objects
          across millennia of human history.
        </p>
        <p>
          The premise is simple: these objects deserve to be looked at, thought about and used. The
          next innovations in design, craft, and technology will not emerge from nowhere, often we
          must look to what has been done before to be inspired, improve and innovate.
        </p>
        <p>
          The Irish Lace archive holds our particular focus. It shows how technical knowledge can
          survive adverse conditions: a tradition that encoded economic survival, political
          resistance, and extraordinary craft expertise into a delicate form small enough to fold up
          in a pocket.
        </p>
        <p>
          Public history is, at its best, an argument about whose past counts and who gets to tell
          it. Textile History deserves to be better represented than they have been from the
          historical record, and we are attempting to do something about that.
        </p>
        <p>
          If you would like to get in contact, email{" "}
          <a
            href="mailto:info@reelmuseum.com"
            className="underline hover:text-foreground transition-colors"
          >
            info@reelmuseum.com
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default About;
