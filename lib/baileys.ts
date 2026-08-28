import { EventEmitter } from 'events';
import pino from 'pino'
import type { Logger } from 'pino'
import NodeCache from 'node-cache'
// baileys itu CommonJS: named import gagal saat file ini dijalankan sebagai ESM.
// Ambil namespace-nya lalu pecah sendiri. Sejak 6.7.24 `default` = makeWASocket dan
// named export pindah ke top-level, jadi WAJIB `import * as` - default import bikin
// semua hasil destructure jadi undefined ("useMultiFileAuthState is not a function").
import * as baileys from '@whiskeysockets/baileys'
const {
    DisconnectReason,
    fetchLatestBaileysVersion,
    getAggregateVotesInPollMessage,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    Browsers,
    proto,
} = baileys as any
const makeWASocket = (baileys as any).default ?? baileys
import type { WAMessageContent, WAMessageKey } from '@whiskeysockets/baileys'
import { readFileSync, existsSync } from 'fs';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

import mime from 'mime-types';

import utils from './utils.ts';
import { join } from 'path';



interface Args {
    debug?: boolean;
    [key: string]: any;  // Define the shape of this object as needed
}

type SendMessageOptions = {
    keyword?: string,
    refresh?: string,
    answer?: string,
    options: {
        capture?: boolean
        child?: any
        delay?: number
        nested?: any[]
        keyword?: any
        callback?: boolean
        buttons?: { body: string }[]
        media?: string
    },
    refSerialize?: string
}

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const msgRetryCounterCache = new NodeCache()


export class BaileysClass extends EventEmitter {
    private vendor: any;
    private store: any;
    private globalVendorArgs: Args;
    private sock: any;
    private NAME_DIR_SESSION: string;
    private plugin: boolean;
    private reconnectAttempts: number = 0;
    private reconnectTimer: any = null;
    private storeTimer: any = null;

    constructor(args = {}) {

        super()
        this.vendor = null;
        this.store = null;
        this.globalVendorArgs = { name: `bot`, usePairingCode: false, phoneNumber: null, gifPlayback: false, dir: './', ...args };
        this.NAME_DIR_SESSION = `${this.globalVendorArgs.dir}${this.globalVendorArgs.name}_sessions`;
        this.initBailey();

        // is plugin?
        const err = new Error();
        const stack = err.stack;
        this.plugin = stack?.includes('createProvider') ?? false;

    }

    // BRAMA: store dibuang bersama makeInMemoryStore (lihat catatan di initBailey).
    // Bot ini cuma mengirim dan tidak pernah membaca ulang pesan lama, jadi tidak ada
    // yang perlu di-load. Kalau WhatsApp minta kirim ulang, tick berikutnya yang urus.
    getMessage = async (_key: WAMessageKey): Promise<WAMessageContent | undefined> => {
        return proto.Message.fromObject({})
    }

    getInstance = (): any => this.vendor;

    initBailey = async (): Promise<void> => {

        const logger : Logger = pino({ level: this.globalVendorArgs.debug ? 'debug' : 'fatal' })
        const { state, saveCreds } = await useMultiFileAuthState(this.NAME_DIR_SESSION);
        const { version, isLatest } = await fetchLatestBaileysVersion()

        if (this.globalVendorArgs.debug) console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

        // BRAMA: `makeInMemoryStore` sudah tidak ada sejak baileys 6.7.24, dan versi itu
        // WAJIB dipakai karena grup WhatsApp sekarang beralamat @lid — 6.7.9 menolak
        // kirim dengan `not-acceptable` (406). Store-nya dibuang, bukan diganti:
        // satu-satunya pemakainya `getMessage`, dan bot ini tidak pernah membaca pesan.

        try {
            this.setUpBaileySock({ version, logger, state, saveCreds });
        } catch (e) {
            this.emit('auth_failure', e);
        }
    }

