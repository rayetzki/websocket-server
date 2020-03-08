import Response from "../models/Response";

export const compileResponse = (response: Response) : string => {
    return `${response.protocol} ${response.statusCode} ${response.status}
    ${Array.from(response.headers).map(header => `${header[0]}: ${header[1]}`).join('\r\n')}

    ${response.body}`
} 