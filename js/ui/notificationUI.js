import { loadCompanyNotifications, checkIfDepartmentExists, updateNotification } from '../services/notificationService.js';
import { FormatDate } from '../utils/dateFormatter.js';

let currentCompanyId = null;

// Set current company ID
export function setCurrentCompanyIdNotifications(companyId) {
    currentCompanyId = companyId;
}

// Event listener for notification's button
export function CompanyNotificationsButtonListener() {
    const notificationsBtn = document.getElementById('btn-notifications');

    notificationsBtn.addEventListener('click', async () => {
        const notifications = await loadCompanyNotifications(currentCompanyId);
        displayCompanyNotifications(notifications);
    });
}

// Display all notifications for company
export async function displayCompanyNotifications(notifications) {
    const formSection = document.querySelector('.form-section');
    
    // create sidebar if it doesn't exist
    let sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        formSection.appendChild(sidebar);
    }
    
    // create form-container if it doesn't exist
    let formContainer = document.querySelector('.form-container');
    if (!formContainer) {
        formContainer = document.createElement('div');
        formContainer.className = 'form-container';
        formSection.appendChild(formContainer);
    }

    // fill the sidebar
    sidebar.innerHTML = '<h2>Oznamy</h2>';

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
            </div>
        `;

        // event listener for every notification-item
        li.querySelector('.notification-item').addEventListener('click', () => {
            displayNotificationForm(notification);
        });
        notificationList.appendChild(li);
    });

    sidebar.appendChild(notificationList);
}

// Display form for editing notification
function displayNotificationForm(notification) {
    const formContainer = document.querySelector('.form-container');
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
        
        <button type="button" id="saveBtn" class="save-btn">Uložiť zmeny</button>
    </form>
    `;

    document.getElementById('formMessage').value = notification.message;

    // format the dates
    document.getElementById('formPublished').value = FormatDate(notification.publishedAt);
    document.getElementById('formUpdated').value = FormatDate(notification.updatedAt);

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

    // event listener for the save button
    document.getElementById('saveBtn').addEventListener('click', async () => {
        try {
            const title = document.getElementById('formTitle').value;
            const message = document.getElementById('formMessage').value;
            const isGlobal = document.querySelector('input[name="isGlobal"]:checked').value === "true";
            const departmentId = document.getElementById('formDepartment').value;

            await updateNotification (
                notification.id,
                {
                    title,
                    message,
                    isGlobal,
                    departmentId
                },
                currentCompanyId
            );

            alert("Oznam bol úspešne upravený.");

            // reload notifications
            const notifications = await loadCompanyNotifications(currentCompanyId);
            displayCompanyNotifications(notifications);

        } catch (error) {
            console.error("Error updating notification:", error);
            alert(error.message);
        }
    });
}