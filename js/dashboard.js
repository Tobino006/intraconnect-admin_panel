import { supabase } from './config/supabase.js'

// format timestampz from Supabase
function FormatDate(dateString) {
    if (!dateString || dateString == '-')  {
        return '-';
    }

    const date = new Date(dateString);

    // check if date is valid
    if (isNaN(date.getTime())) return '-';

    // days
    const daysOfWeek = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];

    // get day of the week
    const dayName = daysOfWeek[date.getDay()];

    // get day, month, year
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    // get hours and minutes
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // return formatted string
    return `${dayName}, ${day}. ${month}. ${year} o ${hours}:${minutes}`;
}

// global variable to store companyId
let currentCompanyId = null;

// entry point
async function InitDashboard() {
    try {
        const user = await checkAuth();
        checkAdminRole(user); // check role whether user has required authentication

        // Load users for admin's company
        const { data } = await supabase
            .from('admin')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
        
        if (data) {
            currentCompanyId = data.company_id;
            const users = await loadCompanyUsers(data.company_id);
            displayCompanyUsers(users);
        }

        CompanyUsersButtonListener();
        CompanyNotificationsButtonListener();
        //CompanyButtonListener();
        CompanyDepartmentsButtonListener();
        Logout();
    } catch (error) {
        console.error(error);
    }
}

// auth guard
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.replace('index.html');
        throw new Error('Neoverený používateľ.');
    }

    return user;
}

// admin role guard
async function checkAdminRole(user) {
    const { data, error } = await supabase
        .from('admin')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (error || (data.role !== 'Company' && data.role !== 'Department')) {
        await supabase.auth.signOut();
        window.location.replace('index.html');
        throw new Error('Prístup zamietnutý.');
    }

    return data.role;
}

// logout button
function Logout() {
    const logoutBtn = document.getElementById('logoutBtn');

    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('index.html');
    })
}

// user class for data
class User {
    constructor(id, companyId, position, phone, name, departmentId, avatarUrl) {
        this.id = id;
        this.companyId = companyId;
        this.position = position || '-';
        this.phone = phone || '-';
        this.name = name;
        this.departmentId = departmentId || '-';
        this.avatarUrl = avatarUrl || '-';
    }
};

// notification class for data
class Notification {
    constructor(id, companyId, title, message, publishedAt, updatedAt, createdBy, isGlobal, departmentId = null) {
        this.id = id;
        this.companyId = companyId;
        this.title = title;
        this.message = message;
        this.publishedAt = publishedAt;
        this.updatedAt = updatedAt || '-';
        this.createdBy = createdBy;
        this.isGlobal = isGlobal;
        this.departmentId = departmentId;
    }
};

class Department {
    constructor(id, companyId, name) {
        this.id = id;
        this.companyId = companyId;
        this.name = name;
    }
};

// event listener for user button
function CompanyUsersButtonListener() {
    const userBtn = document.getElementById('btn-users');

    userBtn.addEventListener('click', async () => {
        const users = await loadCompanyUsers(currentCompanyId);
        displayCompanyUsers(users);
    });
}

// function for loading users in admin's firm
async function loadCompanyUsers(currentCompanyId) {
    const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('company_id', currentCompanyId);

    if (error) {
        console.log('Error loading users: ', error);
        return [];
    }

    // convert to user object
    return data.map(user =>
        new User (
            user.id, 
            user.company_id, 
            user.position, 
            user.phone, 
            user.name, 
            user.department_id, 
            user.avatar_url
        )
    );
}

// function for displaying users
function displayCompanyUsers(users) {
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

function displayAddUserForm() {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
        <h2>Pridať nového používateľa</h2>
        <form id="addUserForm">
            <div class="form-group">
                <label>Meno:</label>
                <input type="text" id="newName" placeholder="Meno a priezvisko" required>
            

            
                <label>Email:</label>
                <input type="email" id="newEmail" placeholder="email@example.com" required>
            

            
                <label>Pozícia:</label>
                <input type="text" id="newPosition" placeholder="Pozícia vo firme (nepovinné)">
            

            
                <label>Oddelenie ID:</label>
                <input type="text" id="newDepartmentId" placeholder="ID oddelenia (nepovinné)">
            

            
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

        // check whether department exists
        if (!checkIfDepartmentExists(departmentId)) {
            alert('Oddelenie s týmto ID neexistuje!');
            return;
        }

        // create auth acc in Supabase
        const { data: authData, error: authError} = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            alert('Chyba pri vytváraní konta: ' + authError.message);
            return;
        }

        const newUserId = authData.user?.id;
        console.log(newUserId);

        // insert new user to 'user' table
        const { data: insertData, error: insertError } = await supabase
            .from('user')
            .insert([{
                id: newUserId,
                company_id: currentCompanyId,
                name: name,
                position: position,
                phone: null,
                department_id: departmentId,
                avatar_url: null
            }]);

        if (insertError) {
            console.error('Insert Error:', insertError);
            alert('Chyba pri vložení do tabuľky: ' + insertError.message);
            return;
        }

        alert(`Používateľ "${name}" bol úspešne vytvorený.\n\nEmail: ${email}\nHeslo: ${password}`);

        // reload user list
        const users = await loadCompanyUsers(currentCompanyId);
        displayCompanyUsers(users);
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Neočakávan chyba: ' + error.message);
    }
}

