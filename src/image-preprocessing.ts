/**
 * @fileoverview
 * Image preprocessing utilities for improving barcode/QR code detection.
 * Especially useful for:
 * - Small codes (e.g., 5mm Data Matrix)
 * - Low contrast situations
 * - Codes behind foil or plastic
 * - Dark backgrounds
 *
 * @author Custom extension for html5-qrcode
 */

/**
 * Configuration for image preprocessing.
 */
export interface ImagePreprocessingConfig {
    /**
     * Enable dedicated DataMatrix DPM candidate generation.
     * When active and no explicitPasses are provided, a fixed DPM-oriented
     * candidate stack is used instead of the generic pass builder.
     * Default: false
     */
    datamatrixDpmMode?: boolean;

    /**
     * Decode-effort hint for DPM mode candidate generation.
     * - "normal": minimal DPM candidate stack
     * - "slow": additional DPM recovery candidate
     * Default: "normal"
     */
    decodingBudget?: "normal" | "slow";

    /**
     * Enable contrast enhancement.
     * Improves detection of low-contrast codes.
     * Default: false
     */
    contrastEnhancement?: boolean;

    /**
     * Contrast enhancement factor (1.0 = no change, 2.0 = double contrast).
     * Only used if contrastEnhancement is true.
     * Default: 1.5
     */
    contrastFactor?: number;

    /**
     * Enable grayscale conversion before processing.
     * Can improve detection in some cases.
     * Default: true (when preprocessing is enabled)
     */
    grayscale?: boolean;

    /**
     * Enable inversion detection.
     * If true, will try both normal and inverted image.
     * Useful for white-on-black codes.
     * Default: false
     */
    tryInverted?: boolean;

    /**
     * Force inversion for all frames.
     * If true, the image is always inverted.
     * Default: false
     */
    forceInvert?: boolean;

    /**
     * Enable sharpening filter.
     * Can help with slightly blurred images.
     * Default: false
     */
    sharpen?: boolean;

    /**
     * Sharpening intensity (0.0 - 1.0).
     * Only used if sharpen is true.
     * Default: 0.3
     */
    sharpenIntensity?: number;


    /**
     * Enable blur to reduce noise.
     * Default: false
     */
    blur?: boolean;

    /**
     * Blur radius (1.0 - 5.0). Higher = stronger blur.
     * Default: 1.5
     */
    blurRadius?: number;

    /**
     * Blend current frame with previous frame to reduce sensor noise.
     * Useful for reflective foil/glare without strong blur.
     * Default: false
     */
    temporalDenoise?: boolean;

    /**
     * Temporal denoise strength (0.05 - 0.95).
     * Higher values smooth more but can increase lag.
     * Default: 0.35
     */
    temporalDenoiseStrength?: number;

    /**
     * Adaptive local thresholding (local binarization).
     * Helps when illumination is uneven (e.g. foil reflections).
     * Default: false
     */
    adaptiveThreshold?: boolean;

    /**
     * Adaptive threshold neighborhood size (odd number, 7-41).
     * Default: 15
     */
    adaptiveBlockSize?: number;

    /**
     * Adaptive threshold offset subtracted from local mean (-32 to 32).
     * Higher positive values create darker binarization.
     * Default: 4
     */
    adaptiveOffset?: number;

    /**
     * Morphological closing (dilate->erode) to close small gaps in modules.
     * Most effective on binarized images.
     * Default: false
     */
    morphClose?: boolean;

    /**
     * Number of morph-close iterations (1-3).
     * Default: 1
     */
    morphCloseIterations?: number;

    /**
     * Enable motion stabilization for hand jitter compensation.
     * Works by estimating small frame-to-frame translation and compensating it.
     * Default: false
     */
    stabilization?: boolean;

    /**
     * Blend strength with previous stabilized frame (0.0 - 0.8).
     * Higher values are steadier but can increase ghosting.
     * Default: 0.25
     */
    stabilizationStrength?: number;

    /**
     * Motion score threshold for accepting compensation (0.05 - 0.50).
     * Lower is stricter (less compensation on noisy frames).
     * Default: 0.22
     */
    stabilizationMotionThreshold?: number;

    /**
     * Maximum translation compensation in source pixels (1 - 24).
     * Default: 10
     */
    stabilizationMaxShift?: number;

    /**
     * Downsample factor for motion estimation (2 - 8).
     * Higher values are faster, lower values are more precise.
     * Default: 4
     */
    stabilizationDownsample?: number;

    /**
     * Enable decoder-side upscaling of the processed region.
     * Useful for very small codes when optical zoom is not available.
     * Default: false
     */
    upscale?: boolean;

    /**
     * Upscale factor for decoder input region.
     * Range: 1.0 - 4.0.
     * Default: 2.0
     */
    upscaleFactor?: number;

    /**
     * Try multiple preprocessing variants for tougher scans.
     * Default: false
     */
    multiPass?: boolean;

    /**
     * Enable additional rotated decode candidates.
     * Default: false
     */
    rotationPasses?: boolean;

    /**
     * Rotation angles in degrees for additional decode candidates.
     * Values are clamped to [-45, 45]. 0 is ignored.
     * If empty while rotationPasses=true, internal default angles are used.
     */
    rotationAngles?: number[];

    /**
     * Enable perspective (keystone / trapezoid) decode candidates.
     * Simulates slight phone tilt where the code appears squashed, not merely rotated.
     * Default: false
     */
    perspectivePasses?: boolean;

    /**
     * Horizontal keystone factors: fraction of width in [-0.15, 0.15].
     * Positive values narrow the top edge (typical when tilting the phone backward).
     */
    perspectiveHorizontal?: number[];

    /**
     * Vertical keystone factors: fraction of height in [-0.15, 0.15].
     * Positive values narrow the left edge.
     */
    perspectiveVertical?: number[];

    /**
     * Build extra orthogonal passes for enabled preprocessing modules.
     * Useful for debugging which individual transform helps most.
     * Default: false
     */
    orthogonalPasses?: boolean;

    /**
     * Maximum number of decode candidates per frame.
     * Applies to all generated preprocessing variants (normal, inverted, multi-pass, rotation).
     * Range: 1-256.
     * Default: 5
     */
    maxPasses?: number;

    /**
     * Generate additional combinational passes (A+B, A+C, A+B+C, ...).
     * Default: false
     */
    combinationPasses?: boolean;

    /**
     * Maximum module count per generated combination pass.
     * Range: 2-5.
     * Default: 3
     */
    combinationMaxSize?: number;

    /**
     * Include inversion module in combination pass generation.
     * Default: false
     */
    combinationIncludeInversion?: boolean;

    /**
     * Explicit list of preprocessing passes to run instead of the combinatorial
     * system (orthogonalPasses / combinationPasses). When non-empty, all
     * combinatorial logic is bypassed and only these passes are executed in order.
     * Each entry is a partial ImagePreprocessingConfig merged on top of the base
     * config, plus an optional `passName` label and `tryInverted` override.
     */
    explicitPasses?: ExplicitPass[];

    /**
     * When true and explicitPasses are configured, each explicit pass is
     * processed on demand (ladder decode) instead of building all pass
     * canvases upfront on every frame.
     * Default: false
     */
    lazyPassLadder?: boolean;

    /**
     * When lazyPassLadder is active, rotate explicit passes across frames
     * (one pass per frame plus optional warm pass) instead of running all
     * passes on every frame.
     * Default: true when lazyPassLadder is enabled.
     */
    lazyPassLadderRotatePasses?: boolean;

}

export type ImagePreprocessingPassVariantMode = "both" | "normal" | "inverted";

/**
 * A single explicitly-defined preprocessing pass. Fields that are undefined
 * inherit from the base ImagePreprocessingConfig. `passName` is used as the
 * display label in the decoder gallery. `tryInverted` controls whether an
 * additional inverted variant is produced for this specific pass (overrides
 * the base config's tryInverted for this pass only).
 */
export interface ExplicitPass {
    passName?: string;
    grayscale?: boolean;
    contrastEnhancement?: boolean;
    contrastFactor?: number;
    blur?: boolean;
    blurRadius?: number;
    sharpen?: boolean;
    sharpenIntensity?: number;
    morphClose?: boolean;
    morphCloseIterations?: number;
    adaptiveThreshold?: boolean;
    adaptiveBlockSize?: number;
    adaptiveOffset?: number;
    forceInvert?: boolean;
    tryInverted?: boolean;
}

export type ImagePreprocessingPerspectiveAxis = "horizontal" | "vertical";

export interface ImagePreprocessingCandidateMeta {
    variantLabel: string;
    inverted: boolean;
    rotationAngle?: number;
    perspectiveFactor?: number;
    perspectiveAxis?: ImagePreprocessingPerspectiveAxis;
    preprocessingSnapshot: ImagePreprocessingConfig;
}

export interface ImagePreprocessingCandidate {
    canvas: HTMLCanvasElement;
    meta: ImagePreprocessingCandidateMeta;
}

interface ImagePreprocessingPassDescriptor {
    config: ImagePreprocessingConfig;
    passLabel?: string;
}

interface PreprocessingModuleDescriptor {
    key: string;
    apply: (target: ImagePreprocessingConfig) => void;
}

interface MotionStabilizationState {
    sample: Float32Array;
    sampleWidth: number;
    sampleHeight: number;
    stabilizedFrame: Uint8ClampedArray;
}

/**
 * Default preprocessing configuration optimized for difficult codes.
 */
