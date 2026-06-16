/**
 * @fileoverview - Global export file.
 * HTML5 QR code & barcode scanning library.
 * - Decode QR Code.
 * - Decode different kinds of barcodes.
 * - Decode using web cam, smart phone camera or using images on local file
 *   system.
 *
 * @author mebjas <minhazav@gmail.com>
 *
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 * http://www.denso-wave.com/qrcode/faqpatent-e.html
 */

const jtiHtml5QrcodeRevision = "20260529-ios-surface-diag1";

if (typeof window !== "undefined") {
    const host = window as any;
    host.__JTI_HTML5_QRCODE_REVISION = jtiHtml5QrcodeRevision;
    if (!Array.isArray(host.__JTI_HTML5_QRCODE_SURFACE_EVENTS)) {
        host.__JTI_HTML5_QRCODE_SURFACE_EVENTS = [];
    }
}

export {
    Html5Qrcode,
    Html5QrcodeFullConfig,
    Html5QrcodeCameraScanConfig
} from "./html5-qrcode";
export type {
    Html5QrcodeDebugMeta,
    Html5QrcodeDebugCandidateMode
} from "./html5-qrcode";
export { Html5QrcodeScanner } from "./html5-qrcode-scanner";
export { LanguageConfig, SupportedLanguage } from "./strings";
export {
    Html5QrcodeSupportedFormats,
    Html5QrcodeResult,
    QrcodeSuccessCallback,
    QrcodeErrorCallback
} from "./core";
export { Html5QrcodeScannerState } from "./state-manager";
export { Html5QrcodeScanType } from "./core";
export {
    CameraCapabilities,
    CameraDevice
} from "./camera/core";

// Image preprocessing exports
export {
    ImagePreprocessingConfig,
    ImagePreprocessor,
    PREPROCESSING_PRESETS
} from "./image-preprocessing";
