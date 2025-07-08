import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

// --- Auth Helpers ---
function getToken() {
  return localStorage.getItem("token");
}
function saveToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

// --- Reusable Components ---

// PUBLIC_INTERFACE
function Navbar({ isLoggedIn, onLogout, theme, toggleTheme }) {
  /** Main app navigation bar with auth and theme controls. */
  return (
    <nav className="navbar">
      <div className="brand">NoteMaster</div>
      <div className="navbar-actions">
        <button className="theme-toggle" onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        {isLoggedIn ? (
          <button className="btn logout-btn" onClick={onLogout}>Logout</button>
        ) : null}
      </div>
    </nav>
  );
}

// PUBLIC_INTERFACE
function AuthForm({ onAuth, variant = "login", loading, error }) {
  /** Login/signup form */
  const [form, setForm] = useState({ username: "", password: "" });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onAuth(form.username, form.password);
  }

  return (
    <div className="auth-form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{variant === "signup" ? "Sign Up" : "Login"}</h2>
        <input
          name="username"
          type="text"
          placeholder="Username"
          autoComplete="username"
          required
          minLength={3}
          value={form.username}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete={variant === "signup" ? "new-password" : "current-password"}
          required
          minLength={4}
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit" className="btn btn-large" disabled={loading}>
          {variant === "signup" ? "Sign Up" : "Login"}
        </button>
        {error && <div className="err-msg">{error}</div>}
      </form>
    </div>
  );
}

