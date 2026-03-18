import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function NoteView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchNote = async () => {
            try {
                const res = await api.get(`/notes/${id}`);
                setNote(res.data.note);
            } catch {
                setError('Failed to load note.');
            } finally {
                setLoading(false);
            }
        };

        fetchNote();
    }, [id]);

    if (loading) {
        return (
            <div className="app-layout">
                <Navbar />
                <main className="editor-page"><div className="loading-screen"><div className="spinner" /></div></main>
            </div>
        );
    }

    if (error || !note) {
        return (
            <div className="app-layout">
                <Navbar />
                <main className="editor-page">
                    <div className="editor-container">
                        <div className="alert alert-error">{error || 'Note not found.'}</div>
                        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
                    </div>
                </main>
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
                        <h2>View Note</h2>
                    </div>

                    <div className="note-view-block">
                        <h3 className="note-view-title">{note.title || 'Untitled'}</h3>
                        {note.tags?.length > 0 && (
                            <div className="note-tags">
                                {note.tags.map(tag => (
                                    <span key={tag} className="tag">#{tag}</span>
                                ))}
                            </div>
                        )}
                        <p className="note-view-content">{note.content}</p>
                    </div>

                    <div className="editor-actions">
                        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                            Close
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate(`/notes/${note.id}/edit`)}>
                            Edit
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
