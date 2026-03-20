/**
 * Customer Portal Service - 고객 전용 포털 기능
 * 
 * 주요 기능:
 * 1. 고객 로그인 (이메일 링크 기반)
 * 2. 사진 갤러리 조회
 * 3. 사진 선택 및 다운로드
 * 4. 리뷰 작성
 * 5. 추가 주문
 */

import { db, storage } from './firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

/**
 * 고객 포털 액세스 토큰 생성
 */
export const generateCustomerToken = async (userId, customerId, expiresInDays = 30) => {
  try {
    const token = generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const tokensRef = collection(db, 'customerPortalTokens');
    await addDoc(tokensRef, {
      userId,
      customerId,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: serverTimestamp(),
      used: false
    });
    
    // 포털 링크 생성
    const portalUrl = `${window.location.origin}/customer-portal/${token}`;
    
    return {
      token,
      portalUrl,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('Generate token error:', error);
    throw error;
  }
};

/**
 * 랜덤 토큰 생성
 */
const generateRandomToken = () => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * 토큰 검증 및 고객 정보 조회
 */
export const validateCustomerToken = async (token) => {
  try {
    const tokensRef = collection(db, 'customerPortalTokens');
    const q = query(tokensRef, where('token', '==', token));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('유효하지 않은 토큰입니다.');
    }
    
    const tokenDoc = snapshot.docs[0];
    const tokenData = tokenDoc.data();
    
    // 만료 확인
    const expiresAt = new Date(tokenData.expiresAt);
    if (expiresAt < new Date()) {
      throw new Error('만료된 토큰입니다.');
    }
    
    // 고객 정보 조회
    const customerDoc = await getDoc(doc(db, 'customers', tokenData.customerId));
    if (!customerDoc.exists()) {
      throw new Error('고객 정보를 찾을 수 없습니다.');
    }
    
    return {
      customerId: tokenData.customerId,
      userId: tokenData.userId,
      customer: customerDoc.data(),
      tokenId: tokenDoc.id
    };
  } catch (error) {
    console.error('Validate token error:', error);
    throw error;
  }
};

/**
 * 고객 포털 - 갤러리 조회
 */
