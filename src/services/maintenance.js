import { databases, DB_ID, MAINT_COL } from './appwrite.js';
import { Query, ID } from 'appwrite';
import { setCache, getCache } from '../lib/cache.js';

const CACHE_KEY = 'maintenance_records_cache';

export async function loadMaintenance(userId) {
  if (!userId) return [];

  const cacheKey = `${CACHE_KEY}_${userId}`;

  try {
    const result = await databases.listDocuments(DB_ID, MAINT_COL, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(100),
    ]);

    const data = result.documents || [];
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error loading maintenance records:', error);
    // Return stale cache data as fallback
    const staleData = getCache(cacheKey, Infinity);
    return staleData || [];
  }
}

export async function createMaintenance(userId, data) {
  if (!userId) throw new Error('userId is required');

  try {
    const docData = {
      ...data,
      userId,
      $permissions: [],
    };

    const response = await databases.createDocument(
      DB_ID,
      MAINT_COL,
      ID.unique(),
      docData
    );

    // Invalidate cache on create
    clearCacheForUser(userId);
    return response;
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    throw error;
  }
}

export async function deleteMaintenance(userId, docId) {
  if (!userId || !docId) throw new Error('userId and docId are required');

  try {
    await databases.deleteDocument(DB_ID, MAINT_COL, docId);

    // Invalidate cache
    clearCacheForUser(userId);
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    throw error;
  }
}

export async function deleteAllMaintenance(userId) {
  if (!userId) throw new Error('userId is required');

  try {
    const result = await databases.listDocuments(DB_ID, MAINT_COL, [
      Query.equal('userId', userId),
    ]);

    const ids = result.documents.map(doc => doc.$id);

    // Delete all in parallel
    await Promise.all(
      ids.map(docId =>
        databases.deleteDocument(DB_ID, MAINT_COL, docId)
      )
    );

    // Invalidate cache
    clearCacheForUser(userId);
    return ids.length;
  } catch (error) {
    console.error('Error deleting all maintenance records:', error);
    throw error;
  }
}

function clearCacheForUser(userId) {
  const cacheKey = `${CACHE_KEY}_${userId}`;
  try {
    localStorage.removeItem(cacheKey);
  } catch (e) {
    console.warn('Cache clear failed:', e);
  }
}
