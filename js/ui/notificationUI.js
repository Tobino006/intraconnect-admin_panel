import { loadCompanyNotifications, updateNotification, createNotification, deleteNotification } from '../services/notificationService.js';
import { FormatDate } from '../utils/dateFormatter.js';

let currentCompanyId = null;
let currentAdminContext = {
    role: 'Company',
    departmentId: null
};

// Set current company ID
export function setCurrentCompanyIdNotifications(companyId) {
    currentCompanyId = companyId;
}

export function setNotificationAdminContext(adminContext) {
    currentAdminContext = {
        role: adminContext?.role || 'Company',
        departmentId: adminContext?.departmentId || null
    };
}

// Event listener for notification's button
export function CompanyNotificationsButtonListener() {
    const notificationsBtn = document.getElementById('btn-notifications');

    notificationsBtn.addEventListener('click', async () => {
        const notifications = await loadCompanyNotifications(currentCompanyId, currentAdminContext);
        displayCompanyNotifications(notifications);
    });
}

// Display all notifications for company
export async function displayCompanyNotifications(notifications) {
    const formSection = document.querySelector('.form-section');

    if (formSection.querySelector('.company-view')) {
        formSection.innerHTML = '';
    }
    
    // create sidebar if it doesn't exist
    let sidebar = formSection.querySelector('.sidebar');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        formSection.appendChild(sidebar);
    }
    
    // create form-container if it doesn't exist
    let formContainer = formSection.querySelector('.form-container');
    if (!formContainer) {
        formContainer = document.createElement('div');
        formContainer.className = 'form-container';
        formSection.appendChild(formContainer);
    }

    // fill the sidebar
    sidebar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Oznamy</h2>
            <button class="btn-add-user" id="btn-add-notification" title="Pridať nový oznam">+</button>
        </div>
    `;
    document.getElementById('btn-add-notification').addEventListener('click', () => {
        displayAddNotificationForm();
    })

    const notificationList = document.createElement('ul');
    notifications.forEach(notification => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="notification-item">
                <strong>${notification.title}</strong>
                <span class="notification-id">ID: ${notification.id}</span>
                <div class="notification-info">
                    <span>Správa:<br/> ${notification.message}</span>
                </div>
                <button class="btn-delete-user" data-notification-id="${notification.id}" title="Odstrániť oznam">Odstrániť</button>
            </div>
        `;

        li.querySelector('.btn-delete-user').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteNotification(notification.id, notification.title);
        })

        // event listener for every notification-item
        li.querySelector('.notification-item').addEventListener('click', () => {
            displayNotificationForm(notification);
        });
        notificationList.appendChild(li);
    });

    sidebar.appendChild(notificationList);
}

// Display form for adding a new notification
function displayAddNotificationForm() {
    const formContainer = document.querySelector('.form-container');
    const isDepartmentAdmin = currentAdminContext.role === 'Department';
    const lockedDepartmentId = currentAdminContext.departmentId || '';

    formContainer.innerHTML = `
    <h2>Pridať nový oznam</h2>
    <form id="notificationForm">
        <div class="form-group">
            <label>Nadpis:</label>
            <input type="text" id="newTitle" placeholder="Nadpis oznamu" autocomplete="off" required>
        </div>

        <div class="form-group">
            <label>Správa:</label>
            <textarea id="newMessage" rows="10" placeholder="Text správy" required></textarea>
        </div>

        ${isDepartmentAdmin ? `
        <div class="form-group">
            <label>Oddelenie ID:</label>
            <input type="text" id="newDepartment" value="${lockedDepartmentId}" readonly>
        </div>
        ` : `
        <div class="form-group">
            <label>Typ oznamu:</label>
            <div style="margin-top: 0.5em;">
                <label for="newIsGlobalYes">Pre všetkých</label>
                <input type="radio" name="newIsGlobal" id="newIsGlobalYes" value="true" checked>
            </div>
            <div style="margin-top: 0.5em;">
                <label for="newIsGlobalNo">Len pre oddelenie</label>
                <input type="radio" name="newIsGlobal" id="newIsGlobalNo" value="false">
            </div>
        </div>

        <div class="form-group" id="newDepartmentGroup" style="display: none;">
            <label>Oddelenie ID:</label>
            <input type="text" id="newDepartment" placeholder="ID oddelenia">
        </div>
        `}

        <button type="button" id="saveNewNotificationBtn" class="save-btn">Vytvoriť oznam</button>
    </form>
    `;

    if (!isDepartmentAdmin) {
        // event listener for radio button changes
        document.querySelectorAll('input[name="newIsGlobal"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const departmentGroup = document.getElementById('newDepartmentGroup');
                if (e.target.value === 'false') {
                    departmentGroup.style.display = 'block';
                } else {
                    departmentGroup.style.display = 'none';
                }
            });
        });
    }

    // event listener for the create button
    document.getElementById('saveNewNotificationBtn').addEventListener('click', () => {
        handleCreateNotification();
    });
}

