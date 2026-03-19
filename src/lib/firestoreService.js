// Firestore 데이터 관리 서비스
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';

// ========== 고객 관리 ==========

export const customersCollection = collection(db, 'customers');

export const createCustomer = async (userId, customerData) => {
  try {
    const docRef = await addDoc(customersCollection, {
      ...customerData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { id: null, error };
  }
};

export const getCustomer = async (customerId) => {
  try {
    const docRef = doc(db, 'customers', customerId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: new Error('Customer not found') };
    }
  } catch (error) {
    console.error('Error getting customer:', error);
    return { data: null, error };
  }
};

export const getCustomers = async (userId, filters = {}) => {
  try {
    let q = query(
      customersCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // 필터 적용
    if (filters.search) {
      // Firestore는 full-text search를 지원하지 않으므로 클라이언트 측에서 필터링
      // 또는 Algolia 같은 검색 서비스 사용 고려
    }

    const querySnapshot = await getDocs(q);
    const customers = [];
    querySnapshot.forEach((doc) => {
      customers.push({ id: doc.id, ...doc.data() });
    });

    return { data: customers, error: null };
  } catch (error) {
    console.error('Error getting customers:', error);
    return { data: [], error };
  }
};

export const updateCustomer = async (customerId, updates) => {
  try {
    const docRef = doc(db, 'customers', customerId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { error };
  }
};

export const deleteCustomer = async (customerId) => {
  try {
    const docRef = doc(db, 'customers', customerId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { error };
  }
};

// ========== 예약 관리 ==========

export const bookingsCollection = collection(db, 'bookings');

export const createBooking = async (userId, bookingData) => {
  try {
    const docRef = await addDoc(bookingsCollection, {
      ...bookingData,
      userId,
      status: bookingData.status || 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { id: null, error };
  }
};

export const getBookings = async (userId, filters = {}) => {
  try {
    let q = query(
      bookingsCollection,
      where('userId', '==', userId),
      orderBy('bookingDate', 'desc')
    );

    // 날짜 범위 필터
    if (filters.startDate) {
      q = query(q, where('bookingDate', '>=', filters.startDate));
    }
    if (filters.endDate) {
      q = query(q, where('bookingDate', '<=', filters.endDate));
    }

    // 상태 필터
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const querySnapshot = await getDocs(q);
    const bookings = [];
    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() });
    });

    return { data: bookings, error: null };
  } catch (error) {
    console.error('Error getting bookings:', error);
    return { data: [], error };
  }
};

export const updateBooking = async (bookingId, updates) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating booking:', error);
    return { error };
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error) {
    console.error('Error deleting booking:', error);
    return { error };
  }
};

// ========== 거래/재무 관리 ==========

export const transactionsCollection = collection(db, 'transactions');

