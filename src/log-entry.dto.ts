export class LogEntryDto {
    requestId: string;
    ip: string;
    timestamp: Date; // Use Date for accurate timestamp representation
    method: string;
    url: string;
    userAgent: string;
    protocol: string;
    statusCode: number; // Use number for numeric status code
    contentLength: number | null; // Allow contentLength to be null
    responseTime: number; // Remove unnecessary string formatting
    response: any; // Use any for flexible response data type
    request: any; // Use any for flexible request data type
    errorStack?: string; // Error stack
}
