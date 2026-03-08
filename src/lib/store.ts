export interface Movie {
  id: string;
  title: string;
  genre: string;
  year: string;
  poster: string;
  description: string;
  addedBy: string;
  rating?: string;
  watchUrl?: string;
  embedUrl?: string;
}

export interface Ticket {
  id: string;
  movieId: string;
  movieTitle: string;
  date: string;
  time: string;
  seat: string;
  holder: string;
  genre: string;
}

export interface JournalEntry {
  id: string;
  movieTitle: string;
  date: string;
  content: string;
  mood: string;
  author: string;
}

const MOVIES_KEY = "cozy-cinema-movies";
const TICKETS_KEY = "cozy-cinema-tickets";
const JOURNAL_KEY = "cozy-cinema-journal";

const defaultMovies: Movie[] = [
  {
    id: "1",
    title: "Gilmore Girls",
    genre: "Comedy / Drama",
    year: "2000",
    poster: "",
    description: "A dramedy centering around the relationship between a thirtysomething single mother and her teen daughter living in Stars Hollow, Connecticut.",
    addedBy: "You",
    rating: "8.2",
    watchUrl: "https://moviebox.ph/detail/gilmore-girls-cCOciFua797?id=5998494678717452072&scene=&season=1&page_from=search_detail&type=/movie/detail",
    embedUrl: "https://123movienow.cc/spa/videoPlayPage/movies/gilmore-girls-cCOciFua797?id=5998494678717452072&type=/movie/detail&detailSe=1&detailEp=1&lang=en",
    totalSeasons: 7,
  },
  {
    id: "2",
    title: "Stranger Things",
    genre: "Sci-Fi / Drama",
    year: "2016",
    poster: "",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    addedBy: "You",
    rating: "8.7",
    watchUrl: "https://moviebox.ph/detail/stranger-things-cCOciFua797?id=5997883574990675144&scene=&season=1&page_from=search_detail&type=/movie/detail",
  },
  {
    id: "3",
    title: "Mean Girls",
    genre: "Comedy",
    year: "2004",
    poster: "",
    description: "Cady Heron is a hit with The Plastics, the A-list girl clique at her new school, until she makes the mistake of falling for Aaron Samuels, the ex-boyfriend of alpha Plastic Regina George.",
    addedBy: "You",
    rating: "7.1",
    watchUrl: "https://moviebox.ph/detail/mean-girls-cCOciFua797?id=5998024665060044672&scene=&page_from=search_detail&type=/movie/detail",
    embedUrl: "https://123movienow.cc/spa/videoPlayPage/movies/mean-girls-hindi-EKXMqPHAh19?id=7571072428810851000&type=/movie/detail&detailSe=&detailEp=&lang=en",
  },
];

export function getMovies(): Movie[] {
  const stored = localStorage.getItem(MOVIES_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(MOVIES_KEY, JSON.stringify(defaultMovies));
  return defaultMovies;
}

export function resetMovies(): void {
  localStorage.removeItem(MOVIES_KEY);
}

export function addMovie(movie: Omit<Movie, "id">): Movie {
  const movies = getMovies();
  const newMovie = { ...movie, id: Date.now().toString() };
  movies.push(newMovie);
  localStorage.setItem(MOVIES_KEY, JSON.stringify(movies));
  return newMovie;
}

export function getTickets(): Ticket[] {
  const stored = localStorage.getItem(TICKETS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addTicket(ticket: Omit<Ticket, "id">): Ticket {
  const tickets = getTickets();
  const newTicket = { ...ticket, id: Date.now().toString() };
  tickets.push(newTicket);
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  return newTicket;
}

export function getJournalEntries(): JournalEntry[] {
  const stored = localStorage.getItem(JOURNAL_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addJournalEntry(entry: Omit<JournalEntry, "id">): JournalEntry {
  const entries = getJournalEntries();
  const newEntry = { ...entry, id: Date.now().toString() };
  entries.push(newEntry);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  return newEntry;
}
