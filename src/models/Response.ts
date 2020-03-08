export default interface Response {
    status: string,
    statusCode: number,
    protocol: string,
    headers: Map<string, string>,
    body: string
}