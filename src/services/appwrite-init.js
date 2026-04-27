import { Client, Account, Databases, ID, Query, Permission, Role } from "https://esm.sh/appwrite@16.0.2";
import { state } from '../state.js';

// ════════════════════════════════════════════════════
// APPWRITE CONFIGURATION
// ════════════════════════════════════════════════════
const client = new Client()
    .setEndpoint("https://sfo.cloud.appwrite.io/v1")
    .setProject("69ed959f000f3f45fe41");

const account   = new Account(client);
const databases = new Databases(client);

const DB_ID    = "69ed9bef000113d0764b";
const FUEL_COL  = "fuel_records";
const MILE_COL  = "mileage_records";
const MAINT_COL = "maintenance_records";

// Global state — exposed to other scripts
window.currentUser = null;
window.appwriteAccount = account;
window.appwriteDB = databases;
window.appwriteID = ID;
window.appwriteQuery = Query;
window.appwritePermission = Permission;
window.appwriteRole = Role;

// Database and collection IDs — exposed for legacy app.js
window.DB_ID = DB_ID;
window.FUEL_COL = FUEL_COL;
window.MILE_COL = MILE_COL;
window.MAINT_COL = MAINT_COL;

// ════════════════════════════════════════════════════
// UI CONTROLS
// ════════════════════════════════════════════════════
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const authError = document.getElementById("authError");
const navAccountContainer = document.getElementById("navAccountContainer");
const navUserEmail = document.getElementById("navUserEmail");
const navLogoutBtn = document.getElementById("navLogoutBtn");
const nav = document.querySelector(".nav");
const main = document.querySelector(".main");

// ════════════════════════════════════════════════════
// AUTH FUNCTIONS
// ════════════════════════════════════════════════════
async function login(email, password) {
    try {
        await account.createEmailPasswordSession(email, password);
        const user = await account.get();
        window.currentUser = user;
        return user;
    } catch (err) {
        throw err;
    }
}

async function logout() {
    try {
        await account.deleteSession("current");
    } catch (err) {
        console.error("Logout error:", err);
    }
    window.currentUser = null;
}

function showUI(user) {
    authModal.classList.remove("show");
    nav.classList.add("authenticated");
    main.classList.add("authenticated");
    navUserEmail.textContent = user.email;
    navAccountContainer.style.display = "flex";
}

function showAuthModal() {
    authModal.classList.add("show");
    nav.classList.remove("authenticated");
    main.classList.remove("authenticated");
    navAccountContainer.style.display = "none";
    loginForm.reset();
    authError.classList.remove("show");
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-bolt" style="margin-right:8px;"></i>Access Command Center';
}

// ════════════════════════════════════════════════════
// RESTORE SESSION ON PAGE LOAD
// ════════════════════════════════════════════════════
(async () => {
    try {
        const user = await account.get();
        window.currentUser = user;
        showUI(user);
        // Load all data from Appwrite after auth is confirmed
        if (window.initAppData) {
            await window.initAppData();
            // Subscribe to realtime updates after data is loaded
            window.subscribeToRealtimeUpdates();
        }
    } catch (err) {
        showAuthModal();
    }
})();

// ════════════════════════════════════════════════════
// LOGIN HANDLER
// ════════════════════════════════════════════════════
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) return;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Authenticating...';
    authError.classList.remove("show");

    try {
        const user = await login(email, password);
        showUI(user);
        // Load all data from Appwrite after login
        if (window.initAppData) {
            await window.initAppData();
            // Subscribe to realtime updates after login
            window.subscribeToRealtimeUpdates();
        }
    } catch (err) {
        authError.textContent = err.message || "Authentication failed. Please check your credentials.";
        authError.classList.add("show");
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-bolt" style="margin-right:8px;"></i>Access Command Center';
    }
});

// ════════════════════════════════════════════════════
// LOGOUT HANDLER
// ════════════════════════════════════════════════════
navLogoutBtn.addEventListener("click", async () => {
    // Unsubscribe from realtime updates before logout
    if (window.realtimeUnsubscribers && Array.isArray(window.realtimeUnsubscribers)) {
        window.realtimeUnsubscribers.forEach(unsub => unsub());
        window.realtimeUnsubscribers = [];
    }
    await logout();
    showAuthModal();
});

