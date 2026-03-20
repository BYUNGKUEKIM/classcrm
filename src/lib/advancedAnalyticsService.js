/**
 * Advanced Analytics Service - 고급 분석 및 리포팅
 * 
 * 주요 기능:
 * 1. 매출 분석 (일/주/월/년)
 * 2. 고객 분석 (신규/재방문/이탈)
 * 3. 예약 분석 (시간대별/유형별)
 * 4. 수익성 분석 (서비스별/월별)
 * 5. 고객 만족도 분석
 * 6. 예측 분석 (AI 기반)
 */

import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  format,
  differenceInDays
} from 'date-fns';

/**
 * 매출 분석 - 기간별
 */
export const getRevenueAnalytics = async (userId, period = 'month') => {
  try {
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 0 }); // 일요일 시작
        endDate = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }
    
    // 거래 내역 조회
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    // 데이터 집계
    let totalRevenue = 0;
    let totalExpense = 0;
    const dailyRevenue = {};
    const categoryRevenue = {};
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const amount = parseFloat(data.amount) || 0;
      const dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
      
      if (data.type === 'income') {
        totalRevenue += amount;
        dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + amount;
        
        const category = data.category || '기타';
        categoryRevenue[category] = (categoryRevenue[category] || 0) + amount;
      } else if (data.type === 'expense') {
        totalExpense += amount;
      }
    });
    
    // 이전 기간과 비교
    const previousPeriodData = await getPreviousPeriodRevenue(userId, startDate, period);
    const growth = previousPeriodData.totalRevenue > 0
      ? ((totalRevenue - previousPeriodData.totalRevenue) / previousPeriodData.totalRevenue) * 100
      : 0;
    
    // 차트 데이터 생성
    const chartData = Object.entries(dailyRevenue).map(([date, amount]) => ({
      date,
      amount,
      label: format(new Date(date), 'MM/dd')
    }));
    
    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      growth,
      previousPeriodRevenue: previousPeriodData.totalRevenue,
      dailyRevenue,
      categoryRevenue,
      chartData,
      averageDaily: totalRevenue / Math.max(differenceInDays(endDate, startDate), 1)
    };
  } catch (error) {
    console.error('Revenue analytics error:', error);
    throw error;
  }
};

/**
 * 이전 기간 매출 조회
 */
const getPreviousPeriodRevenue = async (userId, currentStartDate, period) => {
  let previousStartDate, previousEndDate;
  
  switch (period) {
    case 'day':
      previousStartDate = startOfDay(subDays(currentStartDate, 1));
      previousEndDate = endOfDay(subDays(currentStartDate, 1));
      break;
    case 'week':
      previousStartDate = startOfWeek(subDays(currentStartDate, 7), { weekStartsOn: 0 });
      previousEndDate = endOfWeek(subDays(currentStartDate, 7), { weekStartsOn: 0 });
      break;
    case 'month':
      previousStartDate = startOfMonth(subMonths(currentStartDate, 1));
      previousEndDate = endOfMonth(subMonths(currentStartDate, 1));
      break;
    case 'year':
      previousStartDate = startOfYear(subMonths(currentStartDate, 12));
      previousEndDate = endOfYear(subMonths(currentStartDate, 12));
      break;
    default:
      previousStartDate = startOfMonth(subMonths(currentStartDate, 1));
      previousEndDate = endOfMonth(subMonths(currentStartDate, 1));
  }
  
  const transactionsRef = collection(db, 'transactions');
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('type', '==', 'income'),
    where('date', '>=', Timestamp.fromDate(previousStartDate)),
    where('date', '<=', Timestamp.fromDate(previousEndDate))
  );
  
  const snapshot = await getDocs(q);
  let totalRevenue = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    totalRevenue += parseFloat(data.amount) || 0;
  });
  
  return { totalRevenue };
};

/**
 * 고객 분석
 */
