// 워크플로우 자동화 시스템
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ========== 워크플로우 관리 ==========

export const workflowsCollection = collection(db, 'workflows');

/**
 * 워크플로우 트리거 타입
 */
export const TRIGGER_TYPES = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_DUE: 'payment_due',
  SHOOTING_DAY_BEFORE: 'shooting_day_before',
  SHOOTING_DAY: 'shooting_day',
  GALLERY_UPLOADED: 'gallery_uploaded',
  GALLERY_SELECTION_DUE: 'gallery_selection_due',
  CUSTOMER_BIRTHDAY: 'customer_birthday',
  REVIEW_REQUEST: 'review_request',
  FOLLOW_UP: 'follow_up',
  CUSTOM: 'custom',
};

/**
 * 액션 타입
 */
export const ACTION_TYPES = {
  SEND_EMAIL: 'send_email',
  SEND_SMS: 'send_sms',
  SEND_PUSH: 'send_push',
  CREATE_TASK: 'create_task',
  UPDATE_STATUS: 'update_status',
  CREATE_INVOICE: 'create_invoice',
  SEND_REMINDER: 'send_reminder',
  WEBHOOK: 'webhook',
};

/**
 * 워크플로우 생성
 */
export const createWorkflow = async (userId, workflowData) => {
  try {
    const workflow = {
      ...workflowData,
      userId,
      enabled: workflowData.enabled !== undefined ? workflowData.enabled : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      executionCount: 0,
      lastExecutedAt: null,
    };

    const docRef = await addDoc(workflowsCollection, workflow);
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating workflow:', error);
    return { id: null, error };
  }
};

/**
 * 워크플로우 목록 가져오기
 */
export const getWorkflows = async (userId, filters = {}) => {
  try {
    let q = query(
      workflowsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (filters.enabled !== undefined) {
      q = query(q, where('enabled', '==', filters.enabled));
    }

    if (filters.triggerType) {
      q = query(q, where('triggerType', '==', filters.triggerType));
    }

    const querySnapshot = await getDocs(q);
    const workflows = [];
    querySnapshot.forEach((doc) => {
      workflows.push({ id: doc.id, ...doc.data() });
    });

    return { data: workflows, error: null };
  } catch (error) {
    console.error('Error getting workflows:', error);
    return { data: [], error };
  }
};

/**
 * 워크플로우 업데이트
 */
export const updateWorkflow = async (workflowId, updates) => {
  try {
    const docRef = doc(db, 'workflows', workflowId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating workflow:', error);
    return { error };
  }
};

/**
 * 워크플로우 삭제
 */
export const deleteWorkflow = async (workflowId) => {
  try {
    const docRef = doc(db, 'workflows', workflowId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return { error };
  }
};

/**
 * 워크플로우 활성화/비활성화
 */
export const toggleWorkflow = async (workflowId, enabled) => {
  try {
    const docRef = doc(db, 'workflows', workflowId);
    await updateDoc(docRef, {
      enabled,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error('Error toggling workflow:', error);
    return { error };
  }
};

// ========== 템플릿 관리 ==========

export const templatesCollection = collection(db, 'templates');

/**
 * 템플릿 타입
 */
export const TEMPLATE_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  CONTRACT: 'contract',
  INVOICE: 'invoice',
  QUOTE: 'quote',
};

/**
 * 템플릿 생성
 */
export const createTemplate = async (userId, templateData) => {
  try {
    const template = {
      ...templateData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      usageCount: 0,
    };

    const docRef = await addDoc(templatesCollection, template);
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating template:', error);
    return { id: null, error };
  }
};

/**
 * 템플릿 목록 가져오기
 */
export const getTemplates = async (userId, filters = {}) => {
  try {
    let q = query(
      templatesCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    const querySnapshot = await getDocs(q);
    const templates = [];
    querySnapshot.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() });
    });

    return { data: templates, error: null };
  } catch (error) {
    console.error('Error getting templates:', error);
    return { data: [], error };
  }
};

/**
 * 템플릿 업데이트
 */
export const updateTemplate = async (templateId, updates) => {
  try {
    const docRef = doc(db, 'templates', templateId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating template:', error);
    return { error };
  }
};

/**
 * 템플릿 삭제
 */
export const deleteTemplate = async (templateId) => {
  try {
    const docRef = doc(db, 'templates', templateId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { error };
  }
};

// ========== 알림 관리 ==========

export const notificationsCollection = collection(db, 'notifications');

/**
 * 알림 생성
 */
export const createNotification = async (userId, notificationData) => {
  try {
    const notification = {
      ...notificationData,
      userId,
      read: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(notificationsCollection, notification);
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { id: null, error };
  }
};

/**
 * 알림 목록 가져오기
 */
export const getNotifications = async (userId, filters = {}) => {
  try {
    let q = query(
      notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (filters.read !== undefined) {
      q = query(q, where('read', '==', filters.read));
    }

    const querySnapshot = await getDocs(q);
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    return { data: notifications, error: null };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return { data: [], error };
  }
};

/**
 * 알림 읽음 처리
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      read: true,
      readAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { error };
  }
};

/**
 * 모든 알림 읽음 처리
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      notificationsCollection,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const updatePromises = [];

    querySnapshot.forEach((docSnapshot) => {
      const docRef = doc(db, 'notifications', docSnapshot.id);
      updatePromises.push(
        updateDoc(docRef, {
          read: true,
          readAt: serverTimestamp(),
        })
      );
    });

    await Promise.all(updatePromises);
    return { error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { error };
  }
};

// ========== 기본 워크플로우 템플릿 ==========

/**
 * 기본 워크플로우 템플릿 (사용자가 사용할 수 있는 프리셋)
 */
export const DEFAULT_WORKFLOW_TEMPLATES = [
  {
    name: '예약 확인 이메일',
    description: '고객이 예약하면 자동으로 확인 이메일을 발송합니다.',
    triggerType: TRIGGER_TYPES.BOOKING_CREATED,
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          templateId: 'booking_confirmation',
          subject: '예약이 확인되었습니다',
          delay: 0,
        },
      },
    ],
  },
  {
    name: '촬영 전날 리마인더',
    description: '촬영 하루 전에 고객에게 리마인더를 보냅니다.',
    triggerType: TRIGGER_TYPES.SHOOTING_DAY_BEFORE,
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          templateId: 'shooting_reminder',
          subject: '내일 촬영 일정을 확인해주세요',
          delay: 0,
        },
      },
      {
        type: ACTION_TYPES.SEND_SMS,
        config: {
          templateId: 'shooting_reminder_sms',
          delay: 0,
        },
      },
    ],
  },
  {
    name: '결제 리마인더',
    description: '결제 기한 3일 전에 리마인더를 보냅니다.',
    triggerType: TRIGGER_TYPES.PAYMENT_DUE,
    conditions: {
      daysBeforeDue: 3,
    },
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          templateId: 'payment_reminder',
          subject: '결제 기한이 다가옵니다',
          delay: 0,
        },
      },
    ],
  },
  {
    name: '갤러리 업로드 알림',
    description: '사진 갤러리가 업로드되면 고객에게 알립니다.',
    triggerType: TRIGGER_TYPES.GALLERY_UPLOADED,
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          templateId: 'gallery_ready',
          subject: '사진이 준비되었습니다!',
          delay: 0,
        },
      },
      {
        type: ACTION_TYPES.SEND_PUSH,
        config: {
          title: '사진 갤러리가 준비되었습니다',
          body: '지금 바로 확인하고 사진을 선택하세요!',
          delay: 0,
        },
      },
    ],
  },
  {
    name: '리뷰 요청',
    description: '촬영 완료 후 3일 뒤에 리뷰를 요청합니다.',
    triggerType: TRIGGER_TYPES.BOOKING_COMPLETED,
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          templateId: 'review_request',
          subject: '서비스는 만족스러우셨나요?',
          delay: 259200, // 3일 (초 단위)
        },
      },
    ],
  },
  {
    name: '생일 축하 메시지',
    description: '고객 생일에 자동으로 축하 메시지를 보냅니다.',
    triggerType: TRIGGER_TYPES.CUSTOMER_BIRTHDAY,
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          templateId: 'birthday_greeting',
          subject: '생일을 축하합니다! 🎉',
          delay: 0,
        },
      },
    ],
  },
  {
    name: '예약 취소 알림',
    description: '예약이 취소되면 관리자에게 알립니다.',
    triggerType: TRIGGER_TYPES.BOOKING_CANCELLED,
    actions: [
      {
        type: ACTION_TYPES.CREATE_TASK,
        config: {
          title: '예약 취소 처리',
          priority: 'high',
          delay: 0,
        },
      },
      {
        type: ACTION_TYPES.SEND_PUSH,
        config: {
          title: '예약 취소',
          body: '고객이 예약을 취소했습니다.',
          delay: 0,
        },
      },
    ],
  },
];