export const createTransaction = async (userId, transactionData) => {
  try {
    const docRef = await addDoc(transactionsCollection, {
      ...transactionData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { id: null, error };
  }
};

export const getTransactions = async (userId, filters = {}) => {
  try {
    let q = query(
      transactionsCollection,
      where('userId', '==', userId),
      orderBy('transactionDate', 'desc')
    );

    // 날짜 범위 필터
    if (filters.startDate) {
      q = query(q, where('transactionDate', '>=', filters.startDate));
    }
    if (filters.endDate) {
      q = query(q, where('transactionDate', '<=', filters.endDate));
    }

    // 유형 필터
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    const querySnapshot = await getDocs(q);
    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    return { data: transactions, error: null };
  } catch (error) {
    console.error('Error getting transactions:', error);
    return { data: [], error };
  }
};

// ========== 제품 관리 ==========

export const productsCollection = collection(db, 'products');

export const createProduct = async (userId, productData) => {
  try {
    const docRef = await addDoc(productsCollection, {
      ...productData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating product:', error);
    return { id: null, error };
  }
};

export const getProducts = async (userId) => {
  try {
    const q = query(
      productsCollection,
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    return { data: products, error: null };
  } catch (error) {
    console.error('Error getting products:', error);
    return { data: [], error };
  }
};

export const updateProduct = async (productId, updates) => {
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating product:', error);
    return { error };
  }
};

export const deleteProduct = async (productId) => {
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { error };
  }
};

// ========== 촬영 유형 관리 ==========

export const filmingTypesCollection = collection(db, 'filmingTypes');

export const createFilmingType = async (userId, filmingTypeData) => {
  try {
    const docRef = await addDoc(filmingTypesCollection, {
      ...filmingTypeData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating filming type:', error);
    return { id: null, error };
  }
};

export const getFilmingTypes = async (userId) => {
  try {
    const q = query(
      filmingTypesCollection,
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const filmingTypes = [];
    querySnapshot.forEach((doc) => {
      filmingTypes.push({ id: doc.id, ...doc.data() });
    });

    return { data: filmingTypes, error: null };
  } catch (error) {
    console.error('Error getting filming types:', error);
    return { data: [], error };
  }
};

// ========== 갤러리 관리 ==========

export const galleriesCollection = collection(db, 'galleries');

export const createGallery = async (userId, galleryData) => {
  try {
    const docRef = await addDoc(galleriesCollection, {
      ...galleryData,
      userId,
      photos: galleryData.photos || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating gallery:', error);
    return { id: null, error };
  }
};

export const getGalleries = async (userId, filters = {}) => {
  try {
    let q = query(
      galleriesCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (filters.customerId) {
      q = query(q, where('customerId', '==', filters.customerId));
    }

    const querySnapshot = await getDocs(q);
    const galleries = [];
    querySnapshot.forEach((doc) => {
      galleries.push({ id: doc.id, ...doc.data() });
    });

    return { data: galleries, error: null };
  } catch (error) {
    console.error('Error getting galleries:', error);
    return { data: [], error };
  }
};

// ========== 대시보드 통계 ==========

export const getDashboardStats = async (userId) => {
  try {
    // 이번 달 시작일
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 고객 수
    const customersQuery = query(
      customersCollection,
      where('userId', '==', userId)
    );
    const customersSnapshot = await getDocs(customersQuery);
    const totalCustomers = customersSnapshot.size;

    // 이번 달 예약
    const bookingsQuery = query(
      bookingsCollection,
      where('userId', '==', userId),
      where('bookingDate', '>=', startOfMonth)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const monthlyBookings = bookingsSnapshot.size;

    // 이번 달 수익
    const transactionsQuery = query(
      transactionsCollection,
      where('userId', '==', userId),
      where('type', '==', 'income'),
      where('transactionDate', '>=', startOfMonth)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    let monthlyRevenue = 0;
    transactionsSnapshot.forEach((doc) => {
      monthlyRevenue += doc.data().amount || 0;
    });

    return {
      data: {
        totalCustomers,
        monthlyBookings,
        monthlyRevenue,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { data: null, error };
  }
};

// ========== Batch 작업 ==========

export const batchDeleteCustomers = async (customerIds) => {
  try {
    const batch = writeBatch(db);
    
    customerIds.forEach((id) => {
      const docRef = doc(db, 'customers', id);
      batch.delete(docRef);
    });

    await batch.commit();
    return { error: null };
  } catch (error) {
    console.error('Error batch deleting customers:', error);
    return { error };
  }
};

// ========== Transaction 작업 예제 ==========

export const transferBookingToAnotherUser = async (bookingId, fromUserId, toUserId) => {
  try {
    await runTransaction(db, async (transaction) => {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await transaction.get(bookingRef);

      if (!bookingDoc.exists()) {
        throw new Error('Booking does not exist');
      }

      if (bookingDoc.data().userId !== fromUserId) {
        throw new Error('Booking does not belong to this user');
      }

      transaction.update(bookingRef, {
        userId: toUserId,
        updatedAt: serverTimestamp(),
      });
    });

    return { error: null };
  } catch (error) {
    console.error('Error transferring booking:', error);
    return { error };
  }
};

export default {
  // Customers
  createCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  
  // Bookings
  createBooking,
  getBookings,
  updateBooking,
  deleteBooking,
  
  // Transactions
  createTransaction,
  getTransactions,
  
  // Products
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  
  // Filming Types
  createFilmingType,
  getFilmingTypes,
  
  // Galleries
  createGallery,
  getGalleries,
  
  // Dashboard
  getDashboardStats,
  
  // Batch operations
  batchDeleteCustomers,
};
