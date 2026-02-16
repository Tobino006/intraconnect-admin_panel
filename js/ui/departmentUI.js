import { loadCompanyDepartments, updateDepartment } from '../services/departmentService.js';

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

        await updateDepartment(departmentId, { name });

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