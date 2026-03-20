import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Check, Copy, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const plans = [
  {
    name: "베이직",
    price: "49,000",
    features: ["고객 관리", "예약 관리", "기본 통계"],
    cta: "베이직으로 시작하기",
    color: "from-blue-500 to-purple-600",
    shadow: "shadow-blue-200",
  },
  {
    name: "프리미엄",
    price: "99,000",
    features: ["베이직 플랜의 모든 기능", "매출 및 재무 관리", "상품 관리", "고급 통계 분석", "우선 기술 지원"],
    cta: "프리미엄으로 업그레이드",
    color: "from-green-500 to-teal-600",
    shadow: "shadow-green-200",
    popular: true,
  },
];

const BankInfo = {
    bankName: "신한은행",
    accountNumber: "110-230-161558",
    accountHolder: "김병규",
};

export default function SubscriptionPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCardPayment = () => {
    toast({
      title: "🚀 카드 결제 준비 중!",
      description: "안전한 카드 결제 기능이 곧 추가될 예정입니다. Stripe API 키를 등록하시면 바로 사용하실 수 있습니다.",
      duration: 5000,
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({
            title: "✅ 복사 완료",
            description: "계좌번호가 클립보드에 복사되었습니다.",
        })
    }).catch(err => {
        toast({
            title: "❌ 복사 실패",
            description: "계좌번호 복사에 실패했습니다.",
            variant: "destructive",
        })
    })
  }

  return (
    <>
      <Helmet>
        <title>구독 관리 - 포토스튜디오 CRM</title>
        <meta name="description" content="구독 플랜을 확인하고 결제를 진행하세요." />
      </Helmet>

      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">구독 플랜</h1>
          <p className="text-lg text-gray-600">사장님의 스튜디오에 가장 적합한 플랜을 선택하세요.</p>
          <p className="text-sm text-gray-500 mt-2">현재 구독: <span className="font-semibold text-purple-600">{user?.subscription || '정보 없음'}</span></p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.2 }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`relative rounded-2xl p-8 border ${plan.popular ? 'border-green-400' : 'border-gray-200'} bg-white flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300`}
              variants={{
                initial: { opacity: 0, y: 50 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.1 } }
              }}
            >
              {plan.popular && <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-green-500 to-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">가장 인기있는 플랜</div>}
              <h2 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${plan.color}`}>{plan.name}</h2>
              <p className="text-4xl font-extrabold text-gray-900 my-4">₩{plan.price}<span className="text-base font-medium text-gray-500">/월</span></p>
              <ul className="space-y-3 text-gray-600 flex-grow">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={handleCardPayment} className={`w-full mt-8 h-12 text-lg font-bold bg-gradient-to-r ${plan.color} hover:shadow-lg hover:opacity-90 transition-all`}>
                <CreditCard className="w-5 h-5 mr-2" />
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
            className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
        >
          <div className="flex items-center mb-4">
            <Banknote className="w-8 h-8 mr-3 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900">계좌 이체 안내</h2>
          </div>
          <p className="text-gray-600 mb-6">아래 계좌로 입금 후 관리자에게 문의해주시면 확인 후 바로 플랜을 적용해 드립니다.</p>
          <div className="bg-gray-100 rounded-lg p-6 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">은행</span>
                <span className="font-bold text-gray-800">{BankInfo.bankName}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">예금주</span>
                <span className="font-bold text-gray-800">{BankInfo.accountHolder}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">계좌번호</span>
                <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-blue-600">{BankInfo.accountNumber}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(BankInfo.accountNumber)}>
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            </div>
          </div>
        </motion.div>

      </div>
    </>
  );
}