import {
    loadCompanyDepartments,
    updateDepartment,
    createDepartment,
    deleteDepartment
} from '../services/departmentService.js';

let currentCompanyId = null;

// Set current company ID
export function setCurrentCompanyIdDepartments(companyId) {
    currentCompanyId = companyId;
}

// Event listener for department's button
export function CompanyDepartmentsButtonListener() {
    const departmentsBtn = document.getElementById('btn-departments');

    departmentsBtn.addEventListener('click', async () => {
        const departments = await loadCompanyDepartments(currentCompanyId);
        displayCompanyDepartments(departments);
    });
}

// Display all departments for company
export async function displayCompanyDepartments(departments) {
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
            <h2>Oddelenia</h2>
            <button class="btn-add-user" id="btn-add-department" title="Pridať nové oddelenie">+</button>
        </div>
    `;

    document.getElementById('btn-add-department').addEventListener('click', () => {
        displayAddDepartmentForm();
    });

    const departmentLists = document.createElement('ul');
    departments.forEach(department => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="department-item">
                <strong>${department.name}</strong>
                <span class="department-id">ID: ${department.id}</span>
                <button class="btn-delete-user" data-department-id="${department.id}" title="Odstrániť oddelenie">Odstrániť</button>
            </div>
        `;

        li.querySelector('.btn-delete-user').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteDepartment(department.id, department.name);
        });

        // event listener for every department-item
        li.querySelector('.department-item').addEventListener('click', () => {
            displayDepartmentForm(department);
        });
        departmentLists.appendChild(li);
    });

    sidebar.appendChild(departmentLists);
}

// Display form for adding a new department
function displayAddDepartmentForm() {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
    <h2>Pridať nové oddelenie</h2>
    <form id="newDepartmentForm">
        <div class="form-group">
            <label>Názov:</label>
            <input type="text" id="newDepartmentName" placeholder="Názov oddelenia" autocomplete="off" required>
        </div>

        <button type="button" id="saveNewDepartmentBtn" class="save-btn">Vytvoriť oddelenie</button>
    </form>
    `;

    document.getElementById('saveNewDepartmentBtn').addEventListener('click', () => {
        handleCreateDepartment();
    });
}

// Display form for editing department
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

// Handle saving department changes
async function handleSaveDepartment(departmentId) {
    try {
        // get form values
        const name = document.getElementById('formName').value;

        await updateDepartment(departmentId, { name }, currentCompanyId);

        // success message and reload
        alert('Zmeny boli úspešne uložené!');

        if (currentCompanyId) {
            const departments = await loadCompanyDepartments(currentCompanyId);
            await displayCompanyDepartments(departments);
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        alert('Chyba: ' + error.message);
    }
}

// Handle creating a new department
async function handleCreateDepartment() {
    try {
        const name = document.getElementById('newDepartmentName').value;

        if (!name.trim()) {
            alert('Zadajte názov oddelenia!');
            return;
        }

        await createDepartment({ name }, currentCompanyId);

        alert('Oddelenie bolo úspešne vytvorené!');

        const departments = await loadCompanyDepartments(currentCompanyId);
        await displayCompanyDepartments(departments);
    } catch (error) {
        console.error('Error creating department:', error);
        alert('Chyba pri vytváraní oddelenia: ' + error.message);
    }
}

// Handle deleting department
async function handleDeleteDepartment(departmentId, departmentName) {
    const confirmed = confirm(`Naozaj si prajete odstrániť oddelenie "${departmentName}"?\n\nTáto akcia je nemenná.`);

    if (!confirmed) {
        console.log('Akcia zrušená.');
        return;
    }

    try {
        await deleteDepartment(departmentId, currentCompanyId);
        alert(`Oddelenie "${departmentName}" bolo úspešne odstránené.`);

        const departments = await loadCompanyDepartments(currentCompanyId);
        await displayCompanyDepartments(departments);
    } catch (error) {
        console.error('Error deleting department:', error);
        alert('Chyba pri odstraňovaní oddelenia: ' + error.message);
    }
}
