/**
 * @module
 * Complete Scanner build on top of {@link Html5Qrcode}.
 * - Decode QR Code using web cam or smartphone camera
 * 
 * @author mebjas <minhazav@gmail.com>
 * 
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 * http://www.denso-wave.com/qrcode/faqpatent-e.html
 */
import {
    Html5QrcodeConstants,
    Html5QrcodeScanType,
    QrcodeSuccessCallback,
    QrcodeErrorCallback,
    Html5QrcodeResult,
    Html5QrcodeError,
    Html5QrcodeErrorFactory,
    BaseLoggger,
    Logger,
    isNullOrUndefined,
    clip,
} from "./core";

import { CameraCapabilities } from "./camera/core";

import { CameraDevice } from "./camera/core";

import {
    Html5Qrcode,
    Html5QrcodeConfigs,
    Html5QrcodeCameraScanConfig,
    Html5QrcodeDecodingBudget,
    Html5QrcodeScanRegion,
    Html5QrcodeFullConfig,
    Html5QrcodeDebugMeta,
    Html5QrcodeDebugCandidateMode,
} from "./html5-qrcode";

import {
    Html5QrcodeScannerStrings,
    LanguageConfig,
    SupportedLanguage,
} from "./strings";

import {
    ASSET_FILE_SCAN,
    ASSET_CAMERA_SCAN,
} from "./image-assets";

import {
    PersistedDataManager
} from "./storage";

import {
    LibraryInfoContainer
} from "./ui";

import {
  CameraPermissions
} from "./camera/permissions";

import { Html5QrcodeScannerState } from "./state-manager";

import { ScanTypeSelector } from "./ui/scanner/scan-type-selector";

import { TorchButton } from "./ui/scanner/torch-button";

import {
    FileSelectionUi,
    OnFileSelected
} from "./ui/scanner/file-selection-ui";

import {
    BaseUiElementFactory,
    PublicUiElementIdAndClasses
} from "./ui/scanner/base";

import { CameraSelectionUi } from "./ui/scanner/camera-selection-ui";
import { CameraZoomUi } from "./ui/scanner/camera-zoom-ui";
import {
    CssConfig,
    CssClassNames,
    applyStyle,
    showElement,
    hideElement,
    setVisuallyDisabled
} from "./css-config";

import {
    ImagePreprocessingConfig,
    ImagePreprocessor,
    PREPROCESSING_PRESETS
} from "./image-preprocessing";

/**
 * Different states of QR Code Scanner.
 */
enum Html5QrcodeScannerStatus {
    STATUS_DEFAULT = 0,
    STATUS_SUCCESS = 1,
    STATUS_WARNING = 2,
    STATUS_REQUESTING_PERMISSION = 3,
}

/**
 * Interface for controlling different aspects of {@class Html5QrcodeScanner}.
 */
export interface Html5QrcodeScannerConfig
    extends Html5QrcodeCameraScanConfig, Html5QrcodeConfigs {

    /**
     * If `true` the library will remember if the camera permissions
     * were previously granted and what camera was last used. If the permissions
     * is already granted for "camera", QR code scanning will automatically
     * start for previously used camera.
     * 
     * Note: default value is `true`.
     */
    rememberLastUsedCamera?: boolean | undefined;

    /**
     * Sets the desired scan types to be supported in the scanner.
     * 
     *  - Not setting a value will follow the default order supported by
     *      library.
     *  - First value would be used as the default value. Example:
     *    - [SCAN_TYPE_CAMERA, SCAN_TYPE_FILE]: Camera will be default type,
     *      user can switch to file based scan.
     *    - [SCAN_TYPE_FILE, SCAN_TYPE_CAMERA]: File based scan will be default
     *      type, user can switch to camera based scan.
     *  - Setting only value will disable option to switch to other. Example:
     *    - [SCAN_TYPE_CAMERA] - Only camera based scan supported.
     *    - [SCAN_TYPE_FILE] - Only file based scan supported.
     *  - Setting wrong values or multiple values will fail.
     */
    supportedScanTypes?: Array<Html5QrcodeScanType> | [];

    /**
     * If `true` the rendered UI will have button to turn flash on or off
     * based on device + browser support.
     * 
     * Note: default value is `false`.
     */
    showTorchButtonIfSupported?: boolean | undefined;

    /**
     * If `true` the rendered UI will have slider to zoom camera based on
     * device + browser support.
     * 
     * Note: default value is `false`.
     * 
     * TODO(minhazav): Document this API, currently hidden.
     */
    showZoomSliderIfSupported?: boolean | undefined;

    /**
     * Default zoom value if supported.
     *
     * Note: default value is 1x.
     *
     * TODO(minhazav): Document this API, currently hidden.
     */
    defaultZoomValueIfSupported?: number | undefined;

    /**
     * Language for UI strings.
     *
     * Supported values: "en" (English), "de" (German)
     * Note: default value is "en".
     */
    lang?: SupportedLanguage | undefined;

    /**
     * If `false`, the library will use CSS classes instead of inline styles.
     * This allows you to provide your own external CSS file.
     *
     * Note: default value is `true` (inline CSS).
     */
    inlineCSS?: boolean | undefined;

    /**
     * If `true`, the decoder will try harder to find codes.
     * Improves detection of difficult codes (small, low contrast, etc.)
     * at the cost of slightly reduced performance.
     *
     * Note: default value is `false`.
     */
    tryHarder?: boolean | undefined;

    /**
     * Image preprocessing configuration for improving detection of
     * difficult codes (small Data Matrix, codes behind foil, etc.).
     *
     * Can be:
     * - A preset name: "none", "light", "standard", "aggressive", "dataMatrix"
     * - A custom ImagePreprocessingConfig object
     *
     * Note: default is no preprocessing.
     */
    imagePreprocessing?:
        | "none"
        | "light"
        | "standard"
        | "aggressive"
        | "dataMatrix"
        | ImagePreprocessingConfig
        | undefined;

    /**
     * Optional callback to receive the canvas used for decoding.
     * Useful for debug previews of the actual input frame.
     */
    debugCallback?:
        ((canvas: HTMLCanvasElement, meta?: Html5QrcodeDebugMeta) => void)
        | undefined;

    /**
     * Controls which debug candidates are emitted.
     * Default: "attempted".
     */
    debugCandidateMode?: Html5QrcodeDebugCandidateMode | undefined;

    /**
     * If `true`, zoom will be automatically enabled when available.
     * The zoom level is set via `autoZoomLevel` or defaults to 2x.
     *
     * Note: default value is `false`.
     */
    autoZoom?: boolean | undefined;

    /**
     * Zoom level for auto-zoom feature (1.0 - max zoom).
     * Only used if `autoZoom` is `true`.
     *
     * Note: default value is `2.0`.
     */
    autoZoomLevel?: number | undefined;

    /**
     * If `true`, torch/flash will be automatically enabled when available.
     * Useful for scanning in low-light conditions.
     *
     * Note: default value is `false`.
     */
    autoTorch?: boolean | undefined;

    /**
     * Video resolution preference for camera.
     * Higher resolution improves detection of small codes.
     *
     * Note: default is "hd" (1280x720).
     */
    videoResolution?: "sd" | "hd" | "fullHd" | "4k" | undefined;

    /**
     * Optional normalized decoder crop region.
     *
     * If set, the decoder scans only this region of the viewfinder.
     */
    scanRegion?: Html5QrcodeScanRegion | undefined;

    /**
     * Optional flag reserved for a future dedicated DataMatrix DPM mode.
     */
    datamatrixDpmMode?: boolean | undefined;

    /**
     * Optional decode-effort hint reserved for future decoder-side budgets.
     */
    decodingBudget?: Html5QrcodeDecodingBudget | undefined;
    tryDenoise?: boolean | undefined;
    tryRotate?: boolean | undefined;
    tryDownscale?: boolean | undefined;
    tryInvert?: boolean | undefined;
    isPure?: boolean | undefined;
    returnErrors?: boolean | undefined;
    downscaleThreshold?: number | undefined;
    binarizer?: string | undefined;
    maxDecodeWidth?: number | undefined;
    maxNumberOfSymbols?: number | undefined;
    zxingWasmProcessing?: "raw" | "invert" | "dual" | undefined;
    combineZxingWasmProcessing?: boolean | undefined;
}

