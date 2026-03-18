import { useState } from 'react';

export default function SearchBar({ onSearch, onClear, isSearching }) {
    const [value, setValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
    };

    const handleClear = () => {
        setValue('');
        onClear();
    };

    return (
        <form className="search-bar" onSubmit={handleSubmit}>
            <div className="search-input-wrapper">
                <span className="search-icon">⌕</span>
                <input
                    id="semantic-search"
                    type="text"
                    className="search-input"
                    placeholder="Search semantically… e.g. 'ideas about climate change'"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    autoComplete="off"
                />
                {value && (
                    <button type="button" className="search-clear" onClick={handleClear} aria-label="Clear search">✕</button>
                )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={!value.trim() || isSearching} id="search-submit">
                {isSearching ? <span className="btn-spinner" /> : 'Search'}
            </button>
        </form>
    );
}
