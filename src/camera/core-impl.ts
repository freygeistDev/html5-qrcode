/**
 * @fileoverview
 * Core camera library implementations.
 * 
 * @author mebjas <minhazav@gmail.com>
 */

import {
    Camera,
    CameraCapabilities,
    CameraCapability,
    RangeCameraCapability,
    CameraRenderingOptions,
    RenderedCamera,
    RenderingCallbacks,
    BooleanCameraCapability
} from "./core";

/** Interface for a range value. */
interface RangeValue {
    min: number;
    max: number;
    step: number;
}

/** Abstract camera capability class. */
abstract class AbstractCameraCapability<T> implements CameraCapability<T> {
    protected readonly name: string;
    protected readonly track: MediaStreamTrack;

    constructor(name: string, track: MediaStreamTrack) {
        this.name = name;
        this.track = track;
    }

    public isSupported(): boolean {
        // TODO(minhazav): Figure out fallback for getCapabilities()
        // in firefox.
        // https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints
        if (!this.track.getCapabilities) {
            return false;
        }
        return this.name in this.track.getCapabilities();
    }

    public apply(value: T): Promise<void> {
        let constraint: any = {};
        constraint[this.name] = value;
        let constraints = { advanced: [ constraint ] };
        return this.track.applyConstraints(constraints);
    }

    public value(): T | null {
        let settings: any = this.track.getSettings();
        if (this.name in settings) {
            let settingValue = settings[this.name];
            return settingValue;
        }

        return null;
    }
}

abstract class AbstractRangeCameraCapability extends AbstractCameraCapability<number> {
    constructor(name: string, track: MediaStreamTrack) {
       super(name, track);
    }

    public min(): number {
        return this.getCapabilities().min;
    }

    public max(): number {
        return this.getCapabilities().max;
    }

    public step(): number {
        return this.getCapabilities().step;
    }

    public apply(value: number): Promise<void> {
        let constraint: any = {};
        constraint[this.name] = value;
        let constraints = {advanced: [ constraint ]};
        return this.track.applyConstraints(constraints);
    }

    private getCapabilities(): RangeValue {
        this.failIfNotSupported();
        let capabilities: any = this.track.getCapabilities();
        let capability: any = capabilities[this.name];
        return {
            min: capability.min,
            max: capability.max,
            step: capability.step,
        };
    }

    private failIfNotSupported() {
        if (!this.isSupported()) {
            throw new Error(`${this.name} capability not supported`);
        }
    }
}

