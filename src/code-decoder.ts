/**
 * @fileoverview
 * Shim layer for providing the decoding library.
 * 
 * @author mebjas <minhazav@gmail.com>
 * 
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 * http://www.denso-wave.com/qrcode/faqpatent-e.html
 */

import {
    QrcodeResult,
    Html5QrcodeSupportedFormats,
    Logger,
    QrcodeDecoderAsync,
    RobustQrcodeDecoderAsync,
} from "./core";

import {
    ZXingHtml5QrcodeDecoder,
    ZXingDecoderConfig
} from "./zxing-html5-qrcode-decoder";
import { BarcodeDetectorDelegate } from "./native-bar-code-detector";
import { ZXingWasmDecoder } from "./zxing-wasm-decoder";

/**
 * Configuration for the decoder shim.
 */
export interface Html5QrcodeShimConfig {
    /**
     * If true, decoder will try harder to find codes.
     * Default: false
     */
    tryHarder?: boolean;

    /**
     * If true, use zxing-wasm (C++ zxing-cpp via WebAssembly) as the primary
     * decoder. Substantially better DataMatrix detection for DPM / embossed
     * codes compared to the ZXing JS implementation.
     *
     * Requires the zxing_reader.wasm file to be served from the path configured
     * via configureZXingWasmPath() before the first scan.
     *
     * Default: false
     */
    useZXingWasm?: boolean;
}

/**
 * Shim layer for {@interface QrcodeDecoder}.
 *
 * Currently uses {@class ZXingHtml5QrcodeDecoder}, can be replace with another library.
 */
export class Html5QrcodeShim implements RobustQrcodeDecoderAsync {

    private verbose: boolean;
    private primaryDecoder: QrcodeDecoderAsync;
    private secondaryDecoder: QrcodeDecoderAsync | undefined;
    private zxingDecoder: ZXingHtml5QrcodeDecoder | undefined;
    // When true, decodeAsync always uses primary (WASM) with secondary as error-fallback only.
    // The default alternating strategy halves WASM scan rate and must not apply here.
    private readonly useZXingWasmMode: boolean;

    private readonly EXECUTIONS_TO_REPORT_PERFORMANCE = 100;
    private executions: number = 0;
    private executionResults: Array<number> = [];
    private wasPrimaryDecoderUsedInLastDecode = false;

    public constructor(
        requestedFormats: Array<Html5QrcodeSupportedFormats>,
        useBarCodeDetectorIfSupported: boolean,
        verbose: boolean,
        logger: Logger,
        shimConfig?: Html5QrcodeShimConfig) {
        this.verbose = verbose;
        this.useZXingWasmMode = shimConfig?.useZXingWasm ?? false;

        const zxingConfig: ZXingDecoderConfig = {
            tryHarder: shimConfig?.tryHarder ?? false
        };

        // zxing-wasm path: superior DataMatrix / DPM detection via C++ zxing-cpp.
        // BarcodeDetector is intentionally not combined with zxing-wasm since
        // BarcodeDetector does not support DataMatrix on iOS/Safari anyway.
        if (shimConfig?.useZXingWasm) {
            this.primaryDecoder = new ZXingWasmDecoder(
                requestedFormats, verbose, logger, shimConfig?.tryHarder ?? true);
            // Keep ZXing JS as a fallback in case the WASM fails to load.
            this.zxingDecoder = new ZXingHtml5QrcodeDecoder(
                requestedFormats, verbose, logger, zxingConfig);
            this.secondaryDecoder = this.zxingDecoder;
        }
        // Use BarcodeDetector library if enabled by config and is supported.
        else if (useBarCodeDetectorIfSupported
                && BarcodeDetectorDelegate.isSupported()) {
            this.primaryDecoder = new BarcodeDetectorDelegate(
                requestedFormats, verbose, logger);
            // If 'BarcodeDetector' is supported, the library will alternate
            // between 'BarcodeDetector' and 'zxing-js' to compensate for
            // quality gaps between the two.
            this.zxingDecoder = new ZXingHtml5QrcodeDecoder(
                requestedFormats, verbose, logger, zxingConfig);
            this.secondaryDecoder = this.zxingDecoder;
        } else {
            this.zxingDecoder = new ZXingHtml5QrcodeDecoder(
                requestedFormats, verbose, logger, zxingConfig);
            this.primaryDecoder = this.zxingDecoder;
        }
    }

    /**
     * Update the TRY_HARDER setting dynamically.
     */
    public setTryHarder(tryHarder: boolean): void {
        if (this.zxingDecoder) {
            this.zxingDecoder.setTryHarder(tryHarder);
        }
    }

    async decodeAsync(canvas: HTMLCanvasElement): Promise<QrcodeResult> {
        let startTime = performance.now();
        try {
            if (this.useZXingWasmMode) {
                // zxing-wasm mode: always use WASM primary decoder; ZXing JS secondary
                // is error-fallback only (e.g. WASM load failure). The alternating
                // strategy designed for BarcodeDetector+ZXing would halve WASM
                // scan rate and is wrong here.
                return await this.decodeRobustlyAsync(canvas);
            }
            return await this.getDecoder().decodeAsync(canvas);
        } finally {
            this.possiblyLogPerformance(startTime);
        }
    }

    async decodeRobustlyAsync(canvas: HTMLCanvasElement)
        : Promise<QrcodeResult> {
        let startTime = performance.now();
        try {
            return await this.primaryDecoder.decodeAsync(canvas);
        } catch(error) {
            if (this.secondaryDecoder) {
                // Try fallback.
                return this.secondaryDecoder.decodeAsync(canvas);
            }
            throw error;
        } finally {
            this.possiblyLogPerformance(startTime);
        }
    }

    private getDecoder(): QrcodeDecoderAsync {
        if (!this.secondaryDecoder) {
            return this.primaryDecoder;
        }

        if (this.wasPrimaryDecoderUsedInLastDecode === false) {
            this.wasPrimaryDecoderUsedInLastDecode = true;
            return this.primaryDecoder;
        }
        this.wasPrimaryDecoderUsedInLastDecode = false;
        return this.secondaryDecoder;
    }

    private possiblyLogPerformance(startTime: number) {
        if (!this.verbose) {
            return;
        }
        let executionTime = performance.now() - startTime;
        this.executionResults.push(executionTime);
        this.executions++;
        this.possiblyFlushPerformanceReport();
    }

    // Dumps mean decoding latency to console for last
    // EXECUTIONS_TO_REPORT_PERFORMANCE runs.
    // TODO(mebjas): Can we automate instrumentation runs?
    possiblyFlushPerformanceReport() {
        if (this.executions < this.EXECUTIONS_TO_REPORT_PERFORMANCE) {
            return;
        }

        let sum:number = 0;
        for (let executionTime of this.executionResults) {
            sum += executionTime;
        }
        let mean = sum / this.executionResults.length;
        // eslint-disable-next-line no-console
        console.log(`${mean} ms for ${this.executionResults.length} last runs.`);
        this.executions = 0;
        this.executionResults = [];
    }
}
