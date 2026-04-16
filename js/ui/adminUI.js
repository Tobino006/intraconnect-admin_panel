import {
    loadCompanyAdmins,
    createNewAdmin,
    updateAdmin,
    deleteAdmin
} from '../services/adminService.js';

let currentCompanyId = null;

// Set current company ID
export function setCurrentCompanyIdAdmins(companyId) {
    currentCompanyId = companyId;
}

// Event listener for admin button
export function CompanyAdminsButtonListener() {
    const adminsBtn = document.getElementById('btn-admins');

    adminsBtn.addEventListener('click', async () => {
        const admins = await loadCompanyAdmins(currentCompanyId);
        displayCompanyAdmins(admins);
    });
}

// Display all admins for company
export async function displayCompanyAdmins(admins) {
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
            <h2>Správcovia</h2>
            <button class="btn-add-user" id="btn-add-admin" title="Pridať nového správcu">+</button>
        </div>
    `;

    // event listener for + button
    document.getElementById('btn-add-admin').addEventListener('click', () => {
        displayAddAdminForm();
    });

    const adminList = document.createElement('ul');
    admins.forEach(admin => {
        const li = document.createElement('li');
        const avatarSrc = (admin.avatarUrl && admin.avatarUrl !== '-') ? admin.avatarUrl : 'assets/avatar_default.svg';
        const adminDepartment = admin.role === 'Department'
            ? (admin.adminDepartmentId || admin.departmentId || '-')
            : '-';

        li.innerHTML = `
            <div class="user-item">
                <button class="btn-delete-user" data-admin-id="${admin.id}" title="Odstrániť správcu">Odstrániť</button>
                <img src="${avatarSrc}" alt="Avatar" class="user-avatar">
                <strong>${admin.name}</strong>
                <span class="user-id">ID: ${admin.id}</span>
                <div class="user-info">
                    <span>Rola: ${admin.role}</span>
                    <span>Pozícia: ${admin.position}</span>
                    <span>Oddelenie: ${adminDepartment}</span>
                </div>
            </div>
        `;

        li.querySelector('.user-item').addEventListener('click', () => {
            displayAdminForm(admin);
        });
        adminList.appendChild(li);

        li.querySelector('.btn-delete-user').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteAdmin(admin.id, admin.name);
        });
    });

    sidebar.appendChild(adminList);
}

// Display form for adding a new admin
function displayAddAdminForm() {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
        <h2>Pridať nového správcu</h2>
        <form id="adminForm">
            <div class="form-group">
                <label>Meno:</label>
                <input type="text" id="newAdminName" placeholder="Meno a priezvisko" autocomplete="off" required>
            </div>

            <div class="form-group">
                <label>Email:</label>
                <input type="email" id="newAdminEmail" placeholder="email@example.com" autocomplete="off" required>
            </div>

            <div class="form-group">
                <label>Pozícia:</label>
                <input type="text" id="newAdminPosition" placeholder="Pozícia vo firme (nepovinné)" autocomplete="off">
            </div>

            <div class="form-group">
                <label>Oddelenie ID:</label>
                <input type="text" id="newAdminDepartmentId" placeholder="ID oddelenia (pre Department rolu povinné)" autocomplete="off">
            </div>

            <div class="form-group">
                <label>Dočasné heslo:</label>
                <input type="password" id="newAdminPassword" placeholder="Minimálne 8 znakov" required>
            </div>

            <div class="form-group">
                <label>Rola správcu:</label>
                <div style="margin-top: 0.5em;">
                    <label for="newAdminRoleCompany">Company</label>
                    <input type="radio" name="newAdminRole" id="newAdminRoleCompany" value="Company" checked>
                </div>
                <div style="margin-top: 0.5em;">
                    <label for="newAdminRoleDepartment">Department</label>
                    <input type="radio" name="newAdminRole" id="newAdminRoleDepartment" value="Department">
                </div>
            </div>

            <div class="form-group" style="flex-direction: row; gap: 1em; justify-content: center;">
                <button type="button" id="saveNewAdminBtn" class="save-btn">Vytvoriť správcu</button>
            </div>
        </form>
    `;

    // save new admin button
    document.getElementById('saveNewAdminBtn').addEventListener('click', () => {
        handleCreateNewAdmin();
    });
}

