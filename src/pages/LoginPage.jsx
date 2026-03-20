import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, AlertCircle, Globe } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Language Toggle - Top Right */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          console.log('Current language:', language);
          toggleLanguage();
        }}
        className="fixed top-4 right-4 z-50 bg-white"
      >
        <Globe className="h-4 w-4 mr-2" />
        <span className="font-semibold">
          {language === 'ko' ? 'EN' : 'KO'}
        </span>
      </Button>

      <div className="w-full max-w-md">
        {/* Language Indicator */}
        <div className="text-center mb-2">
          <span className="text-xs text-gray-500">
            Current: {language === 'ko' ? '한국어' : 'English'}
          </span>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Photo Studio CRM</h1>
          <p className="text-gray-600 mt-2">
            {language === 'ko' ? '사진 스튜디오를 쉽게 관리하세요' : 'Manage your photography business with ease'}
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('welcomeBack')}</CardTitle>
            <CardDescription>
              {language === 'ko' ? '계정에 로그인하여 계속하세요' : 'Sign in to your account to continue'}
            </CardDescription>
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
                <label className="text-sm font-medium text-gray-700">{t('email')}</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('password')}</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? t('signingIn') : t('signIn')}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                {t('dontHaveAccount')}{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  {t('signUpFree')}
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700">
                  {t('forgotPassword')}
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