function toHtml5QrcodeCameraScanConfig(config: Html5QrcodeScannerConfig)
    : Html5QrcodeCameraScanConfig {
    return {
        fps: config.fps,
        qrbox: config.qrbox,
        aspectRatio: config.aspectRatio,
        disableFlip: config.disableFlip,
        videoConstraints: config.videoConstraints,
        autoFocusOnStart: config.autoFocusOnStart,
        autoFocusMode: config.autoFocusMode,
        autoFocusPoint: config.autoFocusPoint,
        autoFocusDistance: config.autoFocusDistance,
        autoFocusDistanceRatio: config.autoFocusDistanceRatio,
        autoFocusMaxRetries: config.autoFocusMaxRetries,
        autoFocusRetryIntervalMs: config.autoFocusRetryIntervalMs,
        scanRegion: config.scanRegion,
        datamatrixDpmMode: config.datamatrixDpmMode,
        decodingBudget: config.decodingBudget
    };
}

function toHtml5QrcodeFullConfig(
    config: Html5QrcodeScannerConfig,
    verbose: boolean | undefined,
    imagePreprocessor: ImagePreprocessor | null
): Html5QrcodeFullConfig {
    return {
        formatsToSupport: config.formatsToSupport,
        useBarCodeDetectorIfSupported: config.useBarCodeDetectorIfSupported,
        experimentalFeatures: config.experimentalFeatures,
        verbose: verbose,
        tryHarder: config.tryHarder,
        useZXingWasm: config.useZXingWasm,
        zxingWasmBasePath: config.zxingWasmBasePath,
        datamatrixDpmMode: config.datamatrixDpmMode,
        decodingBudget: config.decodingBudget,
        tryDenoise: config.tryDenoise,
        tryRotate: config.tryRotate,
        tryDownscale: config.tryDownscale,
        tryInvert: config.tryInvert,
        isPure: config.isPure,
        returnErrors: config.returnErrors,
        downscaleThreshold: config.downscaleThreshold,
        binarizer: config.binarizer,
        maxDecodeWidth: config.maxDecodeWidth,
        maxNumberOfSymbols: config.maxNumberOfSymbols,
        zxingWasmProcessing: config.zxingWasmProcessing,
        combineZxingWasmProcessing: config.combineZxingWasmProcessing,
        scanRegion: config.scanRegion,
        imagePreprocessor: imagePreprocessor ?? undefined,
        debugCallback: config.debugCallback,
        debugCandidateMode: config.debugCandidateMode
    };
}

/**
 * End to end web based QR and Barcode Scanner.
 * 
 * Use this class for setting up QR scanner in your web application with
 * few lines of codes.
 * 
 * -   Supports camera as well as file based scanning.
 * -   Depending on device supports camera selection, zoom and torch features.
 * -   Supports different kind of 2D and 1D codes {@link Html5QrcodeSupportedFormats}.
 */
export class Html5QrcodeScanner {

    //#region private fields
    private elementId: string;
    private config: Html5QrcodeScannerConfig;
    private verbose: boolean;
    private currentScanType: Html5QrcodeScanType;
    private sectionSwapAllowed: boolean;
    private persistedDataManager: PersistedDataManager;
    private scanTypeSelector: ScanTypeSelector;
    private logger: Logger;
    private imagePreprocessor: ImagePreprocessor | null = null;

    // Initally null fields.
    private html5Qrcode: Html5Qrcode | undefined;
    private qrCodeSuccessCallback: QrcodeSuccessCallback | undefined;
    private qrCodeErrorCallback: QrcodeErrorCallback | undefined;
    private lastMatchFound: string | null = null;
    private cameraScanImage: HTMLImageElement | null = null;
    private fileScanImage: HTMLImageElement | null = null;
    private fileSelectionUi: FileSelectionUi | null = null;
    //#endregion

    /**
     * Creates instance of this class.
     *
     * @param elementId Id of the HTML element.
     * @param config Extra configurations to tune the code scanner.
     * @param verbose - If true, all logs would be printed to console. 
     */
    public constructor(
        elementId: string,
        config: Html5QrcodeScannerConfig | undefined,
        verbose: boolean | undefined) {
        this.elementId = elementId;
        this.config = this.createConfig(config);
        this.verbose = verbose === true;

        // Set language for UI strings
        if (config?.lang) {
            LanguageConfig.setLanguage(config.lang);
        }

        // Set CSS mode (inline or external)
        CssConfig.setInlineCss(config?.inlineCSS !== false);

        // Initialize image preprocessor if configured
        this.initializeImagePreprocessor(config);

        if (!document.getElementById(elementId)) {
            throw `HTML Element with id=${elementId} not found`;
        }

        this.scanTypeSelector = new ScanTypeSelector(
            this.config.supportedScanTypes);
        this.currentScanType = this.scanTypeSelector.getDefaultScanType();

        this.sectionSwapAllowed = true;
        this.logger = new BaseLoggger(this.verbose);

        this.persistedDataManager = new PersistedDataManager();
        if (config!.rememberLastUsedCamera !== true) {
            this.persistedDataManager.reset();
        }
    }