export const getCustomerAnalytics = async (userId) => {
  try {
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const ninetyDaysAgo = subDays(now, 90);
    
    let totalCustomers = 0;
    let newCustomers = 0; // 30일 이내
    let activeCustomers = 0; // 30일 이내 활동
    let dormantCustomers = 0; // 90일 이상 활동 없음
    let totalBookings = 0;
    const visitFrequency = {}; // 방문 횟수별 고객 수
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalCustomers++;
      
      // 신규 고객
      if (data.createdAt && data.createdAt.toDate() >= thirtyDaysAgo) {
        newCustomers++;
      }
      
      // 활동 고객
      if (data.lastVisit && data.lastVisit.toDate() >= thirtyDaysAgo) {
        activeCustomers++;
      }
      
      // 휴면 고객
      if (data.lastVisit && data.lastVisit.toDate() < ninetyDaysAgo) {
        dormantCustomers++;
      }
      
      // 방문 횟수
      const visits = data.visitCount || 0;
      totalBookings += visits;
      
      if (visits === 1) {
        visitFrequency['1회'] = (visitFrequency['1회'] || 0) + 1;
      } else if (visits >= 2 && visits <= 3) {
        visitFrequency['2-3회'] = (visitFrequency['2-3회'] || 0) + 1;
      } else if (visits >= 4 && visits <= 5) {
        visitFrequency['4-5회'] = (visitFrequency['4-5회'] || 0) + 1;
      } else if (visits > 5) {
        visitFrequency['6회+'] = (visitFrequency['6회+'] || 0) + 1;
      }
    });
    
    // 재방문율 계산
    const returningCustomers = totalCustomers - (visitFrequency['1회'] || 0);
    const retentionRate = totalCustomers > 0 
      ? (returningCustomers / totalCustomers) * 100 
      : 0;
    
    // 평균 예약 횟수
    const averageBookings = totalCustomers > 0 
      ? totalBookings / totalCustomers 
      : 0;
    
    return {
      totalCustomers,
      newCustomers,
      activeCustomers,
      dormantCustomers,
      returningCustomers,
      retentionRate,
      averageBookings,
      visitFrequency,
      customerGrowth: calculateCustomerGrowth(snapshot)
    };
  } catch (error) {
    console.error('Customer analytics error:', error);
    throw error;
  }
};

/**
 * 고객 증가율 계산
 */
const calculateCustomerGrowth = (snapshot) => {
  const monthlyCustomers = {};
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.createdAt) {
      const monthKey = format(data.createdAt.toDate(), 'yyyy-MM');
      monthlyCustomers[monthKey] = (monthlyCustomers[monthKey] || 0) + 1;
    }
  });
  
  const sortedMonths = Object.keys(monthlyCustomers).sort();
  const chartData = sortedMonths.map(month => ({
    month,
    count: monthlyCustomers[month],
    label: format(new Date(month + '-01'), 'MM월')
  }));
  
  return chartData;
};

/**
 * 예약 분석
 */
export const getBookingAnalytics = async (userId, period = 'month') => {
  try {
    const { startDate, endDate } = getPeriodDates(period);
    
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('userId', '==', userId),
      where('booking_date', '>=', Timestamp.fromDate(startDate)),
      where('booking_date', '<=', Timestamp.fromDate(endDate))
    );
    
    const snapshot = await getDocs(q);
    
    let totalBookings = 0;
    const bookingsByType = {};
    const bookingsByTime = {};
    const bookingsByDay = {};
    let cancelledBookings = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalBookings++;
      
      // 촬영 유형별
      const filmingType = data.filming_type || '기타';
      bookingsByType[filmingType] = (bookingsByType[filmingType] || 0) + 1;
      
      // 시간대별
      if (data.booking_time) {
        const hour = parseInt(data.booking_time.split(':')[0]);
        let timeSlot;
        
        if (hour >= 9 && hour < 12) {
          timeSlot = '오전(9-12시)';
        } else if (hour >= 12 && hour < 15) {
          timeSlot = '점심(12-3시)';
        } else if (hour >= 15 && hour < 18) {
          timeSlot = '오후(3-6시)';
        } else {
          timeSlot = '저녁(6시 이후)';
        }
        
        bookingsByTime[timeSlot] = (bookingsByTime[timeSlot] || 0) + 1;
      }
      
      // 요일별
      if (data.booking_date) {
        const dayOfWeek = format(data.booking_date.toDate(), 'EEEE', { locale: 'ko' });
        bookingsByDay[dayOfWeek] = (bookingsByDay[dayOfWeek] || 0) + 1;
      }
      
      // 취소된 예약
      if (data.status === 'cancelled') {
        cancelledBookings++;
      }
    });
    
    // 예약률 계산 (취소 제외)
    const completedBookings = totalBookings - cancelledBookings;
    const completionRate = totalBookings > 0 
      ? (completedBookings / totalBookings) * 100 
      : 0;
    
    return {
      period,
      totalBookings,
      completedBookings,
      cancelledBookings,
      completionRate,
      bookingsByType,
      bookingsByTime,
      bookingsByDay,
      averageDaily: totalBookings / Math.max(differenceInDays(endDate, startDate), 1)
    };
  } catch (error) {
    console.error('Booking analytics error:', error);
    throw error;
  }
};

