import { supabase } from './../config/supabase.js';
import { Department } from '../models/department.js';

function normalizeDepartmentName(name) {
    const normalizedName = name?.trim();

    if (!normalizedName) {
        throw new Error('Názov oddelenia nesmie byť prázdny!');
    }

    return normalizedName;
}

// Load all departments for a company
export async function loadCompanyDepartments(companyId) {
    const { data, error } = await supabase
        .from('department')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
    
    if (error) {
        console.log('Chyba pri načítaní oddelení: ', error);
        return [];
    }

    // convert to department object
    return data.map(department => {
        return new Department(
            department.id,
            department.company_id,
            department.name
        );
    });
}

// Update department
export async function updateDepartment(departmentId, departmentData, companyId) {
    const normalizedName = normalizeDepartmentName(departmentData.name);

    const { error: updateError } = await supabase
        .from('department')
        .update({
            name: normalizedName
        })
        .eq('id', departmentId)
        .eq('company_id', companyId);

    if (updateError) {
        throw new Error('Chyba pri úprave oddelenia: ' + updateError.message);
    }
}

// Create department for the admin's company
export async function createDepartment(departmentData, companyId) {
    const normalizedName = normalizeDepartmentName(departmentData.name);

    const { data, error } = await supabase
        .from('department')
        .insert([{
            company_id: companyId,
            name: normalizedName
        }])
        .select('*')
        .single();

    if (error) {
        throw new Error('Chyba pri vytváraní oddelenia: ' + error.message);
    }

    return new Department(data.id, data.company_id, data.name);
}

// Delete department after clearing safe references
export async function deleteDepartment(departmentId, companyId) {
    const { data: departmentAdmins, error: departmentAdminsError } = await supabase
        .from('department_admin')
        .select('admin_user_id')
        .eq('department_id', departmentId)
        .limit(1);

    if (departmentAdminsError) {
        throw new Error('Chyba pri kontrole správcov oddelenia: ' + departmentAdminsError.message);
    }

    if (departmentAdmins && departmentAdmins.length > 0) {
        throw new Error('Oddelenie nie je možné odstrániť, pretože je priradené department správcovi.');
    }

    const { data: linkedNotifications, error: linkedNotificationsError } = await supabase
        .from('notification_department')
        .select('notification_id')
        .eq('department_id', departmentId)
        .limit(1);

    if (linkedNotificationsError) {
        throw new Error('Chyba pri kontrole oznamov oddelenia: ' + linkedNotificationsError.message);
    }

    if (linkedNotifications && linkedNotifications.length > 0) {
        throw new Error('Oddelenie nie je možné odstrániť, pretože je použité v ozname.');
    }

    const { error: clearUsersError } = await supabase
        .from('user')
        .update({ department_id: null })
        .eq('company_id', companyId)
        .eq('department_id', departmentId);

    if (clearUsersError) {
        throw new Error('Chyba pri odpájaní používateľov od oddelenia: ' + clearUsersError.message);
    }

    const { error: deleteError } = await supabase
        .from('department')
        .delete()
        .eq('id', departmentId)
        .eq('company_id', companyId);

    if (deleteError) {
        throw new Error('Chyba pri mazaní oddelenia: ' + deleteError.message);
    }
}
