import { supabase } from './../config/supabase.js';
import { Notification } from '../models/notification.js';
import { getAdminContext } from './authService.js';

function extractNotificationDepartmentId(notification) {
    const relation = notification.notification_department;

    if (!relation) {
        return null;
    }

    if (Array.isArray(relation)) {
        return relation[0]?.department_id || null;
    }

    return relation.department_id || null;
}

async function resolveNotificationAccessContext(companyId, accessContext = null) {
    if (accessContext?.role) {
        return accessContext;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
        throw new Error('Chyba pri zisťovaní aktuálneho používateľa: ' + authError.message);
    }

    if (!authData?.user) {
        throw new Error('Neoverený používateľ.');
    }

    const adminContext = await getAdminContext(authData.user.id);

    if (adminContext.companyId !== companyId) {
        throw new Error('Prístup zamietnutý.');
    }

    return adminContext;
}

async function assertDepartmentAdminNotificationAccess(notificationId, companyId, departmentId) {
    const { data, error } = await supabase
        .from('notification')
        .select('id, notification_department!inner(department_id)')
        .eq('id', notificationId)
        .eq('company_id', companyId)
        .eq('notification_department.department_id', departmentId)
        .maybeSingle();

    if (error) {
        throw new Error('Chyba pri overení oznamu: ' + error.message);
    }

    if (!data) {
        throw new Error('Department admin má prístup len k oznamom svojho oddelenia.');
    }
}

async function deleteNotificationDepartmentRows(notificationId, requireExistingRows = false) {
    const { count, error } = await supabase
        .from('notification_department')
        .delete({ count: 'exact' })
        .eq('notification_id', notificationId);

    if (error) {
        throw new Error('Chyba pri zmazaní starých oddelení: ' + error.message);
    }

    if (requireExistingRows && count === 0) {
        throw new Error('Staré oddelenie oznamu sa nepodarilo odstrániť. Skontroluj SELECT a DELETE policy pre notification_department.');
    }
}

async function insertNotificationDepartmentRow(notificationId, departmentId) {
    const { error: insertError } = await supabase
        .from('notification_department')
        .insert([{ notification_id: notificationId, department_id: departmentId }]);

    if (!insertError) {
        return;
    }

    throw new Error('Chyba pri novom priradení oddelenia: ' + insertError.message);
}

async function setNotificationDepartment(notificationId, departmentId, requireExistingRows = false) {
    await deleteNotificationDepartmentRows(notificationId, requireExistingRows);
    await insertNotificationDepartmentRow(notificationId, departmentId);
}