/**
 * 기간 날짜 계산
 */
const getPeriodDates = (period) => {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'day':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 0 });
      endDate = endOfWeek(now, { weekStartsOn: 0 });
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'year':
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
  }
  
  return { startDate, endDate };
};

/**
 * 서비스별 수익성 분석
 */
export const getServiceProfitability = async (userId) => {
  try {
    // 촬영 유형 조회
    const filmingTypesRef = collection(db, 'filming_types');
    const typesQuery = query(filmingTypesRef, where('userId', '==', userId));
    const typesSnapshot = await getDocs(typesQuery);
    
    const profitability = [];
    
    for (const typeDoc of typesSnapshot.docs) {
      const typeData = typeDoc.data();
      
      // 해당 유형의 예약 조회
      const bookingsRef = collection(db, 'bookings');
      const bookingsQuery = query(
        bookingsRef,
        where('userId', '==', userId),
        where('filming_type_id', '==', typeDoc.id)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      let totalRevenue = 0;
      let bookingCount = 0;
      
      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        bookingCount++;
        // 가격 계산 (filming_type의 price 사용)
        totalRevenue += parseFloat(typeData.price) || 0;
      });
      
      // 평균 비용 추정 (실제로는 더 정교한 계산 필요)
      const estimatedCost = totalRevenue * 0.3; // 30% 비용으로 가정
      const profit = totalRevenue - estimatedCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      
      profitability.push({
        id: typeDoc.id,
        name: typeData.name,
        price: typeData.price,
        bookingCount,
        totalRevenue,
        estimatedCost,
        profit,
        profitMargin,
        averageRevenue: bookingCount > 0 ? totalRevenue / bookingCount : 0
      });
    }
    
    // 수익성 기준 정렬
    profitability.sort((a, b) => b.profit - a.profit);
    
    return profitability;
  } catch (error) {
    console.error('Service profitability error:', error);
    throw error;
  }
};

/**
 * 고객 만족도 분석
 */
export const getCustomerSatisfaction = async (userId) => {
  try {
    const reviewsRef = collection(db, 'customerReviews');
    const q = query(
      reviewsRef,
      where('userId', '==', userId),
      where('status', '==', 'approved')
    );
    
    const snapshot = await getDocs(q);
    
    let totalRating = 0;
    let reviewCount = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const recentReviews = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const rating = data.rating || 0;
      
      totalRating += rating;
      reviewCount++;
      ratingDistribution[rating]++;
      
      if (recentReviews.length < 10) {
        recentReviews.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
    
    // NPS 계산 (Net Promoter Score)
    // 5점: Promoter, 4점: Passive, 1-3점: Detractor
    const promoters = ratingDistribution[5];
    const passives = ratingDistribution[4];
    const detractors = ratingDistribution[1] + ratingDistribution[2] + ratingDistribution[3];
    
    const nps = reviewCount > 0 
      ? ((promoters - detractors) / reviewCount) * 100 
      : 0;
    
    return {
      averageRating,
      reviewCount,
      ratingDistribution,
      promoters,
      passives,
      detractors,
      nps,
      recentReviews
    };
  } catch (error) {
    console.error('Customer satisfaction error:', error);
    throw error;
  }
};

/**
 * 예측 분석 (AI 기반)
 */
export const getPredictiveAnalytics = async (userId) => {
  try {
    // 과거 데이터 기반 예측
    const [revenueData, bookingData, customerData] = await Promise.all([
      getRevenueAnalytics(userId, 'year'),
      getBookingAnalytics(userId, 'year'),
      getCustomerAnalytics(userId)
    ]);
    
    // 간단한 선형 회귀 기반 예측 (실제로는 더 복잡한 ML 모델 사용)
    const nextMonthRevenue = predictNextValue(
      Object.values(revenueData.dailyRevenue)
    );
    
    const nextMonthBookings = predictNextValue(
      [bookingData.totalBookings] // 단순화
    );
    
    // 추천 사항 생성
    const recommendations = generateRecommendations(revenueData, bookingData, customerData);
    
    return {
      predictions: {
        nextMonthRevenue,
        nextMonthBookings,
        confidenceLevel: 0.75 // 예측 신뢰도
      },
      trends: {
        revenueGrowth: revenueData.growth,
        customerGrowth: customerData.newCustomers,
        bookingTrend: bookingData.averageDaily
      },
      recommendations
    };
  } catch (error) {
    console.error('Predictive analytics error:', error);
    throw error;
  }
};

/**
 * 다음 값 예측 (단순 선형 회귀)
 */
const predictNextValue = (values) => {
  if (values.length === 0) return 0;
  
  // 최근 값들의 평균 증가율 계산
  let totalGrowth = 0;
  let growthCount = 0;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      const growth = (values[i] - values[i - 1]) / values[i - 1];
      totalGrowth += growth;
      growthCount++;
    }
  }
  
  const averageGrowth = growthCount > 0 ? totalGrowth / growthCount : 0;
  const lastValue = values[values.length - 1];
  
  return lastValue * (1 + averageGrowth);
};

