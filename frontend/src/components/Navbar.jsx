import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <Link to="/dashboard" className="navbar-brand">
                <span className="brand-icon">✦</span>
                <span className="brand-name">Semantic<span className="brand-accent">Notes</span></span>
            </Link>
            <div className="navbar-actions">
                {user && (
                    <>
                        <span className="navbar-user">
                            <span className="user-avatar">{user.name?.charAt(0).toUpperCase()}</span>
                            {user.name}
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                            Sign Out
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
