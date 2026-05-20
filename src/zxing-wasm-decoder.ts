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
    QrcodePoint,
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
    private readonly tryRotate: boolean;
    private readonly tryDownscale: boolean;
    private readonly tryDenoise: boolean;
    private readonly tryInvert: boolean;
    private readonly isPure: boolean;
    private readonly returnErrors: boolean;
    private readonly downscaleThreshold: number;
    private readonly binarizer: string | undefined;
    private readonly maxDecodeWidth: number | undefined;
    private readonly maxNumberOfSymbols: number;
    private readonly preContrast: number | undefined;
    private readonly minLineCount: number | undefined;
    private readonly wasmFormats: string[];
    private readonly logger: Logger;

    private static normalizePositionPoints(
        position: any,
        scaleX: number,
        scaleY: number): QrcodePoint[] {
        if (!position) {
            return [];
        }

        const rawPoints: any[] = [];
        if (Array.isArray(position)) {
            rawPoints.push(...position);
        } else {
            ["topLeft", "topRight", "bottomRight", "bottomLeft"].forEach((key) => {
                if (position[key]) {
                    rawPoints.push(position[key]);
                }
            });
        }

        return rawPoints
            .filter((point: any) => {
                return point
                    && typeof point.x === "number"
                    && typeof point.y === "number"
                    && isFinite(point.x)
                    && isFinite(point.y);
            })
            .map((point: any) => {
                return {
                    x: point.x * scaleX,
                    y: point.y * scaleY
                };
            });
    }

    private static createBoundsFromPoints(points: QrcodePoint[])
        : { x: number; y: number; width: number; height: number } | undefined {
        if (!points || points.length === 0) {
            return undefined;
        }

        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY)
        };
    }

    public constructor(
        requestedFormats: Array<Html5QrcodeSupportedFormats>,
        _verbose: boolean,
        logger: Logger,
        tryHarder?: boolean,
        tryDenoise?: boolean,
        tryInvert?: boolean,
        downscaleThreshold?: number,
        binarizer?: string,
        maxDecodeWidth?: number,
        tryRotate?: boolean,
        tryDownscale?: boolean,
        isPure?: boolean,
        returnErrors?: boolean,
        maxNumberOfSymbols?: number,
        preContrast?: number,
        minLineCount?: number) {
        this.logger = logger;
        this.tryHarder = tryHarder ?? true;
        this.tryRotate = tryRotate ?? true;
        this.tryDownscale = tryDownscale ?? true;
        this.tryDenoise = tryDenoise ?? false;
        this.tryInvert = tryInvert ?? false;
        this.isPure = isPure ?? false;
        this.returnErrors = returnErrors ?? false;
        this.downscaleThreshold = downscaleThreshold ?? 500;
        this.binarizer = binarizer;
        this.maxDecodeWidth = maxDecodeWidth;
        this.maxNumberOfSymbols = Math.max(1, Math.min(255, Math.floor(
            maxNumberOfSymbols ?? 1)));
        this.preContrast = (preContrast && preContrast > 0) ? preContrast : undefined;
        this.minLineCount = (minLineCount && minLineCount >= 1) ? Math.floor(minLineCount) : undefined;
        this.wasmFormats = requestedFormats
            .map(f => REVERSE_FORMAT_MAP.get(f))
            .filter((s): s is string => s !== undefined);

        if (this.wasmFormats.length === 0) {
            this.logger.logError(
                "ZXingWasmDecoder: none of the requested formats are supported");
        }
    }

    async decodeAsync(canvas: HTMLCanvasElement): Promise<QrcodeResult> {
        let sourceCanvas = canvas;

        // Pre-downscale to maxDecodeWidth via bilinear canvas interpolation.
        // Merges dot-pattern DPM modules into solid cells before ZXing binarization.
        if (this.maxDecodeWidth && canvas.width > this.maxDecodeWidth) {
            const scale = this.maxDecodeWidth / canvas.width;
            const w = this.maxDecodeWidth;
            const h = Math.max(1, Math.round(canvas.height * scale));
            const tmp = document.createElement("canvas");
            tmp.width = w;
            tmp.height = h;
            const tmpCtx = tmp.getContext("2d");
            if (tmpCtx) {
                tmpCtx.drawImage(canvas, 0, 0, w, h);
                sourceCanvas = tmp;
            }
        }

        // JS-side contrast enhancement before ZXing binarization.
        // CSS filter is GPU-accelerated and cheaper than pixel-by-pixel JS.
        // Helps LocalAverage binarizer on low-contrast foil DPM codes where
        // specular reflections compress the effective dynamic range.
        if (this.preContrast && this.preContrast !== 1) {
            const w = sourceCanvas.width;
            const h = sourceCanvas.height;
            const pre = document.createElement("canvas");
            pre.width = w;
            pre.height = h;
            const preCtx = pre.getContext("2d");
            if (preCtx) {
                preCtx.filter = `contrast(${this.preContrast})`;
                preCtx.drawImage(sourceCanvas, 0, 0, w, h);
                preCtx.filter = "none";
                sourceCanvas = pre;
            }
        }

        const ctx = sourceCanvas.getContext("2d");
        if (!ctx) {
            throw "ZXingWasmDecoder: could not get 2d context from canvas";
        }

        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

        const readOptions: any = {
            formats: this.wasmFormats as any,
            tryHarder: this.tryHarder,
            tryRotate: this.tryRotate,
            tryDownscale: this.tryDownscale,
            tryDenoise: this.tryDenoise,
            tryInvert: this.tryInvert,
            isPure: this.isPure,
            downscaleThreshold: this.downscaleThreshold,
            maxNumberOfSymbols: this.maxNumberOfSymbols,
            returnErrors: this.returnErrors,
            textMode: "Plain",
        };
        if (this.binarizer) {
            readOptions.binarizer = this.binarizer;
        }
        if (this.minLineCount !== undefined) {
            readOptions.minLineCount = this.minLineCount;
        }

        const results = await readBarcodesFromImageData(imageData, readOptions);
        const validResults = results.filter((candidate: any) => {
            return candidate
                && candidate.text
                && candidate.isValid !== false;
        });

        if (validResults.length === 0) {
            if (this.returnErrors && results.length > 0) {
                const errorSet: string[] = [];
                results.map((candidate: any) => candidate.error || "unknown")
                    .forEach((e: string) => { if (!errorSet.includes(e)) errorSet.push(e); });
                const errors = errorSet.join(",");
                throw `ZXingWasmDecoder: no barcode found (${errors})`;
            }
            throw "ZXingWasmDecoder: no barcode found";
        }

        const result = validResults[0];
        const format = WASM_FORMAT_MAP[result.format]
            ?? Html5QrcodeSupportedFormats.DATA_MATRIX;
        const positionScaleX = canvas.width / sourceCanvas.width;
        const positionScaleY = canvas.height / sourceCanvas.height;
        const position = ZXingWasmDecoder.normalizePositionPoints(
            result.position,
            positionScaleX,
            positionScaleY);
        const bounds = ZXingWasmDecoder.createBoundsFromPoints(position);

        return {
            text: result.text,
            format: QrcodeResultFormat.create(format),
            bounds: bounds,
            debugData: {
                decoderName: "zxing-wasm",
                zxingWasm: {
                    width: sourceCanvas.width,
                    height: sourceCanvas.height,
                    originalWidth: canvas.width,
                    originalHeight: canvas.height,
                    position: position,
                    positionFrameWidth: canvas.width,
                    positionFrameHeight: canvas.height,
                    isInverted: !!result.isInverted,
                    isMirrored: !!result.isMirrored,
                    orientation: typeof result.orientation === "number"
                        ? result.orientation
                        : undefined,
                    tryHarder: this.tryHarder,
                    tryRotate: this.tryRotate,
                    tryDownscale: this.tryDownscale,
                    tryDenoise: this.tryDenoise,
                    tryInvert: this.tryInvert,
                    binarizer: this.binarizer,
                    maxDecodeWidth: this.maxDecodeWidth,
                    maxNumberOfSymbols: this.maxNumberOfSymbols,
                },
            },
        };
    }
}
