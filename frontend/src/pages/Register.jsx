import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/register', form);
            login(res.data.token, res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-glow" />
            <div className="auth-card">
                <div className="auth-brand">
                    <span className="brand-icon">✦</span>
                    <h1>SemanticNotes</h1>
                    <p className="auth-tagline">Find your thoughts with AI-powered search</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <h2 className="auth-title">Create your account</h2>
                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="Jane Doe"
                            value={form.name}
                            onChange={handleChange}
                            required
                            autoComplete="name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password <span className="label-hint">(min. 6 chars)</span></label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" id="register-submit" disabled={loading}>
                        {loading ? <span className="btn-spinner" /> : 'Create Account'}
                    </button>

                    <p className="auth-switch">
                        Already have an account? <Link to="/login">Sign in →</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