// show formular after clicking on a user
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

// function for saving user changes to database
async function handleSaveUser(userId) {
    const name = document.getElementById('formName').value;
    const position = document.getElementById('formPosition').value || null;
    const departmentId = document.getElementById('formDepartment').value;

    const { error } = await supabase
        .from('user')
        .update({
            name: name,
            position: position,
            department_id: departmentId
        })
        .eq('id', userId);
    
    if (error) {
        alert('Chyba pri ukladaní: ' + error.message);
    } else {
        alert('Zmeny boli uložené.');

        // reload user list
        if (currentCompanyId) {
            const users = await loadCompanyUsers(currentCompanyId);
            displayCompanyUsers()(users);
        }   
    }
}

// function for safe user deletion
async function handleDeleteUser(userId, userName) {
    // confirmation dialog
    const confirmed = confirm(`Naozaj si prajete odstrániť používateľa "${userName}"?\n\nTáto akcia je nemenná.`);

    if (!confirmed) {
        console.log('Akcia zrušená.');
        return;
    }

    try {

        // remove user
        const { data, error } = await supabase.functions.invoke("delete-user", {
            body: {
                userId: userId,
                companyId:currentCompanyId
            }
        });

        if (error) {
            alert(error.message);
        }
        
        alert(`Používateľ "${userName}" bol úspešne odstránený.`);

        // reload user list
        if (currentCompanyId) {
            const users = await loadCompanyUsers(currentCompanyId);
            displayCompanyUsers(users);
        }
    } catch (error ) {
        console.error('Error pri odstraňovaní užívateľa:', error);
        alert('Chyba pri odstraňovaní používateľa!' + error.message);
    }
}

// event listener for notification's button
function CompanyNotificationsButtonListener() {
    const notificationsBtn = document.getElementById('btn-notifications');

    notificationsBtn.addEventListener('click', async () => {
        const notifications = await loadCompanyNotifications(currentCompanyId);
        displayCompanyNotifications(notifications);
    });
}

async function loadCompanyNotifications(currentCompanyId) {
    // load notifications with optional department relationship
    const { data, error } = await supabase
        .from('notification')
        .select('*, notification_department(department_id)')
        .eq('company_id', currentCompanyId)
        .order('published_at', { ascending: false });;
    
    if (error) {
        console.log('Chyba pri načítaní oznamov: ', error);
        return [];
    }

    // convert to notification object
    return data.map(notification => {
        // extract department id if it exists (for non-global notifications)
        let departmentId = null;
        if (!notification.is_global && notification.notification_department && notification.notification_department.length > 0) {
            departmentId = notification.notification_department[0].department_id;
        }
        return new Notification (
            notification.id, 
            notification.company_id, 
            notification.title, 
            notification.message, 
            notification.published_at, 
            notification.updated_at, 
            notification.created_by,
            notification.is_global,
            departmentId
        );
    });
}

