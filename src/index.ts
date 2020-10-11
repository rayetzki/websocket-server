import * as http from "http";
import * as stream from 'stream';
import { createHash } from 'crypto';

interface DecryptedMessage {
    length: number | bigint;
    mask: Buffer;
    data: Buffer;
}

export class SockerServer {
    private connections: Set<stream.Duplex> = new Set();
    private HANDSHAKE_CONSTANT: string = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    private MASK_LENGTH: number = 4;
    private OPCODE = {
        PING: 0x89,
        SHORT_TEXT_MESSAGE: 0x81
    };
    private DATA_LENGTH = {
        MIDDLE: 128,
        SHORT: 125,
        LONG: 126,
        VERY_LONG: 127
    };
    private CONTROL_MESSAGES = {
        PING: Buffer.from([this.OPCODE.PING, 0x0])
    };
    
    constructor(private port: number, private heartbeatTimeout: number) {
        http
            .createServer()
            .on('upgrade', (request: http.IncomingMessage, socket: stream.Duplex) => { 
                this.initiateHandshake(request, socket);
                this.connections.add(socket);
                this.dataListener(socket);
                this.deleteSocketOnTimeout(socket, this.heartbeatTimeout);
                this.notifyAllSockets(`Подключился новый участник чата. Всего в чате: ${this.connections.size}`);
            }).listen(this.port);

        console.log(`Listening on port: ${this.port}`);
    }

    private initiateHandshake(request: http.IncomingMessage, socket: stream.Duplex): void {
        const clientKey: string = request.headers['sec-websocket-key'] as string;
        const handshakeKey = createHash('sha1')
            .update(clientKey.concat(this.HANDSHAKE_CONSTANT))
            .digest('base64');

        const responseHeaders = [
            'HTTP/1.1 101',
            'upgrade: websocket',
            'connection: upgrade',
            `sec-webSocket-accept: ${handshakeKey}`,
            '\r\n'
        ];

        socket.write(responseHeaders.join('\r\n'));
    }

    private deleteSocketOnTimeout(socket: stream.Duplex, heartbeatTimeout: number): void {
        const id: NodeJS.Timeout = setInterval(() => socket.write(this.CONTROL_MESSAGES.PING), heartbeatTimeout);
        const events = ['end', 'close', 'error'] as const;

        events.forEach(event => {
            socket.once(event, () => {
                console.log(`Socket terminated due to connection: ${event}`)
                clearInterval(id);
                this.connections.delete(socket);
            });
        });
    }

    private decryptMessage(message: Buffer): DecryptedMessage {
        const length: number = message[1] ^ this.DATA_LENGTH.MIDDLE;
        if (length <= this.DATA_LENGTH.SHORT) {
            return {
                length,
                mask: message.slice(2, 6),
                data: message.slice(6)
            }
        } else if (length === this.DATA_LENGTH.LONG) {
            return {
                length: message.slice(2, 4).readInt16BE(),
                mask: message.slice(4, 8),
                data: message.slice(8)
            }
        } else if (length === this.DATA_LENGTH.VERY_LONG) {
            return {
                length: message.slice(2, 10).readBigInt64BE(),
                mask: message.slice(10, 14),
                data: message.slice(14)
            };
        } else throw new Error('Wrong message format');
    }

    private dataListener(socket: stream.Duplex): void {
        socket.on('data', (data: Buffer) => {
            if (data[0] === this.OPCODE.SHORT_TEXT_MESSAGE) {
                const meta: DecryptedMessage = this.decryptMessage(data);
                const message: Buffer = this.unmasked(meta.mask, meta.data);
                this.connections.forEach((socket: stream.Duplex) => {
                    this.sendMessage(message, socket);
                });
            }
        });
    }

    private unmasked(mask: Buffer, data: Buffer): Buffer {
        return Buffer.from(data.map((byte, index) => byte ^ mask[index % this.MASK_LENGTH]));
    }

    private sendMessage(message: Buffer, socket: stream.Duplex): void {
        const meta: Buffer = Buffer.alloc(2);
        meta[0] = this.OPCODE.SHORT_TEXT_MESSAGE;
        meta[1] = message.length;
        socket.write(Buffer.concat([meta, message]));
    }

    private notifyAllSockets(message: string): void {
        this.connections.forEach(socket => {
            this.sendMessage(Buffer.from(message), socket);
            console.log(message);
        });
    }
}

new SockerServer(8080, 5000);