    setUpBaileySock = async ({ version, logger, state, saveCreds }) => {
        this.sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: this.plugin || this.globalVendorArgs.usePairingCode ? false : true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            browser: Browsers.macOS('Desktop'),
            msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            getMessage: this.getMessage,
        })

        this.store?.bind(this.sock.ev)

        if (this.globalVendorArgs.usePairingCode) {
            if (this.globalVendorArgs.phoneNumber) {
                await this.sock.waitForConnectionUpdate((update) => !!update.qr)
                const code = await this.sock.requestPairingCode(this.globalVendorArgs.phoneNumber)
                if (this.plugin) {
                    this.emit('require_action', {
                        instructions: [
                            `Acepta la notificación del WhatsApp ${this.globalVendorArgs.phoneNumber} en tu celular 👌`,
                            `El token para la vinculación es: ${code}`,
                            `Necesitas ayuda: https://link.codigoencasa.com/DISCORD`,
                        ],
                    })
                } else {
                    this.emit('pairing_code', code);
                }
            } else {
                this.emit('auth_failure', 'phoneNumber is empty')
            }
        }

        this.sock.ev.on('connection.update', this.handleConnectionUpdate);
        this.sock.ev.on('creds.update', saveCreds)
    }

    handleConnectionUpdate = async (update: any): Promise<void> => {
        const { connection, lastDisconnect, qr } = update;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        if (connection === 'close') {
            // BRAMA: session files are NEVER deleted. Reconnect with backoff, forever.
            const loggedOut = statusCode === DisconnectReason.loggedOut;
            if (loggedOut) {
                this.emit('logged_out', statusCode);
                console.warn(`[brama] logged out dari HP. Session di ${this.NAME_DIR_SESSION} TIDAK dihapus.`);
                console.warn(`[brama] untuk re-link: stop bot, rename folder session, start lagi, scan QR.`);
            }
            this.reconnectAttempts = loggedOut ? this.reconnectAttempts + 1 : 0;
            // ponytail: backoff 5s..5m, cukup buat jaringan ngadat & spam-guard pas loggedOut
            const delay = loggedOut ? Math.min(30_000 * this.reconnectAttempts, 300_000) : 5_000;
            this.emit('reconnecting', { statusCode, delay });
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.initBailey(), delay);
        }

        if (connection === 'open') {
            this.vendor = this.sock;
            this.initBusEvents(this.sock);
            this.emit('ready', true);
        }

        if (qr && !this.globalVendorArgs.usePairingCode) {
            if (this.plugin) this.emit('require_action', {
                instructions: [
                    `Debes escanear el QR Code 👌 ${this.globalVendorArgs.name}.qr.png`,
                    `Recuerda que el QR se actualiza cada minuto `,
                    `Necesitas ayuda: https://link.codigoencasa.com/DISCORD`,
                ],
            })
            this.emit('qr', qr);
            // BRAMA: dulu `if (this.plugin)`. Guard dilepas supaya PNG SELALU ditulis —
            // QR ASCII di terminal tidak selalu bisa dipindai (mis. saat prosesnya
            // dijalankan bukan dari terminal orangnya). Divergensi dari upstream.
            await utils.baileyGenerateImage(qr, `${this.globalVendorArgs.name}.qr.png`)
        }
    }

    busEvents = (): any[] => [
        {
            event: 'messages.upsert',
            func: ({ messages, type }) => {
                // Ignore notify messages
                if (type !== 'notify') return

                const [messageCtx] = messages;
                let payload = {
                    ...messageCtx,
                    body: messageCtx?.message?.extendedTextMessage?.text ?? messageCtx?.message?.conversation,
                    from: messageCtx?.key?.remoteJid,
                    type: 'text'
                };

                // Ignore pollUpdateMessage
                if (messageCtx.message?.pollUpdateMessage) return

                // Ignore broadcast messages
                if (payload.from === 'status@broadcast') return

                // Ignore messages from self
                if (payload?.key?.fromMe) return

                // Detect location
                if (messageCtx.message?.locationMessage) {
                    const { degreesLatitude, degreesLongitude } = messageCtx.message.locationMessage;
                    if (typeof degreesLatitude === 'number' && typeof degreesLongitude === 'number') {
                        payload = { ...payload, body: utils.generateRefprovider('_event_location_'), type: 'location' };
                    }
                }
                // Detect  media
                if (messageCtx.message?.imageMessage) {
                    payload = { ...payload, body: utils.generateRefprovider('_event_media_'), type: 'image' };
                }

                // Detect  ectar file
                if (messageCtx.message?.documentMessage) {
                    payload = { ...payload, body: utils.generateRefprovider('_event_document_'), type: 'file' };
                }

                // Detect voice note
                if (messageCtx.message?.audioMessage) {
                    payload = { ...payload, body: utils.generateRefprovider('_event_voice_note_'), type: 'voice' };
                }

                // Check from user and group is valid 
                if (!utils.formatPhone(payload.from)) {
                    return
                }

                const btnCtx = payload?.message?.buttonsResponseMessage?.selectedDisplayText;
                if (btnCtx) payload.body = btnCtx;

                const listRowId = payload?.message?.listResponseMessage?.title;
                if (listRowId) payload.body = listRowId;

                payload.from = utils.formatPhone(payload.from, this.plugin);
                this.emit('message', payload);
            },
        },
        {
            event: 'messages.update',
            func: async (message) => {
                for (const { key, update } of message) {
                    if (update.pollUpdates) {
                        const pollCreation = await this.getMessage(key)
                        if (pollCreation) {
                            const pollMessage = await getAggregateVotesInPollMessage({
                                message: pollCreation,
                                pollUpdates: update.pollUpdates,
                            })
                            const [messageCtx] = message;

                            let payload = {
                                ...messageCtx,
                                body: pollMessage.find(poll => poll.voters.length > 0)?.name || '',
                                from: utils.formatPhone(key.remoteJid, this.plugin),
                                voters: pollCreation,
                                type: 'poll'
                            };

                            this.emit('message', payload);
                        }
                    }
                }
            }
        }
    ]

    initBusEvents = (_sock: any): void => {
        this.vendor = _sock;
        const listEvents = this.busEvents();

        for (const { event, func } of listEvents) {
            this.vendor.ev.on(event, func);
        }
    }

    /**
     * Send Media
     * @alpha
     * @param {string} number
     * @param {string} message
     * @example await sendMessage('+XXXXXXXXXXX', 'https://dominio.com/imagen.jpg' | 'img/imagen.jpg')
     */

    sendMedia = async (number: string, mediaUrl: string, text: string): Promise<any> => {
        try {
            const fileDownloaded = await utils.generalDownload(mediaUrl);
            const mimeType = mime.lookup(fileDownloaded);

            if (typeof mimeType === 'string' && mimeType.includes('image')) return this.sendImage(number, fileDownloaded, text);
            if (typeof mimeType === 'string' && mimeType.includes('video')) return this.sendVideo(number, fileDownloaded, text);
            if (typeof mimeType === 'string' && mimeType.includes('audio')) {
                const fileOpus = await utils.convertAudio(fileDownloaded);
                return this.sendAudio(number, fileOpus);
            }

            return this.sendFile(number, fileDownloaded)
        } catch (error) {
            console.error(`Error enviando media: ${error}`);
            throw error;
        }
    }

    /**
     * Send image
     * @param {*} number
     * @param {*} filePath
     * @param {*} text
     * @returns
     */
    sendImage = async (number: string, filePath: string, text: string): Promise<any> => {
        const numberClean = utils.formatPhone(number)
        return this.vendor.sendMessage(numberClean, {
            image: readFileSync(filePath),
            caption: text ?? '',
        })
    }

    /**
     * Enviar video
     * @param {*} number
     * @param {*} imageUrl
     * @param {*} text
     * @returns
     */
    sendVideo = async (number: string, filePath: string, text: string): Promise<any> => {
        const numberClean = utils.formatPhone(number)
        return this.vendor.sendMessage(numberClean, {
            video: readFileSync(filePath),
            caption: text,
            gifPlayback: this.globalVendorArgs.gifPlayback,
        })
    }

    /**
     * Enviar audio
     * @alpha
     * @param {string} number
     * @param {string} message
     * @param {boolean} voiceNote optional
     * @example await sendMessage('+XXXXXXXXXXX', 'audio.mp3')
     */

    sendAudio = async (number: string, audioUrl: string): Promise<any> => {
        const numberClean = utils.formatPhone(number)
        return this.vendor.sendMessage(numberClean, {
            audio: { url: audioUrl },
            ptt: true,
        })
    }

    /**
     *
     * @param {string} number
     * @param {string} message
     * @returns
     */
    sendText = async (number: string, message: string): Promise<any> => {
        const numberClean = utils.formatPhone(number)
        return this.vendor.sendMessage(numberClean, { text: message })
    }

    /**
     *
     * @param {string} number
     * @param {string} filePath
     * @example await sendMessage('+XXXXXXXXXXX', './document/file.pdf')
     */

    sendFile = async (number: string, filePath: string): Promise<any> => {
        const numberClean = utils.formatPhone(number)
        const mimeType = mime.lookup(filePath);
        const fileName = filePath.split('/').pop();
        return this.vendor.sendMessage(numberClean, {
            document: { url: filePath },
            mimetype: mimeType,
            fileName: fileName,
        })
    }

    /**
     * @deprecated
     * @param {string} number
     * @param {string} text
     * @param {string} footer
     * @param {Array} buttons
     * @example await sendMessage("+XXXXXXXXXXX", "Your Text", "Your Footer", [{"buttonId": "id", "buttonText": {"displayText": "Button"}, "type": 1}])
     */

    sendButtons = async (number: string, text: string, buttons: any[]): Promise<any> => {
        const numberClean = utils.formatPhone(number)

        const templateButtons = buttons.map((btn, i) => ({
            buttonId: `id-btn-${i}`,
            buttonText: { displayText: btn.body },
            type: 1,
        }));

        const buttonMessage = {
            text,
            footer: '',
            buttons: templateButtons,
            headerType: 1,
        };

        return this.vendor.sendMessage(numberClean, buttonMessage)
    }

    /**
    *
    * @param {string} number
    * @param {string} text
    * @param {string} footer
    * @param {Array} poll
    * @example await sendMessage("+XXXXXXXXXXX", "Your Text", "Your Footer", [{"buttonId": "id", "buttonText": {"displayText": "Button"}, "type": 1}])
    */

    sendPoll = async (number: string, text: string, poll: any): Promise<boolean> => {
        const numberClean = utils.formatPhone(number)

        if (poll.options.length < 2) return false

        const pollMessage = {
            name: text,
            values: poll.options,
            selectableCount: 1
        };
        return this.vendor.sendMessage(numberClean, { poll: pollMessage })
    }

    /**
     * @param {string} number
     * @param {string} message
     * @example await sendMessage('+XXXXXXXXXXX', 'Hello World')
     */


    sendMessage = async (numberIn: string, message: string, options: SendMessageOptions): Promise<any> => {
        const number = utils.formatPhone(numberIn);

        if (options.options.buttons?.length) {
            return this.sendPoll(number, message, {
                options: options.options.buttons.map((btn, i) => (btn.body)) ?? [],
            })
        }
        if (options.options?.media) return this.sendMedia(number, options.options.media, message)
        return this.sendText(number, message)
    }

    /**
     * @param {string} remoteJid
     * @param {string} latitude
     * @param {string} longitude
     * @param {any} messages
     * @example await sendLocation("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "xx.xxxx", "xx.xxxx", messages)
     */

    sendLocation = async (remoteJid: string, latitude: string, longitude: string, messages: any = null): Promise<{ status: string }> => {
        await this.vendor.sendMessage(
            remoteJid,
            {
                location: {
                    degreesLatitude: latitude,
                    degreesLongitude: longitude,
                },
            },
            { quoted: messages }
        );

        return { status: 'success' }
    }

    /**
     * @param {string} remoteJid
     * @param {string} contactNumber
     * @param {string} displayName
     * @param {any} messages - optional
     * @example await sendContact("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "+xxxxxxxxxxx", "Robin Smith", messages)
     */

    sendContact = async (remoteJid: string, contactNumber: string, displayName: string, messages: any = null): Promise<{ status: string }> => {

        const cleanContactNumber = contactNumber.replace(/ /g, '');
        const waid = cleanContactNumber.replace('+', '');

        const vcard =
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${displayName}\n` +
            'ORG:Ashoka Uni;\n' +
            `TEL;type=CELL;type=VOICE;waid=${waid}:${cleanContactNumber}\n` +
            'END:VCARD';

        await this.vendor.sendMessage(
            remoteJid,
            {
                contacts: {
                    displayName: displayName,
                    contacts: [{ vcard }],
                },
            },
            { quoted: messages }
        );

        return { status: 'success' }
    }

    /**
     * @param {string} remoteJid
     * @param {string} WAPresence
     * @example await sendPresenceUpdate("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "recording")
     */
    sendPresenceUpdate = async (remoteJid: string, WAPresence: string): Promise<void> => {
        await this.vendor.sendPresenceUpdate(WAPresence, remoteJid);
    }

    /**
     * @param {string} remoteJid
     * @param {string} url
     * @param {object} stickerOptions
     * @param {any} messages - optional
     * @example await sendSticker("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "https://dn/image.png" || "https://dn/image.gif" || "https://dn/image.mp4", {pack: 'User', author: 'Me'}, messages)
     */

    sendSticker = async (remoteJid: string, url: string, stickerOptions: any, messages: any = null): Promise<void> => {
        const number = utils.formatPhone(remoteJid);
        const fileDownloaded = await utils.generalDownload(url);

        await this.vendor.sendMessage(number, {
            sticker: {
                url: fileDownloaded
            },
        }, { quoted: messages });
    }
}


