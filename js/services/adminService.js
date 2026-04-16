import { supabase } from './../config/supabase.js';
import { User } from '../models/user.js';
import { createNewUser, deleteUser } from './userService.js';

// Load all admins for a company
export async function loadCompanyAdmins(companyId) {
    const { data: admins, error: adminsError } = await supabase
        .from('admin')
        .select('user_id, company_id, assigned_at, role')
        .eq('company_id', companyId)
        .order('assigned_at', { ascending: false });

    if (adminsError) {
        console.log('Error loading admins: ', adminsError);
        return [];
    }

    if (!admins || admins.length === 0) {
        return [];
    }

    const adminUserIds = admins.map(admin => admin.user_id);

    const { data: users, error: usersError } = await supabase
        .from('user')
        .select('*')
        .in('id', adminUserIds)
        .eq('company_id', companyId);

    if (usersError) {
        console.log('Error loading admin users: ', usersError);
        return [];
    }

    const { data: departmentAdmins, error: departmentAdminsError } = await supabase
        .from('department_admin')
        .select('admin_user_id, department_id')
        .in('admin_user_id', adminUserIds);

    if (departmentAdminsError) {
        console.log('Error loading department admin relations: ', departmentAdminsError);
        return [];
    }

    const safeUsers = users || [];
    const safeDepartmentAdmins = departmentAdmins || [];

    const userById = new Map(safeUsers.map(user => [user.id, user]));
    const departmentIdByAdminUserId = new Map();

    safeDepartmentAdmins.forEach(departmentAdmin => {
        departmentIdByAdminUserId.set(departmentAdmin.admin_user_id, departmentAdmin.department_id);
    });

    return admins
        .map(admin => {
            const user = userById.get(admin.user_id);

            if (!user) {
                return null;
            }

            const mappedUser = new User(
                user.id,
                user.company_id,
                user.position,
                user.phone,
                user.name,
                user.department_id,
                user.avatar_url,
                user.email
            );

            return {
                ...mappedUser,
                role: admin.role,
                assignedAt: admin.assigned_at,
                adminDepartmentId: departmentIdByAdminUserId.get(admin.user_id) || null
            };
        })
        .filter(Boolean);
}

// Check if department exists in company
export async function checkIfDepartmentExists(departmentId, companyId) {
    const { data, error } = await supabase
        .from('department')
        .select('id')
        .eq('id', departmentId)
        .eq('company_id', companyId)
        .single();

    if (error || !data) {
        return false;
    }

    return true;
}

// Create new admin (creates user + admin role rows)
export async function createNewAdmin(adminData, companyId) {
    const { name, email, password, position, departmentId, role } = adminData;

    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim();
    const normalizedPassword = password?.trim();
    const normalizedPosition = position?.trim() || null;
    const normalizedDepartmentId = departmentId?.trim() || null;

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
        throw new Error('Vyplňte všetky povinné polia!');
    }

    if (role !== 'Company' && role !== 'Department') {
        throw new Error('Vyberte rolu správcu.');
    }

    if (role === 'Department' && !normalizedDepartmentId) {
        throw new Error('Pre Department rolu musíš zadať ID oddelenia.');
    }

    if (role === 'Department') {
        const departmentExists = await checkIfDepartmentExists(normalizedDepartmentId, companyId);
        if (!departmentExists) {
            throw new Error('Toto oddelenie neexistuje vo Vašej firme!');
        }
    }

    const createdUser = await createNewUser(
        {
            name: normalizedName,
            email: normalizedEmail,
            password: normalizedPassword,
            position: normalizedPosition,
            departmentId: normalizedDepartmentId
        },
        companyId
    );

    try {
        const { error: adminInsertError } = await supabase
            .from('admin')
            .insert([{
                user_id: createdUser.userId,
                company_id: companyId,
                assigned_at: new Date().toISOString(),
                role: role
            }]);

        if (adminInsertError) {
            throw new Error('Chyba pri vytváraní admin roly: ' + adminInsertError.message);
        }

        if (role === 'Company') {
            const { error: companyAdminInsertError } = await supabase
                .from('company_admin')
                .insert([{
                    admin_user_id: createdUser.userId,
                    company_id: companyId
                }]);

            if (companyAdminInsertError) {
                throw new Error('Chyba pri vytváraní Company admin väzby: ' + companyAdminInsertError.message);
            }
        } else {
            const { error: departmentAdminInsertError } = await supabase
                .from('department_admin')
                .insert([{
                    admin_user_id: createdUser.userId,
                    department_id: normalizedDepartmentId
                }]);

            if (departmentAdminInsertError) {
                throw new Error('Chyba pri vytváraní Department admin väzby: ' + departmentAdminInsertError.message);
            }
        }
    } catch (error) {
        // rollback created user if admin rows fail
        try {
            await deleteUser(createdUser.userId, companyId);
        } catch (rollbackError) {
            console.error('Rollback failed after admin creation error:', rollbackError);
        }

        throw error;
    }

    return createdUser;
}

