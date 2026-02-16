// Notification class for data
export class Notification {
    constructor(id, companyId, title, message, publishedAt, updatedAt, createdBy, isGlobal, departmentId = null) {
        this.id = id;
        this.companyId = companyId;
        this.title = title;
        this.message = message;
        this.publishedAt = publishedAt;
        this.updatedAt = updatedAt || '-';
        this.createdBy = createdBy;
        this.isGlobal = isGlobal;
        this.departmentId = departmentId;
    }
}