// Display form for editing notification
function displayNotificationForm(notification) {
    const formContainer = document.querySelector('.form-container');
    const isDepartmentAdmin = currentAdminContext.role === 'Department';
    const lockedDepartmentId = currentAdminContext.departmentId || notification.departmentId || '';

    formContainer.innerHTML = `
    <h2>Upraviť oznam</h2>
    <form id="notificationForm">
        <div class="form-group">
            <label>Nadpis:</label>
            <input type="text" id="formTitle" value="${notification.title}" placeholder="Nadpis">
        </div>

        <div class="form-group">
            <label>Správa:</label> 
            <textarea id="formMessage" rows="10"></textarea>
        </div>

        <div class="form-group">
            <label>Vytvorené:</label>
            <input type="text" id="formPublished" readonly>
        </div>

        <div class="form-group">
            <label>Naposledy upravené:</label>
            <input type="text" id="formUpdated" readonly>
        </div>

        ${isDepartmentAdmin ? `
        <div class="form-group">
            <label>Oddelenie ID:</label>
            <input type="text" id="formDepartment" value="${lockedDepartmentId}" readonly>
        </div>
        ` : `
        <div class="form-group">
            <label>Typ oznamu:</label>
            <div style="margin-top: 0.5em;">
                <label for="formIsGlobalYes">Pre všetkých</label>
                <input type="radio" name="isGlobal" id="formIsGlobalYes" value="true">
            </div>
            <div style="margin-top: 0.5em;">
                <label for="formIsGlobalNo">Len pre oddelenie</label>
                <input type="radio" name="isGlobal" id="formIsGlobalNo" value="false">
            </div>
        </div>

        <div class="form-group" id="departmentGroup" style="display: none;">
            <label>Oddelenie ID:</label>
            <input type="text" id="formDepartment" placeholder="ID oddelenia">
        </div>
        `}
        
        <button type="button" id="saveBtn" class="save-btn">Uložiť zmeny</button>
    </form>
    `;

    document.getElementById('formMessage').value = notification.message;

    // format the dates
    document.getElementById('formPublished').value = FormatDate(notification.publishedAt);
    document.getElementById('formUpdated').value = FormatDate(notification.updatedAt);

    if (!isDepartmentAdmin) {
        // if global is chosen false, show input field for department id
        if (notification.isGlobal) {
            document.getElementById('formIsGlobalYes').checked = true;
            document.getElementById('departmentGroup').style.display = 'none';
        } else {
            document.getElementById('formIsGlobalNo').checked = true;
            document.getElementById('departmentGroup').style.display = 'block';
            document.getElementById('formDepartment').value = notification.departmentId || '';
        }

        // event listener for radio button changes
        document.querySelectorAll('input[name="isGlobal"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const departmentGroup = document.getElementById('departmentGroup');
                if (e.target.value === 'false') {
                    departmentGroup.style.display = 'block';
                } else {
                    departmentGroup.style.display = 'none';
                }
            });
        });
    }

    // event listener for the save button
    document.getElementById('saveBtn').addEventListener('click', async () => {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;

        try {
            const title = document.getElementById('formTitle').value;
            const message = document.getElementById('formMessage').value;
            const isGlobal = isDepartmentAdmin
                ? false
                : document.querySelector('input[name="isGlobal"]:checked').value === "true";
            const departmentId = document.getElementById('formDepartment').value;

            await updateNotification (
                notification.id,
                {
                    title,
                    message,
                    isGlobal,
                    departmentId
                },
                currentCompanyId,
                currentAdminContext
            );

            alert("Oznam bol úspešne upravený.");

            // reload notifications
            const notifications = await loadCompanyNotifications(currentCompanyId, currentAdminContext);
            displayCompanyNotifications(notifications);

        } catch (error) {
            console.error("Error updating notification:", error);
            alert(error.message);
            saveBtn.disabled = false;
        }
    });
}

// handle creating new notification
async function handleCreateNotification() {
    try {
        const isDepartmentAdmin = currentAdminContext.role === 'Department';
        const title = document.getElementById('newTitle').value;
        const message = document.getElementById('newMessage').value;
        const isGlobal = isDepartmentAdmin
            ? false
            : document.querySelector('input[name="newIsGlobal"]:checked').value === "true";
        const departmentId = document.getElementById('newDepartment').value;

        // validation
        if (!title.trim() || !message.trim()) {
            alert('Vyplňte nadpis aj správu!');
            return;
        }

        if (!isGlobal && !departmentId.trim()) {
            alert('Pri ozname pre oddelenie musí byť vyplnené ID oddelenia!');
            return;
        }

        await createNotification(
            {
                title,
                message,
                isGlobal,
                departmentId
            },
            currentCompanyId,
            currentAdminContext
        );

        alert('Oznam bol úspešne vytvorený.');

        // reload notifications
        const notifications = await loadCompanyNotifications(currentCompanyId, currentAdminContext);
        displayCompanyNotifications(notifications);
    } catch (error) {
        console.error('Error creating notification:', error);
        alert('Chyba pri vytváraní oznamu: ' + error.message);
    }
}

// Handle deleting notification
async function handleDeleteNotification(notificationId, notificationTitle) {
    const confirmed = confirm(`Naozaj si prajete odstrániť oznam "${notificationTitle}"?\n\nTáto akcia je nemenná.`);

    if (!confirmed) {
        console.log('Akcia zrušená.');
        return;
    }

    try {
        await deleteNotification(notificationId, currentCompanyId, currentAdminContext);
        alert(`Oznam "${notificationTitle}" bol úspešne odstránený.`);

        // reload notifications
        const notifications = await loadCompanyNotifications(currentCompanyId, currentAdminContext);
        displayCompanyNotifications(notifications);
    } catch (error) {
        console.error('Error deleting notification:', error);
        alert('Chyba pri odstraňovaní oznamu: ' + error.message);
    }
}
