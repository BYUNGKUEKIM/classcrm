import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, AlertCircle, CheckCircle, Globe } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    studioName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }

    if (!formData.studioName.trim()) {
      setError(t('studioNameRequired'));
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.email, formData.password, formData.studioName);
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Language Toggle - Top Right */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="fixed top-4 right-4 z-50"
      >
        <Globe className="h-4 w-4 mr-2" />
        {language === 'ko' ? 'English' : '한국어'}
      </Button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('signUpFree')}</h1>
          <p className="text-gray-600 mt-2">
            {language === 'ko' ? '몇 분 안에 스튜디오 관리 시작하기' : 'Start managing your studio in minutes'}
          </p>
        </div>

        {/* Register Card */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ko' ? '계정 만들기' : 'Create Your Account'}</CardTitle>
            <CardDescription>{t('freeTrial')} • {t('noCreditCard')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('studioName')}</label>
                <Input
                  type="text"
                  name="studioName"
                  placeholder={language === 'ko' ? '내 포토 스튜디오' : 'My Photography Studio'}
                  value={formData.studioName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('email')}</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('password')}</label>
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">{t('minimumSixChars')}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('confirmPassword')}</label>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? t('creatingAccount') : (language === 'ko' ? '계정 만들기' : 'Create Account')}
              </Button>
            </form>

            {/* Features */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{t('freeTrial')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{t('noCreditCard')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{t('cancelAnytime')}</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                  {t('signIn')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© 2026 Photo Studio CRM. {t('allRightsReserved')}.</p>
        </div>
      </div>
    </div>
  );
}