// ════════════════════════════════════════════════════
// APPWRITE DATABASE FUNCTIONS (FUEL)
// ════════════════════════════════════════════════════
window.createFuelRecord = async (data) => {
    if (!window.currentUser) throw new Error("Not authenticated");
    await databases.createDocument(
        DB_ID,
        FUEL_COL,
        ID.unique(),
        {
            ...data,
            userId: window.currentUser.$id
        },
        [
            Permission.read(Role.user(window.currentUser.$id)),
            Permission.update(Role.user(window.currentUser.$id)),
            Permission.delete(Role.user(window.currentUser.$id))
        ]
    );
};

window.loadFuelFromAppwrite = async () => {
    if (!window.currentUser) return;
    try {
        let allDocs = [];
        let offset = 0;
        const limit = 100;

        while (true) {
            const res = await databases.listDocuments(DB_ID, FUEL_COL, [
                Query.equal("userId", window.currentUser.$id),
                Query.orderDesc("date"),
                Query.limit(limit),
                Query.offset(offset)
            ]);

            if (!res.documents || res.documents.length === 0) break;
            allDocs = allDocs.concat(res.documents);

            if (res.documents.length < limit) break;
            offset += limit;
        }

        return allDocs;
    } catch (err) {
        console.error("Error loading fuel records:", err);
        return [];
    }
};

window.createMileageRecord = async (data) => {
    if (!window.currentUser) throw new Error("Not authenticated");
    await databases.createDocument(
        DB_ID,
        MILE_COL,
        ID.unique(),
        {
            ...data,
            userId: window.currentUser.$id
        },
        [
            Permission.read(Role.user(window.currentUser.$id)),
            Permission.update(Role.user(window.currentUser.$id)),
            Permission.delete(Role.user(window.currentUser.$id))
        ]
    );
};

window.loadMileageFromAppwrite = async () => {
    if (!window.currentUser) return;
    try {
        let allDocs = [];
        let offset = 0;
        const limit = 100;

        while (true) {
            const res = await databases.listDocuments(DB_ID, MILE_COL, [
                Query.equal("userId", window.currentUser.$id),
                Query.orderDesc("dateTime"),
                Query.limit(limit),
                Query.offset(offset)
            ]);

            if (!res.documents || res.documents.length === 0) break;
            allDocs = allDocs.concat(res.documents);

            if (res.documents.length < limit) break;
            offset += limit;
        }

        return allDocs;
    } catch (err) {
        console.error("Error loading mileage records:", err);
        return [];
    }
};

window.deleteMileageRecordsForUser = async () => {
    if (!window.currentUser) throw new Error("Not authenticated");
    try {
        let offset = 0;
        const limit = 100;

        while (true) {
            const res = await databases.listDocuments(DB_ID, MILE_COL, [
                Query.equal("userId", window.currentUser.$id),
                Query.limit(limit),
                Query.offset(offset)
            ]);

            if (!res.documents || res.documents.length === 0) break;

            for (const doc of res.documents) {
                await databases.deleteDocument(DB_ID, MILE_COL, doc.$id);
            }

            if (res.documents.length < limit) break;
            offset += limit;
        }
    } catch (err) {
        console.error("Error deleting mileage records:", err);
        throw err;
    }
};

window.createMaintRecord = async (data) => {
    if (!window.currentUser) throw new Error("Not authenticated");
    await databases.createDocument(
        DB_ID,
        MAINT_COL,
        ID.unique(),
        {
            ...data,
            userId: window.currentUser.$id
        },
        [
            Permission.read(Role.user(window.currentUser.$id)),
            Permission.update(Role.user(window.currentUser.$id)),
            Permission.delete(Role.user(window.currentUser.$id))
        ]
    );
};

