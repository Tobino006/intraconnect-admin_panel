import { supabase } from './../config/supabase.js';
import { User } from '../models/user.js';

// Load all users for a company
export async function loadCompanyUsers(companyId) {
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
        new User(
            user.id, 
            user.company_id, 
            user.position, 
            user.phone, 
            user.name, 
            user.department_id, 
            user.avatar_url,
            user.email
        )
    );
}

// Create a new user
export async function createNewUser(userData, companyId) {
    const { name, email, password, position, departmentId } = userData;
    const normalizedEmail = email?.trim();
    const normalizedDepartmentId = departmentId?.trim() || null;

    // create auth account in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
            emailRedirectTo: 'https://tobino006.github.io/intraconnect-admin_panel'
        }
    });

    if (authError) {
        throw new Error('Chyba pri vytváraní konta: ' + authError.message);
    }

    const newUserId = authData.user?.id;

    // insert new user to 'user' table
    const { data: insertData, error: insertError } = await supabase
        .from('user')
        .insert([{
            id: newUserId,
            company_id: companyId,
            name: name,
            position: position || null,
            phone: null,
            department_id: normalizedDepartmentId,
            avatar_url: null
        }]);

    if (insertError) {
        console.error('Insert Error:', insertError);
        throw new Error('Chyba pri vložení do tabuľky: ' + insertError.message);
    }

    return { userId: newUserId, email: normalizedEmail, password };
}

// Update user details
export async function updateUser(userId, userData) {
    const { name, position, departmentId } = userData;
    const normalizedDepartmentId = departmentId?.trim() || null;

    const { error } = await supabase
        .from('user')
        .update({
            name: name,
            position: position || null,
            department_id: normalizedDepartmentId
        })
        .eq('id', userId);
    
    if (error) {
        throw new Error('Chyba pri ukladaní: ' + error.message);
    }
}

// Delete user by ID
export async function deleteUser(userId, companyId) {
    const { data, error } = await supabase.functions.invoke("delete-user", {
        body: {
            userId: userId,
            companyId: companyId
        }
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}
