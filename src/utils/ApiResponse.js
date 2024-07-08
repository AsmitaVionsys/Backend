class apiResponse {
    constructor(status, message, data = "Success") {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = this.statusCode < 400;
    }
}