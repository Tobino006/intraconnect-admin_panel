import { supabase } from './../config/supabase.js';

// Check if user is authenticated
export async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.replace('index.html');
        throw new Error('Neoverený používateľ.');
    }

    return user;
}

// Check if user has admin role
export async function checkAdminRole(user) {
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

// Get company ID for admin
export async function getAdminCompanyId(userId) {
    const { data } = await supabase
        .from('admin')
        .select('company_id')
        .eq('user_id', userId)
        .single();
    
    return data?.company_id || null;
}

// Get role, company and optional department scope for current admin
export async function getAdminContext(userId) {
    const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('company_id, role')
        .eq('user_id', userId)
        .single();

    if (adminError || !adminData) {
        throw new Error('Prístup zamietnutý.');
    }

    let departmentId = null;

    if (adminData.role === 'Department') {
        const { data: departmentAdmin, error: departmentError } = await supabase
            .from('department_admin')
            .select('department_id')
            .eq('admin_user_id', userId)
            .single();

        if (departmentError || !departmentAdmin?.department_id) {
            throw new Error('Department admin nemá priradené oddelenie.');
        }

        departmentId = departmentAdmin.department_id;
    }

    return {
        companyId: adminData.company_id,
        role: adminData.role,
        departmentId
    };
}

// Logout user
export async function logoutUser() {
    await supabase.auth.signOut();
    window.location.replace('index.html');
}