// Update admin details and admin role rows
export async function updateAdmin(adminUserId, adminData, companyId) {
    const { name, position, departmentId, role } = adminData;

    const normalizedName = name?.trim();
    const normalizedPosition = position?.trim() || null;
    const normalizedDepartmentId = departmentId?.trim() || null;

    if (!normalizedName) {
        throw new Error('Meno nesmie byť prázdne!');
    }

    if (role !== 'Company' && role !== 'Department') {
        throw new Error('Vyberte rolu správcu.');
    }

    if (role === 'Department' && !normalizedDepartmentId) {
        throw new Error('Pre Department rolu musíš zadať ID oddelenia.');
    }

    if (role === 'Department') {
        const departmentExists = await checkIfDepartmentExists(normalizedDepartmentId, companyId);
        if (!departmentExists) {
            throw new Error('Toto oddelenie neexistuje vo Vašej firme!');
        }
    }

    const { error: userUpdateError } = await supabase
        .from('user')
        .update({
            name: normalizedName,
            position: normalizedPosition,
            department_id: normalizedDepartmentId
        })
        .eq('id', adminUserId)
        .eq('company_id', companyId);

    if (userUpdateError) {
        throw new Error('Chyba pri ukladaní používateľa: ' + userUpdateError.message);
    }

    const { error: adminUpdateError } = await supabase
        .from('admin')
        .update({
            role: role
        })
        .eq('user_id', adminUserId)
        .eq('company_id', companyId);

    if (adminUpdateError) {
        throw new Error('Chyba pri ukladaní admin roly: ' + adminUpdateError.message);
    }

    if (role === 'Company') {
        const { error: deleteDepartmentAdminError } = await supabase
            .from('department_admin')
            .delete()
            .eq('admin_user_id', adminUserId);

        if (deleteDepartmentAdminError) {
            throw new Error('Chyba pri mazaní Department admin väzby: ' + deleteDepartmentAdminError.message);
        }

        const { data: existingCompanyAdmin, error: companyAdminFetchError } = await supabase
            .from('company_admin')
            .select('admin_user_id')
            .eq('admin_user_id', adminUserId)
            .eq('company_id', companyId);

        if (companyAdminFetchError) {
            throw new Error('Chyba pri načítaní Company admin väzby: ' + companyAdminFetchError.message);
        }

        if (!existingCompanyAdmin || existingCompanyAdmin.length === 0) {
            const { error: companyAdminInsertError } = await supabase
                .from('company_admin')
                .insert([{
                    admin_user_id: adminUserId,
                    company_id: companyId
                }]);

            if (companyAdminInsertError) {
                throw new Error('Chyba pri vytváraní Company admin väzby: ' + companyAdminInsertError.message);
            }
        }
    } else {
        const { error: deleteCompanyAdminError } = await supabase
            .from('company_admin')
            .delete()
            .eq('admin_user_id', adminUserId)
            .eq('company_id', companyId);

        if (deleteCompanyAdminError) {
            throw new Error('Chyba pri mazaní Company admin väzby: ' + deleteCompanyAdminError.message);
        }

        const { data: existingDepartmentAdmin, error: departmentAdminFetchError } = await supabase
            .from('department_admin')
            .select('admin_user_id')
            .eq('admin_user_id', adminUserId);

        if (departmentAdminFetchError) {
            throw new Error('Chyba pri načítaní Department admin väzby: ' + departmentAdminFetchError.message);
        }

        if (!existingDepartmentAdmin || existingDepartmentAdmin.length === 0) {
            const { error: departmentAdminInsertError } = await supabase
                .from('department_admin')
                .insert([{
                    admin_user_id: adminUserId,
                    department_id: normalizedDepartmentId
                }]);

            if (departmentAdminInsertError) {
                throw new Error('Chyba pri vytváraní Department admin väzby: ' + departmentAdminInsertError.message);
            }
        } else {
            const { error: departmentAdminUpdateError } = await supabase
                .from('department_admin')
                .update({
                    department_id: normalizedDepartmentId
                })
                .eq('admin_user_id', adminUserId);

            if (departmentAdminUpdateError) {
                throw new Error('Chyba pri update Department admin väzby: ' + departmentAdminUpdateError.message);
            }
        }
    }
}

// Delete admin (remove admin rows + delete user account)
export async function deleteAdmin(adminUserId, companyId) {
    const { error: companyAdminDeleteError } = await supabase
        .from('company_admin')
        .delete()
        .eq('admin_user_id', adminUserId)
        .eq('company_id', companyId);

    if (companyAdminDeleteError) {
        throw new Error('Chyba pri mazaní Company admin väzby: ' + companyAdminDeleteError.message);
    }

    const { error: departmentAdminDeleteError } = await supabase
        .from('department_admin')
        .delete()
        .eq('admin_user_id', adminUserId);

    if (departmentAdminDeleteError) {
        throw new Error('Chyba pri mazaní Department admin väzby: ' + departmentAdminDeleteError.message);
    }

    const { error: adminDeleteError } = await supabase
        .from('admin')
        .delete()
        .eq('user_id', adminUserId)
        .eq('company_id', companyId);

    if (adminDeleteError) {
        throw new Error('Chyba pri mazaní admin záznamu: ' + adminDeleteError.message);
    }

    await deleteUser(adminUserId, companyId);
}