export const DEFAULT_PREPROCESSING_CONFIG: ImagePreprocessingConfig = {
    datamatrixDpmMode: false,
    decodingBudget: "normal",
    contrastEnhancement: false,
    contrastFactor: 1.5,
    grayscale: true,
    tryInverted: false,
    forceInvert: false,
    sharpen: false,
    sharpenIntensity: 0.3,
    blur: false,
    blurRadius: 1.5,
    temporalDenoise: false,
    temporalDenoiseStrength: 0.35,
    adaptiveThreshold: false,
    adaptiveBlockSize: 15,
    adaptiveOffset: 4,
    morphClose: false,
    morphCloseIterations: 1,
    stabilization: false,
    stabilizationStrength: 0.25,
    stabilizationMotionThreshold: 0.22,
    stabilizationMaxShift: 10,
    stabilizationDownsample: 4,
    upscale: false,
    upscaleFactor: 2.0,
    multiPass: false,
    rotationPasses: false,
    rotationAngles: [],
    perspectivePasses: false,
    perspectiveHorizontal: [],
    perspectiveVertical: [],
    orthogonalPasses: false,
    maxPasses: 5,
    combinationPasses: false,
    combinationMaxSize: 3,
    combinationIncludeInversion: false,
    lazyPassLadder: false,
    lazyPassLadderRotatePasses: true
};

const DEFAULT_ROTATION_PASS_ANGLES: number[] = [-12, 12, -24, 24];
const MAX_ROTATION_PASS_ANGLES = 6;
const DEFAULT_PERSPECTIVE_HORIZONTAL_FACTORS: number[] = [-0.08, -0.04, 0.04, 0.08];
const DEFAULT_PERSPECTIVE_VERTICAL_FACTORS: number[] = [-0.06, 0.06];
const MAX_PERSPECTIVE_FACTORS_PER_AXIS = 6;
const MIN_PERSPECTIVE_FACTOR = -0.15;
const MAX_PERSPECTIVE_FACTOR = 0.15;
const MIN_PREPROCESSING_PASSES = 1;
const MAX_PREPROCESSING_PASSES = 256;
const MIN_COMBINATION_PASS_SIZE = 2;
const MAX_COMBINATION_PASS_SIZE = 5;
const MIN_UPSCALE_FACTOR = 1.0;
const MAX_UPSCALE_FACTOR = 4.0;
const MIN_TEMPORAL_DENOISE_STRENGTH = 0.05;
const MAX_TEMPORAL_DENOISE_STRENGTH = 0.95;
const MIN_ADAPTIVE_BLOCK_SIZE = 7;
const MAX_ADAPTIVE_BLOCK_SIZE = 41;
const MIN_ADAPTIVE_OFFSET = -32;
const MAX_ADAPTIVE_OFFSET = 32;
const MIN_MORPH_CLOSE_ITERATIONS = 1;
const MAX_MORPH_CLOSE_ITERATIONS = 3;
const MAX_TEMPORAL_CACHE_ENTRIES = 512;
const MIN_STABILIZATION_STRENGTH = 0;
const MAX_STABILIZATION_STRENGTH = 0.8;
const MIN_STABILIZATION_MOTION_THRESHOLD = 0.05;
const MAX_STABILIZATION_MOTION_THRESHOLD = 0.5;
const MIN_STABILIZATION_MAX_SHIFT = 1;
const MAX_STABILIZATION_MAX_SHIFT = 24;
const MIN_STABILIZATION_DOWNSAMPLE = 2;
const MAX_STABILIZATION_DOWNSAMPLE = 8;
const MAX_STABILIZATION_CACHE_ENTRIES = 32;
const ADAPTIVE_SAUVOLA_K = 0.2;
const ADAPTIVE_SAUVOLA_R = 128;
const ADAPTIVE_BINARY_BLEND = 0.72;

/**
 * Preset configurations for common use cases.
 */
export const PREPROCESSING_PRESETS = {
    /**
     * No preprocessing - fastest, for good conditions.
     */
    NONE: {
        contrastEnhancement: false,
        grayscale: false,
        tryInverted: false,
        forceInvert: false,
        sharpen: false,
        multiPass: false
    } as ImagePreprocessingConfig,

    /**
     * Light preprocessing - slight contrast boost.
     */
    LIGHT: {
        contrastEnhancement: true,
        contrastFactor: 1.3,
        grayscale: true,
        tryInverted: false,
        forceInvert: false,
        sharpen: false,
        multiPass: false
    } as ImagePreprocessingConfig,

    /**
     * Standard preprocessing for difficult conditions.
     */
    STANDARD: {
        contrastEnhancement: true,
        contrastFactor: 1.5,
        grayscale: true,
        tryInverted: false,
        forceInvert: false,
        sharpen: true,
        sharpenIntensity: 0.3,
        blur: false,
        blurRadius: 1.5,
        multiPass: false
    } as ImagePreprocessingConfig,

    /**
     * Aggressive preprocessing for very difficult codes.
     * Small Data Matrix, behind foil, low contrast.
     */
    AGGRESSIVE: {
        contrastEnhancement: true,
        contrastFactor: 2.0,
        grayscale: true,
        tryInverted: true,
        forceInvert: false,
        sharpen: true,
        sharpenIntensity: 0.5,
        blur: false,
        blurRadius: 1.5,
        multiPass: false
    } as ImagePreprocessingConfig,

    /**
     * Optimized for Data Matrix codes.
     */
    DATA_MATRIX: {
        contrastEnhancement: true,
        contrastFactor: 1.8,
        grayscale: true,
        tryInverted: true,
        forceInvert: false,
        sharpen: true,
        sharpenIntensity: 0.4,
        blur: false,
        blurRadius: 1.5,
        multiPass: false
    } as ImagePreprocessingConfig,

    /**
     * Optimized for DPM (Direct Part Marking) / embossed DataMatrix codes.
     *
     * Designed for use with zxing-wasm decoder on cigarette packaging foil:
     * - Very subtle gray-level differences (emboss relief, not printed ink)
     * - Metallic/reflective surface with uneven lighting
     * - Code can appear light-on-dark OR dark-on-light depending on lighting angle
     *
     * Key differences from DATA_MATRIX:
     * - Higher contrast (3.0) to amplify the subtle emboss relief
     * - Gentle blur (0.5) to suppress metallic surface noise
     * - Stronger sharpen (0.55) to restore module boundaries after blur
     * - tryInverted: true — tries BOTH normal and inverted polarity each frame,
     *   since embossed foil polarity varies with lighting angle
     */
    DPM: {
        contrastEnhancement: true,
        contrastFactor: 3.0,
        grayscale: true,
        tryInverted: true,
        forceInvert: false,
        sharpen: true,
        sharpenIntensity: 0.55,
        blur: true,
        blurRadius: 0.5,
        multiPass: false
    } as ImagePreprocessingConfig
};

/**
 * Image preprocessing processor.
 */
export class ImagePreprocessor {
    private config: ImagePreprocessingConfig;
    private tempCanvas: HTMLCanvasElement | null = null;
    private tempContext: CanvasRenderingContext2D | null = null;
    private temporalDenoiseCache: Map<string, Uint8ClampedArray> = new Map();
    private motionStabilizationCache: Map<string, MotionStabilizationState> = new Map();

    constructor(config?: ImagePreprocessingConfig) {
        this.config = this.normalizeConfig(config);
    }

    /**
     * Update preprocessing configuration.
     */
    public setConfig(config: ImagePreprocessingConfig): void {
        this.config = this.normalizeConfig(config);
        this.resetTemporalDenoiseCache();
        this.resetMotionStabilizationCache();
    }

    /**
     * Get current configuration.
     */
    public getConfig(): ImagePreprocessingConfig {
        return { ...this.config };
    }

    /**
     * Check if any preprocessing is enabled.
     */
    public isEnabled(): boolean {
        return !!(
            this.config.datamatrixDpmMode ||
            (this.config.explicitPasses && this.config.explicitPasses.length > 0) ||
            this.config.contrastEnhancement ||
            this.config.grayscale ||
            this.config.sharpen ||
            this.config.tryInverted ||
            this.config.forceInvert ||
            this.config.blur ||
            this.config.stabilization ||
            this.config.temporalDenoise ||
            this.config.adaptiveThreshold ||
            this.config.morphClose ||
            this.config.upscale ||
            this.config.multiPass ||
            this.config.rotationPasses ||
            this.config.perspectivePasses
        );
    }

