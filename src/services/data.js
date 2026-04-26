import { deleteAllFuel } from './fuel.js';
import { deleteAllMileage } from './mileage.js';
import { deleteAllMaintenance } from './maintenance.js';
import { showToast } from '../components/toast.js';

export async function wipeAllData(userId) {
  if (!userId) throw new Error('userId is required');

  try {
    // Delete from all collections in parallel
    const results = await Promise.all([
      deleteAllFuel(userId),
      deleteAllMileage(userId),
      deleteAllMaintenance(userId),
    ]);

    const totalDeleted = results.reduce((sum, count) => sum + count, 0);

    // Clear all related cache entries
    const cacheKeys = [
      `fuel_records_cache_${userId}`,
      `mileage_records_cache_${userId}`,
      `maintenance_records_cache_${userId}`,
    ];

    cacheKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to clear cache key:', key);
      }
    });

    showToast(`Successfully wiped ${totalDeleted} records from cloud and local storage`, 'info');
    return totalDeleted;
  } catch (error) {
    console.error('Error wiping all data:', error);
    showToast('Failed to wipe data. Please try again.', 'error');
    throw error;
  }
}

export async function wipeAllDataWithConfirmation(userId) {
  const confirmed = confirm(
    'WARNING: This will permanently delete ALL your records from the cloud and local storage.\n\n' +
    'This action CANNOT be undone.\n\n' +
    'Type "DELETE ALL" in the prompt to confirm.'
  );

  if (!confirmed) return null;

  const input = prompt('Type "DELETE ALL" to confirm permanent deletion:');

  if (input !== 'DELETE ALL') {
    showToast('Deletion cancelled - confirmation text did not match', 'warn');
    return null;
  }

  return await wipeAllData(userId);
}
