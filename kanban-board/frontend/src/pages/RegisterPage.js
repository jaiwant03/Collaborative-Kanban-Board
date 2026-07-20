import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/workspaces';

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => () => clearError(), [clearError]);

  // Simple password strength indicator: 0-3
  useEffect(() => {
    const p = form.password;
    let strength = 0;
    if (p.length >= 6) strength++;
    if (/[A-Z]/.test(p)) strength++;
    if (/\d/.test(p)) strength++;
    setPasswordStrength(strength);
  }, [form.password]);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    else if (form.name.trim().length < 2)
      errors.name = 'Name must be at least 2 characters.';

    if (!form.email.trim()) errors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errors.email = 'Enter a valid email.';

    if (!form.password) errors.password = 'Password is required.';
    else if (form.password.length < 6)
      errors.password = 'Password must be at least 6 characters.';
    else if (!/\d/.test(form.password))
      errors.password = 'Password must contain at least one number.';

    if (!form.confirmPassword)
      errors.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword)
      errors.confirmPassword = 'Passwords do not match.';

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

    const { confirmPassword, ...registerData } = form;
    const result = await register(registerData);
    if (result.success) {
      toast.success('Account created! Welcome aboard.');
      navigate(returnUrl);
    } else {
      toast.error(result.message);
    }
  };

  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];
  const strengthClasses = ['', 'strength--weak', 'strength--fair', 'strength--strong'];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo" aria-hidden="true">⬛</div>
          <h1 className="auth-card__title">Create an account</h1>
          <p className="auth-card__subtitle">Start managing your team's work today</p>
        </div>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label="Registration form">
          <Input
            id="name"
            name="name"
            type="text"
            label="Full name"
            placeholder="Alice Johnson"
            value={form.name}
            onChange={handleChange}
            error={fieldErrors.name}
            required
            autoComplete="name"
            autoFocus
          />

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
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Min. 6 characters with a number"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
            autoComplete="new-password"
          />

          {/* Password strength meter */}
          {form.password.length > 0 && (
            <div className="password-strength" aria-live="polite">
              <div className="password-strength__bar">
                <div
                  className={`password-strength__fill ${strengthClasses[passwordStrength]}`}
                  style={{ width: `${(passwordStrength / 3) * 100}%` }}
                />
              </div>
              <span className="password-strength__label">
                {strengthLabels[passwordStrength]}
              </span>
            </div>
          )}

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="full"
            isLoading={isLoading}
            className="auth-card__submit"
          >
            Create Account
          </Button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link
            to={returnUrl !== '/workspaces' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
            className="auth-card__link"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
