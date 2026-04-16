import { checkAuth, checkAdminRole, getAdminContext, logoutUser }
    from './services/authService.js';

import { 
    CompanyUsersButtonListener, 
    displayCompanyUsers, 
    setCurrentCompanyId as setUserCompanyId 
} from './ui/userUI.js';

import { 
    CompanyNotificationsButtonListener,
    setCurrentCompanyIdNotifications,
    setNotificationAdminContext,
    displayCompanyNotifications
} from './ui/notificationUI.js';

import { 
    CompanyDepartmentsButtonListener,
    setCurrentCompanyIdDepartments 
} from './ui/departmentUI.js';

import {
    CompanyAdminsButtonListener,
    setCurrentCompanyIdAdmins
} from './ui/adminUI.js';

import {
    CompanyButtonListener,
    setCurrentCompanyIdCompany
} from './ui/companyUI.js';

import { loadCompanyUsers } from './services/userService.js';
import { loadCompanyNotifications } from './services/notificationService.js';


async function initDashboard() {
    try {
        const user = await checkAuth();
        await checkAdminRole(user);
        const adminContext = await getAdminContext(user.id);

        // get companyId of admin
        const companyId = adminContext.companyId;

        if (!companyId) {
            throw new Error("Company ID not found.");
        }

        // set companyId for all modules
        setUserCompanyId(companyId);
        setCurrentCompanyIdNotifications(companyId);
        setNotificationAdminContext(adminContext);
        setCurrentCompanyIdDepartments(companyId);
        setCurrentCompanyIdAdmins(companyId);
        setCurrentCompanyIdCompany(companyId);

        if (adminContext.role === 'Department') {
            applyDepartmentAdminLayout();
            const notifications = await loadCompanyNotifications(companyId, adminContext);
            await displayCompanyNotifications(notifications);
        } else {
            // initialise with users loaded
            const users = await loadCompanyUsers(companyId);
            await displayCompanyUsers(users);
        }

        setupListeners();

    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

function applyDepartmentAdminLayout() {
    ['btn-users', 'btn-admins', 'btn-departments', 'btn-company'].forEach(buttonId => {
        const button = document.getElementById(buttonId);

        if (button) {
            button.style.display = 'none';
        }
    });
}

// button listeners
function setupListeners() {
    CompanyUsersButtonListener();
    CompanyAdminsButtonListener();
    CompanyNotificationsButtonListener();
    CompanyDepartmentsButtonListener();
    CompanyButtonListener();
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