    /**
     * Process a canvas and return processed canvas(es).
     * May return multiple canvases if tryInverted is enabled.
     *
     * Backward-compatible API (canvas list only). Use processWithMetadata()
     * to get candidate metadata for debug galleries.
     */
    public process(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement[] {
        return this.processWithMetadata(sourceCanvas).map((candidate) => {
            return candidate.canvas;
        });
    }

    /**
     * True when lazy ladder decode should run one explicit pass at a time.
     */
    public usesLazyPassLadder(): boolean {
        return !!(
            this.config.lazyPassLadder
            && this.config.explicitPasses
            && this.config.explicitPasses.length > 0
        );
    }

    /**
     * Number of explicit preprocessing passes configured for ladder decode.
     */
    public getExplicitPassCount(): number {
        if (!this.config.explicitPasses || this.config.explicitPasses.length === 0) {
            return 0;
        }
        return this.buildPassDescriptors(this.config).length;
    }

    /**
     * Process a single explicit pass index for lazy ladder decode.
     */
    public processExplicitPassWithMetadata(
        sourceCanvas: HTMLCanvasElement,
        passIndex: number,
        variantMode: ImagePreprocessingPassVariantMode = "both"
    ): ImagePreprocessingCandidate[] {
        const passes = this.buildPassDescriptors(this.config);
        return this.processPassDescriptorAt(
            sourceCanvas,
            passIndex,
            passes,
            variantMode
        );
    }

    public usesLazyPassLadderRotatePasses(): boolean {
        if (!this.usesLazyPassLadder()) {
            return false;
        }
        return this.config.lazyPassLadderRotatePasses !== false;
    }

    public getExplicitPassTryInverted(passIndex: number): boolean {
        const passes = this.buildPassDescriptors(this.config);
        if (passIndex < 0 || passIndex >= passes.length) {
            return false;
        }
        return !!passes[passIndex].config.tryInverted;
    }

    /**
     * Process a canvas and return processed candidates with metadata.
     */
    public processWithMetadata(
        sourceCanvas: HTMLCanvasElement
    ): ImagePreprocessingCandidate[] {
        const results: ImagePreprocessingCandidate[] = [];

        const passes = this.buildPassDescriptors(this.config);
        const passCount = passes.length;

        for (let passIndex = 0; passIndex < passCount; passIndex += 1) {
            results.push(...this.processPassDescriptorAt(
                sourceCanvas,
                passIndex,
                passes
            ));
        }

        const maxPasses = this.normalizeMaxPasses(this.config.maxPasses);
        return this.limitCandidatesWithFullCombo(results, maxPasses);
    }

    private processPassDescriptorAt(
        sourceCanvas: HTMLCanvasElement,
        passIndex: number,
        passes: ImagePreprocessingPassDescriptor[],
        variantMode: ImagePreprocessingPassVariantMode = "both"
    ): ImagePreprocessingCandidate[] {
        if (passIndex < 0 || passIndex >= passes.length) {
            return [];
        }

        const pass = passes[passIndex];
        const passCount = passes.length;
        const cfg = pass.config;
        const variantsForConfig: ImagePreprocessingCandidate[] = [];
        const preprocessingSnapshot = this.buildPreprocessingSnapshot(cfg);
        const includeNormal = variantMode === "both" || variantMode === "normal";
        const includeInverted = variantMode === "both" || variantMode === "inverted";

        if (includeNormal) {
            const processed = this.processCanvasWithConfig(
                sourceCanvas, cfg, false);
            variantsForConfig.push(...this.buildCandidatesForVariant(
                processed,
                cfg,
                passIndex,
                passCount,
                false,
                preprocessingSnapshot,
                pass.passLabel
            ));
        }

        if (includeInverted && cfg.tryInverted) {
            const inverted = this.processCanvasWithConfig(
                sourceCanvas, cfg, true);
            variantsForConfig.push(...this.buildCandidatesForVariant(
                inverted,
                cfg,
                passIndex,
                passCount,
                true,
                preprocessingSnapshot,
                pass.passLabel
            ));
        }

        return variantsForConfig;
    }

    private isFullComboCandidate(
        candidate: ImagePreprocessingCandidate
    ): boolean {
        const label = candidate?.meta?.variantLabel;
        if (typeof label !== "string") {
            return false;
        }
        return label.trim().toLowerCase().indexOf("combo-full") === 0;
    }

    private getPreferredFullComboCandidate(
        candidates: ImagePreprocessingCandidate[]
    ): ImagePreprocessingCandidate | null {
        const fullComboCandidates = candidates.filter((candidate) => {
            return this.isFullComboCandidate(candidate);
        });
        if (fullComboCandidates.length === 0) {
            return null;
        }

        const direct = fullComboCandidates.find((candidate) => {
            const angle = Number(candidate?.meta?.rotationAngle || 0);
            const normalizedAngle = isFinite(angle) ? angle : 0;
            const factor = Number(candidate?.meta?.perspectiveFactor || 0);
            const normalizedFactor = isFinite(factor) ? factor : 0;
            return Math.abs(normalizedAngle) < 0.001
                && Math.abs(normalizedFactor) < 0.0001;
        });
        if (direct) {
            return direct;
        }

        return fullComboCandidates[0];
    }

    private limitCandidatesWithFullCombo(
        candidates: ImagePreprocessingCandidate[],
        maxPasses: number
    ): ImagePreprocessingCandidate[] {
        if (maxPasses < 1) {
            return [];
        }

        if (candidates.length <= maxPasses) {
            return candidates;
        }

        const preferredFullCombo = this.getPreferredFullComboCandidate(candidates);
        if (!preferredFullCombo) {
            return candidates.slice(0, maxPasses);
        }

        if (maxPasses === 1) {
            return [preferredFullCombo];
        }

        const limited = candidates.slice(0, maxPasses);
        const withoutFullCombo = limited.filter((candidate) => {
            return !this.isFullComboCandidate(candidate);
        });
        while (withoutFullCombo.length > maxPasses - 1) {
            withoutFullCombo.pop();
        }
        return [
            ...withoutFullCombo,
            preferredFullCombo
        ];
    }

    private buildVariantLabel(
        config: ImagePreprocessingConfig,
        passIndex: number,
        passCount: number,
        inverted: boolean,
        rotationAngle?: number,
        passLabel?: string,
        perspectiveFactor?: number,
        perspectiveAxis?: ImagePreprocessingPerspectiveAxis
    ): string {
        const effectivePassLabel = typeof passLabel === "string" && passLabel.trim() !== ""
            ? passLabel.trim()
            : (passCount > 1 ? `mp${passIndex + 1}` : "mp1");
        const angle = typeof rotationAngle === "number"
            ? rotationAngle
            : 0;
        const hasRotation = Math.abs(angle) > 0.001;
        const roundedAngle = Math.round(angle * 100) / 100;
        const rotationLabel = hasRotation
            ? ` rot${roundedAngle >= 0 ? "+" : ""}${roundedAngle}`
            : "";
        const factor = typeof perspectiveFactor === "number"
            ? perspectiveFactor
            : 0;
        const hasPerspective = Math.abs(factor) > 0.0001;
        const roundedFactor = Math.round(factor * 1000) / 1000;
        const axisSuffix = perspectiveAxis === "vertical" ? "V" : "H";
        const perspectiveLabel = hasPerspective
            ? ` keystone${axisSuffix}${roundedFactor >= 0 ? "+" : ""}${roundedFactor}`
            : "";
        const modeLabel = inverted || !!config.forceInvert ? "inverted" : "normal";
        return `${effectivePassLabel}${rotationLabel}${perspectiveLabel} ${modeLabel}`;
    }

    private buildPreprocessingSnapshot(
        config: ImagePreprocessingConfig
    ): ImagePreprocessingConfig {
        return {
            datamatrixDpmMode: !!config.datamatrixDpmMode,
            decodingBudget: config.decodingBudget === "slow" ? "slow" : "normal",
            contrastEnhancement: !!config.contrastEnhancement,
            contrastFactor: typeof config.contrastFactor === "number"
                ? config.contrastFactor
                : DEFAULT_PREPROCESSING_CONFIG.contrastFactor,
            grayscale: !!config.grayscale,
            tryInverted: !!config.tryInverted,
            forceInvert: !!config.forceInvert,
            sharpen: !!config.sharpen,
            sharpenIntensity: typeof config.sharpenIntensity === "number"
                ? config.sharpenIntensity
                : DEFAULT_PREPROCESSING_CONFIG.sharpenIntensity,
            blur: !!config.blur,
            blurRadius: typeof config.blurRadius === "number"
                ? config.blurRadius
                : DEFAULT_PREPROCESSING_CONFIG.blurRadius,
            temporalDenoise: !!config.temporalDenoise,
            temporalDenoiseStrength: typeof config.temporalDenoiseStrength === "number"
                ? this.normalizeTemporalDenoiseStrength(config.temporalDenoiseStrength)
                : DEFAULT_PREPROCESSING_CONFIG.temporalDenoiseStrength,
            adaptiveThreshold: !!config.adaptiveThreshold,
            adaptiveBlockSize: typeof config.adaptiveBlockSize === "number"
                ? this.normalizeAdaptiveBlockSize(config.adaptiveBlockSize)
                : DEFAULT_PREPROCESSING_CONFIG.adaptiveBlockSize,
            adaptiveOffset: typeof config.adaptiveOffset === "number"
                ? this.normalizeAdaptiveOffset(config.adaptiveOffset)
                : DEFAULT_PREPROCESSING_CONFIG.adaptiveOffset,
            morphClose: !!config.morphClose,
            morphCloseIterations: typeof config.morphCloseIterations === "number"
                ? this.normalizeMorphCloseIterations(config.morphCloseIterations)
                : DEFAULT_PREPROCESSING_CONFIG.morphCloseIterations,
            stabilization: !!config.stabilization,
            stabilizationStrength: typeof config.stabilizationStrength === "number"
                ? this.normalizeStabilizationStrength(config.stabilizationStrength)
                : DEFAULT_PREPROCESSING_CONFIG.stabilizationStrength,
            stabilizationMotionThreshold: typeof config.stabilizationMotionThreshold === "number"
                ? this.normalizeStabilizationMotionThreshold(config.stabilizationMotionThreshold)
                : DEFAULT_PREPROCESSING_CONFIG.stabilizationMotionThreshold,
            stabilizationMaxShift: typeof config.stabilizationMaxShift === "number"
                ? this.normalizeStabilizationMaxShift(config.stabilizationMaxShift)
                : DEFAULT_PREPROCESSING_CONFIG.stabilizationMaxShift,
            stabilizationDownsample: typeof config.stabilizationDownsample === "number"
                ? this.normalizeStabilizationDownsample(config.stabilizationDownsample)
                : DEFAULT_PREPROCESSING_CONFIG.stabilizationDownsample,
            upscale: !!config.upscale,
            upscaleFactor: typeof config.upscaleFactor === "number"
                ? this.normalizeUpscaleFactor(config.upscaleFactor)
                : DEFAULT_PREPROCESSING_CONFIG.upscaleFactor,
            multiPass: !!config.multiPass,
            rotationPasses: !!config.rotationPasses,
            rotationAngles: this.normalizeRotationAngles(config.rotationAngles),
            perspectivePasses: !!config.perspectivePasses,
            perspectiveHorizontal: this.normalizePerspectiveFactors(
                config.perspectiveHorizontal
            ),
            perspectiveVertical: this.normalizePerspectiveFactors(
                config.perspectiveVertical
            ),
            orthogonalPasses: !!config.orthogonalPasses,
            maxPasses: this.normalizeMaxPasses(config.maxPasses),
            combinationPasses: !!config.combinationPasses,
            combinationMaxSize: this.normalizeCombinationMaxSize(
                config.combinationMaxSize
            ),
            combinationIncludeInversion: config.combinationIncludeInversion !== false
        };
    }

    private buildCandidatesForVariant(
        sourceCanvas: HTMLCanvasElement,
        config: ImagePreprocessingConfig,
        passIndex: number,
        passCount: number,
        inverted: boolean,
        preprocessingSnapshot: ImagePreprocessingConfig,
        passLabel?: string
    ): ImagePreprocessingCandidate[] {
        const results: ImagePreprocessingCandidate[] = [];
        const baseInverted = inverted || !!config.forceInvert;
        const baseLabel = this.buildVariantLabel(
            config,
            passIndex,
            passCount,
            baseInverted,
            0,
            passLabel
        );
        results.push({
            canvas: sourceCanvas,
            meta: {
                variantLabel: baseLabel,
                inverted: baseInverted,
                rotationAngle: 0,
                preprocessingSnapshot: preprocessingSnapshot
            }
        });

        const rotationAngles = this.getRotationAnglesForConfig(config);
        for (const angle of rotationAngles) {
            const rotatedCanvas = this.rotateCanvas(sourceCanvas, angle);
            results.push({
                canvas: rotatedCanvas,
                meta: {
                    variantLabel: this.buildVariantLabel(
                        config,
                        passIndex,
                        passCount,
                        baseInverted,
                        angle,
                        passLabel
                    ),
                    inverted: baseInverted,
                    rotationAngle: angle,
                    preprocessingSnapshot: preprocessingSnapshot
                }
            });
        }

        const perspectiveDescriptors = this.getPerspectiveDescriptorsForConfig(config);
        for (const descriptor of perspectiveDescriptors) {
            const warpedCanvas = this.perspectiveCanvas(
                sourceCanvas,
                descriptor.axis,
                descriptor.factor
            );
            results.push({
                canvas: warpedCanvas,
                meta: {
                    variantLabel: this.buildVariantLabel(
                        config,
                        passIndex,
                        passCount,
                        baseInverted,
                        0,
                        passLabel,
                        descriptor.factor,
                        descriptor.axis
                    ),
                    inverted: baseInverted,
                    rotationAngle: 0,
                    perspectiveFactor: descriptor.factor,
                    perspectiveAxis: descriptor.axis,
                    preprocessingSnapshot: preprocessingSnapshot
                }
            });
        }

        return results;
    }

    private getRotationAnglesForConfig(config: ImagePreprocessingConfig): number[] {
        if (!config.rotationPasses) {
            return [];
        }

        const configuredAngles = this.normalizeRotationAngles(config.rotationAngles);
        if (configuredAngles.length > 0) {
            return configuredAngles;
        }

        return DEFAULT_ROTATION_PASS_ANGLES.slice(0, MAX_ROTATION_PASS_ANGLES);
    }

    private rotateCanvas(
        sourceCanvas: HTMLCanvasElement,
        angleDeg: number
    ): HTMLCanvasElement {
        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = sourceCanvas.width;
        resultCanvas.height = sourceCanvas.height;
        const ctx = resultCanvas.getContext("2d")!;

        const angleRad = (angleDeg * Math.PI) / 180;
        const centerX = sourceCanvas.width / 2;
        const centerY = sourceCanvas.height / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate(angleRad);
        ctx.drawImage(
            sourceCanvas,
            -centerX,
            -centerY,
            sourceCanvas.width,
            sourceCanvas.height
        );

        return resultCanvas;
    }

    private normalizeRotationAngles(rawAngles: any): number[] {
        if (!Array.isArray(rawAngles)) {
            return [];
        }

        const seen = new Set<string>();
        const output: number[] = [];
        rawAngles.forEach((entry) => {
            const value = Number(entry);
            if (!isFinite(value)) {
                return;
            }
            const clamped = Math.max(-45, Math.min(45, value));
            if (Math.abs(clamped) < 0.001) {
                return;
            }
            const normalized = Math.round(clamped * 100) / 100;
            const key = normalized.toFixed(2);
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            output.push(normalized);
        });

        return output.slice(0, MAX_ROTATION_PASS_ANGLES);
    }

    private normalizePerspectiveFactors(rawFactors: any): number[] {
        if (!Array.isArray(rawFactors)) {
            return [];
        }

        const seen = new Set<string>();
        const output: number[] = [];
        rawFactors.forEach((entry) => {
            const value = Number(entry);
            if (!isFinite(value)) {
                return;
            }
            const clamped = Math.max(
                MIN_PERSPECTIVE_FACTOR,
                Math.min(MAX_PERSPECTIVE_FACTOR, value)
            );
            if (Math.abs(clamped) < 0.0001) {
                return;
            }
            const normalized = Math.round(clamped * 1000) / 1000;
            const key = normalized.toFixed(3);
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            output.push(normalized);
        });

        return output.slice(0, MAX_PERSPECTIVE_FACTORS_PER_AXIS);
    }

    private getPerspectiveDescriptorsForConfig(
        config: ImagePreprocessingConfig
    ): Array<{ axis: ImagePreprocessingPerspectiveAxis; factor: number }> {
        if (!config.perspectivePasses) {
            return [];
        }

        const descriptors: Array<{
            axis: ImagePreprocessingPerspectiveAxis;
            factor: number;
        }> = [];

        const horizontalFactors = this.normalizePerspectiveFactors(
            config.perspectiveHorizontal
        );
        const verticalFactors = this.normalizePerspectiveFactors(
            config.perspectiveVertical
        );
        const effectiveHorizontal = horizontalFactors.length > 0
            ? horizontalFactors
            : DEFAULT_PERSPECTIVE_HORIZONTAL_FACTORS.slice(
                0,
                MAX_PERSPECTIVE_FACTORS_PER_AXIS
            );
        const effectiveVertical = verticalFactors.length > 0
            ? verticalFactors
            : DEFAULT_PERSPECTIVE_VERTICAL_FACTORS.slice(
                0,
                MAX_PERSPECTIVE_FACTORS_PER_AXIS
            );

        effectiveHorizontal.forEach((factor) => {
            descriptors.push({ axis: "horizontal", factor: factor });
        });
        effectiveVertical.forEach((factor) => {
            descriptors.push({ axis: "vertical", factor: factor });
        });

        return descriptors;
    }

    private normalizeConfig(
        config?: ImagePreprocessingConfig
    ): ImagePreprocessingConfig {
        const merged: ImagePreprocessingConfig = {
            ...DEFAULT_PREPROCESSING_CONFIG,
            ...(config || {})
        };
        merged.rotationPasses = !!merged.rotationPasses;
        merged.rotationAngles = this.normalizeRotationAngles(merged.rotationAngles);
        merged.perspectivePasses = !!merged.perspectivePasses;
        merged.perspectiveHorizontal = this.normalizePerspectiveFactors(
            merged.perspectiveHorizontal
        );
        merged.perspectiveVertical = this.normalizePerspectiveFactors(
            merged.perspectiveVertical
        );
        merged.datamatrixDpmMode = merged.datamatrixDpmMode === true;
        merged.decodingBudget = merged.decodingBudget === "slow" ? "slow" : "normal";
        merged.temporalDenoise = !!merged.temporalDenoise;
        merged.temporalDenoiseStrength = this.normalizeTemporalDenoiseStrength(
            merged.temporalDenoiseStrength
        );
        merged.adaptiveThreshold = !!merged.adaptiveThreshold;
        merged.adaptiveBlockSize = this.normalizeAdaptiveBlockSize(
            merged.adaptiveBlockSize
        );
        merged.adaptiveOffset = this.normalizeAdaptiveOffset(merged.adaptiveOffset);
        merged.morphClose = !!merged.morphClose;
        merged.morphCloseIterations = this.normalizeMorphCloseIterations(
            merged.morphCloseIterations
        );
        merged.stabilization = !!merged.stabilization;
        merged.stabilizationStrength = this.normalizeStabilizationStrength(
            merged.stabilizationStrength
        );
        merged.stabilizationMotionThreshold = this.normalizeStabilizationMotionThreshold(
            merged.stabilizationMotionThreshold
        );
        merged.stabilizationMaxShift = this.normalizeStabilizationMaxShift(
            merged.stabilizationMaxShift
        );
        merged.stabilizationDownsample = this.normalizeStabilizationDownsample(
            merged.stabilizationDownsample
        );
        merged.upscale = !!merged.upscale;
        merged.upscaleFactor = this.normalizeUpscaleFactor(merged.upscaleFactor);
        merged.orthogonalPasses = !!merged.orthogonalPasses;
        merged.combinationPasses = !!merged.combinationPasses;
        merged.combinationMaxSize = this.normalizeCombinationMaxSize(
            merged.combinationMaxSize
        );
        merged.combinationIncludeInversion = merged.combinationIncludeInversion !== false;
        merged.maxPasses = this.normalizeMaxPasses(merged.maxPasses);
        merged.lazyPassLadder = merged.lazyPassLadder === true;
        merged.lazyPassLadderRotatePasses = merged.lazyPassLadder
            ? merged.lazyPassLadderRotatePasses !== false
            : false;
        return merged;
    }

    private normalizeMaxPasses(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.maxPasses || 5;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? Math.floor(parsed) : fallback;
        return Math.max(
            MIN_PREPROCESSING_PASSES,
            Math.min(MAX_PREPROCESSING_PASSES, value)
        );
    }

    private normalizeCombinationMaxSize(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.combinationMaxSize || 3;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? Math.floor(parsed) : fallback;
        return Math.max(
            MIN_COMBINATION_PASS_SIZE,
            Math.min(MAX_COMBINATION_PASS_SIZE, value)
        );
    }

    private normalizeUpscaleFactor(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.upscaleFactor || 2.0;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? parsed : fallback;
        return this.clampFloat(value, MIN_UPSCALE_FACTOR, MAX_UPSCALE_FACTOR);
    }

    private normalizeTemporalDenoiseStrength(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.temporalDenoiseStrength || 0.35;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? parsed : fallback;
        return this.clampFloat(
            value,
            MIN_TEMPORAL_DENOISE_STRENGTH,
            MAX_TEMPORAL_DENOISE_STRENGTH
        );
    }

    private normalizeAdaptiveBlockSize(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.adaptiveBlockSize || 15;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? Math.floor(parsed) : fallback;
        return this.normalizeOddInteger(
            value,
            MIN_ADAPTIVE_BLOCK_SIZE,
            MAX_ADAPTIVE_BLOCK_SIZE
        );
    }

    private normalizeAdaptiveOffset(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.adaptiveOffset || 4;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? parsed : fallback;
        return this.clampFloat(value, MIN_ADAPTIVE_OFFSET, MAX_ADAPTIVE_OFFSET);
    }

    private normalizeMorphCloseIterations(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.morphCloseIterations || 1;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? Math.floor(parsed) : fallback;
        return Math.max(
            MIN_MORPH_CLOSE_ITERATIONS,
            Math.min(MAX_MORPH_CLOSE_ITERATIONS, value)
        );
    }

    private normalizeStabilizationStrength(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.stabilizationStrength || 0.25;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? parsed : fallback;
        return this.clampFloat(
            value,
            MIN_STABILIZATION_STRENGTH,
            MAX_STABILIZATION_STRENGTH
        );
    }

    private normalizeStabilizationMotionThreshold(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.stabilizationMotionThreshold || 0.22;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? parsed : fallback;
        return this.clampFloat(
            value,
            MIN_STABILIZATION_MOTION_THRESHOLD,
            MAX_STABILIZATION_MOTION_THRESHOLD
        );
    }

    private normalizeStabilizationMaxShift(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.stabilizationMaxShift || 10;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? Math.floor(parsed) : fallback;
        return Math.max(
            MIN_STABILIZATION_MAX_SHIFT,
            Math.min(MAX_STABILIZATION_MAX_SHIFT, value)
        );
    }

    private normalizeStabilizationDownsample(raw: any): number {
        const fallback = DEFAULT_PREPROCESSING_CONFIG.stabilizationDownsample || 4;
        const parsed = Number(raw);
        const value = isFinite(parsed) ? Math.floor(parsed) : fallback;
        return Math.max(
            MIN_STABILIZATION_DOWNSAMPLE,
            Math.min(MAX_STABILIZATION_DOWNSAMPLE, value)
        );
    }

    private normalizeOddInteger(value: number, min: number, max: number): number {
        let normalized = Math.max(min, Math.min(max, Math.floor(value)));
        if (normalized % 2 === 0) {
            normalized += 1;
        }
        if (normalized > max) {
            normalized = max % 2 === 1 ? max : max - 1;
        }
        if (normalized < min) {
            normalized = min % 2 === 1 ? min : min + 1;
        }
        return normalized;
    }

    private buildMultiPassConfigs(
        baseConfig: ImagePreprocessingConfig
    ): ImagePreprocessingConfig[] {
        const configs: ImagePreprocessingConfig[] = [];
        configs.push({ ...baseConfig, multiPass: false });

        if (!baseConfig.contrastEnhancement) {
            configs.push({
                ...baseConfig,
                contrastEnhancement: true,
                contrastFactor: baseConfig.contrastFactor || 1.5,
                multiPass: false
            });
        }

        if (!baseConfig.blur) {
            configs.push({
                ...baseConfig,
                blur: true,
                blurRadius: baseConfig.blurRadius || 0.4,
                multiPass: false
            });
        }

        if (!baseConfig.sharpen) {
            configs.push({
                ...baseConfig,
                sharpen: true,
                sharpenIntensity: baseConfig.sharpenIntensity || 0.3,
                multiPass: false
            });
        }

        if (!baseConfig.forceInvert && !baseConfig.tryInverted) {
            configs.push({
                ...baseConfig,
                forceInvert: true,
                multiPass: false
            });
        }

        return configs.slice(0, 4);
    }

    private getConfigSnapshotKey(config: ImagePreprocessingConfig): string {
        return JSON.stringify(this.buildPreprocessingSnapshot(config));
    }

    private createIsolatedBaseConfig(
        baseConfig: ImagePreprocessingConfig
    ): ImagePreprocessingConfig {
        return {
            ...baseConfig,
            contrastEnhancement: false,
            grayscale: false,
            tryInverted: false,
            forceInvert: false,
            blur: false,
            sharpen: false,
            temporalDenoise: false,
            adaptiveThreshold: false,
            morphClose: false,
            upscale: false,
            multiPass: false
        };
    }

    private getActivePreprocessingModules(
        baseConfig: ImagePreprocessingConfig,
        includeInversion: boolean
    ): PreprocessingModuleDescriptor[] {
        const modules: PreprocessingModuleDescriptor[] = [];
        if (baseConfig.contrastEnhancement) {
            modules.push({
                key: "contrast",
                apply: (target) => {
                    target.contrastEnhancement = true;
                    target.contrastFactor = baseConfig.contrastFactor;
                }
            });
        }
        if (baseConfig.grayscale) {
            modules.push({
                key: "grayscale",
                apply: (target) => {
                    target.grayscale = true;
                }
            });
        }
        if (baseConfig.blur) {
            modules.push({
                key: "blur",
                apply: (target) => {
                    target.blur = true;
                    target.blurRadius = baseConfig.blurRadius;
                }
            });
        }
        if (baseConfig.temporalDenoise) {
            modules.push({
                key: "temporal",
                apply: (target) => {
                    target.temporalDenoise = true;
                    target.temporalDenoiseStrength = baseConfig.temporalDenoiseStrength;
                }
            });
        }
        if (baseConfig.adaptiveThreshold) {
            modules.push({
                key: "adaptive",
                apply: (target) => {
                    target.adaptiveThreshold = true;
                    target.adaptiveBlockSize = baseConfig.adaptiveBlockSize;
                    target.adaptiveOffset = baseConfig.adaptiveOffset;
                }
            });
        }
        if (baseConfig.morphClose) {
            modules.push({
                key: "morph",
                apply: (target) => {
                    target.morphClose = true;
                    target.morphCloseIterations = baseConfig.morphCloseIterations;
                }
            });
        }
        if (baseConfig.sharpen) {
            modules.push({
                key: "sharpen",
                apply: (target) => {
                    target.sharpen = true;
                    target.sharpenIntensity = baseConfig.sharpenIntensity;
                }
            });
        }
        if (baseConfig.upscale) {
            modules.push({
                key: "upscale",
                apply: (target) => {
                    target.upscale = true;
                    target.upscaleFactor = baseConfig.upscaleFactor;
                }
            });
        }
        if ((baseConfig.forceInvert || baseConfig.tryInverted)
            && includeInversion) {
            modules.push({
                key: "invert",
                apply: (target) => {
                    target.tryInverted = false;
                    target.forceInvert = true;
                }
            });
        }

        return modules;
    }

    private buildConfigFromModules(
        isolatedBase: ImagePreprocessingConfig,
        modules: PreprocessingModuleDescriptor[]
    ): ImagePreprocessingConfig {
        const cfg: ImagePreprocessingConfig = {
            ...isolatedBase,
            multiPass: false,
            tryInverted: false,
            forceInvert: false
        };
        modules.forEach((module) => {
            module.apply(cfg);
        });
        return cfg;
    }

    private buildModuleCombinations(
        modules: PreprocessingModuleDescriptor[],
        size: number
    ): PreprocessingModuleDescriptor[][] {
        const output: PreprocessingModuleDescriptor[][] = [];
        if (size < 1 || modules.length < size) {
            return output;
        }

        const current: PreprocessingModuleDescriptor[] = [];
        const visit = (startIndex: number): void => {
            if (current.length === size) {
                output.push(current.slice());
                return;
            }
            const remaining = size - current.length;
            for (let index = startIndex; index <= modules.length - remaining; index += 1) {
                current.push(modules[index]);
                visit(index + 1);
                current.pop();
            }
        };
        visit(0);
        return output;
    }

    private buildPassDescriptors(
        baseConfig: ImagePreprocessingConfig
    ): ImagePreprocessingPassDescriptor[] {
        // Explicit pass list bypasses the entire combinatorial system.
        if (baseConfig.explicitPasses && baseConfig.explicitPasses.length > 0) {
            return baseConfig.explicitPasses.map((ep, index) => {
                const { passName, tryInverted, ...overrides } = ep;
                const merged: ImagePreprocessingConfig = this.normalizeConfig({
                    ...baseConfig,
                    ...overrides,
                    // tryInverted per-pass override; fall back to base config
                    tryInverted: tryInverted !== undefined ? tryInverted : !!baseConfig.tryInverted,
                    // Never recurse into explicit passes
                    explicitPasses: undefined,
                    multiPass: false,
                    orthogonalPasses: false,
                    combinationPasses: false,
                });
                return {
                    config: merged,
                    passLabel: passName ?? `ep${index + 1}`,
                };
            });
        }

        if (baseConfig.datamatrixDpmMode) {
            return this.buildDpmModePassDescriptors(baseConfig);
        }

        const combinationPassesEnabled = !!baseConfig.combinationPasses;
        const includeInversionInCombinations
            = baseConfig.combinationIncludeInversion === true;
        if (!baseConfig.orthogonalPasses && !combinationPassesEnabled) {
            const defaults = baseConfig.multiPass
                ? this.buildMultiPassConfigs(baseConfig)
                : [baseConfig];
            return defaults.map((cfg, index) => {
                return {
                    config: cfg,
                    passLabel: defaults.length > 1 ? `mp${index + 1}` : "mp1"
                };
            });
        }

        const descriptors: ImagePreprocessingPassDescriptor[] = [];
        const isolatedBase = this.createIsolatedBaseConfig(baseConfig);
        const activeModulesForSingles = this.getActivePreprocessingModules(
            baseConfig,
            true
        );
        const activeModulesForCombinations = this.getActivePreprocessingModules(
            baseConfig,
            includeInversionInCombinations
        );

        const add = (
            label: string,
            cfg: ImagePreprocessingConfig,
            forceTail: boolean = false
        ): void => {
            const normalized = this.normalizeConfig({
                ...cfg,
                multiPass: false
            });
            const key = this.getConfigSnapshotKey(normalized);
            const existingIndex = descriptors.findIndex((descriptor) => {
                return this.getConfigSnapshotKey(descriptor.config) === key;
            });
            if (existingIndex !== -1) {
                if (!forceTail) {
                    return;
                }
                descriptors.splice(existingIndex, 1);
            }
            if (forceTail) {
                descriptors.push({
                    config: normalized,
                    passLabel: label
                });
                return;
            }
            descriptors.push({
                config: normalized,
                passLabel: label
            });
        };

        if (baseConfig.orthogonalPasses) {
            activeModulesForSingles.forEach((module) => {
                add(
                    `single-${module.key}`,
                    this.buildConfigFromModules(isolatedBase, [module])
                );
            });
        }

        if (combinationPassesEnabled) {
            const maxCombinationSize = Math.min(
                this.normalizeCombinationMaxSize(baseConfig.combinationMaxSize),
                activeModulesForCombinations.length
            );
            for (
                let size = MIN_COMBINATION_PASS_SIZE;
                size <= maxCombinationSize;
                size += 1
            ) {
                const combinations = this.buildModuleCombinations(
                    activeModulesForCombinations,
                    size
                );
                combinations.forEach((combination) => {
                    add(
                        `combo-${combination.map((module) => {
                            return module.key;
                        }).join("+")}`,
                        this.buildConfigFromModules(isolatedBase, combination)
                    );
                });
            }
        }

        if (baseConfig.multiPass) {
            const multiVariants = this.buildMultiPassConfigs(baseConfig);
            multiVariants.forEach((variant, index) => {
                if (index === 0) {
                    return;
                }
                let label = `multi${index}`;
                if (variant.forceInvert) {
                    label = "multi-invert";
                } else if (variant.sharpen && !baseConfig.sharpen) {
                    label = "multi-sharpen";
                } else if (variant.blur && !baseConfig.blur) {
                    label = "multi-blur";
                } else if (variant.contrastEnhancement && !baseConfig.contrastEnhancement) {
                    label = "multi-contrast";
                }
                add(label, variant);
            });
        }

        const fullComboModules = activeModulesForCombinations.length > 0
            ? activeModulesForCombinations
            : activeModulesForSingles;

        add(
            "combo-full",
            this.buildConfigFromModules(
                isolatedBase,
                fullComboModules
            ),
            true
        );

        return descriptors;
    }

    private buildDpmModePassDescriptors(
        baseConfig: ImagePreprocessingConfig
    ): ImagePreprocessingPassDescriptor[] {
        const descriptors: ImagePreprocessingPassDescriptor[] = [];
        const budget = baseConfig.decodingBudget === "slow" ? "slow" : "normal";

        const dpmBase = this.normalizeConfig({
            ...baseConfig,
            ...PREPROCESSING_PRESETS.DPM,
            datamatrixDpmMode: true,
            decodingBudget: budget,
            multiPass: false,
            orthogonalPasses: false,
            combinationPasses: false,
            rotationPasses: false
        });
        descriptors.push({
            config: dpmBase,
            passLabel: "dpm-base"
        });

        if (budget === "slow") {
            const dpmRelief = this.normalizeConfig({
                ...dpmBase,
                blur: true,
                blurRadius: 0.7,
                sharpen: true,
                sharpenIntensity: 0.65,
                morphClose: true,
                morphCloseIterations: 1,
                tryInverted: false,
                forceInvert: false,
                multiPass: false,
                orthogonalPasses: false,
                combinationPasses: false,
                rotationPasses: false
            });
            descriptors.push({
                config: dpmRelief,
                passLabel: "dpm-relief"
            });
        }

        return descriptors;
    }

    /**
     * Process a single canvas with all enabled filters.
     */
    private processCanvasWithConfig(
        sourceCanvas: HTMLCanvasElement,
        config: ImagePreprocessingConfig,
        invert: boolean
    ): HTMLCanvasElement {
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;

        // Create or reuse temp canvas
        if (!this.tempCanvas) {
            this.tempCanvas = document.createElement("canvas");
        }
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;

        if (!this.tempContext) {
            this.tempContext = this.tempCanvas.getContext("2d", {
                willReadFrequently: true
            })!;
        }

        // Draw source to temp canvas
        this.tempContext.drawImage(sourceCanvas, 0, 0);

        // Get image data for pixel manipulation
        const imageData = this.tempContext.getImageData(0, 0, width, height);
        const data = imageData.data;
        const temporalCacheKey = this.buildTemporalCacheKey(config, width, height, invert);

        // Apply grayscale if enabled
        if (config.grayscale) {
            this.applyGrayscale(data);
        }

        // Frame-to-frame jitter compensation before denoise/contrast pipeline.
        if (config.stabilization) {
            this.applyMotionStabilization(
                data,
                width,
                height,
                this.normalizeStabilizationStrength(config.stabilizationStrength),
                this.normalizeStabilizationMotionThreshold(
                    config.stabilizationMotionThreshold
                ),
                this.normalizeStabilizationMaxShift(config.stabilizationMaxShift),
                this.normalizeStabilizationDownsample(config.stabilizationDownsample)
            );
        }

        // Blend with previous frame to suppress sensor noise/flicker.
        if (config.temporalDenoise) {
            this.applyTemporalDenoise(
                data,
                temporalCacheKey,
                this.normalizeTemporalDenoiseStrength(config.temporalDenoiseStrength)
            );
        }

        // Apply contrast enhancement if enabled
        if (config.contrastEnhancement) {
            this.applyContrast(data, config.contrastFactor || 1.5);
        }

        // Apply blur if enabled (reduce noise before sharpening)
        if (config.blur) {
            this.applyBlur(
                imageData,
                width,
                height,
                config.blurRadius || 1.5
            );
        }

        // Apply sharpening if enabled
        if (config.sharpen) {
            this.applySharpen(
                imageData,
                width,
                height,
                config.sharpenIntensity || 0.3
            );
        }

        // Local binarization for uneven illumination on reflective surfaces.
        if (config.adaptiveThreshold) {
            this.applyAdaptiveThreshold(
                imageData,
                width,
                height,
                this.normalizeAdaptiveBlockSize(config.adaptiveBlockSize),
                this.normalizeAdaptiveOffset(config.adaptiveOffset)
            );
        }

        // Close tiny gaps in modules after binarization.
        if (config.morphClose) {
            this.applyMorphClose(
                imageData,
                width,
                height,
                this.normalizeMorphCloseIterations(config.morphCloseIterations)
            );
        }

        // Apply inversion if requested
        if (invert || config.forceInvert) {
            this.applyInversion(data);
        }

        // Put processed data back
        this.tempContext.putImageData(imageData, 0, 0);

        // Create result canvas (don't reuse to allow multiple results)
        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultContext = resultCanvas.getContext("2d")!;
        resultContext.drawImage(this.tempCanvas, 0, 0);

        if (config.upscale) {
            const factor = this.normalizeUpscaleFactor(config.upscaleFactor);
            if (factor > 1.001) {
                return this.createUpscaledCanvas(resultCanvas, factor);
            }
        }

        return resultCanvas;
    }

    private buildTemporalCacheKey(
        config: ImagePreprocessingConfig,
        width: number,
        height: number,
        invert: boolean
    ): string {
        return `${width}x${height}|${invert ? "inv" : "norm"}|${this.getConfigSnapshotKey(config)}`;
    }

    private applyTemporalDenoise(
        data: Uint8ClampedArray,
        cacheKey: string,
        strength: number
    ): void {
        const normalizedStrength = this.normalizeTemporalDenoiseStrength(strength);
        const previous = this.temporalDenoiseCache.get(cacheKey);
        if (previous && previous.length === data.length) {
            const currentWeight = 1 - normalizedStrength;
            for (let i = 0; i < data.length; i += 1) {
                data[i] = this.clamp(
                    data[i] * currentWeight + previous[i] * normalizedStrength
                );
            }
        }

        this.temporalDenoiseCache.delete(cacheKey);
        this.temporalDenoiseCache.set(cacheKey, new Uint8ClampedArray(data));
        while (this.temporalDenoiseCache.size > MAX_TEMPORAL_CACHE_ENTRIES) {
            const oldestKey = this.temporalDenoiseCache.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            this.temporalDenoiseCache.delete(oldestKey);
        }
    }

    private applyMotionStabilization(
        data: Uint8ClampedArray,
        width: number,
        height: number,
        strength: number,
        motionThreshold: number,
        maxShiftPx: number,
        downsample: number
    ): void {
        if (width < 24 || height < 24) {
            return;
        }

        const normalizedDownsample = this.normalizeStabilizationDownsample(downsample);
        const sample = this.buildDownsampledLuminance(
            data,
            width,
            height,
            normalizedDownsample
        );
        const sampleWidth = Math.max(1, Math.floor(width / normalizedDownsample));
        const sampleHeight = Math.max(1, Math.floor(height / normalizedDownsample));
        const cacheKey = `${width}x${height}|ds${normalizedDownsample}`;

        const previous = this.motionStabilizationCache.get(cacheKey);
        if (!previous
            || previous.sampleWidth !== sampleWidth
            || previous.sampleHeight !== sampleHeight
            || previous.stabilizedFrame.length !== data.length) {
            this.storeMotionStabilizationState(cacheKey, {
                sample: sample,
                sampleWidth: sampleWidth,
                sampleHeight: sampleHeight,
                stabilizedFrame: new Uint8ClampedArray(data)
            });
            return;
        }

        const maxShiftSample = Math.max(
            1,
            Math.round(this.normalizeStabilizationMaxShift(maxShiftPx) / normalizedDownsample)
        );
        const shift = this.estimateBestStabilizationShift(
            sample,
            previous.sample,
            sampleWidth,
            sampleHeight,
            maxShiftSample
        );
        const normalizedThreshold = this.normalizeStabilizationMotionThreshold(
            motionThreshold
        );
        const shouldCompensate = shift.score <= normalizedThreshold;

        let working = new Uint8ClampedArray(data);
        if (shouldCompensate) {
            const shiftX = Math.round(-shift.dx * normalizedDownsample);
            const shiftY = Math.round(-shift.dy * normalizedDownsample);
            if (shiftX !== 0 || shiftY !== 0) {
                working = this.translateFrameData(
                    working,
                    width,
                    height,
                    shiftX,
                    shiftY
                );
            }
            working = this.blendWithReference(
                working,
                previous.stabilizedFrame,
                this.normalizeStabilizationStrength(strength)
            );
        }

        data.set(working);
        this.storeMotionStabilizationState(cacheKey, {
            sample: sample,
            sampleWidth: sampleWidth,
            sampleHeight: sampleHeight,
            stabilizedFrame: new Uint8ClampedArray(working)
        });
    }

    private storeMotionStabilizationState(
        key: string,
        state: MotionStabilizationState
    ): void {
        this.motionStabilizationCache.delete(key);
        this.motionStabilizationCache.set(key, state);
        while (this.motionStabilizationCache.size > MAX_STABILIZATION_CACHE_ENTRIES) {
            const oldestKey = this.motionStabilizationCache.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            this.motionStabilizationCache.delete(oldestKey);
        }
    }

    private buildDownsampledLuminance(
        data: Uint8ClampedArray,
        width: number,
        height: number,
        downsample: number
    ): Float32Array {
        const sampleWidth = Math.max(1, Math.floor(width / downsample));
        const sampleHeight = Math.max(1, Math.floor(height / downsample));
        const sample = new Float32Array(sampleWidth * sampleHeight);
        for (let sy = 0; sy < sampleHeight; sy += 1) {
            const y = Math.min(height - 1, sy * downsample + Math.floor(downsample / 2));
            for (let sx = 0; sx < sampleWidth; sx += 1) {
                const x = Math.min(width - 1, sx * downsample + Math.floor(downsample / 2));
                const idx = (y * width + x) * 4;
                sample[sy * sampleWidth + sx] = data[idx] === data[idx + 1]
                    && data[idx] === data[idx + 2]
                    ? data[idx]
                    : (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
            }
        }
        return sample;
    }

    private estimateBestStabilizationShift(
        current: Float32Array,
        previous: Float32Array,
        width: number,
        height: number,
        maxShift: number
    ): { dx: number; dy: number; score: number } {
        let bestDx = 0;
        let bestDy = 0;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let dy = -maxShift; dy <= maxShift; dy += 1) {
            for (let dx = -maxShift; dx <= maxShift; dx += 1) {
                const score = this.computeShiftScore(
                    current,
                    previous,
                    width,
                    height,
                    dx,
                    dy
                );
                if (score < bestScore) {
                    bestScore = score;
                    bestDx = dx;
                    bestDy = dy;
                }
            }
        }
        return {
            dx: bestDx,
            dy: bestDy,
            score: Number.isFinite(bestScore) ? bestScore : 1
        };
    }

    private computeShiftScore(
        current: Float32Array,
        previous: Float32Array,
        width: number,
        height: number,
        dx: number,
        dy: number
    ): number {
        let sum = 0;
        let count = 0;
        for (let y = 0; y < height; y += 1) {
            const py = y - dy;
            if (py < 0 || py >= height) {
                continue;
            }
            const row = y * width;
            const prevRow = py * width;
            for (let x = 0; x < width; x += 1) {
                const px = x - dx;
                if (px < 0 || px >= width) {
                    continue;
                }
                sum += Math.abs(current[row + x] - previous[prevRow + px]);
                count += 1;
            }
        }
        if (count === 0) {
            return 1;
        }
        return sum / (count * 255);
    }

    private translateFrameData(
        source: Uint8ClampedArray,
        width: number,
        height: number,
        shiftX: number,
        shiftY: number
    ): Uint8ClampedArray {
        const output = new Uint8ClampedArray(source.length);
        for (let y = 0; y < height; y += 1) {
            const srcY = Math.max(0, Math.min(height - 1, y - shiftY));
            for (let x = 0; x < width; x += 1) {
                const srcX = Math.max(0, Math.min(width - 1, x - shiftX));
                const outIdx = (y * width + x) * 4;
                const srcIdx = (srcY * width + srcX) * 4;
                output[outIdx] = source[srcIdx];
                output[outIdx + 1] = source[srcIdx + 1];
                output[outIdx + 2] = source[srcIdx + 2];
                output[outIdx + 3] = source[srcIdx + 3];
            }
        }
        return output;
    }

    private blendWithReference(
        source: Uint8ClampedArray,
        reference: Uint8ClampedArray,
        strength: number
    ): Uint8ClampedArray {
        const normalizedStrength = this.normalizeStabilizationStrength(strength);
        if (normalizedStrength <= 0 || reference.length !== source.length) {
            return source;
        }
        const output = new Uint8ClampedArray(source.length);
        const sourceWeight = 1 - normalizedStrength;
        for (let i = 0; i < source.length; i += 1) {
            output[i] = this.clamp(
                source[i] * sourceWeight + reference[i] * normalizedStrength
            );
        }
        return output;
    }

    private createUpscaledCanvas(
        sourceCanvas: HTMLCanvasElement,
        factor: number
    ): HTMLCanvasElement {
        const targetWidth = Math.max(1, Math.round(sourceCanvas.width * factor));
        const targetHeight = Math.max(1, Math.round(sourceCanvas.height * factor));
        const upscaledCanvas = document.createElement("canvas");
        upscaledCanvas.width = targetWidth;
        upscaledCanvas.height = targetHeight;
        const upscaledContext = upscaledCanvas.getContext("2d")!;
        upscaledContext.imageSmoothingEnabled = false;
        upscaledContext.drawImage(
            sourceCanvas,
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,
            0,
            0,
            targetWidth,
            targetHeight
        );
        return upscaledCanvas;
    }

    /**
     * Convert image to grayscale.
     */
    private applyGrayscale(data: Uint8ClampedArray): void {
        for (let i = 0; i < data.length; i += 4) {
            // Use luminance formula for better results
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            // Alpha (data[i + 3]) remains unchanged
        }
    }

    /**
     * Apply a simple box blur.
     */
    private applyBlur(
        imageData: ImageData,
        width: number,
        height: number,
        radius: number
    ): void {
        const data = imageData.data;
        const result = new Uint8ClampedArray(data.length);
        const original = new Uint8ClampedArray(data);

        // Allow subtle blur values like 0.4 without forcing a full radius-1 blur.
        const normalizedRadius = Math.max(0, radius);
        if (normalizedRadius === 0) {
            return;
        }

        const r = normalizedRadius < 1 ? 1 : Math.max(1, Math.round(normalizedRadius));
        const blurBlend = normalizedRadius < 1 ? normalizedRadius : 1;
        const kernelSize = (2 * r + 1);
        const kernelArea = kernelSize * kernelSize;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sumR = 0;
                let sumG = 0;
                let sumB = 0;
                let sumA = 0;

                for (let ky = -r; ky <= r; ky++) {
                    const yy = Math.min(height - 1, Math.max(0, y + ky));
                    for (let kx = -r; kx <= r; kx++) {
                        const xx = Math.min(width - 1, Math.max(0, x + kx));
                        const idx = (yy * width + xx) * 4;
                        sumR += data[idx];
                        sumG += data[idx + 1];
                        sumB += data[idx + 2];
                        sumA += data[idx + 3];
                    }
                }

                const outIdx = (y * width + x) * 4;
                const blurredR = sumR / kernelArea;
                const blurredG = sumG / kernelArea;
                const blurredB = sumB / kernelArea;
                result[outIdx] = this.clamp(
                    original[outIdx] * (1 - blurBlend) + blurredR * blurBlend
                );
                result[outIdx + 1] = this.clamp(
                    original[outIdx + 1] * (1 - blurBlend) + blurredG * blurBlend
                );
                result[outIdx + 2] = this.clamp(
                    original[outIdx + 2] * (1 - blurBlend) + blurredB * blurBlend
                );
                result[outIdx + 3] = sumA / kernelArea;
            }
        }

