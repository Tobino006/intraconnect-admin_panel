import { supabase } from './config/supabase.js'

// global variable to store companyId
let currentCompanyId = null;

// entry point
async function initDashboard() {
    try {
        const user = await checkAuth();
        const role = await checkAdminRole(user);

        // Load users for admin's company
        const { data } = await supabase
            .from('admin')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
        
        if (data) {
            currentCompanyId = data.company_id;
            const users = await loadCompanyUsers(data.company_id);
            displayUsers(users);
        }

        UserButtonListener(role, user.id);
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

// function for loading users in admin's firm
async function loadCompanyUsers(companyId) {
    const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('company_id', companyId);

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
function displayUsers(users) {
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
    sidebar.innerHTML = '<h2>Používatelia</h2>';

    const userList = document.createElement('ul');
    users.forEach(user => {
        const li = document.createElement('li');
        // if user does not have profile picture set, show default profile picture instead
        const avatarSrc = (user.avatarUrl && user.avatarUrl !== '-') ? user.avatarUrl : 'assets/avatar_default.svg';
        li.innerHTML = `
            <div class="user-item">
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
    });

    sidebar.appendChild(userList);
}

// event listener for user button
function UserButtonListener(role, user_id) {
    const userBtn = document.getElementById('btn-users');

    userBtn.addEventListener('click', async () => {
        // load company_id from admin table
        const { data } = await supabase
            .from('admin')
            .select('company_id')
            .eq('user_id', user_id)
            .single();
        
        if (data) {
            const users = await loadCompanyUsers(data.company_id);
            displayUsers(users);
        }
    });
}

// show formular after clicking on a user
function displayUserForm(user) {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
    <h2>Upraviť používateľa</h2>
    <form id="userform">
        <div class="form-group">
            <label>Meno:</label>
            <input type="text" id="formName" value="${user.name}" placeholder="Meno">
        </div>

        <div class="form-group">
                <label>Pozícia:</label>
                <input type="text" id="formPosition" value="${user.position}" placeholder="Pozícia">
        </div>
        
        <div class="form-group">
                <label>Telefón:</label>
                <input type="text" id="formPhone" value="${user.phone}" placeholder="Telefón">
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
    const position = document.getElementById('formPosition').value;
    const phone = document.getElementById('formPhone').value;
    const departmentId = document.getElementById('formDepartment').value;

    const { error } = await supabase
        .from('user')
        .update({
            name: name,
            position: position,
            phone: phone,
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
            displayUsers(users);
        }   
    }
}

// init
initDashboard();