import { supabase } from './../config/supabase.js';
import { Notification } from '../models/Notification.js';

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

    // Validate inputs
    if (!title.trim()) {
        throw new Error('Nadpis nesmie byť prázdny!');
    }

    if (!isGlobal && !departmentId) {
        throw new Error('Keď je oznam len pre oddelenie, musíš zadať ID oddelenia!');
    }

    // check if department exists and belongs to company
    if (!isGlobal) {
        const departmentExists = await checkIfDepartmentExists(departmentId, companyId);
        if (!departmentExists) {
            throw new Error('Toto oddelenie neexistuje vo Vašej firme!');
        }
    }

    // 1. update notification table
    const { error: updateError } = await supabase
        .from('notification')
        .update({
            title: title,
            message: message,
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
                .update({ department_id: departmentId })
                .eq('notification_id', notificationId);

            if (updateDeptError) {
                throw new Error('Chyba pri úprave oddelenia: ' + updateDeptError.message);
            }
        } else {
            // insert new department association
            const { error: insertError } = await supabase
                .from('notification_department')
                .insert([{ notification_id: notificationId, department_id: departmentId }]);

            if (insertError) {
                throw new Error('Chyba pri novom priradení oddelenia: ' + insertError.message);
            }
        }
    }
}