    /**
     * Initialize the image preprocessor based on config.
     */
    private initializeImagePreprocessor(
        config: Html5QrcodeScannerConfig | undefined
    ): void {
        if (!config?.imagePreprocessing) {
            this.imagePreprocessor = null;
            return;
        }

        let preprocessingConfig: ImagePreprocessingConfig;

        if (typeof config.imagePreprocessing === "string") {
            // Use preset
            switch (config.imagePreprocessing) {
                case "none":
                    preprocessingConfig = PREPROCESSING_PRESETS.NONE;
                    break;
                case "light":
                    preprocessingConfig = PREPROCESSING_PRESETS.LIGHT;
                    break;
                case "standard":
                    preprocessingConfig = PREPROCESSING_PRESETS.STANDARD;
                    break;
                case "aggressive":
                    preprocessingConfig = PREPROCESSING_PRESETS.AGGRESSIVE;
                    break;
                case "dataMatrix":
                    preprocessingConfig = PREPROCESSING_PRESETS.DATA_MATRIX;
                    break;
                default:
                    preprocessingConfig = PREPROCESSING_PRESETS.NONE;
            }
        } else {
            // Use custom config
            preprocessingConfig = config.imagePreprocessing;
        }

        this.imagePreprocessor = new ImagePreprocessor(preprocessingConfig);

        if (this.verbose && this.imagePreprocessor.isEnabled()) {
            console.log(
                "Image preprocessing enabled:",
                this.imagePreprocessor.getConfig()
            );
        }
    }

    /**
     * Get video constraints based on videoResolution config.
     */
    private getVideoConstraintsForResolution(): MediaTrackConstraints {
        const resolution = this.config.videoResolution || "hd";
        let width: number;
        let height: number;

        switch (resolution) {
            case "sd":
                width = 640;
                height = 480;
                break;
            case "hd":
                width = 1280;
                height = 720;
                break;
            case "fullHd":
                width = 1920;
                height = 1080;
                break;
            case "4k":
                width = 3840;
                height = 2160;
                break;
            default:
                width = 1280;
                height = 720;
        }

        return {
            width: { min: width, ideal: width },
            height: { min: height, ideal: height }
        };
    }

    /**
     * Renders the User Interface.
     * 
     * @param qrCodeSuccessCallback Callback called when an instance of a QR
     * code or any other supported bar code is found.
     * @param qrCodeErrorCallback optional, callback called in cases where no
     * instance of QR code or any other supported bar code is found.
     */
    public render(
        qrCodeSuccessCallback: QrcodeSuccessCallback,
        qrCodeErrorCallback: QrcodeErrorCallback | undefined) {
        this.lastMatchFound = null;

        // Add wrapper to success callback.
        this.qrCodeSuccessCallback
            = (decodedText: string, result: Html5QrcodeResult) => {
            if (qrCodeSuccessCallback) {
                qrCodeSuccessCallback(decodedText, result);
            } else {
                if (this.lastMatchFound === decodedText) {
                    return;
                }

                this.lastMatchFound = decodedText;
                this.setHeaderMessage(
                    Html5QrcodeScannerStrings.lastMatch(decodedText),
                    Html5QrcodeScannerStatus.STATUS_SUCCESS);
            }
        };

        // Add wrapper to failure callback
        this.qrCodeErrorCallback =
            (errorMessage: string, error: Html5QrcodeError) => {
            if (qrCodeErrorCallback) {
                qrCodeErrorCallback(errorMessage, error);
            }
        };

        const container = document.getElementById(this.elementId);
        if (!container) {
            throw `HTML Element with id=${this.elementId} not found`;
        }
        container.innerHTML = "";
        this.createBasicLayout(container!);
        this.html5Qrcode = new Html5Qrcode(
            this.getScanRegionId(),
            toHtml5QrcodeFullConfig(
                this.config, this.verbose, this.imagePreprocessor));
    }

    //#region State related public APIs
    /**
     * Pauses the ongoing scan.
     * 
     * Notes:
     * -   Should only be called if camera scan is ongoing.
     * 
     * @param shouldPauseVideo (Optional, default = false) If `true`
     * the video will be paused.
     * 
     * @throws error if method is called when scanner is not in scanning state.
     */
    public pause(shouldPauseVideo?: boolean) {
        if (isNullOrUndefined(shouldPauseVideo) || shouldPauseVideo !== true) {
            shouldPauseVideo = false;
        }

        this.getHtml5QrcodeOrFail().pause(shouldPauseVideo);
    }
    
    /**
     * Resumes the paused scan.
     * 
     * If the video was previously paused by setting `shouldPauseVideo`
     * to `true` in {@link Html5QrcodeScanner#pause(shouldPauseVideo)},
     * calling this method will resume the video.
     * 
     * Notes:
     * -   Should only be called if camera scan is ongoing.
     * -   With this caller will start getting results in success and error
     * callbacks.
     * 
     * @throws error if method is called when scanner is not in paused state.
     */
    public resume() {
        this.getHtml5QrcodeOrFail().resume();
    }

    /**
     * Gets state of the camera scan.
     *
     * @returns state of type {@link Html5QrcodeScannerState}.
     */
    public getState(): Html5QrcodeScannerState {
       return this.getHtml5QrcodeOrFail().getState();
    }

    /**
     * Removes the QR Code scanner UI.
     * 
     * @returns Promise which succeeds if the cleanup is complete successfully,
     *  fails otherwise.
     */
    public clear(): Promise<void> {
        const emptyHtmlContainer = () => {
            const mainContainer = document.getElementById(this.elementId);
            if (mainContainer) {
                mainContainer.innerHTML = "";
                this.resetBasicLayout(mainContainer);
            }
        }

        if (this.html5Qrcode) {
            return new Promise((resolve, reject) => {
                if (!this.html5Qrcode) {
                    resolve();
                    return;
                }
                if (this.html5Qrcode.isScanning) {
                    this.html5Qrcode.stop().then((_) => {
                        if (!this.html5Qrcode) {
                            resolve();
                            return;
                        }

                        this.html5Qrcode.clear();
                        emptyHtmlContainer();
                        resolve();
                    }).catch((error) => {
                        if (this.verbose) {
                            this.logger.logError(
                                "Unable to stop qrcode scanner", error);
                        }
                        reject(error);
                    });
                } else {
                    // Assuming file based scan was ongoing.
                    this.html5Qrcode.clear();
                    emptyHtmlContainer();
                    resolve();
                }
            });
        }

        return Promise.resolve();
    }
    //#endregion

