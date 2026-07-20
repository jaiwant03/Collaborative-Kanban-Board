import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/workspaces';

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  // Clear context-level auth error when component unmounts
  useEffect(() => () => clearError(), [clearError]);

  const validate = () => {
    const errors = {};
    if (!form.email.trim()) errors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errors.email = 'Enter a valid email.';
    if (!form.password) errors.password = 'Password is required.';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    const result = await login(form);
    if (result.success) {
      toast.success('Welcome back!');
      navigate(returnUrl);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Branding */}
        <div className="auth-card__header">
          <img src="/Kanban login logo.png" alt="Kanban Board Logo" className="auth-card__logo" />
          <h1 className="auth-card__title">Welcome back</h1>
          <p className="auth-card__subtitle">Sign in to your Kanban Board account</p>
        </div>

        {/* Server-level error banner */}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label="Login form">
          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            placeholder="alice@example.com"
            value={form.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
            autoComplete="email"
            autoFocus
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="full"
            isLoading={isLoading}
            className="auth-card__submit"
          >
            Sign In
          </Button>
        </form>

        <p className="auth-card__footer">
          Don't have an account?{' '}
          <Link
            to={returnUrl !== '/workspaces' ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` : '/register'}
            className="auth-card__link"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
