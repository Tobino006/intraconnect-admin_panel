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

// Logout user
export async function logoutUser() {
    await supabase.auth.signOut();
    window.location.replace('index.html');
}