    //#region Beta APIs to modify running stream state.
    /**
     * Returns the capabilities of the running video track.
     * 
     * Read more: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getConstraints
     * 
     * Note: Should only be called if {@link Html5QrcodeScanner#getState()}
     *   returns {@link Html5QrcodeScannerState#SCANNING} or 
     *   {@link Html5QrcodeScannerState#PAUSED}.
     *
     * @returns the capabilities of a running video track.
     * @throws error if the scanning is not in running state.
     */
    public getRunningTrackCapabilities(): MediaTrackCapabilities {
        return this.getHtml5QrcodeOrFail().getRunningTrackCapabilities();
    }

    /**
     * Returns the object containing the current values of each constrainable
     * property of the running video track.
     * 
     * Read more: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getSettings
     * 
     * Note: Should only be called if {@link Html5QrcodeScanner#getState()}
     *   returns {@link Html5QrcodeScannerState#SCANNING} or 
     *   {@link Html5QrcodeScannerState#PAUSED}.
     *
     * @returns the supported settings of the running video track.
     * @throws error if the scanning is not in running state.
     */
    public getRunningTrackSettings(): MediaTrackSettings {
        return this.getHtml5QrcodeOrFail().getRunningTrackSettings();
    }

    /**
     * Apply a video constraints on running video track from camera.
     *
     * Note: Should only be called if {@link Html5QrcodeScanner#getState()}
     *   returns {@link Html5QrcodeScannerState#SCANNING} or 
     *   {@link Html5QrcodeScannerState#PAUSED}.
     *
     * @param {MediaTrackConstraints} specifies a variety of video or camera
     *  controls as defined in
     *  https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
     * @returns a Promise which succeeds if the passed constraints are applied,
     *  fails otherwise.
     * @throws error if the scanning is not in running state.
     */
    public applyVideoConstraints(videoConstaints: MediaTrackConstraints)
        : Promise<void> {
        return this.getHtml5QrcodeOrFail().applyVideoConstraints(videoConstaints);
    }
    //#endregion

    //#region Private methods
    private getHtml5QrcodeOrFail() {
        if (!this.html5Qrcode) {
            throw "Code scanner not initialized.";
        }
        return this.html5Qrcode!;
    }

    private createConfig(config: Html5QrcodeScannerConfig | undefined)
        : Html5QrcodeScannerConfig {
        if (config) {
            if (!config.fps) {
                config.fps = Html5QrcodeConstants.SCAN_DEFAULT_FPS;
            }

            if (config.rememberLastUsedCamera !== (
                !Html5QrcodeConstants.DEFAULT_REMEMBER_LAST_CAMERA_USED)) {
                config.rememberLastUsedCamera
                    = Html5QrcodeConstants.DEFAULT_REMEMBER_LAST_CAMERA_USED;
            }

            if (!config.supportedScanTypes) {
                config.supportedScanTypes
                    = Html5QrcodeConstants.DEFAULT_SUPPORTED_SCAN_TYPE;
            }

            return config;
        }

        return {
            fps: Html5QrcodeConstants.SCAN_DEFAULT_FPS,
            rememberLastUsedCamera:
                Html5QrcodeConstants.DEFAULT_REMEMBER_LAST_CAMERA_USED,
            supportedScanTypes:
                Html5QrcodeConstants.DEFAULT_SUPPORTED_SCAN_TYPE
        };
    }

    private createBasicLayout(parent: HTMLElement) {
        applyStyle(parent, CssClassNames.PARENT, {
            position: "relative",
            padding: "0px",
            border: "1px solid silver"
        });
        this.createHeader(parent);

        const qrCodeScanRegion = document.createElement("div");
        const scanRegionId = this.getScanRegionId();
        qrCodeScanRegion.id = scanRegionId;
        applyStyle(qrCodeScanRegion, CssClassNames.SCAN_REGION, {
            width: "100%",
            minHeight: "100px",
            textAlign: "center"
        });
        parent.appendChild(qrCodeScanRegion);
        if (ScanTypeSelector.isCameraScanType(this.currentScanType)) {
            this.insertCameraScanImageToScanRegion();
        } else {
            this.insertFileScanImageToScanRegion();
        }

        const qrCodeDashboard = document.createElement("div");
        const dashboardId = this.getDashboardId();
        qrCodeDashboard.id = dashboardId;
        applyStyle(qrCodeDashboard, CssClassNames.DASHBOARD, {
            width: "100%"
        });
        parent.appendChild(qrCodeDashboard);

        this.setupInitialDashboard(qrCodeDashboard);
    }

    private resetBasicLayout(mainContainer: HTMLElement) {
        applyStyle(mainContainer, CssClassNames.PARENT_NO_BORDER, {
            border: "none"
        });
    }

    private setupInitialDashboard(dashboard: HTMLElement) {
        this.createSection(dashboard);
        this.createSectionControlPanel();
        if (this.scanTypeSelector.hasMoreThanOneScanType()) {
            this.createSectionSwap();
        }
    }

    private createHeader(dashboard: HTMLElement) {
        const header = document.createElement("div");
        applyStyle(header, CssClassNames.HEADER, {
            textAlign: "left",
            margin: "0px"
        });
        dashboard.appendChild(header);

        let libraryInfo = new LibraryInfoContainer();
        libraryInfo.renderInto(header);

        const headerMessageContainer = document.createElement("div");
        headerMessageContainer.id = this.getHeaderMessageContainerId();
        applyStyle(headerMessageContainer, CssClassNames.HEADER_MESSAGE, {
            display: "none",
            textAlign: "center",
            fontSize: "14px",
            padding: "2px 10px",
            margin: "4px",
            borderTop: "1px solid #f6f6f6"
        });
        header.appendChild(headerMessageContainer);
    }

    private createSection(dashboard: HTMLElement) {
        const section = document.createElement("div");
        section.id = this.getDashboardSectionId();
        applyStyle(section, CssClassNames.SECTION, {
            width: "100%",
            padding: "10px 0px 10px 0px",
            textAlign: "left"
        });
        dashboard.appendChild(section);
    }

