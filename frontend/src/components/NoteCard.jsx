export default function NoteCard({ note, onView, onEdit, onDelete }) {
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const preview = note.content?.length > 120
        ? note.content.slice(0, 120) + '…'
        : note.content;

    const similarityBadge = note.similarity !== undefined && (
        <span className={`similarity-badge ${note.similarity > 0.85 ? 'high' : note.similarity > 0.7 ? 'mid' : 'low'}`}>
            {(note.similarity * 100).toFixed(0)}% match
        </span>
    );

    return (
        <div className="note-card">
            <div className="note-card-header">
                <h3 className="note-title">{note.title || 'Untitled'}</h3>
                {similarityBadge}
            </div>
            <p className="note-preview">{preview}</p>
            {note.tags?.length > 0 && (
                <div className="note-tags">
                    {note.tags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                    ))}
                </div>
            )}
            <div className="note-footer">
                <span className="note-date">{formatDate(note.updated_at || note.created_at)}</span>
                <div className="note-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => onView(note)}>View</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(note)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(note.id)}>Delete</button>
                </div>
            </div>
        </div>
    );
}
