// Firebase Storage 파일 관리 서비스
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * 파일 업로드 (단일)
 * @param {File} file - 업로드할 파일
 * @param {string} path - 저장 경로 (예: 'galleries/userId/galleryId/image.jpg')
 * @param {function} onProgress - 진행률 콜백 (선택사항)
 * @returns {Promise} 다운로드 URL과 메타데이터
 */
export const uploadFile = async (file, path, onProgress = null) => {
  try {
    const storageRef = ref(storage, path);

    if (onProgress) {
      // 진행률 추적이 필요한 경우
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata = await getMetadata(uploadTask.snapshot.ref);
              resolve({ url: downloadURL, metadata, error: null });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // 단순 업로드
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const metadata = await getMetadata(snapshot.ref);
      return { url: downloadURL, metadata, error: null };
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return { url: null, metadata: null, error };
  }
};

/**
 * 다중 파일 업로드
 * @param {FileList|Array} files - 업로드할 파일 배열
 * @param {string} basePath - 기본 저장 경로
 * @param {function} onProgress - 전체 진행률 콜백 (선택사항)
 * @returns {Promise} 업로드된 파일들의 URL 배열
 */
export const uploadMultipleFiles = async (files, basePath, onProgress = null) => {
  try {
    const uploadPromises = Array.from(files).map((file, index) => {
      const filePath = `${basePath}/${Date.now()}_${index}_${file.name}`;
      
      return uploadFile(file, filePath, (progress) => {
        if (onProgress) {
          const overallProgress = ((index + progress / 100) / files.length) * 100;
          onProgress(overallProgress);
        }
      });
    });

    const results = await Promise.all(uploadPromises);
    
    const successfulUploads = results
      .filter((result) => !result.error)
      .map((result) => ({
        url: result.url,
        metadata: result.metadata,
      }));

    const errors = results.filter((result) => result.error);

    return {
      uploads: successfulUploads,
      errors: errors.length > 0 ? errors : null,
    };
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    return { uploads: [], errors: [error] };
  }
};

/**
 * 이미지 최적화 업로드 (리사이징 포함)
 * @param {File} file - 업로드할 이미지 파일
 * @param {string} path - 저장 경로
 * @param {object} options - 옵션 { maxWidth, maxHeight, quality }
 * @returns {Promise} 다운로드 URL
 */
export const uploadOptimizedImage = async (file, path, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.9,
  } = options;

  try {
    // Canvas를 사용한 이미지 리사이징
    const resizedImage = await resizeImage(file, maxWidth, maxHeight, quality);
    
    // 리사이징된 이미지 업로드
    return await uploadFile(resizedImage, path);
  } catch (error) {
    console.error('Error uploading optimized image:', error);
    return { url: null, metadata: null, error };
  }
};

/**
 * 이미지 리사이징 헬퍼 함수
 */
const resizeImage = (file, maxWidth, maxHeight, quality) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 비율 유지하면서 리사이징
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 파일 삭제
 * @param {string} path - 삭제할 파일 경로
 * @returns {Promise}
 */
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { error: null };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { error };
  }
};

/**
 * URL로 파일 삭제
 * @param {string} url - Firebase Storage 다운로드 URL
 * @returns {Promise}
 */
export const deleteFileByUrl = async (url) => {
  try {
    // URL에서 경로 추출
    const path = extractPathFromUrl(url);
    if (!path) {
      throw new Error('Invalid Firebase Storage URL');
    }
    
    return await deleteFile(path);
  } catch (error) {
    console.error('Error deleting file by URL:', error);
    return { error };
  }
};

/**
 * URL에서 스토리지 경로 추출
 */
const extractPathFromUrl = (url) => {
  try {
    const match = url.match(/\/o\/(.*?)\?/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
};

/**
 * 디렉토리의 모든 파일 목록 가져오기
 * @param {string} path - 디렉토리 경로
 * @returns {Promise} 파일 목록
 */
export const listFiles = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);

    const filePromises = result.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      const metadata = await getMetadata(itemRef);
      return {
        name: itemRef.name,
        path: itemRef.fullPath,
        url,
        metadata,
      };
    });

    const files = await Promise.all(filePromises);
    return { files, error: null };
  } catch (error) {
    console.error('Error listing files:', error);
    return { files: [], error };
  }
};

