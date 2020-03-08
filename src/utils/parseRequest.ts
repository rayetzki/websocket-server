import Request from "../models/Request";
import { divideStringOn } from './divideStringOn';

export const parseRequest = (address: string): Request => {
    const [firstLine, rest] = divideStringOn(address, '\r\n');
    const [method, url, protocol] = firstLine.split(' ', 3);
    const [headers, body] = divideStringOn(rest, '\r\n\r\n')
    const parsedHeaders = headers.split('\r\n')
        .reduce((map, header) => {
            const [key, value] = divideStringOn(header, ': ');
            return map.set(key, value);
        }, new Map());
    return { protocol, method, url, headers: parsedHeaders, body };
}