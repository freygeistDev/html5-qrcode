const path = require("path");

module.exports = {
    // bundling mode
    mode: "production",
    // entry files
    entry: "./src/index.ts",
    // output bundles (location)
    output: {
        path: path.resolve( __dirname, "dist" ),
        filename: "html5-qrcode.min.js",
        library: "__Html5QrcodeLibrary__",
    },
    // file resolutions
    resolve: {
        extensions: [ ".ts", ".js" ],
        // Required to resolve package.json "exports" subpath fields
        // (e.g. @sec-ant/zxing-wasm/reader) with webpack 5.
        conditionNames: ["import", "module", "browser", "require", "default"],
        alias: {
            // Map subpath export to direct file path for TypeScript resolution.
            "@sec-ant/zxing-wasm/reader": path.resolve(
                __dirname,
                "node_modules/@sec-ant/zxing-wasm/dist/reader/index.js"),
        },
    },
    target: "web",
    // Enable async WebAssembly support (required for zxing-wasm).
    experiments: {
        asyncWebAssembly: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?/,
                // transpileOnly skips type-checking in the webpack bundle build;
                // type correctness is still verified by the separate tsc steps.
                use: {
                    loader: "ts-loader",
                    options: { transpileOnly: true },
                },
                exclude: /node_modules/,
            },
        ]
    },
    optimization: {
        minimize: true,
        usedExports: true
    }
};
