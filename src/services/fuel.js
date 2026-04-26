import { databases, DB_ID, FUEL_COL } from './appwrite.js';
import { Query, ID } from 'appwrite';
import { setCache, getCache } from '../lib/cache.js';

const CACHE_KEY = 'fuel_records_cache';

export async function loadFuel(userId) {
  if (!userId) return [];

  const cacheKey = `${CACHE_KEY}_${userId}`;

  try {
    let allData = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const result = await databases.listDocuments(DB_ID, FUEL_COL, [
        Query.equal('userId', userId),
        Query.orderDesc('date'),
        Query.limit(limit),
        Query.offset(offset),
      ]);

      if (!result.documents || result.documents.length === 0) break;
      allData = allData.concat(result.documents);

      if (result.documents.length < limit) break;
      offset += limit;
    }

    setCache(cacheKey, allData);
    return allData;
  } catch (error) {
    console.error('Error loading fuel records:', error);
    // Return stale cache data as fallback
    const staleData = getCache(cacheKey, Infinity);
    return staleData || [];
  }
}

export async function createFuel(userId, data) {
  if (!userId) throw new Error('userId is required');

  try {
    const docData = {
      ...data,
      userId,
      $permissions: [],
    };

    const response = await databases.createDocument(
      DB_ID,
      FUEL_COL,
      ID.unique(),
      docData
    );

    // Invalidate cache on create
    clearCacheForUser(userId);
    return response;
  } catch (error) {
    console.error('Error creating fuel record:', error);
    throw error;
  }
}

export async function deleteAllFuel(userId) {
  if (!userId) throw new Error('userId is required');

  try {
    const result = await databases.listDocuments(DB_ID, FUEL_COL, [
      Query.equal('userId', userId),
    ]);

    const ids = result.documents.map(doc => doc.$id);

    // Delete all in parallel
    await Promise.all(
      ids.map(docId =>
        databases.deleteDocument(DB_ID, FUEL_COL, docId)
      )
    );

    // Invalidate cache
    clearCacheForUser(userId);
    return ids.length;
  } catch (error) {
    console.error('Error deleting fuel records:', error);
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