window.loadMaintFromAppwrite = async () => {
    if (!window.currentUser) return;
    try {
        let allDocs = [];
        let offset = 0;
        const limit = 100;

        while (true) {
            const res = await databases.listDocuments(DB_ID, MAINT_COL, [
                Query.equal("userId", window.currentUser.$id),
                Query.orderDesc("date"),
                Query.limit(limit),
                Query.offset(offset)
            ]);

            if (!res.documents || res.documents.length === 0) break;
            allDocs = allDocs.concat(res.documents);

            if (res.documents.length < limit) break;
            offset += limit;
        }

        return allDocs;
    } catch (err) {
        console.error("Error loading maintenance records:", err);
        return [];
    }
};

window.updateFuelRecord = async (docId, data) => {
    if (!window.currentUser) throw new Error("Not authenticated");
    await databases.updateDocument(DB_ID, FUEL_COL, docId, data);
};

window.updateMileageRecord = async (docId, data) => {
    if (!window.currentUser) throw new Error("Not authenticated");
    await databases.updateDocument(DB_ID, MILE_COL, docId, data);
};

window.updateMaintRecord = async (docId, data) => {
    if (!window.currentUser) throw new Error("Not authenticated");
    await databases.updateDocument(DB_ID, MAINT_COL, docId, data);
};

window.deleteMaintRecordFromAppwrite = async (docId) => {
    if (!window.currentUser) throw new Error("Not authenticated");
    try {
        await databases.deleteDocument(DB_ID, MAINT_COL, docId);
    } catch (err) {
        console.error("Error deleting maintenance record:", err);
        throw err;
    }
};

window.deleteMaintRecordsForUser = async () => {
    if (!window.currentUser) throw new Error("Not authenticated");
    try {
        let offset = 0;
        const limit = 100;

        while (true) {
            const res = await databases.listDocuments(DB_ID, MAINT_COL, [
                Query.equal("userId", window.currentUser.$id),
                Query.limit(limit),
                Query.offset(offset)
            ]);

            if (!res.documents || res.documents.length === 0) break;

            for (const doc of res.documents) {
                await databases.deleteDocument(DB_ID, MAINT_COL, doc.$id);
            }

            if (res.documents.length < limit) break;
            offset += limit;
        }
    } catch (err) {
        console.error("Error deleting maintenance records:", err);
        throw err;
    }
};

// ════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ════════════════════════════════════════════════════
window.subscribeToRealtimeUpdates = () => {
    if (!window.currentUser) return;

    // Subscribe to fuel records changes
    const fuelUnsubscribe = client.subscribe(
        `databases.${DB_ID}.collections.${FUEL_COL}.documents`,
        async (response) => {
            console.log("Fuel data changed:", response.events);
            if (response.events.some(e => e.includes("create") || e.includes("update") || e.includes("delete"))) {
                await window.loadFuelFromAppwrite().then(docs => {
                    state.fuelRecords = docs;
                    window.renderFuelTable();
                    window.updateVaultCounts();
                    window.refreshOverview();
                });
            }
        }
    );

    // Subscribe to mileage records changes
    const mileUnsubscribe = client.subscribe(
        `databases.${DB_ID}.collections.${MILE_COL}.documents`,
        async (response) => {
            console.log("Mileage data changed:", response.events);
            if (response.events.some(e => e.includes("create") || e.includes("update") || e.includes("delete"))) {
                await window.loadMileageFromAppwrite().then(docs => {
                    state.mileageData = docs;
                    window.processAndRenderMileage(state.mileageData);
                    window.updateVaultCounts();
                    window.refreshOverview();
                });
            }
        }
    );

    // Subscribe to maintenance records changes
    const maintUnsubscribe = client.subscribe(
        `databases.${DB_ID}.collections.${MAINT_COL}.documents`,
        async (response) => {
            console.log("Maintenance data changed:", response.events);
            if (response.events.some(e => e.includes("create") || e.includes("update") || e.includes("delete"))) {
                await window.loadMaintFromAppwrite().then(docs => {
                    state.maintRecords = docs;
                    window.renderMaintTable();
                    window.updateMaintSummary();
                    window.updateVaultCounts();
                    window.refreshOverview();
                });
            }
        }
    );

    // Store unsubscribe functions for cleanup if needed
    window.realtimeUnsubscribers = [fuelUnsubscribe, mileUnsubscribe, maintUnsubscribe];
};
