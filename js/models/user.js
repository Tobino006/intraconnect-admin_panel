// User class for data
export class User {
    constructor(id, companyId, position, phone, name, departmentId, avatarUrl) {
        this.id = id;
        this.companyId = companyId;
        this.position = position || '-';
        this.phone = phone || '-';
        this.name = name;
        this.departmentId = departmentId || '-';
        this.avatarUrl = avatarUrl || '-';
    }
}
