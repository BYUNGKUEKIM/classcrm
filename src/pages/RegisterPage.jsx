import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Camera, Mail, Lock, User, Building, UserPlus, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { toast } from '@/components/ui/use-toast';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    ownerName: '',
    studioName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "비밀번호 불일치",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(formData.email, formData.password, {
      data: {
        ownerName: formData.ownerName,
        studioName: formData.studioName,
        phoneNumber: formData.phoneNumber,
      },
    });

    // Error/Success toast is handled inside signUp function
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Helmet>
        <title>회원가입 - 포토스튜디오 CRM</title>
        <meta name="description" content="포토스튜디오 고객관리 시스템 회원가입" />
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4"
            >
              <Camera className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">회원가입</h1>
            <p className="text-gray-600">새로운 계정을 만들어보세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="ownerName" className="text-gray-700">대표자 이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="ownerName"
                  name="ownerName"
                  type="text"
                  placeholder="홍길동"
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studioName" className="text-gray-700">스튜디오 이름</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="studioName"
                  name="studioName"
                  type="text"
                  placeholder="행복한 사진관"
                  value={formData.studioName}
                  onChange={handleChange}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-gray-700">연락처</Label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="010-1234-5678"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500"
                    required
                    disabled={isLoading}
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">이메일 (로그인 아이디)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700">비밀번호 확인</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  회원가입
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}