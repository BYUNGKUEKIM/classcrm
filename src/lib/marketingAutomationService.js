/**
 * Marketing Automation Service - 마케팅 자동화
 * 
 * 주요 기능:
 * 1. 이메일 캠페인 관리
 * 2. SMS 마케팅
 * 3. 고객 세그멘테이션
 * 4. A/B 테스트
 * 5. 자동 리타게팅
 * 6. 생일/기념일 자동 메시지
 */

import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { format, addDays, isBefore, isAfter, parseISO } from 'date-fns';

/**
 * 캠페인 생성
 */
export const createCampaign = async (userId, campaignData) => {
  try {
    const {
      name,
      type, // 'email', 'sms', 'push'
      targetSegment, // 'all', 'new', 'returning', 'dormant', 'custom'
      content,
      subject, // 이메일 제목
      scheduledAt,
      status = 'draft' // draft, scheduled, running, completed, cancelled
    } = campaignData;
    
    const campaignsRef = collection(db, 'marketingCampaigns');
    const campaignDoc = await addDoc(campaignsRef, {
      userId,
      name,
      type,
      targetSegment,
      content,
      subject,
      scheduledAt: scheduledAt ? Timestamp.fromDate(new Date(scheduledAt)) : null,
      status,
      stats: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        bounced: 0,
        unsubscribed: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: campaignDoc.id,
      success: true
    };
  } catch (error) {
    console.error('Create campaign error:', error);
    throw error;
  }
};

/**
 * 고객 세그멘테이션
 */
export const segmentCustomers = async (userId, segmentType, customFilters = {}) => {
  try {
    const customersRef = collection(db, 'customers');
    let q = query(customersRef, where('userId', '==', userId));
    
    const snapshot = await getDocs(q);
    const customers = [];
    const now = new Date();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      let include = false;
      
      switch (segmentType) {
        case 'all':
          include = true;
          break;
          
        case 'new':
          // 최근 30일 이내 가입
          if (data.createdAt && data.createdAt.toDate() >= addDays(now, -30)) {
            include = true;
          }
          break;
          
        case 'returning':
          // 2회 이상 방문
          if (data.visitCount >= 2) {
            include = true;
          }
          break;
          
        case 'dormant':
          // 90일 이상 활동 없음
          if (data.lastVisit && data.lastVisit.toDate() < addDays(now, -90)) {
            include = true;
          }
          break;
          
        case 'vip':
          // 5회 이상 방문 또는 높은 총 지출
          if (data.visitCount >= 5 || (data.totalSpent && data.totalSpent >= 1000000)) {
            include = true;
          }
          break;
          
        case 'birthday':
          // 이번 달 생일
          if (data.birthday) {
            const birthday = new Date(data.birthday);
            const currentMonth = now.getMonth();
            if (birthday.getMonth() === currentMonth) {
              include = true;
            }
          }
          break;
          
        case 'custom':
          // 커스텀 필터 적용
          include = applyCustomFilters(data, customFilters);
          break;
          
        default:
          include = false;
      }
      
      if (include) {
        customers.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return {
      segment: segmentType,
      count: customers.length,
      customers
    };
  } catch (error) {
    console.error('Segment customers error:', error);
    throw error;
  }
};

/**
 * 커스텀 필터 적용
 */
const applyCustomFilters = (customer, filters) => {
  let match = true;
  
  if (filters.minVisits && customer.visitCount < filters.minVisits) {
    match = false;
  }
  
  if (filters.maxVisits && customer.visitCount > filters.maxVisits) {
    match = false;
  }
  
  if (filters.minSpent && (!customer.totalSpent || customer.totalSpent < filters.minSpent)) {
    match = false;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    if (!customer.tags || !filters.tags.some(tag => customer.tags.includes(tag))) {
      match = false;
    }
  }
  
  return match;
};

/**
 * 캠페인 실행
 */
export const executeCampaign = async (userId, campaignId) => {
  try {
    const campaignRef = doc(db, 'marketingCampaigns', campaignId);
    const campaignDoc = await getDoc(campaignRef);
    
    if (!campaignDoc.exists()) {
      throw new Error('캠페인을 찾을 수 없습니다.');
    }
    
    const campaignData = campaignDoc.data();
    
    // 타겟 고객 세그먼트 가져오기
    const { customers } = await segmentCustomers(
      userId, 
      campaignData.targetSegment,
      campaignData.customFilters
    );
    
    // 캠페인 상태 업데이트
    await updateDoc(campaignRef, {
      status: 'running',
      startedAt: serverTimestamp(),
      targetCount: customers.length
    });
    
    // 메시지 전송 (배치 처리)
    const results = await sendBatchMessages(
      userId,
      campaignId,
      customers,
      campaignData
    );
    
    // 통계 업데이트
    await updateDoc(campaignRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      'stats.sent': results.sent,
      'stats.delivered': results.delivered,
      'stats.bounced': results.bounced
    });
    
    return {
      success: true,
      sent: results.sent,
      delivered: results.delivered
    };
  } catch (error) {
    console.error('Execute campaign error:', error);
    throw error;
  }
};

/**
 * 배치 메시지 전송
 */
const sendBatchMessages = async (userId, campaignId, customers, campaignData) => {
  const results = {
    sent: 0,
    delivered: 0,
    bounced: 0
  };
  
  const messagesRef = collection(db, 'campaignMessages');
  
  for (const customer of customers) {
    try {
      // 개인화된 메시지 생성
      const personalizedContent = personalizeMessage(campaignData.content, customer);
      
      // 메시지 기록 저장
      await addDoc(messagesRef, {
        userId,
        campaignId,
        customerId: customer.id,
        type: campaignData.type,
        recipient: customer.email || customer.phone,
        subject: campaignData.subject,
        content: personalizedContent,
        status: 'sent',
        sentAt: serverTimestamp(),
        opened: false,
        clicked: false,
        converted: false
      });
      
      // 실제 전송 로직 (이메일/SMS API 호출)
      // TODO: SendGrid, Twilio 등 실제 API 연동
      
      results.sent++;
      results.delivered++;
    } catch (error) {
      console.error(`Failed to send to ${customer.id}:`, error);
      results.bounced++;
    }
  }
  
  return results;
};

/**
 * 메시지 개인화
 */
const personalizeMessage = (template, customer) => {
  let message = template;
  
  // 변수 치환
  message = message.replace(/\{name\}/g, customer.name || '고객');
  message = message.replace(/\{email\}/g, customer.email || '');
  message = message.replace(/\{phone\}/g, customer.phone || '');
  message = message.replace(/\{visitCount\}/g, customer.visitCount || 0);
  
  // 추가 개인화 로직
  if (customer.lastVisit) {
    const daysSinceVisit = Math.floor(
      (new Date() - customer.lastVisit.toDate()) / (1000 * 60 * 60 * 24)
    );
    message = message.replace(/\{daysSinceVisit\}/g, daysSinceVisit);
  }
  
  return message;
};

/**
 * A/B 테스트 생성
 */
export const createABTest = async (userId, testData) => {
  try {
    const {
      name,
      type, // 'subject', 'content', 'timing'
      variantA,
      variantB,
      testSize, // 테스트 그룹 크기 (%)
      successMetric // 'open_rate', 'click_rate', 'conversion_rate'
    } = testData;
    
    const testsRef = collection(db, 'abTests');
    const testDoc = await addDoc(testsRef, {
      userId,
      name,
      type,
      variantA,
      variantB,
      testSize,
      successMetric,
      status: 'running',
      results: {
        variantA: { sent: 0, success: 0, rate: 0 },
        variantB: { sent: 0, success: 0, rate: 0 }
      },
      winner: null,
      createdAt: serverTimestamp()
    });
    
    return {
      id: testDoc.id,
      success: true
    };
  } catch (error) {
    console.error('Create A/B test error:', error);
    throw error;
  }
};

/**
 * A/B 테스트 결과 분석
 */
export const analyzeABTest = async (testId) => {
  try {
    const testRef = doc(db, 'abTests', testId);
    const testDoc = await getDoc(testRef);
    
    if (!testDoc.exists()) {
      throw new Error('테스트를 찾을 수 없습니다.');
    }
    
    const testData = testDoc.data();
    const { variantA, variantB } = testData.results;
    
    // 통계적 유의성 검정 (간단한 버전)
    const isSignificant = checkStatisticalSignificance(variantA, variantB);
    
    let winner = null;
    if (isSignificant) {
      winner = variantA.rate > variantB.rate ? 'A' : 'B';
    }
    
    // 결과 업데이트
    await updateDoc(testRef, {
      status: 'completed',
      winner,
      isSignificant,
      completedAt: serverTimestamp()
    });
    
    return {
      winner,
      isSignificant,
      variantA,
      variantB,
      improvement: Math.abs(variantA.rate - variantB.rate)
    };
  } catch (error) {
    console.error('Analyze A/B test error:', error);
    throw error;
  }
};

/**
 * 통계적 유의성 검정 (간단한 버전)
 */
const checkStatisticalSignificance = (variantA, variantB) => {
  // 실제로는 더 정교한 통계 검정 필요 (Chi-square test 등)
  const minSampleSize = 100;
  
  if (variantA.sent < minSampleSize || variantB.sent < minSampleSize) {
    return false; // 샘플 크기가 충분하지 않음
  }
  
  const difference = Math.abs(variantA.rate - variantB.rate);
  return difference > 0.05; // 5% 이상 차이
};

/**
 * 자동 생일 메시지
 */
export const scheduleBirthdayMessages = async (userId) => {
  try {
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const now = new Date();
    const scheduledMessages = [];
    
    for (const docSnap of snapshot.docs) {
      const customer = docSnap.data();
      
      if (!customer.birthday) continue;
      
      const birthday = new Date(customer.birthday);
      const thisYearBirthday = new Date(
        now.getFullYear(),
        birthday.getMonth(),
        birthday.getDate()
      );
      
      // 생일 7일 전부터 당일까지
      const daysUntilBirthday = Math.floor(
        (thisYearBirthday - now) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilBirthday >= 0 && daysUntilBirthday <= 7) {
        const message = {
          customerId: docSnap.id,
          customerName: customer.name,
          birthday: format(thisYearBirthday, 'yyyy-MM-dd'),
          daysUntil: daysUntilBirthday,
          scheduledDate: format(thisYearBirthday, 'yyyy-MM-dd')
        };
        
        scheduledMessages.push(message);
        
        // 자동 메시지 스케줄링
        await scheduleAutomatedMessage(userId, {
          type: 'birthday',
          customerId: docSnap.id,
          scheduledAt: thisYearBirthday,
          template: 'birthday_greeting',
          data: {
            customerName: customer.name,
            email: customer.email,
            phone: customer.phone
          }
        });
      }
    }
    
    return scheduledMessages;
  } catch (error) {
    console.error('Schedule birthday messages error:', error);
    throw error;
  }
};

/**
 * 자동화된 메시지 스케줄링
 */
const scheduleAutomatedMessage = async (userId, messageData) => {
  try {
    const scheduledMessagesRef = collection(db, 'scheduledMessages');
    
    await addDoc(scheduledMessagesRef, {
      userId,
      type: messageData.type,
      customerId: messageData.customerId,
      scheduledAt: Timestamp.fromDate(messageData.scheduledAt),
      template: messageData.template,
      data: messageData.data,
      status: 'scheduled', // scheduled, sent, failed
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Schedule message error:', error);
    throw error;
  }
};

/**
 * 리타게팅 캠페인
 */
export const createRetargetingCampaign = async (userId, retargetingData) => {
  try {
    const {
      name,
      targetAction, // 'cart_abandon', 'browse_abandon', 'dormant'
      delayDays, // 액션 후 며칠 뒤 타게팅
      content,
      incentive // 할인 쿠폰 등
    } = retargetingData;
    
    const retargetingRef = collection(db, 'retargetingCampaigns');
    const campaignDoc = await addDoc(retargetingRef, {
      userId,
      name,
      targetAction,
      delayDays,
      content,
      incentive,
      status: 'active',
      stats: {
        triggered: 0,
        sent: 0,
        converted: 0
      },
      createdAt: serverTimestamp()
    });
    
    return {
      id: campaignDoc.id,
      success: true
    };
  } catch (error) {
    console.error('Create retargeting campaign error:', error);
    throw error;
  }
};

/**
 * 리타게팅 트리거 확인
 */
export const checkRetargetingTriggers = async (userId) => {
  try {
    // 활성 리타게팅 캠페인 조회
    const retargetingRef = collection(db, 'retargetingCampaigns');
    const q = query(
      retargetingRef,
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    
    const triggeredMessages = [];
    
    for (const campaignDoc of snapshot.docs) {
      const campaign = campaignDoc.data();
      
      // 타겟 액션에 해당하는 고객 찾기
      const targetCustomers = await findRetargetingTargets(
        userId,
        campaign.targetAction,
        campaign.delayDays
      );
      
      // 각 고객에게 메시지 전송 스케줄링
      for (const customer of targetCustomers) {
        await scheduleAutomatedMessage(userId, {
          type: 'retargeting',
          customerId: customer.id,
          scheduledAt: new Date(), // 즉시 전송
          template: 'retargeting',
          data: {
            customerName: customer.name,
            content: campaign.content,
            incentive: campaign.incentive
          }
        });
        
        triggeredMessages.push({
          campaignId: campaignDoc.id,
          customerId: customer.id,
          customerName: customer.name
        });
      }
      
      // 통계 업데이트
      await updateDoc(campaignDoc.ref, {
        'stats.triggered': campaign.stats.triggered + targetCustomers.length
      });
    }
    
    return triggeredMessages;
  } catch (error) {
    console.error('Check retargeting triggers error:', error);
    throw error;
  }
};

/**
 * 리타게팅 타겟 찾기
 */
const findRetargetingTargets = async (userId, targetAction, delayDays) => {
  const customersRef = collection(db, 'customers');
  const q = query(customersRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  const targets = [];
  const cutoffDate = addDays(new Date(), -delayDays);
  
  snapshot.forEach((doc) => {
    const customer = doc.data();
    
    switch (targetAction) {
      case 'dormant':
        // 지정 기간 이상 활동 없음
        if (customer.lastVisit && customer.lastVisit.toDate() < cutoffDate) {
          targets.push({
            id: doc.id,
            ...customer
          });
        }
        break;
        
      case 'cart_abandon':
        // TODO: 장바구니 포기 로직
        break;
        
      case 'browse_abandon':
        // TODO: 둘러보기만 한 고객
        break;
    }
  });
  
  return targets;
};

/**
 * 캠페인 성과 리포트
 */
export const getCampaignReport = async (userId, campaignId) => {
  try {
    const campaignRef = doc(db, 'marketingCampaigns', campaignId);
    const campaignDoc = await getDoc(campaignRef);
    
    if (!campaignDoc.exists()) {
      throw new Error('캠페인을 찾을 수 없습니다.');
    }
    
    const campaign = campaignDoc.data();
    
    // 메시지 상세 조회
    const messagesRef = collection(db, 'campaignMessages');
    const q = query(messagesRef, where('campaignId', '==', campaignId));
    const snapshot = await getDocs(q);
    
    const messageDetails = [];
    snapshot.forEach((doc) => {
      messageDetails.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 성과 계산
    const openRate = campaign.stats.sent > 0 
      ? (campaign.stats.opened / campaign.stats.sent) * 100 
      : 0;
    
    const clickRate = campaign.stats.sent > 0 
      ? (campaign.stats.clicked / campaign.stats.sent) * 100 
      : 0;
    
    const conversionRate = campaign.stats.sent > 0 
      ? (campaign.stats.converted / campaign.stats.sent) * 100 
      : 0;
    
    return {
      campaign: {
        id: campaignDoc.id,
        ...campaign
      },
      metrics: {
        openRate,
        clickRate,
        conversionRate,
        bounceRate: campaign.stats.sent > 0 
          ? (campaign.stats.bounced / campaign.stats.sent) * 100 
          : 0,
        unsubscribeRate: campaign.stats.sent > 0 
          ? (campaign.stats.unsubscribed / campaign.stats.sent) * 100 
          : 0
      },
      messageDetails,
      recommendations: generateCampaignRecommendations({
        openRate,
        clickRate,
        conversionRate
      })
    };
  } catch (error) {
    console.error('Get campaign report error:', error);
    throw error;
  }
};

/**
 * 캠페인 추천사항 생성
 */
const generateCampaignRecommendations = (metrics) => {
  const recommendations = [];
  
  if (metrics.openRate < 20) {
    recommendations.push({
      type: 'subject',
      message: '오픈율이 낮습니다. 제목을 더 매력적으로 작성해보세요.',
      suggestion: 'A/B 테스트를 통해 다양한 제목을 시도해보세요.'
    });
  }
  
  if (metrics.clickRate < 5) {
    recommendations.push({
      type: 'content',
      message: '클릭율이 낮습니다. 콘텐츠와 CTA를 개선해보세요.',
      suggestion: '명확한 행동 유도 문구(CTA)와 시각적 요소를 추가하세요.'
    });
  }
  
  if (metrics.conversionRate < 2) {
    recommendations.push({
      type: 'conversion',
      message: '전환율이 낮습니다. 오퍼와 랜딩 페이지를 점검하세요.',
      suggestion: '특별 할인이나 한정 오퍼를 제공해보세요.'
    });
  }
  
  return recommendations;
};

export default {
  createCampaign,
  segmentCustomers,
  executeCampaign,
  createABTest,
  analyzeABTest,
  scheduleBirthdayMessages,
  createRetargetingCampaign,
  checkRetargetingTriggers,
  getCampaignReport
};