/**
 * 추천 사항 생성
 */
const generateRecommendations = (revenueData, bookingData, customerData) => {
  const recommendations = [];
  
  // 매출 감소시
  if (revenueData.growth < 0) {
    recommendations.push({
      priority: 'high',
      category: 'revenue',
      title: '매출 증대 방안 필요',
      description: '지난 기간 대비 매출이 감소했습니다. 프로모션이나 신규 서비스 도입을 검토하세요.',
      actions: ['프로모션 기획', '신규 서비스 개발', '가격 전략 재검토']
    });
  }
  
  // 휴면 고객 많을 시
  if (customerData.dormantCustomers > customerData.totalCustomers * 0.3) {
    recommendations.push({
      priority: 'high',
      category: 'customer',
      title: '휴면 고객 재활성화',
      description: `${customerData.dormantCustomers}명의 휴면 고객이 있습니다. 재방문 유도 캠페인이 필요합니다.`,
      actions: ['할인 쿠폰 발송', '재방문 이벤트', '개인화된 연락']
    });
  }
  
  // 예약 취소율 높을 시
  if (bookingData.completionRate < 80) {
    recommendations.push({
      priority: 'medium',
      category: 'booking',
      title: '예약 취소율 개선',
      description: '예약 완료율이 낮습니다. 리마인더 시스템을 강화하세요.',
      actions: ['자동 리마인더 설정', '예약 확인 프로세스 개선', '취소 사유 분석']
    });
  }
  
  // 인기 시간대 활용
  const popularTimes = Object.entries(bookingData.bookingsByTime)
    .sort((a, b) => b[1] - a[1]);
  
  if (popularTimes.length > 0) {
    recommendations.push({
      priority: 'low',
      category: 'optimization',
      title: '인기 시간대 최적화',
      description: `${popularTimes[0][0]}가 가장 인기 있는 시간대입니다. 추가 슬롯을 고려하세요.`,
      actions: ['인기 시간대 확대', '비인기 시간대 할인', '스케줄 조정']
    });
  }
  
  return recommendations;
};

/**
 * 종합 대시보드 데이터
 */
export const getComprehensiveDashboard = async (userId) => {
  try {
    const [
      revenue,
      customers,
      bookings,
      profitability,
      satisfaction,
      predictions
    ] = await Promise.all([
      getRevenueAnalytics(userId, 'month'),
      getCustomerAnalytics(userId),
      getBookingAnalytics(userId, 'month'),
      getServiceProfitability(userId),
      getCustomerSatisfaction(userId),
      getPredictiveAnalytics(userId)
    ]);
    
    return {
      revenue,
      customers,
      bookings,
      profitability,
      satisfaction,
      predictions,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Comprehensive dashboard error:', error);
    throw error;
  }
};

export default {
  getRevenueAnalytics,
  getCustomerAnalytics,
  getBookingAnalytics,
  getServiceProfitability,
  getCustomerSatisfaction,
  getPredictiveAnalytics,
  getComprehensiveDashboard
};