// PUBLIC_INTERFACE
function NoteCard({ note, onEdit, onDelete, compact }) {
  /** A single note in grid/list view. */
  return (
    <div className={`note-card${compact ? " compact" : ""}`}>
      <div className="note-title">{note.title}</div>
      <div className="note-content">{note.content}</div>
      <div className="note-meta">
        <span className="note-updated">
          {note.updated_at ? `Updated: ${new Date(note.updated_at).toLocaleString()}` : ""}
        </span>
        <div className="note-actions">
          <button className="icon-btn" title="Edit" onClick={() => onEdit(note)}>
            ✏️
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => onDelete(note)}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function NotesList({
  notes, view, onEdit, onDelete
}) {
  /** Grid/List of notes with optional empty state. */
  if (!notes || notes.length === 0) {
    return <div className="notes-empty">No notes found.</div>;
  }
  return (
    <div className={view === "grid" ? "notes-grid" : "notes-list"}>
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} compact={view === "list"} />
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
function NoteModal({ isOpen, onClose, onSave, note, loading }) {
  /** Modal/dialog for creating/editing notes. */
  const [form, setForm] = useState({ title: "", content: "" });

  useEffect(() => {
    setForm(note ? { title: note.title, content: note.content } : { title: "", content: "" });
  }, [note, isOpen]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form.title, form.content);
  }

  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="note-modal" onClick={e => e.stopPropagation()}>
        <h2>{note ? "Edit Note" : "New Note"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            name="title"
            type="text"
            placeholder="Title"
            required
            maxLength={80}
            value={form.title}
            onChange={handleChange}
            autoFocus
          />
          <textarea
            name="content"
            placeholder="Write your note..."
            rows={6}
            required
            maxLength={1000}
            value={form.content}
            onChange={handleChange}
          />
          <div className="modal-actions">
            <button className="btn" type="button" onClick={onClose} tabIndex={-1}>Cancel</button>
            <button className="btn btn-large" type="submit" disabled={loading}>
              {note ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function SearchBar({ value, onChange, placeholder }) {
  /** Simple search input with icon. */
  return (
    <div className="search-bar">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Search..."}
        aria-label="Search notes"
      />
      <span className="search-icon">🔍</span>
    </div>
  );
}

// --- Main App Logic ---

// PUBLIC_INTERFACE
function App() {
  /** Complete NoteMaster frontend app. */

  // Theming
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  function toggleTheme() {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  }
  // Auth
  const [user, setUser] = useState(null); // {username}
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showSignup, setShowSignup] = useState(false);

  // Notes
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState(null);

  // UI states
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Search/filter
  const [query, setQuery] = useState("");

  // Effect: Check login at start
  useEffect(() => {
    // Simulate token login (in real app, we'd fetch user)
    if (getToken()) {
      setUser({ username: "user" }); // fakename
    }
  }, []);

  // Effect: Load notes if logged in
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    setNotesLoading(true);
    setNotesError(null);
    // Replace fetch with actual backend URL and JWT if real API
    fetch(`${API_BASE}/notes`, {
      headers: { Authorization: "Bearer " + (getToken() || "") }
    })
      .then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setNotes)
      .catch(e => {
        setNotesError("Error loading notes.");
        setNotes([]);
      })
      .finally(() => setNotesLoading(false));
  }, [user]);

  // Handle authentication (login/signup)
  function handleAuth(username, password) {
    setAuthLoading(true);
    setAuthError(null);
    fetch(
      `${API_BASE}/${showSignup ? "signup" : "login"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      }
    )
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).detail || "Auth failed");
        return r.json();
      })
      .then((data) => {
        saveToken(data.token);
        setUser({ username });
      })
      .catch(e => setAuthError(e.message || "Authentication failed."))
      .finally(() => setAuthLoading(false));
  }
  function handleLogout() {
    setUser(null);
    saveToken(null);
  }

  // CRUD: Add/Edit/Delete Notes
  function openNewNoteModal() {
    setEditingNote(null);
    setModalOpen(true);
  }
  function openEditNoteModal(note) {
    setEditingNote(note);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditingNote(null);
  }
  function handleSaveNote(title, content) {
    setModalLoading(true);
    const method = editingNote ? "PUT" : "POST";
    const endpoint = editingNote ? `/notes/${editingNote.id}` : "/notes";
    fetch(API_BASE + endpoint, {
      method,
      headers: {
        Authorization: "Bearer " + (getToken() || ""),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title, content })
    })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).detail || "Save failed");
        return r.json();
      })
      .then((saved) => {
        setNotes(prev =>
          editingNote
            ? prev.map((n) => (n.id === saved.id ? saved : n))
            : [...prev, saved]
        );
        closeModal();
      })
      .catch(e => alert(e.message || "Error saving note"))
      .finally(() => setModalLoading(false));
  }
  function handleDeleteNote(note) {
    if (!window.confirm("Delete this note?")) return;
    fetch(`${API_BASE}/notes/${note.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + (getToken() || "") }
    })
      .then(r => {
        if (!r.ok) throw new Error("Delete failed");
        setNotes(prev => prev.filter(n => n.id !== note.id));
      })
      .catch(e => alert("Could not delete note."));
  }

  // Filtered notes
  const filteredNotes = notes.filter(n =>
    (n.title + " " + n.content)
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  // --- RENDER ---
  return (
    <div className="App">
      <Navbar
        isLoggedIn={!!user}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="container main-area">
        {!user ? (
          <div>
            <AuthForm
              onAuth={handleAuth}
              variant={showSignup ? "signup" : "login"}
              loading={authLoading}
              error={authError}
            />
            <div className="auth-switch">
              {showSignup ? (
                <>
                  Already have an account?{" "}
                  <button
                    className="linkish"
                    onClick={() => setShowSignup(false)}
                  >
                    Login
                  </button>
                </>
              ) : (
                <>
                  No account yet?{" "}
                  <button
                    className="linkish"
                    onClick={() => setShowSignup(true)}
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="notes-topbar">
              <button className="btn btn-large" onClick={openNewNoteModal}>
                + New Note
              </button>
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search notes..."
              />
              <div className="view-toggle">
                <button
                  className={
                    "view-btn" + (viewMode === "grid" ? " active" : "")
                  }
                  title="Grid"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid View"
                >
                  ◻️
                </button>
                <button
                  className={
                    "view-btn" + (viewMode === "list" ? " active" : "")
                  }
                  title="List"
                  onClick={() => setViewMode("list")}
                  aria-label="List View"
                >
                  ☰
                </button>
              </div>
            </div>
            {notesLoading ? (
              <div className="notes-loading">Loading...</div>
            ) : notesError ? (
              <div className="err-msg">{notesError}</div>
            ) : (
              <NotesList
                notes={filteredNotes}
                view={viewMode}
                onEdit={openEditNoteModal}
                onDelete={handleDeleteNote}
              />
            )}
            <NoteModal
              isOpen={modalOpen}
              onClose={closeModal}
              onSave={handleSaveNote}
              note={editingNote}
              loading={modalLoading}
            />
          </>
        )}
      </main>
      <footer className="footer">
        <span>
          &copy; {new Date().getFullYear()} NoteMaster. Minimal, Modern React Notes App.
        </span>
      </footer>
    </div>
  );
}

export default App;