/**
 * 기본 워크플로우 설치
 */
export const installDefaultWorkflows = async (userId) => {
  try {
    const promises = DEFAULT_WORKFLOW_TEMPLATES.map((template) =>
      createWorkflow(userId, template)
    );

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => !r.error).length;

    return {
      success: successCount,
      total: DEFAULT_WORKFLOW_TEMPLATES.length,
      error: null,
    };
  } catch (error) {
    console.error('Error installing default workflows:', error);
    return { success: 0, total: 0, error };
  }
};

// ========== 워크플로우 실행 로그 ==========

export const workflowLogsCollection = collection(db, 'workflowLogs');

/**
 * 워크플로우 실행 로그 생성
 */
export const createWorkflowLog = async (logData) => {
  try {
    const log = {
      ...logData,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(workflowLogsCollection, log);
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating workflow log:', error);
    return { id: null, error };
  }
};

/**
 * 워크플로우 실행 로그 가져오기
 */
export const getWorkflowLogs = async (workflowId) => {
  try {
    const q = query(
      workflowLogsCollection,
      where('workflowId', '==', workflowId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    return { data: logs, error: null };
  } catch (error) {
    console.error('Error getting workflow logs:', error);
    return { data: [], error };
  }
};

export default {
  // Workflows
  createWorkflow,
  getWorkflows,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  installDefaultWorkflows,
  
  // Templates
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
  
  // Notifications
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  
  // Workflow Logs
  createWorkflowLog,
  getWorkflowLogs,
  
  // Constants
  TRIGGER_TYPES,
  ACTION_TYPES,
  TEMPLATE_TYPES,
  DEFAULT_WORKFLOW_TEMPLATES,
};
