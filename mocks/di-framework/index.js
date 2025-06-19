export class Result {
    static success(value) {
        return {
            success: true,
            value,
            error: null,
        };
    }
    static fail(error) {
        return {
            success: false,
            value: null,
            error,
        };
    }
}
//# sourceMappingURL=index.js.map