function isIosLikeBrowser(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    const platform = navigator.platform || "";
    return /iPad|iPhone|iPod/.test(platform)
        || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const jtiHtml5QrcodeRevision = "20260529-ios-surface-diag1";
let jtiSurfaceDebugSequence = 0;

function getJtiDebugHost(): any | null {
    if (typeof window === "undefined") {
        return null;
    }

    const host = window as any;
    host.__JTI_HTML5_QRCODE_REVISION = jtiHtml5QrcodeRevision;
    if (!Array.isArray(host.__JTI_HTML5_QRCODE_SURFACE_EVENTS)) {
        host.__JTI_HTML5_QRCODE_SURFACE_EVENTS = [];
    }

    return host;
}

function trackDebugInfo(surface: HTMLVideoElement): any[] {
    const stream = surface.srcObject as MediaStream | null;
    if (!stream || typeof stream.getVideoTracks !== "function") {
        return [];
    }

    return stream.getVideoTracks().map((track) => {
        let settings: any = {};
        try {
            settings = typeof track.getSettings === "function"
                ? track.getSettings()
                : {};
        } catch (error) {
            settings = { error: String(error) };
        }

        return {
            id: track.id,
            label: track.label,
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: {
                deviceId: settings.deviceId
                    ? String(settings.deviceId).slice(0, 12) + "…"
                    : undefined,
                facingMode: settings.facingMode,
                width: settings.width,
                height: settings.height,
                frameRate: settings.frameRate,
            },
        };
    });
}

function recordSurfaceEvent(
    surface: HTMLVideoElement,
    eventName: string,
    details?: any) {
    const host = getJtiDebugHost();
    if (!host) {
        return;
    }

    try {
        const events = host.__JTI_HTML5_QRCODE_SURFACE_EVENTS;
        const parent = surface.parentElement;
        const entry = {
            at: Date.now(),
            event: eventName,
            surfaceId: surface.dataset.jtiSurfaceId || "",
            readyState: surface.readyState,
            videoWidth: surface.videoWidth || 0,
            videoHeight: surface.videoHeight || 0,
            clientWidth: surface.clientWidth || 0,
            clientHeight: surface.clientHeight || 0,
            paused: surface.paused,
            muted: surface.muted,
            autoplay: surface.autoplay,
            playsInline: (surface as any).playsInline === true,
            isConnected: surface.isConnected,
            parentId: parent ? parent.id : "",
            parentClass: parent ? parent.className : "",
            hasSrcObject: !!surface.srcObject,
            tracks: trackDebugInfo(surface),
            details: details || null,
        };
        events.push(entry);
        while (events.length > 80) {
            events.shift();
        }
    } catch (error) {
        // Debug-only instrumentation must never affect camera startup.
    }
}

/** Zoom feature. */
class ZoomFeatureImpl extends AbstractRangeCameraCapability {
    constructor(track: MediaStreamTrack) {
        super("zoom", track);
    }
}

/** Torch feature. */
class TorchFeatureImpl extends AbstractCameraCapability<boolean> {
    constructor(track: MediaStreamTrack) {
        super("torch", track);
    }
}

/** Implementation of {@link CameraCapabilities}. */
class CameraCapabilitiesImpl implements CameraCapabilities {
    private readonly track: MediaStreamTrack;
    
    constructor(track: MediaStreamTrack) {
        this.track = track;
    }

    zoomFeature(): RangeCameraCapability {
        return new ZoomFeatureImpl(this.track);
    }

    torchFeature(): BooleanCameraCapability {
        return new TorchFeatureImpl(this.track);
    }
}

/** Implementation of {@link RenderedCamera}. */
class RenderedCameraImpl implements RenderedCamera {

    private readonly parentElement: HTMLElement;
    private readonly mediaStream: MediaStream;
    private readonly surface: HTMLVideoElement;
    private readonly callbacks: RenderingCallbacks;

    private isClosed: boolean = false;

    private constructor(
        parentElement: HTMLElement,
        mediaStream: MediaStream,
        callbacks: RenderingCallbacks) {
        this.parentElement = parentElement;
        this.mediaStream = mediaStream;
        this.callbacks = callbacks;

        this.surface = this.createVideoElement(this.parentElement.clientWidth);

        // Setup
        parentElement.append(this.surface);
    }

    private createVideoElement(width: number): HTMLVideoElement {
        const videoElement = document.createElement("video");
        const surfaceId = `jti-surface-${++jtiSurfaceDebugSequence}`;
        videoElement.dataset.jtiSurfaceId = surfaceId;
        videoElement.dataset.jtiHtml5QrcodeRevision = jtiHtml5QrcodeRevision;
        videoElement.style.width = `${width}px`;
        videoElement.style.display = "block";
        videoElement.muted = true;
        videoElement.setAttribute("muted", "true");
        videoElement.autoplay = true;
        videoElement.setAttribute("autoplay", "true");
        (<any>videoElement).playsInline = true;
        videoElement.setAttribute("playsinline", "true");
        videoElement.setAttribute("webkit-playsinline", "true");
        recordSurfaceEvent(videoElement, "created", { initialWidth: width });
        return videoElement;
    }

    private setupSurface(): Promise<void> {
        this.surface.onabort = () => {
            throw "RenderedCameraImpl video surface onabort() called";
        };

        this.surface.onerror = () => {
            throw "RenderedCameraImpl video surface onerror() called";
        };

        return new Promise((resolve, reject) => {
            let hasResolved = false;
            let lastPlayError: any = null;
            let playStarted = false;
            let metadataPlayTimeout: number | null = null;
            recordSurfaceEvent(this.surface, "setup-start");

            const cleanup = () => {
                window.clearTimeout(metadataTimeout);
                if (metadataPlayTimeout !== null) {
                    window.clearTimeout(metadataPlayTimeout);
                }
                this.surface.removeEventListener(
                    "loadedmetadata",
                    metadataReadyHandler);
                this.surface.removeEventListener("loadeddata", onVideoReady);
                this.surface.removeEventListener("canplay", onVideoReady);
                this.surface.removeEventListener("playing", onVideoReady);
                this.surface.removeEventListener("error", onVideoError);
            };

            const resolveIfReady = () => {
                if (hasResolved) {
                    return;
                }

                const sourceWidth = this.surface.videoWidth || 0;
                const sourceHeight = this.surface.videoHeight || 0;
                if (
                    this.surface.readyState < 1
                    || sourceWidth < 1
                    || sourceHeight < 1
                ) {
                    recordSurfaceEvent(this.surface, "not-ready", {
                        lastPlayError,
                    });
                    return;
                }

                hasResolved = true;
                recordSurfaceEvent(this.surface, "resolved");
                cleanup();
                this.callbacks.onRenderSurfaceReady(
                    this.surface.clientWidth || sourceWidth,
                    this.surface.clientHeight || sourceHeight);
                resolve();
            };

            const onVideoReady = () => {
                recordSurfaceEvent(this.surface, "event-ready");
                resolveIfReady();
            };

            const onVideoError = () => {
                if (hasResolved) {
                    return;
                }
                recordSurfaceEvent(this.surface, "event-error");
                cleanup();
                reject("RenderedCameraImpl video surface onerror() called");
            };

            const metadataTimeout = window.setTimeout(() => {
                if (hasResolved) {
                    return;
                }
                recordSurfaceEvent(this.surface, "setup-timeout", {
                    lastPlayError,
                });
                cleanup();
                reject(lastPlayError
                    ? `Unable to play camera surface: ${lastPlayError}`
                    : "Unable to initialize camera surface");
            }, 5000);

            const playSurface = () => {
                if (playStarted) {
                    return;
                }

                playStarted = true;
                recordSurfaceEvent(this.surface, "play-called");
                const playPromise = this.surface.play();
                if (playPromise) {
                    playPromise
                        .then(() => {
                            recordSurfaceEvent(this.surface, "play-resolved");
                            resolveIfReady();
                        })
                        .catch((error) => {
                            // Safari can reject the first play() while the
                            // stream is attaching. Keep waiting for metadata /
                            // canplay because a live stream can still become
                            // drawable shortly after.
                            lastPlayError = error && error.message
                                ? error.message
                                : String(error || "unknown");
                            recordSurfaceEvent(this.surface, "play-rejected", {
                                error: lastPlayError,
                            });
                            console.warn(
                                "Unable to autoplay camera surface", error);
                        });
                } else {
                    recordSurfaceEvent(this.surface, "play-no-promise");
                    resolveIfReady();
                }
            };

            const onIosMetadataReady = () => {
                recordSurfaceEvent(this.surface, "loadedmetadata-ios");
                playSurface();
                resolveIfReady();
            };

            const useIosMetadataFirst = isIosLikeBrowser();
            const metadataReadyHandler = useIosMetadataFirst
                ? onIosMetadataReady
                : onVideoReady;

            this.surface.addEventListener(
                "loadedmetadata",
                metadataReadyHandler);
            this.surface.addEventListener("loadeddata", onVideoReady);
            this.surface.addEventListener("canplay", onVideoReady);
            this.surface.addEventListener("playing", onVideoReady);
            this.surface.addEventListener("error", onVideoError);
            recordSurfaceEvent(this.surface, "before-srcObject");
            this.surface.srcObject = this.mediaStream;
            recordSurfaceEvent(this.surface, "after-srcObject");

            if (useIosMetadataFirst) {
                // Mirrors web/camera-test.html: bind stream first, wait for
                // metadata, then call play(). Keep a delayed play fallback for
                // browsers that only fire metadata after playback starts.
                metadataPlayTimeout = window.setTimeout(playSurface, 1500);
            } else {
                playSurface();
            }
        });
    }

    private async tryResumeSurface(): Promise<void> {
        const playPromise = this.surface.play();
        if (!playPromise) {
            return;
        }
        return playPromise.catch((error) => {
            console.warn("Unable to resume camera surface", error);
        });
    }

    private removeSurfaceFromParent() {
        if (this.surface.parentElement === this.parentElement) {
            this.parentElement.removeChild(this.surface);
        } else if (this.surface.parentElement) {
            this.surface.parentElement.removeChild(this.surface);
        }
    }

    static async create(
        parentElement: HTMLElement,
        mediaStream: MediaStream,
        options: CameraRenderingOptions,
        callbacks: RenderingCallbacks)
        : Promise<RenderedCamera> {
        let renderedCamera = new RenderedCameraImpl(
            parentElement, mediaStream, callbacks);
        if (options.aspectRatio) {
            let aspectRatioConstraint = {
                aspectRatio: options.aspectRatio!
            };
            await renderedCamera.getFirstTrackOrFail().applyConstraints(
                aspectRatioConstraint);
        }

        await renderedCamera.setupSurface();
        return renderedCamera;
    }

    private failIfClosed() {
        if (this.isClosed) {
            throw "The RenderedCamera has already been closed.";
        }
    }

    private getFirstTrackOrFail(): MediaStreamTrack {
        this.failIfClosed();

        if (this.mediaStream.getVideoTracks().length === 0) {
            throw "No video tracks found";
        }

        return this.mediaStream.getVideoTracks()[0];
    }

    //#region Public APIs.
    public pause(): void {
        this.failIfClosed();
        this.surface.pause();
    }

    public resume(onResumeCallback: () => void): void {
        this.failIfClosed();
        let $this = this;

        const onVideoResume = () => {
            // Transition after 200ms to avoid the previous canvas frame being
            // re-scanned.
            setTimeout(onResumeCallback, 200);
            $this.surface.removeEventListener("playing", onVideoResume);
        };

        this.surface.addEventListener("playing", onVideoResume);
        this.tryResumeSurface();
    }

    public isPaused(): boolean {
        this.failIfClosed();
        return this.surface.paused;
    }

    public getSurface(): HTMLVideoElement {
        this.failIfClosed();
        return this.surface;
    }

    public getRunningTrackCapabilities(): MediaTrackCapabilities {
        return this.getFirstTrackOrFail().getCapabilities();
    }

    public getRunningTrackSettings(): MediaTrackSettings {
        return this.getFirstTrackOrFail().getSettings();
    }

    public async applyVideoConstraints(constraints: MediaTrackConstraints)
        : Promise<void> {
        if ("aspectRatio" in constraints) {
            throw "Changing 'aspectRatio' in run-time is not yet supported.";
        }

        return this.getFirstTrackOrFail().applyConstraints(constraints);
    }

    public close(): Promise<void> {
        if (this.isClosed) {
            // Already closed.
            return Promise.resolve();
        }

        let $this = this;
        return new Promise((resolve, _) => {
            let tracks = $this.mediaStream.getVideoTracks();
            const tracksToClose = tracks.length;
            if (tracksToClose === 0) {
                $this.isClosed = true;
                $this.removeSurfaceFromParent();
                resolve();
                return;
            }
            var tracksClosed = 0;
            $this.mediaStream.getVideoTracks().forEach((videoTrack) => {
                $this.mediaStream.removeTrack(videoTrack);
                videoTrack.stop();
                ++tracksClosed;
    
                if (tracksClosed >= tracksToClose) {
                    $this.isClosed = true;
                    $this.removeSurfaceFromParent();
                    resolve();
                }
            });
    
            
        });
    }

    getCapabilities(): CameraCapabilities {
        return new CameraCapabilitiesImpl(this.getFirstTrackOrFail());
    }
    //#endregion
}

/** Default implementation of {@link Camera} interface. */
export class CameraImpl implements Camera {
    private readonly mediaStream: MediaStream;

    private constructor(mediaStream: MediaStream) {
        this.mediaStream = mediaStream;
    }

    async render(
        parentElement: HTMLElement,
        options: CameraRenderingOptions,
        callbacks: RenderingCallbacks)
        : Promise<RenderedCamera> {
        return RenderedCameraImpl.create(
            parentElement, this.mediaStream, options, callbacks);
    }

    static async create(videoConstraints: MediaTrackConstraints)
        : Promise<Camera> {
        if (!navigator.mediaDevices) {
            throw "navigator.mediaDevices not supported";
        }
        let constraints: MediaStreamConstraints = {
            audio: false,
            video: videoConstraints
        };

        let mediaStream = await navigator.mediaDevices.getUserMedia(
            constraints);
        return new CameraImpl(mediaStream);
    }
}