// Handle creating new admin
async function handleCreateNewAdmin() {
    try {
        const name = document.getElementById('newAdminName').value;
        const email = document.getElementById('newAdminEmail').value;
        const position = document.getElementById('newAdminPosition').value;
        const departmentId = document.getElementById('newAdminDepartmentId').value;
        const password = document.getElementById('newAdminPassword').value;
        const role = document.querySelector('input[name="newAdminRole"]:checked')?.value;

        // validation
        if (!name.trim() || !email.trim() || !password.trim()) {
            alert('Vyplňte všetky povinné polia!');
            return;
        }

        if (!role) {
            alert('Vyberte rolu správcu!');
            return;
        }

        if (role === 'Department' && !departmentId.trim()) {
            alert('Pre Department rolu musíte vyplniť ID oddelenia!');
            return;
        }

        const result = await createNewAdmin(
            { name, email, password, position, departmentId, role },
            currentCompanyId
        );

        alert(`Správca "${name}" bol úspešne vytvorený.\n\nEmail: ${result.email}\nHeslo: ${result.password}`);

        // reload admin list
        const admins = await loadCompanyAdmins(currentCompanyId);
        await displayCompanyAdmins(admins);
    } catch (error) {
        console.error('Error creating admin:', error);
        alert('Chyba pri vytváraní správcu: ' + error.message);
    }
}

// Display form for editing admin
function displayAdminForm(admin) {
    const formContainer = document.querySelector('.form-container');
    const selectedDepartmentId = admin.role === 'Department'
        ? (admin.adminDepartmentId || admin.departmentId || '')
        : (admin.departmentId !== '-' ? admin.departmentId : '');

    formContainer.innerHTML = `
        <h2>Upraviť správcu</h2>
        <form id="adminForm">
            <div class="form-group">
                <label>Meno:</label>
                <input type="text" id="formAdminName" value="${admin.name}" placeholder="Meno">
            </div>

            <div class="form-group">
                <label>Pozícia:</label>
                <input type="text" id="formAdminPosition" value="${admin.position !== '-' ? admin.position : ''}" placeholder="Pozícia">
            </div>

            <div class="form-group">
                <label>Oddelenie ID:</label>
                <input type="text" id="formAdminDepartment" value="${selectedDepartmentId}" placeholder="Oddelenie">
            </div>

            <div class="form-group">
                <label>Rola správcu:</label>
                <div style="margin-top: 0.5em;">
                    <label for="formAdminRoleCompany">Company</label>
                    <input type="radio" name="formAdminRole" id="formAdminRoleCompany" value="Company" ${admin.role === 'Company' ? 'checked' : ''}>
                </div>
                <div style="margin-top: 0.5em;">
                    <label for="formAdminRoleDepartment">Department</label>
                    <input type="radio" name="formAdminRole" id="formAdminRoleDepartment" value="Department" ${admin.role === 'Department' ? 'checked' : ''}>
                </div>
            </div>

            <button type="button" id="saveAdminBtn" class="save-btn">Uložiť zmeny</button>
        </form>
    `;

    document.getElementById('saveAdminBtn').addEventListener('click', () => {
        handleSaveAdmin(admin.id);
    });
}

// Handle saving admin changes
async function handleSaveAdmin(adminUserId) {
    try {
        const name = document.getElementById('formAdminName').value;
        const position = document.getElementById('formAdminPosition').value;
        const departmentId = document.getElementById('formAdminDepartment').value;
        const role = document.querySelector('input[name="formAdminRole"]:checked')?.value;

        if (!name.trim()) {
            alert('Meno nesmie byť prázdne!');
            return;
        }

        if (!role) {
            alert('Vyberte rolu správcu!');
            return;
        }

        if (role === 'Department' && !departmentId.trim()) {
            alert('Pre Department rolu musíte vyplniť ID oddelenia!');
            return;
        }

        await updateAdmin(adminUserId, { name, position, departmentId, role }, currentCompanyId);

        alert('Zmeny boli uložené.');

        // reload admin list
        if (currentCompanyId) {
            const admins = await loadCompanyAdmins(currentCompanyId);
            await displayCompanyAdmins(admins);
        }
    } catch (error) {
        console.error('Error saving admin:', error);
        alert('Chyba pri ukladaní: ' + error.message);
    }
}

// Handle deleting admin
async function handleDeleteAdmin(adminUserId, adminName) {
    const confirmed = confirm(`Naozaj si prajete odstrániť správcu "${adminName}"?\n\nTáto akcia je nemenná.`);

    if (!confirmed) {
        console.log('Akcia zrušená.');
        return;
    }

    try {
        await deleteAdmin(adminUserId, currentCompanyId);
        alert(`Správca "${adminName}" bol úspešne odstránený.`);

        // reload admin list
        if (currentCompanyId) {
            const admins = await loadCompanyAdmins(currentCompanyId);
            await displayCompanyAdmins(admins);
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        alert('Chyba pri odstraňovaní správcu: ' + error.message);
    }
}
