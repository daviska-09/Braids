import type { Lang } from "@/contexts/LanguageContext";

const en = {
  // Nav
  nav: {
    mainArchive: "main archive",
    laceArchive: "lace archive",
    explored: "explored",
    fieldNotes: "field notes",
  },
  // Gallery
  gallery: {
    subtitle: "every object and thread tells a story.",
    noResults: "no works found matching these origins yet.",
    viewAll: "view all works",
  },
  // Lace Archive
  lace: {
    subtitle: "a dedicated archive of lace and crochet from across human history. these are the most delicate threads in the collection.",
    allLace: "all lace",
    irishLace: "irish lace",
  },
  // Saved / Curate
  saved: {
    subtitle: "Your log of saved and sent items",
    empty: "nothing here yet.",
    emptyHint: "explore the collection — save or send works to see them appear here.",
  },
  // Explored
  explored: {
    heading: "archive explored",
    objectsOut: "objects explored out of",
    inMuseum: "in the Reel Museum",
    detail: "through these objects we see how civilisation is constructed. not just by conquest and industrialisation, but also through expressive and cultural forces that we have woven into our lives.",
    returnHint: "click the spindle whorl to return to feed",
  },
  // Field Notes
  journal: {
    heading: "Field Notes",
    emailUs: "Email us:",
  },
  // Modal actions
  modal: {
    saveToCollection: "save to collection",
    saved: "saved",
    copyLink: "copy link",
    dispatch: "dispatch",
    viewOn: "View on",
    yourName: "your name",
    recipientPlaceholder: "recipient@email.com",
    send: "send",
    addNote: "Add a note...",
    zoomHint: "scroll or click to zoom · drag to pan · esc to close",
    // Detail labels
    date: "Date",
    medium: "Medium",
    dimensions: "Dimensions",
    culture: "Culture",
    classification: "Classification",
    department: "Department",
    credit: "Credit",
    // Toasts
    toastLinkCopied: "Link copied to clipboard",
    toastCopyFail: "Couldn't copy — try copying the URL from the address bar",
    toastRemoved: "Removed from collection",
    toastSaved: "Saved to collection",
    toastDispatched: "Dispatch ready to send",
  },
};

const fr: typeof en = {
  nav: {
    mainArchive: "archive principale",
    laceArchive: "archive de dentelle",
    explored: "explorée",
    fieldNotes: "notes de terrain",
  },
  gallery: {
    subtitle: "chaque objet et chaque fil raconte une histoire.",
    noResults: "aucune œuvre trouvée pour ces origines.",
    viewAll: "voir toutes les œuvres",
  },
  lace: {
    subtitle: "une archive dédiée à la dentelle et au crochet à travers l'histoire humaine. ce sont les fils les plus délicats de la collection.",
    allLace: "toute la dentelle",
    irishLace: "dentelle irlandaise",
  },
  saved: {
    subtitle: "Votre journal des éléments sauvegardés et envoyés",
    empty: "rien ici pour l'instant.",
    emptyHint: "explorez la collection — sauvegardez ou envoyez des œuvres pour les voir apparaître ici.",
  },
  explored: {
    heading: "archive explorée",
    objectsOut: "objets explorés sur",
    inMuseum: "dans le Reel Museum",
    detail: "à travers ces objets, nous voyons comment la civilisation se construit — non seulement par la conquête et l'industrialisation, mais aussi par les forces expressives et culturelles que nous avons tissées dans nos vies.",
    returnHint: "cliquez sur le fuseau pour revenir au fil",
  },
  journal: {
    heading: "Notes de Terrain",
    emailUs: "Contactez-nous :",
  },
  modal: {
    saveToCollection: "sauvegarder",
    saved: "sauvegardé",
    copyLink: "copier le lien",
    dispatch: "envoyer",
    viewOn: "Voir sur",
    yourName: "votre nom",
    recipientPlaceholder: "destinataire@email.com",
    send: "envoyer",
    addNote: "Ajouter une note...",
    zoomHint: "défiler ou cliquer pour zoomer · glisser pour déplacer · échap pour fermer",
    date: "Date",
    medium: "Médium",
    dimensions: "Dimensions",
    culture: "Culture",
    classification: "Classification",
    department: "Département",
    credit: "Crédit",
    toastLinkCopied: "Lien copié dans le presse-papiers",
    toastCopyFail: "Impossible de copier — essayez depuis la barre d'adresse",
    toastRemoved: "Retiré de la collection",
    toastSaved: "Sauvegardé dans la collection",
    toastDispatched: "Envoi prêt",
  },
};

const nl: typeof en = {
  nav: {
    mainArchive: "hoofdarchief",
    laceArchive: "kantarchief",
    explored: "verkend",
    fieldNotes: "veldnotities",
  },
  gallery: {
    subtitle: "elk object en elke draad vertelt een verhaal.",
    noResults: "geen werken gevonden voor deze oorsprong.",
    viewAll: "alle werken bekijken",
  },
  lace: {
    subtitle: "een speciaal archief van kant en haakwerk door de menselijke geschiedenis. dit zijn de meest delicate draden in de collectie.",
    allLace: "alle kant",
    irishLace: "iers kant",
  },
  saved: {
    subtitle: "Uw logboek van opgeslagen en verzonden items",
    empty: "nog niets hier.",
    emptyHint: "verken de collectie — sla werken op of stuur ze om ze hier te zien verschijnen.",
  },
  explored: {
    heading: "archief verkend",
    objectsOut: "objecten verkend van",
    inMuseum: "in het Reel Museum",
    detail: "via deze objecten zien we hoe de beschaving is opgebouwd — niet alleen door verovering en industrialisatie, maar ook door de expressieve en culturele krachten die we in ons leven hebben geweven.",
    returnHint: "klik op de spinschijf om terug te keren",
  },
  journal: {
    heading: "Veldnotities",
    emailUs: "E-mail ons:",
  },
  modal: {
    saveToCollection: "opslaan",
    saved: "opgeslagen",
    copyLink: "link kopiëren",
    dispatch: "versturen",
    viewOn: "Bekijk op",
    yourName: "uw naam",
    recipientPlaceholder: "ontvanger@email.com",
    send: "versturen",
    addNote: "Een notitie toevoegen...",
    zoomHint: "scrollen of klikken om in te zoomen · slepen om te pannen · esc om te sluiten",
    date: "Datum",
    medium: "Medium",
    dimensions: "Afmetingen",
    culture: "Cultuur",
    classification: "Classificatie",
    department: "Afdeling",
    credit: "Credits",
    toastLinkCopied: "Link gekopieerd naar klembord",
    toastCopyFail: "Kopiëren mislukt — kopieer de URL vanuit de adresbalk",
    toastRemoved: "Verwijderd uit collectie",
    toastSaved: "Opgeslagen in collectie",
    toastDispatched: "Verzending klaar",
  },
};

export const translations: Record<Lang, typeof en> = { en, fr, nl };
export type Translations = typeof en;
