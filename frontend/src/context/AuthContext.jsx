import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('snf_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [token, setToken] = useState(() => {
        return localStorage.getItem('snf_token') || null;
    });

    const login = (tokenValue, userData) => {
        localStorage.setItem('snf_token', tokenValue);
        localStorage.setItem('snf_user', JSON.stringify(userData));
        setToken(tokenValue);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('snf_token');
        localStorage.removeItem('snf_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}