export const getCustomerGalleries = async (userId, customerId) => {
  try {
    const galleriesRef = collection(db, 'galleries');
    const q = query(
      galleriesRef,
      where('userId', '==', userId),
      where('customerId', '==', customerId),
      where('sharedWithCustomer', '==', true),
      orderBy('shootingDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const galleries = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // 사진 목록 조회
      const photosRef = collection(db, 'photos');
      const photosQuery = query(
        photosRef,
        where('galleryId', '==', docSnap.id)
      );
      const photosSnapshot = await getDocs(photosQuery);
      
      const photos = [];
      for (const photoDoc of photosSnapshot.docs) {
        const photoData = photoDoc.data();
        photos.push({
          id: photoDoc.id,
          ...photoData,
          downloadUrl: await getDownloadURL(ref(storage, photoData.storagePath))
        });
      }
      
      galleries.push({
        id: docSnap.id,
        ...data,
        photos,
        photoCount: photos.length
      });
    }
    
    return galleries;
  } catch (error) {
    console.error('Get customer galleries error:', error);
    throw error;
  }
};

/**
 * 사진 선택 저장
 */
export const savePhotoSelections = async (userId, customerId, galleryId, selectedPhotoIds, notes = '') => {
  try {
    const selectionsRef = collection(db, 'photoSelections');
    
    await addDoc(selectionsRef, {
      userId,
      customerId,
      galleryId,
      selectedPhotoIds,
      notes,
      createdAt: serverTimestamp(),
      status: 'pending' // pending, approved, processing, completed
    });
    
    // 갤러리 상태 업데이트
    await updateDoc(doc(db, 'galleries', galleryId), {
      hasSelection: true,
      selectionCount: selectedPhotoIds.length,
      lastSelectionAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Save selections error:', error);
    throw error;
  }
};

/**
 * 고객 선택 사진 조회
 */
export const getPhotoSelections = async (userId, customerId, galleryId) => {
  try {
    const selectionsRef = collection(db, 'photoSelections');
    const q = query(
      selectionsRef,
      where('userId', '==', userId),
      where('customerId', '==', customerId),
      where('galleryId', '==', galleryId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const selections = [];
    
    snapshot.forEach((doc) => {
      selections.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return selections;
  } catch (error) {
    console.error('Get selections error:', error);
    throw error;
  }
};

/**
 * 리뷰 작성
 */
export const submitCustomerReview = async (userId, customerId, reviewData) => {
  try {
    const { rating, comment, galleryId, photos = [] } = reviewData;
    
    const reviewsRef = collection(db, 'customerReviews');
    const reviewDoc = await addDoc(reviewsRef, {
      userId,
      customerId,
      galleryId,
      rating, // 1-5
      comment,
      photos, // 리뷰 사진 URLs
      createdAt: serverTimestamp(),
      status: 'pending', // pending, approved, rejected
      helpful: 0,
      response: null // 스튜디오 답변
    });
    
    // 고객 정보에 리뷰 추가
    const customerRef = doc(db, 'customers', customerId);
    const customerDoc = await getDoc(customerRef);
    const customerData = customerDoc.data();
    
    await updateDoc(customerRef, {
      reviewCount: (customerData.reviewCount || 0) + 1,
      averageRating: calculateNewAverage(
        customerData.averageRating || 0,
        customerData.reviewCount || 0,
        rating
      ),
      lastReviewAt: serverTimestamp()
    });
    
    return {
      id: reviewDoc.id,
      success: true
    };
  } catch (error) {
    console.error('Submit review error:', error);
    throw error;
  }
};

/**
 * 새로운 평균 계산
 */
const calculateNewAverage = (currentAverage, currentCount, newRating) => {
  return ((currentAverage * currentCount) + newRating) / (currentCount + 1);
};

/**
 * 고객 리뷰 조회
 */
export const getCustomerReviews = async (userId, options = {}) => {
  try {
    const { status = 'approved', limit = 10 } = options;
    
    const reviewsRef = collection(db, 'customerReviews');
    let q = query(
      reviewsRef,
      where('userId', '==', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reviews = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // 고객 정보 조회
      const customerDoc = await getDoc(doc(db, 'customers', data.customerId));
      
      reviews.push({
        id: docSnap.id,
        ...data,
        customer: customerDoc.exists() ? customerDoc.data() : null
      });
      
      if (reviews.length >= limit) break;
    }
    
    return reviews;
  } catch (error) {
    console.error('Get reviews error:', error);
    throw error;
  }
};

/**
 * 추가 주문 생성
 */
export const createAdditionalOrder = async (userId, customerId, orderData) => {
  try {
    const {
      galleryId,
      items, // [{ photoId, productType, quantity, options }]
      notes = ''
    } = orderData;
    
    // 총 금액 계산
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const ordersRef = collection(db, 'additionalOrders');
    const orderDoc = await addDoc(ordersRef, {
      userId,
      customerId,
      galleryId,
      items,
      notes,
      totalAmount,
      status: 'pending', // pending, confirmed, processing, completed, cancelled
      paymentStatus: 'unpaid', // unpaid, paid, refunded
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: orderDoc.id,
      totalAmount,
      success: true
    };
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

/**
 * 고객 주문 목록 조회
 */
export const getCustomerOrders = async (userId, customerId) => {
  try {
    const ordersRef = collection(db, 'additionalOrders');
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const orders = [];
    
    snapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
  } catch (error) {
    console.error('Get orders error:', error);
    throw error;
  }
};

/**
 * 포털 이메일 전송 (토큰 포함)
 */
export const sendPortalEmail = async (userId, customerId, emailData) => {
  try {
    const { token, portalUrl } = await generateCustomerToken(userId, customerId);
    
    // 이메일 데이터
    const emailContent = {
      to: emailData.email,
      subject: emailData.subject || '사진 확인 및 선택 안내',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">안녕하세요, ${emailData.customerName}님!</h2>
          <p>촬영하신 사진이 준비되었습니다.</p>
          <p>아래 링크를 클릭하시면 사진을 확인하고 선택하실 수 있습니다.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${portalUrl}" 
               style="background-color: #4CAF50; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              사진 확인하기
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            * 이 링크는 30일간 유효합니다.<br>
            * 궁금한 점이 있으시면 연락 주세요.
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 11px;">
            ${emailData.studioName}<br>
            ${emailData.phone}
          </p>
        </div>
      `
    };
    
    // 이메일 전송 (실제 구현시 SendGrid, AWS SES 등 사용)
    const emailsRef = collection(db, 'portalEmails');
    await addDoc(emailsRef, {
      userId,
      customerId,
      ...emailContent,
      token,
      portalUrl,
      sentAt: serverTimestamp(),
      status: 'pending' // pending, sent, failed
    });
    
    return {
      success: true,
      portalUrl,
      token
    };
  } catch (error) {
    console.error('Send portal email error:', error);
    throw error;
  }
};

/**
 * 고객 활동 로깅
 */
export const logCustomerActivity = async (customerId, activityType, details = {}) => {
  try {
    const activitiesRef = collection(db, 'customerActivities');
    await addDoc(activitiesRef, {
      customerId,
      activityType, // 'view', 'select', 'download', 'review', 'order'
      details,
      timestamp: serverTimestamp(),
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null
    });
  } catch (error) {
    console.error('Log activity error:', error);
  }
};

/**
 * 고객 통계 조회
 */
export const getCustomerPortalStats = async (userId, customerId) => {
  try {
    const activitiesRef = collection(db, 'customerActivities');
    const q = query(
      activitiesRef,
      where('customerId', '==', customerId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const activities = [];
    
    const stats = {
      totalViews: 0,
      totalSelections: 0,
      totalDownloads: 0,
      totalReviews: 0,
      totalOrders: 0,
      lastActivity: null
    };
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      activities.push(data);
      
      if (!stats.lastActivity && data.timestamp) {
        stats.lastActivity = data.timestamp.toDate();
      }
      
      switch (data.activityType) {
        case 'view':
          stats.totalViews++;
          break;
        case 'select':
          stats.totalSelections++;
          break;
        case 'download':
          stats.totalDownloads++;
          break;
        case 'review':
          stats.totalReviews++;
          break;
        case 'order':
          stats.totalOrders++;
          break;
      }
    });
    
    return {
      stats,
      recentActivities: activities.slice(0, 10)
    };
  } catch (error) {
    console.error('Get portal stats error:', error);
    throw error;
  }
};

export default {
  generateCustomerToken,
  validateCustomerToken,
  getCustomerGalleries,
  savePhotoSelections,
  getPhotoSelections,
  submitCustomerReview,
  getCustomerReviews,
  createAdditionalOrder,
  getCustomerOrders,
  sendPortalEmail,
  logCustomerActivity,
  getCustomerPortalStats
};
