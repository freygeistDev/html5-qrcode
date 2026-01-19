/**
 * @fileoverview
 * Strings used by {@class Html5Qrcode} & {@class Html5QrcodeScanner}
 *
 * @author mebjas <minhazav@gmail.com>
 *
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 * http://www.denso-wave.com/qrcode/faqpatent-e.html
 */

/** Supported languages for internationalization. */
export type SupportedLanguage = "en" | "de";

/** Language configuration for strings. */
export class LanguageConfig {
    private static currentLanguage: SupportedLanguage = "en";

    public static setLanguage(lang: SupportedLanguage): void {
        LanguageConfig.currentLanguage = lang;
    }

    public static getLanguage(): SupportedLanguage {
        return LanguageConfig.currentLanguage;
    }

    public static isGerman(): boolean {
        return LanguageConfig.currentLanguage === "de";
    }
}

/**
 * Strings used in {@class Html5Qrcode}.
 */
export class Html5QrcodeStrings {

    public static codeParseError(exception: any): string {
        return `QR code parse error, error = ${exception}`;
    }

    public static errorGettingUserMedia(error: any): string {
        return `Error getting userMedia, error = ${error}`;
    }

    public static onlyDeviceSupportedError(): string {
        return "The device doesn't support navigator.mediaDevices , only "
        + "supported cameraIdOrConfig in this case is deviceId parameter "
        + "(string).";
    }

    public static cameraStreamingNotSupported(): string {
        return "Camera streaming not supported by the browser.";
    }

    public static unableToQuerySupportedDevices(): string {
        return "Unable to query supported devices, unknown error.";
    }

    public static insecureContextCameraQueryError(): string {
        return "Camera access is only supported in secure context like https "
        + "or localhost.";
    }

    public static scannerPaused(): string {
        return "Scanner paused";
    }
}

/**
 * Strings used in {@class Html5QrcodeScanner}.
 * 
 * TODO(mebjas): Support internalization.
 */
export class Html5QrcodeScannerStrings {

    public static scanningStatus(): string {
        return LanguageConfig.isGerman() ? "Scannen" : "Scanning";
    }

    public static idleStatus(): string {
        return LanguageConfig.isGerman() ? "Leerlauf" : "Idle";
    }

    public static errorStatus(): string {
        return LanguageConfig.isGerman() ? "Fehler" : "Error";
    }

    public static permissionStatus(): string {
        return LanguageConfig.isGerman() ? "Genehmigung" : "Permission";
    }

    public static noCameraFoundErrorStatus(): string {
        return LanguageConfig.isGerman() ? "Keine Kameras" : "No Cameras";
    }

    public static lastMatch(decodedText: string): string {
        return LanguageConfig.isGerman()
            ? `Letzte Übereinstimmung: ${decodedText}`
            : `Last Match: ${decodedText}`;
    }

    public static codeScannerTitle(): string {
        return "Code Scanner";
    }

    public static cameraPermissionTitle(): string {
        return LanguageConfig.isGerman()
            ? "Kameraberechtigungen anfordern"
            : "Request Camera Permissions";
    }

    public static cameraPermissionRequesting(): string {
        return LanguageConfig.isGerman()
            ? "Kameraberechtigungen anfordern..."
            : "Requesting camera permissions...";
    }

    public static noCameraFound(): string {
        return LanguageConfig.isGerman()
            ? "Keine Kamera gefunden"
            : "No camera found";
    }

    public static scanButtonStopScanningText(): string {
        return LanguageConfig.isGerman() ? "Scannen beenden" : "Stop Scanning";
    }

    public static scanButtonStartScanningText(): string {
        return LanguageConfig.isGerman() ? "Scan starten" : "Start Scanning";
    }

    public static torchOnButton(): string {
        return LanguageConfig.isGerman()
            ? "Taschenlampe einschalten"
            : "Switch On Torch";
    }

    public static torchOffButton(): string {
        return LanguageConfig.isGerman()
            ? "Taschenlampe ausschalten"
            : "Switch Off Torch";
    }

    public static torchOnFailedMessage(): string {
        return LanguageConfig.isGerman()
            ? "Taschenlampe konnte nicht eingeschaltet werden"
            : "Failed to turn on torch";
    }

    public static torchOffFailedMessage(): string {
        return LanguageConfig.isGerman()
            ? "Taschenlampe konnte nicht ausgeschaltet werden"
            : "Failed to turn off torch";
    }

    public static scanButtonScanningStarting(): string {
        return LanguageConfig.isGerman()
            ? "Kamera wird gestartet..."
            : "Launching Camera...";
    }

    /**
     * Text to show when camera scan is selected.
     *
     * This will be used to switch to file based scanning.
     */
    public static textIfCameraScanSelected(): string {
        return LanguageConfig.isGerman()
            ? "Bilddatei scannen"
            : "Scan an Image File";
    }

    /**
     * Text to show when file based scan is selected.
     *
     * This will be used to switch to camera based scanning.
     */
    public static textIfFileScanSelected(): string {
        return LanguageConfig.isGerman()
            ? "Mit Kamera direkt scannen"
            : "Scan using camera directly";
    }

    public static selectCamera(): string {
        return LanguageConfig.isGerman() ? "Kamera wählen" : "Select Camera";
    }

    public static fileSelectionChooseImage(): string {
        return LanguageConfig.isGerman() ? "Bild auswählen" : "Choose Image";
    }

    public static fileSelectionChooseAnother(): string {
        return LanguageConfig.isGerman()
            ? "Anderes Bild wählen"
            : "Choose Another";
    }

    public static fileSelectionNoImageSelected(): string {
        return LanguageConfig.isGerman()
            ? "Kein Bild ausgewählt"
            : "No image choosen";
    }

    /** Prefix to be given to anonymous cameras. */
    public static anonymousCameraPrefix(): string {
        return LanguageConfig.isGerman()
            ? "Anonyme Kamera"
            : "Anonymous Camera";
    }

    public static dragAndDropMessage(): string {
        return LanguageConfig.isGerman()
            ? "Oder Bild zum Scannen ablegen"
            : "Or drop an image to scan";
    }

    public static dragAndDropMessageOnlyImages(): string {
        return LanguageConfig.isGerman()
            ? "Oder Bild zum Scannen ablegen (andere Dateien nicht unterstützt)"
            : "Or drop an image to scan (other files not supported)";
    }

    /** Value for zoom. */
    public static zoom(): string {
        return "Zoom";
    }

    public static loadingImage(): string {
        return LanguageConfig.isGerman()
            ? "Bild wird geladen..."
            : "Loading image...";
    }

    public static cameraScanAltText(): string {
        return LanguageConfig.isGerman()
            ? "Kamerabasierter Scan"
            : "Camera based scan";
    }

    public static fileScanAltText(): string {
        return LanguageConfig.isGerman()
            ? "Dateibasierter Scan"
            : "File based scan";
    }
}

/** Strings used in {@class LibraryInfoDiv} */
export class LibraryInfoStrings {

    public static poweredBy(): string {
        return "Powered by ";
    }

    public static reportIssues(): string {
        return "Report issues";
    }
}
