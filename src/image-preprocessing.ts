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
    blurRadius: 1.5
};

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
        sharpen: false
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
        sharpen: false
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
        blurRadius: 1.5
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
        blurRadius: 1.5
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
        blurRadius: 1.5
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
        this.config = { ...DEFAULT_PREPROCESSING_CONFIG, ...config };
    }

    /**
     * Update preprocessing configuration.
     */
    public setConfig(config: ImagePreprocessingConfig): void {
        this.config = { ...DEFAULT_PREPROCESSING_CONFIG, ...config };
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
            this.config.blur
        );
    }

    /**
     * Process a canvas and return processed canvas(es).
     * May return multiple canvases if tryInverted is enabled.
     *
     * @param sourceCanvas The source canvas to process
     * @returns Array of processed canvases to try for decoding
     */
    public process(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement[] {
        const results: HTMLCanvasElement[] = [];

        // Always include the original (possibly with basic processing)
        const processed = this.processCanvas(sourceCanvas, false);
        results.push(processed);

        // If tryInverted is enabled, also try inverted version
        if (this.config.tryInverted) {
            const inverted = this.processCanvas(sourceCanvas, true);
            results.push(inverted);
        }

        return results;
    }

    /**
     * Process a single canvas with all enabled filters.
     */
    private processCanvas(
        sourceCanvas: HTMLCanvasElement,
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
        if (this.config.grayscale) {
            this.applyGrayscale(data);
        }

        // Apply contrast enhancement if enabled
        if (this.config.contrastEnhancement) {
            this.applyContrast(data, this.config.contrastFactor || 1.5);
        }

        // Apply blur if enabled (reduce noise before sharpening)
        if (this.config.blur) {
            this.applyBlur(
                imageData,
                width,
                height,
                this.config.blurRadius || 1.5
            );
        }

        // Apply sharpening if enabled
        if (this.config.sharpen) {
            this.applySharpen(
                imageData,
                width,
                height,
                this.config.sharpenIntensity || 0.3
            );
        }

        // Apply inversion if requested
        if (invert || this.config.forceInvert) {
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
        const r = Math.max(1, Math.round(radius));
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
                result[outIdx] = sumR / kernelArea;
                result[outIdx + 1] = sumG / kernelArea;
                result[outIdx + 2] = sumB / kernelArea;
                result[outIdx + 3] = sumA / kernelArea;
            }
        }

        data.set(result);
    }

    /**
     * Apply contrast enhancement.
     */
    private applyContrast(data: Uint8ClampedArray, factor: number): void {
        const intercept = 128 * (1 - factor);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = this.clamp(factor * data[i] + intercept);
            data[i + 1] = this.clamp(factor * data[i + 1] + intercept);
            data[i + 2] = this.clamp(factor * data[i + 2] + intercept);
        }
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

    /**
     * Clean up resources.
     */
    public dispose(): void {
        this.tempCanvas = null;
        this.tempContext = null;
    }
}
