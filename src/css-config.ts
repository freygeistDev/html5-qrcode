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
    SECTION_CONTROL_PANEL: "qr-reader__section_control_panel",
    CAMERA_SCAN_REGION: "qr-reader__camera_scan_region",
    FILE_SCAN_REGION: "qr-reader__file_scan_region",

    // Header
    HEADER: "qr-reader__header",
    TITLE: "qr-reader__title",
    STATUS: "qr-reader__status",
    STATUS_SUCCESS: "qr-reader__status_success",
    STATUS_WARNING: "qr-reader__status_warning",
    STATUS_DEFAULT: "qr-reader__status_default",
    HEADER_MESSAGE: "qr-reader__header_message",
    HEADER_MESSAGE_VISIBLE: "qr-reader__header_message--visible",

    // Camera selection
    CAMERA_SELECTION: "qr-reader__camera_selection",
    CAMERA_SELECTION_SELECT: "qr-reader__camera_select",

    // Buttons
    BUTTON: "qr-reader__button",
    BUTTON_START: "qr-reader__button_start",
    BUTTON_STOP: "qr-reader__button_stop",
    BUTTON_PERMISSION: "qr-reader__button_permission",
    BUTTON_TORCH: "qr-reader__button_torch",

    // Display states
    HIDDEN: "qr-reader__hidden",
    VISIBLE: "qr-reader__visible",
    VISIBLE_BLOCK: "qr-reader__visible_block",
    VISIBLE_INLINE_BLOCK: "qr-reader__visible_inline_block",

    // Element states
    DISABLED: "qr-reader__disabled",
    ENABLED: "qr-reader__enabled",

    // File input
    FILE_INPUT: "qr-reader__file_input",
    FILE_LINK: "qr-reader__file_link",
    FILE_SELECTION: "qr-reader__file_selection",
    FILE_SELECTION_BUTTON: "qr-reader__file_selection_button",
    FILE_SELECTION_LABEL: "qr-reader__file_selection_label",

    // Images
    CAMERA_SCAN_IMAGE: "qr-reader__camera_scan_image",
    FILE_SCAN_IMAGE: "qr-reader__file_scan_image",

    // Swap link
    SWAP_LINK: "qr-reader__swap_link",
    SWAP_CONTAINER: "qr-reader__swap_container",

    // Zoom
    ZOOM_CONTAINER: "qr-reader__zoom_container",
    ZOOM_SLIDER: "qr-reader__zoom_slider",
    ZOOM_LABEL: "qr-reader__zoom_label",

    // Torch
    TORCH_BUTTON: "qr-reader__torch_button",

    // Library info
    LIBRARY_INFO: "qr-reader__library_info",
    LIBRARY_INFO_LINK: "qr-reader__library_info_link",

    // Drag and drop
    DROP_ZONE: "qr-reader__drop_zone",
    DROP_ZONE_ACTIVE: "qr-reader__drop_zone--active",

    // Video
    VIDEO_CONTAINER: "qr-reader__video_container",
    VIDEO_ELEMENT: "qr-reader__video",
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

/**
 * Helper to show an element (display: block).
 */
export function showElement(
    element: HTMLElement,
    displayType: "block" | "inline-block" | "inline" = "block"
): void {
    if (CssConfig.isExternalCss()) {
        element.classList.remove(CssClassNames.HIDDEN);
        if (displayType === "inline-block") {
            element.classList.add(CssClassNames.VISIBLE_INLINE_BLOCK);
        } else {
            element.classList.add(CssClassNames.VISIBLE_BLOCK);
        }
    } else {
        element.style.display = displayType;
    }
}

/**
 * Helper to hide an element (display: none).
 */
export function hideElement(element: HTMLElement): void {
    if (CssConfig.isExternalCss()) {
        element.classList.remove(CssClassNames.VISIBLE_BLOCK);
        element.classList.remove(CssClassNames.VISIBLE_INLINE_BLOCK);
        element.classList.add(CssClassNames.HIDDEN);
    } else {
        element.style.display = "none";
    }
}

/**
 * Helper to set element opacity.
 */
export function setOpacity(element: HTMLElement, opacity: string): void {
    if (CssConfig.isExternalCss()) {
        if (opacity === "1" || opacity === "") {
            element.classList.remove(CssClassNames.DISABLED);
            element.classList.add(CssClassNames.ENABLED);
        } else {
            element.classList.remove(CssClassNames.ENABLED);
            element.classList.add(CssClassNames.DISABLED);
        }
    } else {
        element.style.opacity = opacity;
    }
}

/**
 * Helper to set element as visually disabled (reduced opacity).
 */
export function setVisuallyDisabled(element: HTMLElement, disabled: boolean): void {
    if (CssConfig.isExternalCss()) {
        if (disabled) {
            element.classList.add(CssClassNames.DISABLED);
            element.classList.remove(CssClassNames.ENABLED);
        } else {
            element.classList.remove(CssClassNames.DISABLED);
            element.classList.add(CssClassNames.ENABLED);
        }
    } else {
        element.style.opacity = disabled ? "0.5" : "1";
    }
}