    private createCameraListUi(
        scpCameraScanRegion: HTMLDivElement,
        requestPermissionContainer: HTMLDivElement,
        requestPermissionButton?: HTMLButtonElement) {
        const $this = this;
        $this.showHideScanTypeSwapLink(false);
        $this.setHeaderMessage(
            Html5QrcodeScannerStrings.cameraPermissionRequesting());

        const createPermissionButtonIfNotExists = () => {
            if (!requestPermissionButton) {
                $this.createPermissionButton(
                    scpCameraScanRegion, requestPermissionContainer);
            }
        }

        Html5Qrcode.getCameras().then((cameras) => {
            // By this point the user has granted camera permissions.
            $this.persistedDataManager.setHasPermission(
                /* hasPermission */ true);
            $this.showHideScanTypeSwapLink(true);
            $this.resetHeaderMessage();
            if (cameras && cameras.length > 0) {
                scpCameraScanRegion.removeChild(requestPermissionContainer);
                $this.renderCameraSelection(cameras);
            } else {
                $this.setHeaderMessage(
                    Html5QrcodeScannerStrings.noCameraFound(),
                    Html5QrcodeScannerStatus.STATUS_WARNING);
                createPermissionButtonIfNotExists();
            }
        }).catch((error) => {
            $this.persistedDataManager.setHasPermission(
                /* hasPermission */ false);
            
            if (requestPermissionButton) {
                requestPermissionButton.disabled = false;
            } else {
                // Case when the permission button generation was skipped
                // likely due to persistedDataManager indicated permissions
                // exists.
                // This should ideally never happen, but if it so happened that
                // the camera retrieval failed, we want to create button this
                // time.
                createPermissionButtonIfNotExists();
            }
            $this.setHeaderMessage(
                error, Html5QrcodeScannerStatus.STATUS_WARNING);
            $this.showHideScanTypeSwapLink(true);
        });
    }

    private createPermissionButton(
        scpCameraScanRegion: HTMLDivElement,
        requestPermissionContainer: HTMLDivElement) {
        const $this = this;
        const requestPermissionButton = BaseUiElementFactory
            .createElement<HTMLButtonElement>(
                "button", this.getCameraPermissionButtonId());
        requestPermissionButton.innerText
            = Html5QrcodeScannerStrings.cameraPermissionTitle();

        requestPermissionButton.addEventListener("click", function () {
            requestPermissionButton.disabled = true;
            $this.createCameraListUi(
                scpCameraScanRegion,
                requestPermissionContainer,
                requestPermissionButton);
        });
        requestPermissionContainer.appendChild(requestPermissionButton);
    }

    private createPermissionsUi(
        scpCameraScanRegion: HTMLDivElement,
        requestPermissionContainer: HTMLDivElement) {
        const $this = this;

        // Only render last selected camera by default if the default scant type
        // is camera.
        if (ScanTypeSelector.isCameraScanType(this.currentScanType)
            && this.persistedDataManager.hasCameraPermissions()) {
            CameraPermissions.hasPermissions().then(
                (hasPermissions: boolean) => {
                if (hasPermissions) {
                    $this.createCameraListUi(
                        scpCameraScanRegion, requestPermissionContainer);
                } else {
                    $this.persistedDataManager.setHasPermission(
                        /* hasPermission */ false);
                    $this.createPermissionButton(
                        scpCameraScanRegion, requestPermissionContainer);
                }
            }).catch((_: any) => {
                $this.persistedDataManager.setHasPermission(
                    /* hasPermission */ false);
                $this.createPermissionButton(
                    scpCameraScanRegion, requestPermissionContainer);
            });
            return;
        }

        this.createPermissionButton(
            scpCameraScanRegion, requestPermissionContainer);
    }

    private createSectionControlPanel() {
        const section = document.getElementById(this.getDashboardSectionId())!;
        const sectionControlPanel = document.createElement("div");
        section.appendChild(sectionControlPanel);
        const scpCameraScanRegion = document.createElement("div");
        scpCameraScanRegion.id = this.getDashboardSectionCameraScanRegionId();
        if (ScanTypeSelector.isCameraScanType(this.currentScanType)) {
            showElement(scpCameraScanRegion, "block");
        } else {
            hideElement(scpCameraScanRegion);
        }
        sectionControlPanel.appendChild(scpCameraScanRegion);

        // Web browsers require the users to grant explicit permissions before
        // giving camera access. We need to render a button to request user
        // permission.
        // Assuming when the object is created permission is needed.
        const requestPermissionContainer = document.createElement("div");
        applyStyle(requestPermissionContainer, CssClassNames.TEXT_CENTER, {
            textAlign: "center"
        });
        scpCameraScanRegion.appendChild(requestPermissionContainer);

        // TODO(minhazav): If default scan type is file, the permission or
        // camera access shouldn't start unless user explicitly switches to
        // camera based scan. @priority: high.

        if (this.scanTypeSelector.isCameraScanRequired()) {
            this.createPermissionsUi(
                scpCameraScanRegion, requestPermissionContainer);
        }

        this.renderFileScanUi(sectionControlPanel);
    }

    private renderFileScanUi(parent: HTMLDivElement) {
        let showOnRender = ScanTypeSelector.isFileScanType(
            this.currentScanType);
        const $this = this;
        let onFileSelected: OnFileSelected = (file: File) => {
            if (!$this.html5Qrcode) {
                throw "html5Qrcode not defined";
            }

            if (!ScanTypeSelector.isFileScanType($this.currentScanType)) {
                return;
            }

            $this.setHeaderMessage(Html5QrcodeScannerStrings.loadingImage());
            $this.html5Qrcode.scanFileV2(file, /* showImage= */ true)
                .then((html5qrcodeResult: Html5QrcodeResult) => {
                    $this.resetHeaderMessage();
                    $this.qrCodeSuccessCallback!(
                        html5qrcodeResult.decodedText,
                        html5qrcodeResult);
                })
                .catch((error) => {
                    $this.setHeaderMessage(
                        error, Html5QrcodeScannerStatus.STATUS_WARNING);
                    $this.qrCodeErrorCallback!(
                        error, Html5QrcodeErrorFactory.createFrom(error));
                });
        };

        this.fileSelectionUi = FileSelectionUi.create(
            parent, showOnRender, onFileSelected);
    }