        data.set(result);
    }

    private applyAdaptiveThreshold(
        imageData: ImageData,
        width: number,
        height: number,
        blockSize: number,
        offset: number
    ): void {
        const data = imageData.data;
        const pixelCount = width * height;
        if (pixelCount === 0) {
            return;
        }

        const radius = Math.floor(this.normalizeAdaptiveBlockSize(blockSize) / 2);
        const normalizedOffset = this.normalizeAdaptiveOffset(offset);
        const luminance = new Float32Array(pixelCount);

        for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
            luminance[pixel] = data[i] === data[i + 1] && data[i] === data[i + 2]
                ? data[i]
                : (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        const stride = width + 1;
        const integral = new Float64Array((height + 1) * stride);
        const integralSq = new Float64Array((height + 1) * stride);
        for (let y = 1; y <= height; y += 1) {
            let rowSum = 0;
            let rowSumSq = 0;
            const sourceOffset = (y - 1) * width;
            const integralOffset = y * stride;
            const prevIntegralOffset = (y - 1) * stride;
            for (let x = 1; x <= width; x += 1) {
                const lum = luminance[sourceOffset + (x - 1)];
                rowSum += lum;
                rowSumSq += lum * lum;
                integral[integralOffset + x]
                    = integral[prevIntegralOffset + x] + rowSum;
                integralSq[integralOffset + x]
                    = integralSq[prevIntegralOffset + x] + rowSumSq;
            }
        }

        for (let y = 0; y < height; y += 1) {
            const y0 = Math.max(0, y - radius);
            const y1 = Math.min(height - 1, y + radius);
            for (let x = 0; x < width; x += 1) {
                const x0 = Math.max(0, x - radius);
                const x1 = Math.min(width - 1, x + radius);
                const area = (x1 - x0 + 1) * (y1 - y0 + 1);
                const sum
                    = integral[(y1 + 1) * stride + (x1 + 1)]
                    - integral[y0 * stride + (x1 + 1)]
                    - integral[(y1 + 1) * stride + x0]
                    + integral[y0 * stride + x0];
                const sumSq
                    = integralSq[(y1 + 1) * stride + (x1 + 1)]
                    - integralSq[y0 * stride + (x1 + 1)]
                    - integralSq[(y1 + 1) * stride + x0]
                    + integralSq[y0 * stride + x0];
                const localMean = sum / Math.max(1, area);
                const localVariance = Math.max(
                    0,
                    sumSq / Math.max(1, area) - localMean * localMean
                );
                const localStdDev = Math.sqrt(localVariance);
                const sauvolaThreshold = localMean * (
                    1 + ADAPTIVE_SAUVOLA_K * (localStdDev / ADAPTIVE_SAUVOLA_R - 1)
                );
                const threshold = sauvolaThreshold - normalizedOffset;
                const sourceLum = luminance[y * width + x];
                const binary = sourceLum > threshold ? 255 : 0;
                const softened = sourceLum * (1 - ADAPTIVE_BINARY_BLEND)
                    + binary * ADAPTIVE_BINARY_BLEND;
                const value = this.clamp(softened);
                const out = (y * width + x) * 4;
                data[out] = value;
                data[out + 1] = value;
                data[out + 2] = value;
            }
        }
    }

    private applyMorphClose(
        imageData: ImageData,
        width: number,
        height: number,
        iterations: number
    ): void {
        let current = new Uint8ClampedArray(imageData.data);
        const normalizedIterations = this.normalizeMorphCloseIterations(iterations);
        for (let i = 0; i < normalizedIterations; i += 1) {
            const dilated = this.applyMorphOperator(current, width, height, true);
            current = this.applyMorphOperator(dilated, width, height, false);
        }
        imageData.data.set(current);
    }

    private applyMorphOperator(
        source: Uint8ClampedArray,
        width: number,
        height: number,
        dilation: boolean
    ): Uint8ClampedArray {
        const output = new Uint8ClampedArray(source.length);
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                let value = dilation ? 0 : 255;
                for (let ky = -1; ky <= 1; ky += 1) {
                    const yy = Math.min(height - 1, Math.max(0, y + ky));
                    for (let kx = -1; kx <= 1; kx += 1) {
                        const xx = Math.min(width - 1, Math.max(0, x + kx));
                        const idx = (yy * width + xx) * 4;
                        const sample = source[idx];
                        if (dilation) {
                            value = Math.max(value, sample);
                        } else {
                            value = Math.min(value, sample);
                        }
                    }
                }
                const outIdx = (y * width + x) * 4;
                output[outIdx] = value;
                output[outIdx + 1] = value;
                output[outIdx + 2] = value;
                output[outIdx + 3] = source[outIdx + 3];
            }
        }
        return output;
    }

    /**
     * Apply contrast enhancement.
     */
    private applyContrast(data: Uint8ClampedArray, factor: number): void {
        const stats = this.computeLuminanceStats(data);
        const lowContrastBoost = stats.stdDev < 35
            ? this.clampFloat(35 / Math.max(8, stats.stdDev), 1, 1.35)
            : 1;
        const effectiveFactor = this.clampFloat(factor * lowContrastBoost, 1, 3);
        const brightnessLift = stats.mean < 95 ? (95 - stats.mean) * 0.35 : 0;
        const intercept = 128 * (1 - effectiveFactor) + brightnessLift;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = this.clamp(effectiveFactor * data[i] + intercept);
            data[i + 1] = this.clamp(effectiveFactor * data[i + 1] + intercept);
            data[i + 2] = this.clamp(effectiveFactor * data[i + 2] + intercept);
        }
    }

    private computeLuminanceStats(
        data: Uint8ClampedArray
    ): { mean: number; stdDev: number } {
        const pixelCount = data.length / 4;
        if (pixelCount === 0) {
            return { mean: 128, stdDev: 0 };
        }

        let sum = 0;
        let sumSquares = 0;
        for (let i = 0; i < data.length; i += 4) {
            const luminance =
                0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            sum += luminance;
            sumSquares += luminance * luminance;
        }

        const mean = sum / pixelCount;
        const variance = Math.max(0, sumSquares / pixelCount - mean * mean);
        return { mean, stdDev: Math.sqrt(variance) };
    }

    /**
     * Invert image colors.
     */
    private applyInversion(data: Uint8ClampedArray): void {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
    }

    /**
     * Apply sharpening using unsharp mask technique.
     */
    private applySharpen(
        imageData: ImageData,
        width: number,
        height: number,
        intensity: number
    ): void {
        const data = imageData.data;
        const original = new Uint8ClampedArray(data);

        // Simple 3x3 sharpen kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += original[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    const idx = (y * width + x) * 4 + c;
                    // Blend original with sharpened based on intensity
                    data[idx] = this.clamp(
                        original[idx] * (1 - intensity) + sum * intensity
                    );
                }
            }
        }
    }


    /**
     * Clamp value to 0-255 range.
     */
    private clamp(value: number): number {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    private clampFloat(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Clean up resources.
     */
    public dispose(): void {
        this.tempCanvas = null;
        this.tempContext = null;
        this.resetTemporalDenoiseCache();
        this.resetMotionStabilizationCache();
    }

    private resetTemporalDenoiseCache(): void {
        this.temporalDenoiseCache.clear();
    }

    private resetMotionStabilizationCache(): void {
        this.motionStabilizationCache.clear();
    }

    /**
     * Warp the source canvas into a horizontal or vertical trapezoid (keystone).
     */
    private perspectiveCanvas(
        sourceCanvas: HTMLCanvasElement,
        axis: ImagePreprocessingPerspectiveAxis,
        factor: number
    ): HTMLCanvasElement {
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = width;
        resultCanvas.height = height;
        const ctx = resultCanvas.getContext("2d")!;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        let dstTopLeft: [number, number];
        let dstTopRight: [number, number];
        let dstBottomRight: [number, number];
        let dstBottomLeft: [number, number];

        if (axis === "horizontal") {
            const topLeftX = width * factor;
            const topRightX = width * (1 - factor);
            dstTopLeft = [topLeftX, 0];
            dstTopRight = [topRightX, 0];
            dstBottomRight = [width, height];
            dstBottomLeft = [0, height];
        } else {
            const leftTopY = height * factor;
            const leftBottomY = height * (1 - factor);
            dstTopLeft = [0, leftTopY];
            dstTopRight = [width, 0];
            dstBottomRight = [width, height];
            dstBottomLeft = [0, leftBottomY];
        }

        const srcTopLeft: [number, number] = [0, 0];
        const srcTopRight: [number, number] = [width, 0];
        const srcBottomRight: [number, number] = [width, height];
        const srcBottomLeft: [number, number] = [0, height];

        this.drawImageTriangle(
            ctx,
            sourceCanvas,
            srcTopLeft,
            srcTopRight,
            srcBottomRight,
            dstTopLeft,
            dstTopRight,
            dstBottomRight
        );
        this.drawImageTriangle(
            ctx,
            sourceCanvas,
            srcTopLeft,
            srcBottomRight,
            srcBottomLeft,
            dstTopLeft,
            dstBottomRight,
            dstBottomLeft
        );

        return resultCanvas;
    }

    /**
     * Affine warp of one source triangle into one destination triangle.
     */
    private drawImageTriangle(
        ctx: CanvasRenderingContext2D,
        image: CanvasImageSource,
        sourceA: [number, number],
        sourceB: [number, number],
        sourceC: [number, number],
        destA: [number, number],
        destB: [number, number],
        destC: [number, number]
    ): void {
        const [sx0, sy0] = sourceA;
        const [sx1, sy1] = sourceB;
        const [sx2, sy2] = sourceC;
        const [dx0, dy0] = destA;
        const [dx1, dy1] = destB;
        const [dx2, dy2] = destC;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(dx0, dy0);
        ctx.lineTo(dx1, dy1);
        ctx.lineTo(dx2, dy2);
        ctx.closePath();
        ctx.clip();

        const denominator = (
            sx0 * (sy2 - sy1) +
            sx1 * (sy0 - sy2) +
            sx2 * (sy1 - sy0)
        );
        if (Math.abs(denominator) < 1e-6) {
            ctx.restore();
            return;
        }

        const transformA = (
            dx0 * (sy2 - sy1) +
            dx1 * (sy0 - sy2) +
            dx2 * (sy1 - sy0)
        ) / denominator;
        const transformB = (
            dy0 * (sy2 - sy1) +
            dy1 * (sy0 - sy2) +
            dy2 * (sy1 - sy0)
        ) / denominator;
        const transformC = (
            dx0 * (sx1 - sx2) +
            dx1 * (sx2 - sx0) +
            dx2 * (sx0 - sx1)
        ) / denominator;
        const transformD = (
            dy0 * (sx1 - sx2) +
            dy1 * (sx2 - sx0) +
            dy2 * (sx0 - sx1)
        ) / denominator;
        const transformE = (
            dx0 * (sx2 * sy1 - sx1 * sy2) +
            dx1 * (sx0 * sy2 - sx2 * sy0) +
            dx2 * (sx1 * sy0 - sx0 * sy1)
        ) / denominator;
        const transformF = (
            dy0 * (sx2 * sy1 - sx1 * sy2) +
            dy1 * (sx0 * sy2 - sx2 * sy0) +
            dy2 * (sx1 * sy0 - sx0 * sy1)
        ) / denominator;

        ctx.transform(
            transformA,
            transformB,
            transformC,
            transformD,
            transformE,
            transformF
        );
        ctx.drawImage(image, 0, 0);
        ctx.restore();
    }
}
