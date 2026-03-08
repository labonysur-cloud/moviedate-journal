export interface Movie {
  id: string;
  title: string;
  genre: string;
  year: string;
  poster: string;
  description: string;
  addedBy: string;
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
    description: "A heartwarming story about a mother-daughter duo navigating life, love, and lots of coffee in Stars Hollow.",
    addedBy: "You",
  },
  {
    id: "2",
    title: "Stranger Things",
    genre: "Sci-Fi / Horror",
    year: "2016",
    poster: "",
    description: "A group of kids uncover supernatural mysteries in their small town of Hawkins, Indiana.",
    addedBy: "You",
  },
  {
    id: "3",
    title: "Mean Girls",
    genre: "Comedy",
    year: "2004",
    poster: "",
    description: "A homeschooled teen navigates the jungle of high school cliques and discovers the true meaning of friendship.",
    addedBy: "You",
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