    private renderCameraSelection(cameras: Array<CameraDevice>) {
        const $this = this;
        const scpCameraScanRegion = document.getElementById(
            this.getDashboardSectionCameraScanRegionId())!;
        applyStyle(scpCameraScanRegion, CssClassNames.TEXT_CENTER, {
            textAlign: "center"
        });

        // Hide by default.
        let cameraZoomUi: CameraZoomUi = CameraZoomUi.create(
            scpCameraScanRegion, /* renderOnCreate= */ false);
        const renderCameraZoomUiIfSupported
            = (cameraCapabilities: CameraCapabilities) => {
            let zoomCapability = cameraCapabilities.zoomFeature();
            if (!zoomCapability.isSupported()) {
                return;
            }

            // Supported.
            cameraZoomUi.setOnCameraZoomValueChangeCallback((zoomValue) => {
                zoomCapability.apply(zoomValue);
            });
            let defaultZoom = 1;
            if (this.config.defaultZoomValueIfSupported) {
                defaultZoom = this.config.defaultZoomValueIfSupported;
            }
            defaultZoom = clip(
                defaultZoom, zoomCapability.min(), zoomCapability.max());
            cameraZoomUi.setValues(
                zoomCapability.min(),
                zoomCapability.max(),
                defaultZoom,
                zoomCapability.step(),
            );
            cameraZoomUi.show();
        };

        let cameraSelectUi: CameraSelectionUi = CameraSelectionUi.create(
            scpCameraScanRegion, cameras);

        // Camera Action Buttons.
        const cameraActionContainer = document.createElement("span");
        const cameraActionStartButton
            = BaseUiElementFactory.createElement<HTMLButtonElement>(
                "button", PublicUiElementIdAndClasses.CAMERA_START_BUTTON_ID);
        cameraActionStartButton.innerText
            = Html5QrcodeScannerStrings.scanButtonStartScanningText();
        cameraActionContainer.appendChild(cameraActionStartButton);

        const cameraActionStopButton
            = BaseUiElementFactory.createElement<HTMLButtonElement>(
                "button", PublicUiElementIdAndClasses.CAMERA_STOP_BUTTON_ID);
        cameraActionStopButton.innerText
            = Html5QrcodeScannerStrings.scanButtonStopScanningText();
        hideElement(cameraActionStopButton);
        cameraActionStopButton.disabled = true;
        cameraActionContainer.appendChild(cameraActionStopButton);

        // Optional torch button support.
        let torchButton: TorchButton;
        const createAndShowTorchButtonIfSupported
            = (cameraCapabilities: CameraCapabilities) => {
            if (!cameraCapabilities.torchFeature().isSupported()) {
                // Torch not supported, ignore.
                if (torchButton) {
                    torchButton.hide();
                }
                return;
            }

            if (!torchButton) {
                torchButton = TorchButton.create(
                    cameraActionContainer,
                    cameraCapabilities.torchFeature(),
                    { display: "none", marginLeft: "5px" },
                    // Callback in case of torch action failure.
                    (errorMessage) => {
                        $this.setHeaderMessage(
                            errorMessage,
                            Html5QrcodeScannerStatus.STATUS_WARNING);
                    }
                );
            } else {
                torchButton.updateTorchCapability(
                    cameraCapabilities.torchFeature());
            }
            torchButton.show();
        };

        scpCameraScanRegion.appendChild(cameraActionContainer);

        const resetCameraActionStartButton = (shouldShow: boolean) => {
            if (!shouldShow) {
                hideElement(cameraActionStartButton);
            }
            cameraActionStartButton.innerText
                = Html5QrcodeScannerStrings
                    .scanButtonStartScanningText();
            setVisuallyDisabled(cameraActionStartButton, false);
            cameraActionStartButton.disabled = false;
            if (shouldShow) {
                showElement(cameraActionStartButton, "inline-block");
            }
        };

        cameraActionStartButton.addEventListener("click", (_) => {
            // Update the UI.
            cameraActionStartButton.innerText
                = Html5QrcodeScannerStrings.scanButtonScanningStarting();
            cameraSelectUi.disable();
            cameraActionStartButton.disabled = true;
            setVisuallyDisabled(cameraActionStartButton, true);
            // Swap link is available only when both scan types are required.
            if (this.scanTypeSelector.hasMoreThanOneScanType()) {
                $this.showHideScanTypeSwapLink(false);
            }
            $this.resetHeaderMessage();            

            // Attempt starting the camera.
            const cameraId = cameraSelectUi.getValue();
            $this.persistedDataManager.setLastUsedCameraId(cameraId);

            $this.html5Qrcode!.start(
                cameraId,
                toHtml5QrcodeCameraScanConfig($this.config),
                $this.qrCodeSuccessCallback!,
                $this.qrCodeErrorCallback!)
                .then((_) => {
                    // Reset external AJAX container if present
                    $this.resetAjaxContainer();

                    cameraActionStopButton.disabled = false;
                    showElement(cameraActionStopButton, "inline-block");
                    resetCameraActionStartButton(/* shouldShow= */ false);

                    const cameraCapabilities
                        = $this.html5Qrcode!.getRunningTrackCameraCapabilities();

                    // Auto-zoom if enabled and supported
                    if ($this.config.autoZoom === true) {
                        $this.applyAutoZoom(cameraCapabilities);
                    }

                    // Auto-torch if enabled and supported
                    if ($this.config.autoTorch === true) {
                        $this.applyAutoTorch(cameraCapabilities);
                    }

                    // Show torch button if needed.
                    if (this.config.showTorchButtonIfSupported === true) {
                        createAndShowTorchButtonIfSupported(cameraCapabilities);
                    }
                    // Show zoom slider if needed.
                    if (this.config.showZoomSliderIfSupported === true) {
                        renderCameraZoomUiIfSupported(cameraCapabilities);
                    }
                })
                .catch((error) => {
                    $this.showHideScanTypeSwapLink(true);
                    cameraSelectUi.enable();
                    resetCameraActionStartButton(/* shouldShow= */ true);
                    $this.setHeaderMessage(
                        error, Html5QrcodeScannerStatus.STATUS_WARNING);
                });
        });

        if (cameraSelectUi.hasSingleItem()) {
            // If there is only one camera, start scanning directly.
            cameraActionStartButton.click();
        }

        cameraActionStopButton.addEventListener("click", (_) => {
            if (!$this.html5Qrcode) {
                throw "html5Qrcode not defined";
            }
            cameraActionStopButton.disabled = true;
            $this.html5Qrcode.stop()
                .then((_) => {
                    // Swap link is required if more than one scan types are
                    // required.
                    if(this.scanTypeSelector.hasMoreThanOneScanType()) {
                        $this.showHideScanTypeSwapLink(true);
                    }
                    
                    cameraSelectUi.enable();
                    cameraActionStartButton.disabled = false;
                    hideElement(cameraActionStopButton);
                    showElement(cameraActionStartButton, "inline-block");
                    // Reset torch state.
                    if (torchButton) {
                        torchButton.reset();
                        torchButton.hide();
                    }
                    cameraZoomUi.removeOnCameraZoomValueChangeCallback();
                    cameraZoomUi.hide();
                    $this.insertCameraScanImageToScanRegion();
                }).catch((error) => {
                    cameraActionStopButton.disabled = false;
                    $this.setHeaderMessage(
                        error, Html5QrcodeScannerStatus.STATUS_WARNING);
                });
        });

        if ($this.persistedDataManager.getLastUsedCameraId()) {
            const cameraId = $this.persistedDataManager.getLastUsedCameraId()!;
            if (cameraSelectUi.hasValue(cameraId)) {
                cameraSelectUi.setValue(cameraId);
                cameraActionStartButton.click();
            } else {
                $this.persistedDataManager.resetLastUsedCameraId();
            }
        }
    }