function displayCompanyNotifications(notifications) {
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
                    <span>Správa: ${notification.message}</span>
                </div>
            </div>
        `;

        // event listener for every user-item
        li.querySelector('.notification-item').addEventListener('click', () => {
            displayNotificationForm(notification);
        });
        notificationList.appendChild(li);
    });

    sidebar.appendChild(notificationList);
}

// show formular after clicking on a user
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
    document.getElementById('saveBtn').addEventListener('click', () => {
        handleSaveNotification(notification.id);
    });
}

// validation for saving notification to check if department exists
async function checkIfDepartmentExists(departmentId) {
    const { data, error } = await supabase
        .from('department')
        .select('id')
        .eq('id', departmentId)
        .eq('company_id', currentCompanyId)
        .single();

    if (error || !data) {
        return false;
    }

    return true; // department exists and belongs to admin's company
}

// function for saving notification changes to database
async function handleSaveNotification(notificationId) {
    try {
         // get form values
        const title = document.getElementById('formTitle').value;
        const message = document.getElementById('formMessage').value;
        const isGlobal = document.getElementById('formIsGlobalYes').checked;  // true if "Áno" is selected
        const departmentId =document.getElementById('formDepartment').value || null;

        // validation
        if (!title.trim()) {
            alert('Nadpis nesmie byť prázdny!');
            return;
        }

        if (!isGlobal && !departmentId) {
            alert('Keď je oznam len pre oddelenie, musíš zadať ID oddelenia!');
            return;
        }

        // check if department exists and belongs to admin's company
        if (!isGlobal) {
            const departmentExists = await checkIfDepartmentExists(departmentId);
            if (!departmentExists) {
                alert('Toto oddelenie neexistuje vo Vašej firme!');
                return;
            }
        }

        // 1. update notification table
        const { error: updateError } = await supabase
            .from('notification')
            .update({
                title: title,
                message: message,
                is_global: isGlobal,
                updated_at: new Date().toISOString() // actual time in ISO format like in Supabase
            })
            .eq('id', notificationId);
        
        if (updateError) {
            alert('Chyba pri úprave oznamu: ' + updateError.message);
            return;
        }

        // 2. handle notification_department relationship changes
        const { data: existingDept, error: fetchError } = await supabase
            .from('notification_department')
            .select('*')
            .eq('notification_id', notificationId);
            
        if (fetchError) {
            alert('Chyba pri načítaní údajov: ' + fetchError.message);
            return;
        }

        // if notification is now global
        if (isGlobal) {
            // delete all department associations
            if (existingDept && existingDept.length > 0) {
                const { error: deleteError } = await supabase
                    .from('notification_department')
                    .delete()
                    .eq('notification_id', notificationId);

                if (deleteError) {
                    alert('Chyba pri zmazaní oddelení: ' + deleteError.message);
                    return;
                }
            }
        } else {
            // if notification is for department
            if (existingDept && existingDept.length > 0) {
                // update existing department association
                const { error: updateDeptError } = await supabase
                    .from('notification_department')
                    .update({ department_id: departmentId })
                    .eq('notification_id', notificationId);

                if (updateDeptError) {
                    alert('Chyba pri úprave oddelenia: ' + updateDeptError.message);
                    return;
                }
            } else {
                // insert new department association
                const { error: insertError } = await supabase
                    .from('notification_department')
                    .insert([{ notification_id: notificationId, department_id: departmentId}]);

                if (insertError) {
                    alert('Chyba pri novom priradení oddelenia: ' + insertError.message);
                    return;
                }
            }
        }

        // 3. success message and reload
        alert('Zmeny boli úspešne uložené!');

        if (currentCompanyId) {
            const notifications = await loadCompanyNotifications(currentCompanyId);
            displayCompanyNotifications(notifications);
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        alert('Neočakávaná chyba: ' + error.message);
    }
}

// event listener for department's button
function CompanyDepartmentsButtonListener() {
    const departmentsBtn = document.getElementById('btn-departments');

    departmentsBtn.addEventListener('click', async () => {
        const departments = await loadCompanyDepartments(currentCompanyId);
        displayCompanyDepartments(departments);
    });
}

async function loadCompanyDepartments(currentCompanyId) {
    const { data, error } = await supabase
        .from('department')
        .select('*')
        .eq('company_id', currentCompanyId);
    
    if (error) {
        console.log('Chyba pri načítaní oddelení: ', error);
        return [];
    }

    // convert to department object
    return data.map(department => {
        return new Department (
            department.id,
            department.company_id,
            department.name
        );
    });
}

function displayCompanyDepartments(departments) {
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
    sidebar.innerHTML = '<h2>Oddelenia</h2>';

    const departmentLists = document.createElement('ul');
    departments.forEach(department => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="department-item">
                <strong>${department.name}</strong>
                <span class="department-id">ID: ${department.id}</span>
            </div>
        `;

        // event listener for every department-item
        li.querySelector('.department-item').addEventListener('click', () => {
            displayDepartmentForm(department);
        });
        departmentLists.appendChild(li);
    });

    sidebar.appendChild(departmentLists);
}

function displayDepartmentForm(department) {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
    <h2>Upraviť oddelenie</h2>
    <form id="departmentForm">
        <div class="form-group">
            <label>Názov:</label>
            <input type="text" id="formName" value="${department.name}" placeholder="Názov">
            <button type="button" id="saveBtn" class="save-btn">Uložiť zmeny</button>
        </div>
    </form>
    `;

    // event listener for the save button
    document.getElementById('saveBtn').addEventListener('click', () => {
        handleSaveDepartment(department.id);
    });
}

async function handleSaveDepartment(departmentId) {
    try {
         // get form values
        const name = document.getElementById('formName').value;

        // update department
        const { error: updateError } = await supabase
            .from('department')
            .update({
                name: name
            })
            .eq('id', departmentId);

        // success message and reload
        alert('Zmeny boli úspešne uložené!');

        if (currentCompanyId) {
            const departments = await loadCompanyDepartments(currentCompanyId);
            displayCompanyDepartments(departments);
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        alert('Neočakávaná chyba: ' + error.message);
    }
}

// init
InitDashboard();