/**
 * 갤러리 사진 업로드 (워터마크 옵션 포함)
 * @param {File} file - 업로드할 사진
 * @param {string} userId - 사용자 ID
 * @param {string} galleryId - 갤러리 ID
 * @param {object} options - 옵션
 * @returns {Promise}
 */
export const uploadGalleryPhoto = async (file, userId, galleryId, options = {}) => {
  const {
    addWatermark = false,
    watermarkText = '',
    optimize = true,
  } = options;

  try {
    let processedFile = file;

    // 워터마크 추가
    if (addWatermark && watermarkText) {
      processedFile = await addWatermarkToImage(file, watermarkText);
    }

    // 경로 설정
    const timestamp = Date.now();
    const path = `galleries/${userId}/${galleryId}/${timestamp}_${file.name}`;

    // 최적화 업로드 또는 일반 업로드
    if (optimize) {
      return await uploadOptimizedImage(processedFile, path);
    } else {
      return await uploadFile(processedFile, path);
    }
  } catch (error) {
    console.error('Error uploading gallery photo:', error);
    return { url: null, metadata: null, error };
  }
};

/**
 * 이미지에 워터마크 추가
 */
const addWatermarkToImage = (file, watermarkText) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // 워터마크 스타일
        const fontSize = Math.floor(img.width / 30);
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // 워터마크 위치 (오른쪽 하단)
        const x = img.width - 20;
        const y = img.height - 20;
        ctx.fillText(watermarkText, x, y);

        canvas.toBlob(
          (blob) => {
            const watermarkedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(watermarkedFile);
          },
          file.type,
          0.95
        );
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 프로필 사진 업로드
 * @param {File} file - 업로드할 프로필 사진
 * @param {string} userId - 사용자 ID
 * @returns {Promise}
 */
export const uploadProfilePhoto = async (file, userId) => {
  try {
    const path = `profiles/${userId}/avatar_${Date.now()}.jpg`;
    
    // 프로필 사진은 작게 최적화 (500x500)
    const optimizedResult = await uploadOptimizedImage(file, path, {
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9,
    });

    return optimizedResult;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return { url: null, metadata: null, error };
  }
};

/**
 * 문서 파일 업로드 (계약서, 청구서 등)
 * @param {File} file - 업로드할 문서
 * @param {string} userId - 사용자 ID
 * @param {string} documentType - 문서 타입 (contract, invoice, etc.)
 * @param {string} customerId - 고객 ID (선택사항)
 * @returns {Promise}
 */
export const uploadDocument = async (file, userId, documentType, customerId = null) => {
  try {
    const customerPath = customerId ? `/${customerId}` : '';
    const path = `documents/${userId}/${documentType}${customerPath}/${Date.now()}_${file.name}`;
    
    return await uploadFile(file, path);
  } catch (error) {
    console.error('Error uploading document:', error);
    return { url: null, metadata: null, error };
  }
};

/**
 * 갤러리 전체 삭제
 * @param {string} userId - 사용자 ID
 * @param {string} galleryId - 갤러리 ID
 * @returns {Promise}
 */
export const deleteGallery = async (userId, galleryId) => {
  try {
    const path = `galleries/${userId}/${galleryId}`;
    const { files, error } = await listFiles(path);

    if (error) {
      throw error;
    }

    // 모든 파일 삭제
    const deletePromises = files.map((file) => deleteFile(file.path));
    await Promise.all(deletePromises);

    return { error: null };
  } catch (error) {
    console.error('Error deleting gallery:', error);
    return { error };
  }
};

/**
 * 스토리지 사용량 계산
 * @param {string} userId - 사용자 ID
 * @returns {Promise} 총 사용량 (bytes)
 */
export const calculateStorageUsage = async (userId) => {
  try {
    const basePath = `galleries/${userId}`;
    const { files, error } = await listFiles(basePath);

    if (error) {
      throw error;
    }

    const totalSize = files.reduce((sum, file) => {
      return sum + (file.metadata.size || 0);
    }, 0);

    return { size: totalSize, fileCount: files.length, error: null };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { size: 0, fileCount: 0, error };
  }
};

export default {
  uploadFile,
  uploadMultipleFiles,
  uploadOptimizedImage,
  uploadGalleryPhoto,
  uploadProfilePhoto,
  uploadDocument,
  deleteFile,
  deleteFileByUrl,
  deleteGallery,
  listFiles,
  calculateStorageUsage,
};