    private createSectionSwap() {
        const $this = this;
        const TEXT_IF_CAMERA_SCAN_SELECTED
            = Html5QrcodeScannerStrings.textIfCameraScanSelected();
        const TEXT_IF_FILE_SCAN_SELECTED
            = Html5QrcodeScannerStrings.textIfFileScanSelected();

        // TODO(minhaz): Export this as an UI element.
        const section = document.getElementById(this.getDashboardSectionId())!;
        const switchContainer = document.createElement("div");
        applyStyle(switchContainer, CssClassNames.SWAP_CONTAINER, {
            textAlign: "center"
        });
        const switchScanTypeLink
            = BaseUiElementFactory.createElement<HTMLAnchorElement>(
                "span", this.getDashboardSectionSwapLinkId());
        applyStyle(switchScanTypeLink, CssClassNames.SWAP_LINK, {
            textDecoration: "underline",
            cursor: "pointer"
        });
        switchScanTypeLink.innerText
            = ScanTypeSelector.isCameraScanType(this.currentScanType)
            ? TEXT_IF_CAMERA_SCAN_SELECTED : TEXT_IF_FILE_SCAN_SELECTED;
        switchScanTypeLink.addEventListener("click", function () {
            // TODO(minhazav): Abstract this to a different library.
            if (!$this.sectionSwapAllowed) {
                if ($this.verbose) {
                    $this.logger.logError(
                        "Section swap called when not allowed");
                }
                return;
            }

            // Cleanup states
            $this.resetHeaderMessage();
            $this.fileSelectionUi!.resetValue();
            $this.sectionSwapAllowed = false;
            
            if (ScanTypeSelector.isCameraScanType($this.currentScanType)) {
                // Swap to file based scanning.
                $this.clearScanRegion();
                hideElement($this.getCameraScanRegion());
                $this.fileSelectionUi!.show();
                switchScanTypeLink.innerText = TEXT_IF_FILE_SCAN_SELECTED;
                $this.currentScanType = Html5QrcodeScanType.SCAN_TYPE_FILE;
                $this.insertFileScanImageToScanRegion();
            } else {
                // Swap to camera based scanning.
                $this.clearScanRegion();
                showElement($this.getCameraScanRegion(), "block");
                $this.fileSelectionUi!.hide();
                switchScanTypeLink.innerText = TEXT_IF_CAMERA_SCAN_SELECTED;
                $this.currentScanType = Html5QrcodeScanType.SCAN_TYPE_CAMERA;
                $this.insertCameraScanImageToScanRegion();

                $this.startCameraScanIfPermissionExistsOnSwap();
            }

            $this.sectionSwapAllowed = true;
        });
        switchContainer.appendChild(switchScanTypeLink);
        section.appendChild(switchContainer);
    }

    // Start camera scanning automatically when swapping to camera based scan
    // if set in config and has permission.
    private startCameraScanIfPermissionExistsOnSwap() {
        const $this = this;
        if (this.persistedDataManager.hasCameraPermissions()) {
            CameraPermissions.hasPermissions().then(
                (hasPermissions: boolean) => {
                if (hasPermissions) {
                    // Start feed.
                    // Assuming at this point the permission button exists.
                    let permissionButton = document.getElementById(
                        $this.getCameraPermissionButtonId());
                    if (!permissionButton) {
                        this.logger.logError(
                            "Permission button not found, fail;");
                        throw "Permission button not found";
                    }
                    permissionButton.click();
                } else {
                    $this.persistedDataManager.setHasPermission(
                        /* hasPermission */ false);
                }
            }).catch((_: any) => {
                $this.persistedDataManager.setHasPermission(
                    /* hasPermission */ false);
            });
            return;
        }
    }

    private resetHeaderMessage() {
        const messageDiv = document.getElementById(
            this.getHeaderMessageContainerId())!;
        hideElement(messageDiv);
        if (CssConfig.isExternalCss()) {
            messageDiv.classList.remove(CssClassNames.HEADER_MESSAGE_VISIBLE);
            messageDiv.classList.remove(CssClassNames.STATUS_SUCCESS);
            messageDiv.classList.remove(CssClassNames.STATUS_WARNING);
            messageDiv.classList.remove(CssClassNames.STATUS_DEFAULT);
        }
    }

    private setHeaderMessage(
        messageText: string, scannerStatus?: Html5QrcodeScannerStatus) {
        if (!scannerStatus) {
            scannerStatus = Html5QrcodeScannerStatus.STATUS_DEFAULT;
        }

        const messageDiv = this.getHeaderMessageDiv();
        messageDiv.innerText = messageText;
        showElement(messageDiv, "block");

        if (CssConfig.isExternalCss()) {
            messageDiv.classList.add(CssClassNames.HEADER_MESSAGE_VISIBLE);
            // Remove old status classes
            messageDiv.classList.remove(CssClassNames.STATUS_SUCCESS);
            messageDiv.classList.remove(CssClassNames.STATUS_WARNING);
            messageDiv.classList.remove(CssClassNames.STATUS_DEFAULT);

            switch (scannerStatus) {
                case Html5QrcodeScannerStatus.STATUS_SUCCESS:
                    messageDiv.classList.add(CssClassNames.STATUS_SUCCESS);
                    break;
                case Html5QrcodeScannerStatus.STATUS_WARNING:
                    messageDiv.classList.add(CssClassNames.STATUS_WARNING);
                    break;
                case Html5QrcodeScannerStatus.STATUS_DEFAULT:
                default:
                    messageDiv.classList.add(CssClassNames.STATUS_DEFAULT);
                    break;
            }
        } else {
            switch (scannerStatus) {
                case Html5QrcodeScannerStatus.STATUS_SUCCESS:
                    messageDiv.style.background = "rgba(106, 175, 80, 0.26)";
                    messageDiv.style.color = "#477735";
                    break;
                case Html5QrcodeScannerStatus.STATUS_WARNING:
                    messageDiv.style.background = "rgba(203, 36, 49, 0.14)";
                    messageDiv.style.color = "#cb2431";
                    break;
                case Html5QrcodeScannerStatus.STATUS_DEFAULT:
                default:
                    messageDiv.style.background = "rgba(0, 0, 0, 0)";
                    messageDiv.style.color = "rgb(17, 17, 17)";
                    break;
            }
        }
    }

