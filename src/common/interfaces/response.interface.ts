export interface ApiResponse<T> {
    statusCode: number;
    isSuccess: boolean;
    message: string;
    data: T;
    toastMessage?: string;
}

export interface PaginatedData<T> {
    tableData: T[];
    totalCount: number;
}
