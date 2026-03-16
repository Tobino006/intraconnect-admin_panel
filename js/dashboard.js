import { checkAuth, checkAdminRole, getAdminCompanyId, logoutUser } 
    from './services/authService.js';

import { 
    CompanyUsersButtonListener, 
    displayCompanyUsers, 
    setCurrentCompanyId as setUserCompanyId 
} from './ui/userUI.js';

import { 
    CompanyNotificationsButtonListener,
    setCurrentCompanyIdNotifications 
} from './ui/notificationUI.js';

import { 
    CompanyDepartmentsButtonListener,
    setCurrentCompanyIdDepartments 
} from './ui/departmentUI.js';

import {
    CompanyAdminsButtonListener,
    setCurrentCompanyIdAdmins
} from './ui/adminUI.js';

import { loadCompanyUsers } from './services/userService.js';


async function initDashboard() {
    try {
        const user = await checkAuth();
        await checkAdminRole(user);

        // get companyId of admin
        const companyId = await getAdminCompanyId(user.id);

        if (!companyId) {
            throw new Error("Company ID not found.");
        }

        // set companyId for all modules
        setUserCompanyId(companyId);
        setCurrentCompanyIdNotifications(companyId);
        setCurrentCompanyIdDepartments(companyId);
        setCurrentCompanyIdAdmins(companyId);

        // initialise with users loaded
        const users = await loadCompanyUsers(companyId);
        await displayCompanyUsers(users);

        setupListeners();

    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

// button listeners
function setupListeners() {
    CompanyUsersButtonListener();
    CompanyAdminsButtonListener();
    CompanyNotificationsButtonListener();
    CompanyDepartmentsButtonListener();
    setupLogout();
}

// setup logout
function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async () => {
        await logoutUser();
    });
}

// init
document.addEventListener("DOMContentLoaded", initDashboard);