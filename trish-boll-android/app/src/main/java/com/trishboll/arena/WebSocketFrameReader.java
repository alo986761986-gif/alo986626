package com.trishboll.arena;

import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;
import java.net.SocketTimeoutException;

/**
 * RFC 6455 reader for Android 5+ with support for fragmented messages,
 * control frames interleaved with continuations, and extended lengths.
 * Never assumes that a socket read is a whole frame or message.
 * Does not depend on Android libraries, allowing ordinary JVM unit tests.
 */
public final class WebSocketFrameReader {
    private static final int MAX_MESSAGE = 1048576;
    private final InputStream input;
    private final Socket socket;
    private ByteArrayOutputStream fragments;
    private int fragmentType = -1;

    public static final class Message {
        public final int opcode;
        public final byte[] data;
        Message(int opcode, byte[] data) { this.opcode = opcode; this.data = data; }
    }

    public WebSocketFrameReader(InputStream input, Socket socket) {
        this.input = input;
        this.socket = socket;
    }

    private int readByte() throws IOException {
        int result = input.read();
        if (result < 0) throw new EOFException("Connessione WebSocket terminata");
        return result;
    }

    private byte[] readFully(int count) throws IOException {
        byte[] payload = new byte[count];
        int done = 0;
        while (done < count) {
            int n = input.read(payload, done, count - done);
            if (n < 0) throw new EOFException("Pacchetto WebSocket incompleto");
            if (n == 0) continue;
            done += n;
        }
        return payload;
    }

    /**
     * Returns null on an idle read timeout (with no frame bytes consumed)
     * or for a non-final data frame. Continuations are retained until FIN.
     * Ping/pong/close may be interleaved without losing the partial message.
     */
    public Message next() throws IOException {
        if (socket != null) socket.setSoTimeout(250);
        final int first;
        try { first = input.read(); }
        catch (SocketTimeoutException idle) { return null; }
        if (first < 0) throw new EOFException("Server WebSocket disconnesso");
        if (socket != null) socket.setSoTimeout(12000);

        final int second = readByte();
        final int opcode = first & 0x0f;
        final boolean fin = (first & 0x80) != 0;
        if ((first & 0x70) != 0) throw new IOException("Estensioni WebSocket non negoziate");

        long length = second & 0x7f;
        if (length == 126) {
            length = ((long)readByte() << 8) | readByte();
            if (length < 126) throw new IOException("Lunghezza WebSocket non canonica");
        } else if (length == 127) {
            length = 0;
            for (int i = 0; i < 8; i++) length = (length << 8) | readByte();
            if (length < 65536) throw new IOException("Lunghezza WebSocket estesa non valida");
        }
        if (length < 0 || length > MAX_MESSAGE)
            throw new IOException("Messaggio WebSocket oltre il limite massimo");
        if (opcode >= 8 && (!fin || length > 125))
            throw new IOException("Frame di controllo WebSocket non valido");

        // RFC 6455 servers send unmasked frames. Support masked frames too
        // for tolerant interoperability with nonconforming network proxies.
        final boolean masked = (second & 0x80) != 0;
        final byte[] mask = masked ? readFully(4) : null;
        final byte[] bytes = readFully((int)length);
        if (masked) {
            for (int i = 0; i < bytes.length; i++) bytes[i] ^= mask[i & 3];
        }
        if (opcode == 8 || opcode == 9 || opcode == 10)
            return new Message(opcode, bytes);

        if (opcode == 0) {
            if (fragments == null) throw new IOException("Continuazione WebSocket inattesa");
            if (fragments.size() + bytes.length > MAX_MESSAGE)
                throw new IOException("Messaggio frammentato troppo grande");
            fragments.write(bytes, 0, bytes.length);
            if (fin) {
                byte[] complete = fragments.toByteArray();
                int type = fragmentType;
                fragments = null;
                fragmentType = -1;
                return new Message(type, complete);
            }
            return null;
        }
        if (opcode == 1 || opcode == 2) {
            if (fragments != null)
                throw new IOException("Nuovo messaggio durante frammentazione");
            if (fin) return new Message(opcode, bytes);
            fragments = new ByteArrayOutputStream(Math.min((int)length + 256, MAX_MESSAGE));
            fragments.write(bytes, 0, bytes.length);
            fragmentType = opcode;
            return null;
        }
        throw new IOException("Opcode WebSocket non valido: " + opcode);
    }
}
