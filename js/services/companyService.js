import { supabase } from './../config/supabase.js';
import { Company } from '../models/company.js';

const COMPANY_LOGO_BUCKET = 'company_logos';

function mapCompany(company) {
    return new Company(
        company.id,
        company.name,
        company.created_at,
        company.logo_url,
        company.color_theme
    );
}

function normalizeCompanyName(name) {
    const normalizedName = name?.trim();

    if (!normalizedName) {
        throw new Error('Názov firmy nesmie byť prázdny!');
    }

    return normalizedName;
}

function normalizeColorTheme(colorTheme) {
    const normalizedColor = colorTheme?.trim().toUpperCase();

    if (!normalizedColor) {
        throw new Error('HEX farba nesmie byť prázdna!');
    }

    if (!/^#([0-9A-F]{6})$/.test(normalizedColor)) {
        throw new Error('Farba musí byť vo formáte HEX, napr. #1A2B3C.');
    }

    return normalizedColor;
}

function getFileExtension(fileName) {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : 'png';
}

function getCompanyLogoFilePath(companyId, logoFile) {
    const fileExtension = getFileExtension(logoFile.name || 'company-logo.png');
    const uniqueSuffix = globalThis.crypto?.randomUUID?.() || Date.now();
    return `${companyId}/logo-${uniqueSuffix}.${fileExtension}`;
}

function extractStoragePathFromLogoUrl(logoUrl) {
    if (!logoUrl || logoUrl === '-') {
        return null;
    }

    try {
        const parsedUrl = new URL(logoUrl);
        const marker = `/${COMPANY_LOGO_BUCKET}/`;
        const pathIndex = parsedUrl.pathname.indexOf(marker);

        if (pathIndex === -1) {
            return null;
        }

        return decodeURIComponent(parsedUrl.pathname.slice(pathIndex + marker.length));
    } catch {
        return null;
    }
}

async function uploadCompanyLogo(logoFile, companyId) {
    if (!logoFile.type?.startsWith('image/')) {
        throw new Error('Logo musí byť obrázok.');
    }

    const filePath = getCompanyLogoFilePath(companyId, logoFile);

    const { error: uploadError } = await supabase
        .storage
        .from(COMPANY_LOGO_BUCKET)
        .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        if (uploadError.message?.includes('row-level security policy')) {
            throw new Error('Storage bucket nepovolil uloženie loga. Skontrolujte Supabase policy pre insert/update v bucketi company_logos.');
        }

        throw new Error('Chyba pri nahrávaní loga: ' + uploadError.message);
    }

    const { data } = supabase
        .storage
        .from(COMPANY_LOGO_BUCKET)
        .getPublicUrl(filePath);

    return {
        filePath,
        publicUrl: data.publicUrl
    };
}

async function deleteCompanyLogoByPath(filePath) {
    if (!filePath) {
        return;
    }

    const { error } = await supabase
        .storage
        .from(COMPANY_LOGO_BUCKET)
        .remove([filePath]);

    if (error) {
        console.error('Chyba pri mazaní starého loga:', error);
    }
}

// Load company details
export async function loadCompany(companyId) {
    const { data, error } = await supabase
        .from('company')
        .select('*')
        .eq('id', companyId)
        .single();

    if (error) {
        throw new Error('Chyba pri načítaní firmy: ' + error.message);
    }

    return mapCompany(data);
}

// Update company details and optionally replace logo
export async function updateCompany(companyId, companyData) {
    const normalizedName = normalizeCompanyName(companyData.name);
    const normalizedColorTheme = normalizeColorTheme(companyData.colorTheme);
    const previousLogoPath = extractStoragePathFromLogoUrl(companyData.existingLogoUrl);

    let uploadedLogo = null;

    if (companyData.logoFile) {
        uploadedLogo = await uploadCompanyLogo(companyData.logoFile, companyId);
    }

    const payload = {
        name: normalizedName,
        color_theme: normalizedColorTheme
    };

    if (uploadedLogo) {
        payload.logo_url = uploadedLogo.publicUrl;
    }

    const { data, error } = await supabase
        .from('company')
        .update(payload)
        .eq('id', companyId)
        .select('*')
        .single();

    if (error) {
        if (uploadedLogo) {
            await deleteCompanyLogoByPath(uploadedLogo.filePath);
        }

        throw new Error('Chyba pri ukladaní firmy: ' + error.message);
    }

    if (uploadedLogo && previousLogoPath && previousLogoPath !== uploadedLogo.filePath) {
        await deleteCompanyLogoByPath(previousLogoPath);
    }

    return mapCompany(data);
}
