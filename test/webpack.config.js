const path = require("path");
const FontsWebpackPlugin = require("../lib/index");

const PATHS = {
    lib: path.join(__dirname, "stub.js"),
    build: path.join(__dirname, "build")
};

module.exports = {
    entry: {
        lib: PATHS.lib
    },
    target: "node",
    output: {
        path: PATHS.build,
        filename: "[name].js"
    },
    plugins: [new FontsWebpackPlugin(path.join(__dirname, "../fonts"), "fonts/[family]/[style]-[weight].[ext]")]
}
