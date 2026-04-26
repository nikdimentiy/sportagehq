import { deleteAllFuel } from './fuel.js';
import { deleteAllMileage } from './mileage.js';
import { deleteAllMaintenance } from './maintenance.js';
import { showToast } from '../components/toast.js';

export async function wipeAllData(userId) {
  if (!userId) throw new Error('userId is required');

  try {
    // Delete from all collections sequentially with error logging
    let fuelCount = 0;
    let mileageCount = 0;
    let maintenanceCount = 0;

    try {
      fuelCount = await deleteAllFuel(userId);
      console.log('Deleted fuel records:', fuelCount);
    } catch (error) {
      console.error('Error deleting fuel records:', error);
      showToast(`Failed to delete fuel records: ${error.message}`, 'error');
    }

    try {
      mileageCount = await deleteAllMileage(userId);
      console.log('Deleted mileage records:', mileageCount);
    } catch (error) {
      console.error('Error deleting mileage records:', error);
      showToast(`Failed to delete mileage records: ${error.message}`, 'error');
    }

    try {
      maintenanceCount = await deleteAllMaintenance(userId);
      console.log('Deleted maintenance records:', maintenanceCount);
    } catch (error) {
      console.error('Error deleting maintenance records:', error);
      showToast(`Failed to delete maintenance records: ${error.message}`, 'error');
    }

    const totalDeleted = fuelCount + mileageCount + maintenanceCount;

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