    private showHideScanTypeSwapLink(shouldDisplay?: boolean) {
        if (this.scanTypeSelector.hasMoreThanOneScanType()) {
            if (shouldDisplay !== true) {
                shouldDisplay = false;
            }

            this.sectionSwapAllowed = shouldDisplay;
            const swapLink = this.getDashboardSectionSwapLink();
            if (shouldDisplay) {
                showElement(swapLink, "inline-block");
            } else {
                hideElement(swapLink);
            }
        }
    }

    private insertCameraScanImageToScanRegion() {
        const $this = this;
        const qrCodeScanRegion = document.getElementById(
            this.getScanRegionId())!;

        if (this.cameraScanImage) {
            qrCodeScanRegion.innerHTML = "<br>";
            qrCodeScanRegion.appendChild(this.cameraScanImage);
            return;
        }

        this.cameraScanImage = new Image;
        this.cameraScanImage.onload = (_) => {
            qrCodeScanRegion.innerHTML = "<br>";
            qrCodeScanRegion.appendChild($this.cameraScanImage!);
        }
        this.cameraScanImage.width = 64;
        applyStyle(this.cameraScanImage, CssClassNames.CAMERA_SCAN_IMAGE, {
            opacity: "0.8"
        });
        this.cameraScanImage.src = ASSET_CAMERA_SCAN;
        this.cameraScanImage.alt = Html5QrcodeScannerStrings.cameraScanAltText();
    }

    private insertFileScanImageToScanRegion() {
        const $this = this;
        const qrCodeScanRegion = document.getElementById(
            this.getScanRegionId())!;

        if (this.fileScanImage) {
            qrCodeScanRegion.innerHTML = "<br>";
            qrCodeScanRegion.appendChild(this.fileScanImage);
            return;
        }

        this.fileScanImage = new Image;
        this.fileScanImage.onload = (_) => {
            qrCodeScanRegion.innerHTML = "<br>";
            qrCodeScanRegion.appendChild($this.fileScanImage!);
        }
        this.fileScanImage.width = 64;
        applyStyle(this.fileScanImage, CssClassNames.FILE_SCAN_IMAGE, {
            opacity: "0.8"
        });
        this.fileScanImage.src = ASSET_FILE_SCAN;
        this.fileScanImage.alt = Html5QrcodeScannerStrings.fileScanAltText();
    }

    private clearScanRegion() {
        const qrCodeScanRegion = document.getElementById(
            this.getScanRegionId())!;
        qrCodeScanRegion.innerHTML = "";
    }

    //#region state getters
    private getDashboardSectionId(): string {
        return `${this.elementId}__dashboard_section`;
    }

    private getDashboardSectionCameraScanRegionId(): string {
        return `${this.elementId}__dashboard_section_csr`;
    }

    private getDashboardSectionSwapLinkId(): string {
        return PublicUiElementIdAndClasses.SCAN_TYPE_CHANGE_ANCHOR_ID;
    }

    private getScanRegionId(): string {
        return `${this.elementId}__scan_region`;
    }

    private getDashboardId(): string {
        return `${this.elementId}__dashboard`;
    }

    private getHeaderMessageContainerId(): string {
        return `${this.elementId}__header_message`;
    }

    private getCameraPermissionButtonId(): string {
        return PublicUiElementIdAndClasses.CAMERA_PERMISSION_BUTTON_ID;
    }

    private getCameraScanRegion(): HTMLElement {
        return document.getElementById(
            this.getDashboardSectionCameraScanRegionId())!;
    }

    private getDashboardSectionSwapLink(): HTMLElement {
        return document.getElementById(this.getDashboardSectionSwapLinkId())!;
    }

    private getHeaderMessageDiv(): HTMLElement {
        return document.getElementById(this.getHeaderMessageContainerId())!;
    }

    /**
     * Returns the ID for an external AJAX response container.
     * This allows integration with AJAX workflows where scan results
     * need to be displayed in a custom container.
     */
    private getAjaxResponseContainerId(): string {
        return `${this.elementId}__ajax_response`;
    }

    /**
     * Resets the external AJAX response container if it exists.
     * The container should have a data-infotext attribute with default text.
     */
    public resetAjaxContainer(): void {
        const ajaxResponseContainer = document.getElementById(
            this.getAjaxResponseContainerId());

        if (ajaxResponseContainer) {
            const infotext = ajaxResponseContainer.dataset.infotext || "";
            ajaxResponseContainer.innerHTML = infotext;
            ajaxResponseContainer.removeAttribute("class");
        }
    }

    /**
     * Apply auto-zoom if supported by the camera.
     */
    private applyAutoZoom(cameraCapabilities: CameraCapabilities): void {
        const zoomCapability = cameraCapabilities.zoomFeature();
        if (!zoomCapability.isSupported()) {
            if (this.verbose) {
                this.logger.log("Auto-zoom: zoom not supported by camera");
            }
            return;
        }

        const desiredZoom = this.config.autoZoomLevel ?? 2.0;
        const minZoom = zoomCapability.min();
        const maxZoom = zoomCapability.max();

        // Clamp the zoom value to supported range
        const actualZoom = clip(desiredZoom, minZoom, maxZoom);

        zoomCapability.apply(actualZoom)
            .then(() => {
                if (this.verbose) {
                    this.logger.log(`Auto-zoom: applied ${actualZoom}x zoom`);
                }
            })
            .catch((error) => {
                if (this.verbose) {
                    this.logger.logError(
                        `Auto-zoom: failed to apply zoom - ${error}`
                    );
                }
            });
    }

    /**
     * Apply auto-torch if supported by the camera.
     */
    private applyAutoTorch(cameraCapabilities: CameraCapabilities): void {
        const torchCapability = cameraCapabilities.torchFeature();
        if (!torchCapability.isSupported()) {
            if (this.verbose) {
                this.logger.log("Auto-torch: torch not supported by camera");
            }
            return;
        }

        torchCapability.apply(true)
            .then(() => {
                if (this.verbose) {
                    this.logger.log("Auto-torch: torch enabled");
                }
            })
            .catch((error) => {
                if (this.verbose) {
                    this.logger.logError(
                        `Auto-torch: failed to enable torch - ${error}`
                    );
                }
            });
    }

    /**
     * Get the image preprocessor instance (for advanced usage).
     */
    public getImagePreprocessor(): ImagePreprocessor | null {
        return this.imagePreprocessor;
    }

    /**
     * Update the image preprocessing configuration dynamically.
     */
    public setImagePreprocessing(
        config:
            | "none"
            | "light"
            | "standard"
            | "aggressive"
            | "dataMatrix"
            | ImagePreprocessingConfig
    ): void {
        // Re-use the initialization logic
        this.initializeImagePreprocessor({
            ...this.config,
            imagePreprocessing: config
        });
    }
    //#endregion
    //#endregion
}
