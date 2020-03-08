import * as net from "net";
import * as wp from 'workerpool';
import { compileResponse } from './utils/compileResponse'; 

const PORT: number = 8001;
const IP: string = '127.0.0.1';
const BACKLOG: number = 100;
const workerpool = wp.pool();

const fibonacci: Function = (n: number) => (n < 2) ? n : fibonacci(n - 2) + fibonacci(n - 1);

net.createServer()
    .listen(PORT, IP, BACKLOG)
    .on('connection', socket => 
        socket.on('data', buffer => {
            socket.write(compileResponse({
                protocol: 'HTTP/1.1',
                headers: new Map(),
                status: 'OK',
                statusCode: 200,
                body: `<html><body><h1>Greetings</h1></body></html>`
            }));
            socket.end();
        })
    )