// Load all notifications for a company
export async function loadCompanyNotifications(companyId, accessContext = null) {
    const resolvedAccessContext = await resolveNotificationAccessContext(companyId, accessContext);
    const isDepartmentAdmin = resolvedAccessContext.role === 'Department';

    let query = supabase
        .from('notification')
        .select(
            isDepartmentAdmin
                ? '*, notification_department!inner(department_id)'
                : '*, notification_department(department_id)'
        )
        .eq('company_id', companyId)
        .order('published_at', { ascending: false });

    if (isDepartmentAdmin) {
        if (!resolvedAccessContext.departmentId) {
            throw new Error('Department admin nemá priradené oddelenie.');
        }

        query = query.eq('notification_department.department_id', resolvedAccessContext.departmentId);
    }

    const { data, error } = await query;
    
    if (error) {
        console.log('Chyba pri načítaní oznamov: ', error);
        return [];
    }

    // convert to notification object
    return data.map(notification => {
        const departmentId = notification.is_global
            ? null
            : extractNotificationDepartmentId(notification);

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
export async function updateNotification(notificationId, notificationData, companyId, accessContext = null) {
    const resolvedAccessContext = await resolveNotificationAccessContext(companyId, accessContext);
    const isDepartmentAdmin = resolvedAccessContext.role === 'Department';
    const { title, message, isGlobal, departmentId } = notificationData;
    const normalizedTitle = title?.trim();
    const normalizedMessage = message?.trim();
    const normalizedDepartmentId = isDepartmentAdmin
        ? resolvedAccessContext.departmentId
        : departmentId?.trim() || null;
    const effectiveIsGlobal = isDepartmentAdmin ? false : isGlobal;

    if (isDepartmentAdmin) {
        await assertDepartmentAdminNotificationAccess(notificationId, companyId, resolvedAccessContext.departmentId);
    }

    // Validate inputs
    if (!normalizedTitle) {
        throw new Error('Nadpis nesmie byť prázdny!');
    }

    if (!normalizedMessage) {
        throw new Error('Správa nesmie byť prázdna!');
    }

    if (!effectiveIsGlobal && !normalizedDepartmentId) {
        throw new Error('Keď je oznam len pre oddelenie, musíš zadať ID oddelenia!');
    }

    // check if department exists and belongs to company
    if (!effectiveIsGlobal) {
        const departmentExists = await checkIfDepartmentExists(normalizedDepartmentId, companyId);
        if (!departmentExists) {
            throw new Error('Toto oddelenie neexistuje vo Vašej firme!');
        }
    }

    const { data: currentNotification, error: currentNotificationError } = await supabase
        .from('notification')
        .select('is_global')
        .eq('id', notificationId)
        .eq('company_id', companyId)
        .single();

    if (currentNotificationError) {
        throw new Error('Chyba pri načítaní aktuálneho oznamu: ' + currentNotificationError.message);
    }

    if (effectiveIsGlobal) {
        await deleteNotificationDepartmentRows(notificationId, !currentNotification.is_global);
    }

    // 1. update notification table
    const { error: updateError } = await supabase
        .from('notification')
        .update({
            title: normalizedTitle,
            message: normalizedMessage,
            is_global: effectiveIsGlobal,
            updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    
    if (updateError) {
        throw new Error('Chyba pri úprave oznamu: ' + updateError.message);
    }

    if (effectiveIsGlobal) {
        return;
    }

    // 2. keep one current department target without creating duplicate rows
    await setNotificationDepartment(notificationId, normalizedDepartmentId, !currentNotification.is_global);
}

export async function createNotification(notificationData, companyId, accessContext = null) {
    const resolvedAccessContext = await resolveNotificationAccessContext(companyId, accessContext);
    const isDepartmentAdmin = resolvedAccessContext.role === 'Department';
    const { title, message, isGlobal, departmentId } = notificationData;
    const normalizedTitle = title?.trim();
    const normalizedMessage = message?.trim();
    const normalizedDepartmentId = isDepartmentAdmin
        ? resolvedAccessContext.departmentId
        : departmentId?.trim() || null;
    const effectiveIsGlobal = isDepartmentAdmin ? false : isGlobal;
    const now = new Date().toISOString();

    if (!normalizedTitle) throw new Error('Nadpis nesmie byť prázdny!');
    if (!normalizedMessage) throw new Error('Správa nesmie byť prázdna!');
    if (!effectiveIsGlobal && !normalizedDepartmentId) {
        throw new Error('Keď je oznam len pre oddelenie, musíš zadať ID oddelenia!');
    }

    if (!effectiveIsGlobal) {
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
            is_global: effectiveIsGlobal,
            created_by: authData?.user?.id || null,
            published_at: now,
            updated_at: now
        }])
        .select('id')
        .single();

    if (insertError) throw new Error('Chyba pri vytváraní oznamu: ' + insertError.message);

    if (!effectiveIsGlobal) {
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

export async function deleteNotification(notificationId, companyId, accessContext = null) {
    const resolvedAccessContext = await resolveNotificationAccessContext(companyId, accessContext);

    if (resolvedAccessContext.role === 'Department') {
        await assertDepartmentAdminNotificationAccess(notificationId, companyId, resolvedAccessContext.departmentId);
    }

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
