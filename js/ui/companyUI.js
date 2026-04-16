import { loadCompany, updateCompany } from '../services/companyService.js';
import { FormatDate } from '../utils/dateFormatter.js';

let currentCompanyId = null;
let currentCompany = null;
let pendingLogoFile = null;
let pendingLogoPreviewUrl = null;

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getDisplayLogoUrl(company) {
    if (pendingLogoPreviewUrl) {
        return pendingLogoPreviewUrl;
    }

    if (company.logoUrl && company.logoUrl !== '-') {
        return company.logoUrl;
    }

    return 'assets/logo.svg';
}

function getSafeColorValue(colorTheme) {
    const normalizedColor = colorTheme?.trim().toUpperCase();

    if (/^#([0-9A-F]{6})$/.test(normalizedColor)) {
        return normalizedColor;
    }

    return '#000000';
}

function clearPendingLogoPreview() {
    if (pendingLogoPreviewUrl) {
        URL.revokeObjectURL(pendingLogoPreviewUrl);
        pendingLogoPreviewUrl = null;
    }
}

// Set current company ID
export function setCurrentCompanyIdCompany(companyId) {
    currentCompanyId = companyId;
}

// Event listener for company button
export function CompanyButtonListener() {
    const companyBtn = document.getElementById('btn-company');

    companyBtn.addEventListener('click', async () => {
        try {
            const company = await loadCompany(currentCompanyId);
            displayCompany(company);
        } catch (error) {
            console.error('Error loading company:', error);
            alert('Chyba pri načítaní firmy: ' + error.message);
        }
    });
}

// Display company details in the center without sidebar
export function displayCompany(company) {
    currentCompany = company;
    pendingLogoFile = null;
    clearPendingLogoPreview();

    const displayLogoUrl = escapeHtml(getDisplayLogoUrl(company));
    const companyName = escapeHtml(company.name);
    const companyId = escapeHtml(company.id);
    const createdAt = escapeHtml(FormatDate(company.createdAt));
    const colorTheme = escapeHtml(company.colorTheme);
    const safeColorValue = escapeHtml(getSafeColorValue(company.colorTheme));

    const formSection = document.querySelector('.form-section');
    formSection.innerHTML = `
        <div class="company-view">
            <div class="company-card">
                <input type="file" id="companyLogoInput" accept="image/*" hidden>
                <button type="button" id="companyLogoButton" class="company-logo-button" title="Kliknite pre zmenu loga">
                    <img src="${displayLogoUrl}" alt="Logo firmy" id="companyLogoPreview" class="company-logo-preview">
                    <span>Kliknite pre zmenu loga</span>
                </button>

                <div class="company-field">
                    <label for="companyNameInput">Názov firmy</label>
                    <input type="text" id="companyNameInput" value="${companyName}" autocomplete="off">
                </div>

                <div class="company-info-row">
                    <span class="company-info-label">ID firmy</span>
                    <span class="company-info-value">${companyId}</span>
                </div>

                <div class="company-info-row">
                    <span class="company-info-label">História</span>
                    <span class="company-info-value">Využíva služby IntraConnect od ${createdAt}</span>
                </div>

                <div class="company-field">
                    <label for="companyColorTheme">Color theme</label>
                    <div class="company-color-inputs">
                        <input type="color" id="companyColorPicker" value="${safeColorValue}" title="Vybrať farbu">
                        <input type="text" id="companyColorTheme" value="${colorTheme}" placeholder="#000000" autocomplete="off">
                    </div>
                </div>

                <button type="button" id="saveCompanyBtn" class="save-btn">Uložiť zmeny</button>
            </div>
        </div>
    `;

    setupCompanyViewListeners();
}

function setupCompanyViewListeners() {
    const logoButton = document.getElementById('companyLogoButton');
    const logoInput = document.getElementById('companyLogoInput');
    const colorPicker = document.getElementById('companyColorPicker');
    const colorThemeInput = document.getElementById('companyColorTheme');
    const saveButton = document.getElementById('saveCompanyBtn');

    logoButton.addEventListener('click', () => {
        logoInput.click();
    });

    logoInput.addEventListener('change', (event) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) {
            return;
        }

        pendingLogoFile = selectedFile;
        clearPendingLogoPreview();
        pendingLogoPreviewUrl = URL.createObjectURL(selectedFile);
        document.getElementById('companyLogoPreview').src = pendingLogoPreviewUrl;
    });

    colorPicker.addEventListener('input', () => {
        colorThemeInput.value = colorPicker.value.toUpperCase();
    });

    colorThemeInput.addEventListener('input', () => {
        const normalizedColor = colorThemeInput.value.trim().toUpperCase();

        if (/^#([0-9A-F]{6})$/.test(normalizedColor)) {
            colorPicker.value = normalizedColor;
        }
    });

    saveButton.addEventListener('click', async () => {
        await handleSaveCompany();
    });
}

async function handleSaveCompany() {
    try {
        const name = document.getElementById('companyNameInput').value;
        const colorTheme = document.getElementById('companyColorTheme').value;

        const updatedCompany = await updateCompany(currentCompanyId, {
            name,
            colorTheme,
            logoFile: pendingLogoFile,
            existingLogoUrl: currentCompany.logoUrl
        });

        alert('Údaje o firme boli úspešne uložené.');
        displayCompany(updatedCompany);
    } catch (error) {
        console.error('Error saving company:', error);
        alert('Chyba pri ukladaní firmy: ' + error.message);
    }
}
