import { supabase } from './../config/supabase.js';
import { Notification } from '../models/notification.js';

// Load all notifications for a company
export async function loadCompanyNotifications(companyId) {
    const { data, error } = await supabase
        .from('notification')
        .select('*, notification_department(department_id)')
        .eq('company_id', companyId)
        .order('published_at', { ascending: false });
    
    if (error) {
        console.log('Chyba pri načítaní oznamov: ', error);
        return [];
    }

    // convert to notification object
    return data.map(notification => {
        // extract department id if it exists (for non-global notifications)
        let departmentId = null;
        if (!notification.is_global && notification.notification_department && notification.notification_department.length > 0) {
            departmentId = notification.notification_department[0].department_id;
        }
        return new Notification(
            notification.id, 
            notification.company_id, 
            notification.title, 
            notification.message, 
            notification.published_at, 
            notification.updated_at, 
            notification.created_by,
            notification.is_global,
            departmentId
        );
    });
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

    return true; // department exists and belongs to company
}

// Update notification and its department association
export async function updateNotification(notificationId, notificationData, companyId) {
    const { title, message, isGlobal, departmentId } = notificationData;
    const normalizedTitle = title?.trim();
    const normalizedMessage = message?.trim();
    const normalizedDepartmentId = departmentId?.trim() || null;

    // Validate inputs
    if (!normalizedTitle) {
        throw new Error('Nadpis nesmie byť prázdny!');
    }

    if (!normalizedMessage) {
        throw new Error('Správa nesmie byť prázdna!');
    }

    if (!isGlobal && !normalizedDepartmentId) {
        throw new Error('Keď je oznam len pre oddelenie, musíš zadať ID oddelenia!');
    }

    // check if department exists and belongs to company
    if (!isGlobal) {
        const departmentExists = await checkIfDepartmentExists(normalizedDepartmentId, companyId);
        if (!departmentExists) {
            throw new Error('Toto oddelenie neexistuje vo Vašej firme!');
        }
    }

    // 1. update notification table
    const { error: updateError } = await supabase
        .from('notification')
        .update({
            title: normalizedTitle,
            message: normalizedMessage,
            is_global: isGlobal,
            updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    
    if (updateError) {
        throw new Error('Chyba pri úprave oznamu: ' + updateError.message);
    }

    // 2. handle notification_department relationship changes
    const { data: existingDept, error: fetchError } = await supabase
        .from('notification_department')
        .select('*')
        .eq('notification_id', notificationId);
        
    if (fetchError) {
        throw new Error('Chyba pri načítaní údajov: ' + fetchError.message);
    }

    // if notification is now global
    if (isGlobal) {
        // delete all department associations
        if (existingDept && existingDept.length > 0) {
            const { error: deleteError } = await supabase
                .from('notification_department')
                .delete()
                .eq('notification_id', notificationId);

            if (deleteError) {
                throw new Error('Chyba pri zmazaní oddelení: ' + deleteError.message);
            }
        }
    } else {
        // if notification is for department
        if (existingDept && existingDept.length > 0) {
            // update existing department association
            const { error: updateDeptError } = await supabase
                .from('notification_department')
                .update({ department_id: normalizedDepartmentId })
                .eq('notification_id', notificationId);

            if (updateDeptError) {
                throw new Error('Chyba pri úprave oddelenia: ' + updateDeptError.message);
            }
        } else {
            // insert new department association
            const { error: insertError } = await supabase
                .from('notification_department')
                .insert([{ notification_id: notificationId, department_id: normalizedDepartmentId }]);

            if (insertError) {
                throw new Error('Chyba pri novom priradení oddelenia: ' + insertError.message);
            }
        }
    }
}

export async function createNotification(notificationData, companyId) {
    const { title, message, isGlobal, departmentId } = notificationData;
    const normalizedTitle = title?.trim();
    const normalizedMessage = message?.trim();
    const normalizedDepartmentId = departmentId?.trim() || null;
    const now = new Date().toISOString();

    if (!normalizedTitle) throw new Error('Nadpis nesmie byť prázdny!');
    if (!normalizedMessage) throw new Error('Správa nesmie byť prázdna!');
    if (!isGlobal && !normalizedDepartmentId) {
        throw new Error('Keď je oznam len pre oddelenie, musíš zadať ID oddelenia!');
    }

    if (!isGlobal) {
        const departmentExists = await checkIfDepartmentExists(normalizedDepartmentId, companyId);
        if (!departmentExists) throw new Error('Toto oddelenie neexistuje vo Vašej firme!');
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
        throw new Error('Chyba pri zisťovaní aktuálneho používateľa: ' + authError.message);
    }

    const { data: insertedNotification, error: insertError } = await supabase
        .from('notification')
        .insert([{
            company_id: companyId,
            title: normalizedTitle,
            message: normalizedMessage,
            is_global: isGlobal,
            created_by: authData?.user?.id || null,
            published_at: now,
            updated_at: now
        }])
        .select('id')
        .single();

    if (insertError) throw new Error('Chyba pri vytváraní oznamu: ' + insertError.message);

    if (!isGlobal) {
        const { error: deptInsertError } = await supabase
            .from('notification_department')
            .insert([{
                notification_id: insertedNotification.id,
                department_id: normalizedDepartmentId
            }]);

        if (deptInsertError) throw new Error('Chyba pri priradení oddelenia: ' + deptInsertError.message);
    }

    return insertedNotification;
}

export async function deleteNotification(notificationId, companyId) {
    const { error: deptDeleteError } = await supabase
        .from('notification_department')
        .delete()
        .eq('notification_id', notificationId);

    if (deptDeleteError) {
        throw new Error('Chyba pri mazaní väzby na oddelenie: ' + deptDeleteError.message);
    }

    const { error: notificationDeleteError } = await supabase
        .from('notification')
        .delete()
        .eq('id', notificationId)
        .eq('company_id', companyId);

    if (notificationDeleteError) {
        throw new Error('Chyba pri mazaní oznamu: ' + notificationDeleteError.message);
    }
}
