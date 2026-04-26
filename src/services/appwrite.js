import { Client, Databases, Account } from 'appwrite';

const ENDPOINT = import.meta.env?.VITE_APPWRITE_ENDPOINT ?? 'https://sfo.cloud.appwrite.io/v1';
const PROJECT_ID = import.meta.env?.VITE_APPWRITE_PROJECT_ID ?? '69ed959f000f3f45fe41';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export const DB_ID = import.meta.env?.VITE_APPWRITE_DB_ID ?? '69ed9bef000113d0764b';
export const FUEL_COL = 'fuel_records';
export const MILE_COL = 'mileage_records';
export const MAINT_COL = 'maintenance_records';

export default client;
