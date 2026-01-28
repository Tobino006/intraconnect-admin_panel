import { supabase } from './config/supabase.js'

// entry point
async function initDashboard() {
    try {
        const user = await checkAuth();
        const role = await checkAdminRole(user);

        logout();
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
function logout() {
    const logoutBtn = document.getElementById('logoutBtn');

    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('index.html');
    })
}

// init
initDashboard();