/**
 * @fileoverview
 * CSS configuration for Html5QrcodeScanner.
 * Allows switching between inline CSS and external CSS classes.
 */

/** CSS class names used when inlineCSS is false. */
export const CssClassNames = {
    // Parent container
    PARENT: "qr-reader__parent",
    PARENT_NO_BORDER: "qr-reader__noborder",

    // Scan region
    SCAN_REGION: "qr-reader__scanregion",
    SCAN_REGION_READY: "qr-reader__ready",

    // Text alignment
    TEXT_CENTER: "qr-reader__text_center",
    TEXT_LEFT: "qr-reader__text_left",

    // Dashboard
    DASHBOARD: "qr-reader__dashboard",
    SECTION: "qr-reader__section",

    // Header
    HEADER: "qr-reader__header",
    TITLE: "qr-reader__title",
    STATUS: "qr-reader__status",
    STATUS_SUCCESS: "qr-reader__status_success",
    STATUS_WARNING: "qr-reader__status_warning",
    STATUS_DEFAULT: "qr-reader__status_default",
    HEADER_MESSAGE: "qr-reader__header_message",

    // Camera selection
    CAMERA_SELECTION: "qr-reader__camera_selection",

    // File input
    FILE_INPUT: "qr-reader__file_input",
    FILE_LINK: "qr-reader__file_link",

    // Images
    CAMERA_SCAN_IMAGE: "qr-reader__camera_scan_image",
    FILE_SCAN_IMAGE: "qr-reader__file_scan_image",
};

/** Global CSS configuration. */
export class CssConfig {
    private static useInlineCss: boolean = true;

    /** Set whether to use inline CSS or external CSS classes. */
    public static setInlineCss(useInline: boolean): void {
        CssConfig.useInlineCss = useInline;
    }

    /** Check if inline CSS should be used. */
    public static isInlineCss(): boolean {
        return CssConfig.useInlineCss;
    }

    /** Check if external CSS classes should be used. */
    public static isExternalCss(): boolean {
        return !CssConfig.useInlineCss;
    }
}

/**
 * Helper to apply styles or classes to an element.
 */
export function applyStyle(
    element: HTMLElement,
    cssClass: string,
    inlineStyles: { [key: string]: string }
): void {
    if (CssConfig.isExternalCss()) {
        element.classList.add(cssClass);
    } else {
        for (const [property, value] of Object.entries(inlineStyles)) {
            (element.style as any)[property] = value;
        }
    }
}

/**
 * Helper to remove styles or classes from an element.
 */
export function removeStyle(
    element: HTMLElement,
    cssClass: string,
    inlineStyles: { [key: string]: string }
): void {
    if (CssConfig.isExternalCss()) {
        element.classList.remove(cssClass);
    } else {
        for (const property of Object.keys(inlineStyles)) {
            (element.style as any)[property] = "";
        }
    }
}
