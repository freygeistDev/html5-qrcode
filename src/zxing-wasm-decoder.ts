/**
 * @fileoverview
 * {@interface QrcodeDecoder} wrapper around zxing-wasm (C++ zxing-cpp via WebAssembly).
 *
 * Uses @sec-ant/zxing-wasm for superior DataMatrix detection, especially for
 * DPM (Direct Part Marking) codes on embossed or low-contrast surfaces.
 *
 * ZXing JS (WhiteRectangleDetector) fundamentally fails on embossed cigarette
 * packaging foil. The C++ zxing-cpp implementation in zxing-wasm has a much
 * better DataMatrix detector that handles such cases.
 */

import {
    readBarcodesFromImageData,
    setZXingModuleOverrides
} from "@sec-ant/zxing-wasm/reader";

import {
    QrcodeResult,
    QrcodeResultFormat,
    Html5QrcodeSupportedFormats,
    Logger,
    QrcodeDecoderAsync
} from "./core";

/**
 * Configure the base path from which the zxing_reader.wasm file is fetched.
 * Must be called before the first decode attempt.
 *
 * @param basePath  URL path prefix, e.g. "/assets/vendor/"
 */
export function configureZXingWasmPath(basePath: string): void {
    const normalizedBase = basePath.replace(/\/$/, "");
    setZXingModuleOverrides({
        locateFile: (path: string): string => {
            return normalizedBase + "/" + path;
        }
    });
}

/**
 * Maps zxing-wasm format name strings to Html5QrcodeSupportedFormats.
 */
const WASM_FORMAT_MAP: Record<string, Html5QrcodeSupportedFormats> = {
    "Aztec":            Html5QrcodeSupportedFormats.AZTEC,
    "Codabar":          Html5QrcodeSupportedFormats.CODABAR,
    "Code128":          Html5QrcodeSupportedFormats.CODE_128,
    "Code39":           Html5QrcodeSupportedFormats.CODE_39,
    "Code93":           Html5QrcodeSupportedFormats.CODE_93,
    "DataMatrix":       Html5QrcodeSupportedFormats.DATA_MATRIX,
    "EAN-13":           Html5QrcodeSupportedFormats.EAN_13,
    "EAN-8":            Html5QrcodeSupportedFormats.EAN_8,
    "ITF":              Html5QrcodeSupportedFormats.ITF,
    "MaxiCode":         Html5QrcodeSupportedFormats.MAXICODE,
    "PDF417":           Html5QrcodeSupportedFormats.PDF_417,
    "QRCode":           Html5QrcodeSupportedFormats.QR_CODE,
    "UPC-A":            Html5QrcodeSupportedFormats.UPC_A,
    "UPC-E":            Html5QrcodeSupportedFormats.UPC_E,
};

/**
 * Maps Html5QrcodeSupportedFormats to zxing-wasm format name strings.
 */
const REVERSE_FORMAT_MAP: Map<Html5QrcodeSupportedFormats, string> = (() => {
    const m = new Map<Html5QrcodeSupportedFormats, string>();
    for (const [wasmName, fmt] of Object.entries(WASM_FORMAT_MAP)) {
        m.set(fmt, wasmName);
    }
    return m;
})();

/**
 * Decoder that uses zxing-wasm (C++ zxing-cpp via WebAssembly).
 * Substantially better DataMatrix detection than ZXing JS, especially for DPM.
 */
export class ZXingWasmDecoder implements QrcodeDecoderAsync {
    private readonly tryHarder: boolean;
    private readonly wasmFormats: string[];
    private readonly logger: Logger;

    public constructor(
        requestedFormats: Array<Html5QrcodeSupportedFormats>,
        _verbose: boolean,
        logger: Logger,
        tryHarder?: boolean) {
        this.logger = logger;
        this.tryHarder = tryHarder ?? true;
        this.wasmFormats = requestedFormats
            .map(f => REVERSE_FORMAT_MAP.get(f))
            .filter((s): s is string => s !== undefined);

        if (this.wasmFormats.length === 0) {
            this.logger.logError(
                "ZXingWasmDecoder: none of the requested formats are supported");
        }
    }

    async decodeAsync(canvas: HTMLCanvasElement): Promise<QrcodeResult> {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw "ZXingWasmDecoder: could not get 2d context from canvas";
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const results = await readBarcodesFromImageData(imageData, {
            formats: this.wasmFormats as any,
            tryHarder: this.tryHarder,
            maxSymbols: 1,
        });

        if (results.length === 0 || !results[0].text) {
            throw "ZXingWasmDecoder: no barcode found";
        }

        const result = results[0];
        const format = WASM_FORMAT_MAP[result.format]
            ?? Html5QrcodeSupportedFormats.DATA_MATRIX;

        return {
            text: result.text,
            format: QrcodeResultFormat.create(format),
            debugData: { decoderName: "zxing-wasm" },
        };
    }
}
