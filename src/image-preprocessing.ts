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

}

export interface ImagePreprocessingCandidateMeta {
    variantLabel: string;
    inverted: boolean;
    rotationAngle?: number;
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

/**
 * Default preprocessing configuration optimized for difficult codes.
 */
export const DEFAULT_PREPROCESSING_CONFIG: ImagePreprocessingConfig = {
    contrastEnhancement: false,
    contrastFactor: 1.5,
    grayscale: true,
    tryInverted: false,
    forceInvert: false,
    sharpen: false,
    sharpenIntensity: 0.3,
    blur: false,
    blurRadius: 1.5,
    multiPass: false,
    rotationPasses: false,
    rotationAngles: [],
    orthogonalPasses: false,
    maxPasses: 5,
    combinationPasses: false,
    combinationMaxSize: 3,
    combinationIncludeInversion: false
};

const DEFAULT_ROTATION_PASS_ANGLES: number[] = [-12, 12, -24, 24];
const MAX_ROTATION_PASS_ANGLES = 6;
const MIN_PREPROCESSING_PASSES = 1;
const MAX_PREPROCESSING_PASSES = 256;
const MIN_COMBINATION_PASS_SIZE = 2;
const MAX_COMBINATION_PASS_SIZE = 5;

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

    constructor(config?: ImagePreprocessingConfig) {
        this.config = this.normalizeConfig(config);
    }

    /**
     * Update preprocessing configuration.
     */
    public setConfig(config: ImagePreprocessingConfig): void {
        this.config = this.normalizeConfig(config);
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
            this.config.contrastEnhancement ||
            this.config.grayscale ||
            this.config.sharpen ||
            this.config.tryInverted ||
            this.config.forceInvert ||
            this.config.blur ||
            this.config.multiPass ||
            this.config.rotationPasses
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
     * Process a canvas and return processed candidates with metadata.
     */
    public processWithMetadata(
        sourceCanvas: HTMLCanvasElement
    ): ImagePreprocessingCandidate[] {
        const results: ImagePreprocessingCandidate[] = [];

        const passes = this.buildPassDescriptors(this.config);
        const passCount = passes.length;

        passes.forEach((pass, passIndex) => {
            const cfg = pass.config;
            const variantsForConfig: ImagePreprocessingCandidate[] = [];
            const preprocessingSnapshot = this.buildPreprocessingSnapshot(cfg);
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

            if (cfg.tryInverted) {
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

            results.push(...variantsForConfig);
        });

        const maxPasses = this.normalizeMaxPasses(this.config.maxPasses);
        return this.limitCandidatesWithFullCombo(results, maxPasses);
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
            const normalized = isFinite(angle) ? angle : 0;
            return Math.abs(normalized) < 0.001;
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
        passLabel?: string
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
        const modeLabel = inverted || !!config.forceInvert ? "inverted" : "normal";
        return `${effectivePassLabel}${rotationLabel} ${modeLabel}`;
    }

    private buildPreprocessingSnapshot(
        config: ImagePreprocessingConfig
    ): ImagePreprocessingConfig {
        return {
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
            multiPass: !!config.multiPass,
            rotationPasses: !!config.rotationPasses,
            rotationAngles: this.normalizeRotationAngles(config.rotationAngles),
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

    private normalizeConfig(
        config?: ImagePreprocessingConfig
    ): ImagePreprocessingConfig {
        const merged: ImagePreprocessingConfig = {
            ...DEFAULT_PREPROCESSING_CONFIG,
            ...(config || {})
        };
        merged.rotationPasses = !!merged.rotationPasses;
        merged.rotationAngles = this.normalizeRotationAngles(merged.rotationAngles);
        merged.orthogonalPasses = !!merged.orthogonalPasses;
        merged.combinationPasses = !!merged.combinationPasses;
        merged.combinationMaxSize = this.normalizeCombinationMaxSize(
            merged.combinationMaxSize
        );
        merged.combinationIncludeInversion = merged.combinationIncludeInversion !== false;
        merged.maxPasses = this.normalizeMaxPasses(merged.maxPasses);
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
        if (baseConfig.sharpen) {
            modules.push({
                key: "sharpen",
                apply: (target) => {
                    target.sharpen = true;
                    target.sharpenIntensity = baseConfig.sharpenIntensity;
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

        // Apply grayscale if enabled
        if (config.grayscale) {
            this.applyGrayscale(data);
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

        return resultCanvas;
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
    }
}
