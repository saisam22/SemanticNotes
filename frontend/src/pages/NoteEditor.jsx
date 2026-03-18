import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function NoteEditor() {
    const { id } = useParams(); // undefined for new note
    const isEdit = !!id;
    const navigate = useNavigate();

    const [form, setForm] = useState({ title: '', content: '', tags: '' });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!isEdit) return;
        const fetchNote = async () => {
            try {
                const res = await api.get(`/notes/${id}`);
                const note = res.data.note;
                setForm({
                    title: note.title,
                    content: note.content,
                    tags: note.tags?.join(', ') || '',
                });
            } catch {
                setError('Failed to load note.');
            } finally {
                setFetching(false);
            }
        };
        fetchNote();
    }, [id, isEdit]);

    const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const tags = form.tags
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);

        const payload = { title: form.title.trim(), content: form.content.trim(), tags };

        try {
            if (isEdit) {
                await api.put(`/notes/${id}`, payload);
                setSuccess('Note updated! Embedding regenerated if content changed.');
                setTimeout(() => navigate('/dashboard'), 1200);
            } else {
                await api.post('/notes', payload);
                setSuccess('Note created with semantic embedding! Redirecting…');
                setTimeout(() => navigate('/dashboard'), 1200);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save note.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="app-layout">
                <Navbar />
                <main className="editor-page"><div className="loading-screen"><div className="spinner" /></div></main>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Navbar />
            <main className="editor-page">
                <div className="editor-container">
                    <div className="editor-header">
                        <button className="btn btn-ghost back-btn" onClick={() => navigate('/dashboard')}>
                            ← Back
                        </button>
                        <h2>{isEdit ? 'Edit Note' : 'New Note'}</h2>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <form onSubmit={handleSubmit} className="editor-form">
                        <div className="form-group">
                            <label htmlFor="note-title">Title</label>
                            <input
                                id="note-title"
                                type="text"
                                name="title"
                                className="form-input"
                                placeholder="Give your note a title…"
                                value={form.title}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="note-content">Content</label>
                            <textarea
                                id="note-content"
                                name="content"
                                className="form-input form-textarea"
                                placeholder="Write anything — ideas, research, observations…"
                                value={form.content}
                                onChange={handleChange}
                                required
                                rows={14}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="note-tags">
                                Tags <span className="label-hint">(comma-separated)</span>
                            </label>
                            <input
                                id="note-tags"
                                type="text"
                                name="tags"
                                className="form-input"
                                placeholder="e.g. research, ideas, climate"
                                value={form.tags}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="editor-actions">
                            <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" id="save-note-btn" disabled={loading}>
                                {loading
                                    ? <><span className="btn-spinner" /> {isEdit ? 'Updating…' : 'Creating…'}</>
                                    : isEdit ? 'Save Changes' : 'Create Note'}
                            </button>
                        </div>
                    </form>

                    {!isEdit && (
                        <div className="editor-hint">
                            <span className="hint-icon">✦</span>
                            An AI embedding will be generated automatically to enable semantic search.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
