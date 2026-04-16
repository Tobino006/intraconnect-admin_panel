// Company class for data
export class Company {
    constructor(id, name, createdAt, logoUrl, colorTheme) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt || '-';
        this.logoUrl = logoUrl || '-';
        this.colorTheme = colorTheme || '#000000';
    }
}
