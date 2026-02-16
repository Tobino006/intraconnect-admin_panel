import { supabase } from './../config/supabase.js';
import { Department } from '../models/department.js';

// Load all departments for a company
export async function loadCompanyDepartments(companyId) {
    const { data, error } = await supabase
        .from('department')
        .select('*')
        .eq('company_id', companyId);
    
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
export async function updateDepartment(departmentId, departmentData) {
    const { name } = departmentData;

    const { error: updateError } = await supabase
        .from('department')
        .update({
            name: name
        })
        .eq('id', departmentId);

    if (updateError) {
        throw new Error('Chyba pri úprave oddelenia: ' + updateError.message);
    }
}