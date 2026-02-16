import { loadCompanyUsers, createNewUser, updateUser, deleteUser } from '../services/userService.js';

let currentCompanyId = null;

// Set current company ID
export function setCurrentCompanyId(companyId) {
    currentCompanyId = companyId;
}

// Event listener for user button
export function CompanyUsersButtonListener() {
    const userBtn = document.getElementById('btn-users');

    userBtn.addEventListener('click', async () => {
        const users = await loadCompanyUsers(currentCompanyId);
        displayCompanyUsers(users);
    });
}

// Display all users for company
export async function displayCompanyUsers(users) {
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
    sidebar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Používatelia</h2>
            <button class="btn-add-user" id="btn-add-user" title="Pridať nového používateľa">+</button>
        </div>
    `;

    // event listener for + button
    document.getElementById('btn-add-user').addEventListener('click', () => {
        displayAddUserForm();
    });

    const userList = document.createElement('ul');
    users.forEach(user => {
        const li = document.createElement('li');
        // if user does not have profile picture set, show default profile picture instead
        const avatarSrc = (user.avatarUrl && user.avatarUrl !== '-') ? user.avatarUrl : 'assets/avatar_default.svg';
        li.innerHTML = `
            <div class="user-item">
                <button class="btn-delete-user" data-user-id="${user.id}" title="Odstrániť používateľa">Odstrániť</button>
                <img src="${avatarSrc}" alt="Avatar" class="user-avatar">
                <strong>${user.name}</strong>
                <span class="user-id">ID: ${user.id}</span>
                <div class="user-info">
                    <span>Pozícia: ${user.position}</span>
                    <span>Telefón: ${user.phone}</span>
                    <span>Oddelenie: ${user.departmentId}</span>
                </div>
            </div>
        `;

        // event listener for every user-item
        li.querySelector('.user-item').addEventListener('click', () => {
            displayUserForm(user);
        });
        userList.appendChild(li);

        // event listener for delete button
        li.querySelector('.btn-delete-user').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteUser(user.id, user.name);
        })
    });

    sidebar.appendChild(userList);
}

// Display form for adding new user
function displayAddUserForm() {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
        <h2>Pridať nového používateľa</h2>
        <form id="addUserForm">
            <div class="form-group">
                <label>Meno:</label>
                <input type="text" id="newName" placeholder="Meno a priezvisko" autocomplete="off" required>
            

            
                <label>Email:</label>
                <input type="email" id="newEmail" placeholder="email@example.com" autocomplete="off" required>
            

            
                <label>Pozícia:</label>
                <input type="text" id="newPosition" placeholder="Pozícia vo firme (nepovinné)" autocomplete="off">
            

            
                <label>Oddelenie ID:</label>
                <input type="text" id="newDepartmentId" placeholder="ID oddelenia (nepovinné)" autocomplete="off">
            

            
                <label>Dočasné heslo:</label>
                <input type="password" id="newPassword" placeholder="Minimálne 8 znakov" required>
            

            <div class="form-group" style="flex-direction: row; gap: 1em; justify-content: center;">
                <button type="button" id="saveNewUserBtn" class="save-btn">Vytvoriť používateľa</button>
            </div>
        </form>
    `;

    // save new user button
    document.getElementById('saveNewUserBtn').addEventListener('click', () => {
        handleCreateNewUser();
    });
}

// Handle creating new user
async function handleCreateNewUser() {
    try {
        const name = document.getElementById('newName').value;
        const email = document.getElementById('newEmail').value;
        const position = document.getElementById('newPosition').value || null;
        const departmentId = document.getElementById('newDepartmentId').value;
        const password = document.getElementById('newPassword').value;

        // validation
        if (!name.trim() || !email.trim() || !password.trim()) {
            alert('Vyplňte všetky povinné polia!');
            return;
        }

        const result = await createNewUser(
            { name, email, password, position, departmentId },
            currentCompanyId
        );

        alert(`Používateľ "${name}" bol úspešne vytvorený.\n\nEmail: ${result.email}\nHeslo: ${result.password}`);

        // reload user list
        const users = await loadCompanyUsers(currentCompanyId);
        await displayCompanyUsers(users);
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Chyba pri vytváraní používateľa: ' + error.message);
    }
}

// Display form for editing user
function displayUserForm(user) {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
    <h2>Upraviť používateľa</h2>
    <form id="userForm">
        <div class="form-group">
            <label>Meno:</label>
            <input type="text" id="formName" value="${user.name}" placeholder="Meno">
        </div>

        <div class="form-group">
                <label>Pozícia:</label>
                <input type="text" id="formPosition" value="${user.position}" placeholder="Pozícia">
        </div>
        
        <div class="form-group">
            <label>Oddelenie ID:</label>
             <input type="text" id="formDepartment" value="${user.departmentId}" placeholder="Oddelenie">
        </div>
        
        <button type="button" id="saveBtn" class="save-btn">Uložiť zmeny</button>
    </form>
    `;

    // event listener for the save button
    document.getElementById('saveBtn').addEventListener('click', () => {
        handleSaveUser(user.id);
    });
}

// Handle saving user changes
async function handleSaveUser(userId) {
    try {
        const name = document.getElementById('formName').value;
        const position = document.getElementById('formPosition').value || null;
        const departmentId = document.getElementById('formDepartment').value;

        await updateUser(userId, { name, position, departmentId });
        
        alert('Zmeny boli uložené.');

        // reload user list
        if (currentCompanyId) {
            const users = await loadCompanyUsers(currentCompanyId);
            await displayCompanyUsers(users);
        }   
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Chyba pri ukladaní: ' + error.message);
    }
}

// Handle deleting user
async function handleDeleteUser(userId, userName) {
    // confirmation dialog
    const confirmed = confirm(`Naozaj si prajete odstrániť používateľa "${userName}"?\n\nTáto akcia je nemenná.`);

    if (!confirmed) {
        console.log('Akcia zrušená.');
        return;
    }

    try {
        await deleteUser(userId, currentCompanyId);
        alert(`Používateľ "${userName}" bol úspešne odstránený.`);

        // reload user list
        if (currentCompanyId) {
            const users = await loadCompanyUsers(currentCompanyId);
            await displayCompanyUsers(users);
        }
    } catch (error) {
        console.error('Error pri odstraňovaní užívateľa:', error);
        alert('Chyba pri odstraňovaní používateľa: ' + error.message);
    }
}