import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import NoteCard from '../components/NoteCard';
import SearchBar from '../components/SearchBar';
import api from '../services/api';

export default function Dashboard() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState(null); // null = not in search mode
    const [tags, setTags] = useState([]);
    const [activeTag, setActiveTag] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchNotes = useCallback(async (page = 1, tag = '') => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page, limit: 12 });
            if (tag) params.append('tag', tag);
            const res = await api.get(`/notes?${params}`);
            setNotes(res.data.notes);
            setPagination(res.data.pagination);
        } catch {
            setError('Failed to load notes.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTags = useCallback(async () => {
        try {
            const res = await api.get('/notes/tags');
            setTags(res.data.tags);
        } catch { }
    }, []);

    useEffect(() => {
        fetchNotes(1, activeTag);
        fetchTags();
    }, [activeTag, fetchNotes, fetchTags]);

    const handleSearch = async (query) => {
        setIsSearching(true);
        setError('');
        try {
            const res = await api.post('/notes/search', { query, limit: 10, ...(activeTag && { tag: activeTag }) });
            setSearchResults({ query, results: res.data.results });
        } catch (err) {
            setError(err.response?.data?.message || 'Search failed.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleClear = () => {
        setSearchResults(null);
        fetchNotes(1, activeTag);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await api.delete(`/notes/${id}`);
            if (searchResults) {
                setSearchResults(prev => ({ ...prev, results: prev.results.filter(n => n.id !== id) }));
            } else {
                setNotes(prev => prev.filter(n => n.id !== id));
            }
            fetchTags();
        } catch {
            setError('Failed to delete note.');
        }
    };

    const handleEdit = (note) => {
        navigate(`/notes/${note.id}/edit`);
    };

    const handleView = (note) => {
        navigate(`/notes/${note.id}`);
    };

    const displayNotes = searchResults ? searchResults.results : notes;
    const isSearchMode = searchResults !== null;

    return (
        <div className="app-layout">
            <Navbar />
            <main className="dashboard">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Your Notes</h1>
                        <p className="dashboard-subtitle">
                            {isSearchMode
                                ? `${displayNotes.length} semantic results for "${searchResults.query}"`
                                : `${pagination.total} note${pagination.total !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <button className="btn btn-primary" id="new-note-btn" onClick={() => navigate('/notes/new')}>
                        + New Note
                    </button>
                </div>

                {/* Search */}
                <SearchBar onSearch={handleSearch} onClear={handleClear} isSearching={isSearching} />

                {/* Tag Filter */}
                {tags.length > 0 && (
                    <div className="tag-filter">
                        <button
                            className={`tag-filter-btn ${activeTag === '' ? 'active' : ''}`}
                            onClick={() => { setActiveTag(''); setSearchResults(null); }}
                        >
                            All
                        </button>
                        {tags.map(tag => (
                            <button
                                key={tag}
                                className={`tag-filter-btn ${activeTag === tag ? 'active' : ''}`}
                                onClick={() => { setActiveTag(tag); setSearchResults(null); }}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && <div className="alert alert-error">{error}</div>}

                {/* Notes Grid */}
                {loading ? (
                    <div className="notes-loading">
                        {[...Array(6)].map((_, i) => <div key={i} className="note-skeleton" />)}
                    </div>
                ) : displayNotes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">{isSearchMode ? '🔍' : '📝'}</div>
                        <h3>{isSearchMode ? 'No matching notes found.' : 'No notes yet.'}</h3>
                        <p>{isSearchMode ? 'Try a different query.' : 'Create your first note to get started!'}</p>
                        {!isSearchMode && (
                            <button className="btn btn-primary" onClick={() => navigate('/notes/new')}>
                                Create Note
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="notes-grid">
                        {displayNotes.map(note => (
                            <NoteCard key={note.id} note={note} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {!isSearchMode && pagination.totalPages > 1 && (
                    <div className="pagination">
                        <button
                            className="btn btn-ghost"
                            disabled={pagination.page <= 1}
                            onClick={() => fetchNotes(pagination.page - 1, activeTag)}
                        >
                            ← Prev
                        </button>
                        <span className="pagination-info">Page {pagination.page} of {pagination.totalPages}</span>
                        <button
                            className="btn btn-ghost"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => fetchNotes(pagination.page + 1, activeTag)}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
