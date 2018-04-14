"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const glob = require("glob");
const fontkit = require("fontkit");
const webpack_sources_1 = require("webpack-sources");
const utils_1 = require("./utils");
class FontsWebpackPlugin {
    constructor(fontsFolder, assetPath = "[name].[ext]") {
        this.fontsFolder = fontsFolder;
        this.assetPath = assetPath;
        this.pluginName = "FontsWebpackPlugin";
        this.handleLoadError = filename => () => Promise.reject(new Error(`${this.pluginName}: could not load file ${filename}`));
        this.apply.bind(this);
    }
    apply(compiler) {
        this.compiler = compiler;
        this.fontsFolder = path.resolve(compiler.options.context, this.fontsFolder);
        this.compiler.hooks.emit.tapPromise(this.pluginName, compilation => this.addFilesToAssets(compilation));
    }
    async enquireFSData(fontPath) {
        return Promise.all([
            utils_1.fsStatAsync(fontPath),
            utils_1.fsReadFileAsync(fontPath),
        ]).catch(this.handleLoadError(fontPath));
    }
    async gatherFileMeta(font) {
        const { path, ...fontEnriched } = font;
        const fontPaths = font.exts.map(ext => utils_1.joinExt(font, ext));
        const fileData = fontPaths.flatMap(async (fontPath) => {
            const fsData = await this.enquireFSData(fontPath);
            return {
                path: fontPath,
                source: fsData[1],
                stats: fsData[0],
            };
        });
        const files = await Promise.all(fileData);
        return {
            ...fontEnriched,
            files
        };
    }
    generateStyles(fontMeta, assetPaths) {
        const src = assetPaths.map(file => `url(${file.path}) format('${path.extname(file.path).slice(1)}')`).join(",");
        const style = `
            @font-face {
                font-family: ${fontMeta.family};
                src: ${src};
                font-weight: ${fontMeta.weight};
                font-style: ${fontMeta.style};
            }
        `;
    }
    async addFilesToAssets(compilation) {
        const fontsMeta = await this.convertFonts();
        const files = await Promise.all(fontsMeta.map(this.gatherFileMeta));
        const styles = files.map(meta => {
            const assetPaths = utils_1.handlePathQuery(meta);
            assetPaths.forEach(file => compilation.assets[file.path] = {
                source: () => file.source,
                stats: () => file.stats.size
            });
            return this.generateStyles(meta, assetPaths);
        });
        compilation.assets["style/fonts.css"] = new webpack_sources_1.RawSource(styles.join("\n"));
    }
    resolveFonts(folder) {
        return new Promise(res => glob(`${folder}/**/*.@(woff|woff2|ttf|otf)`, (er, files) => res(files)));
    }
    async convertFonts() {
        const files = await this.resolveFonts(this.fontsFolder);
        const names = files.map(file => file.replace(path.extname(file), ""));
        return utils_1.uniq(names).map(pathName => {
            const exts = files
                .filter(file => new RegExp(`^${pathName}\.[a-z0-9]*$`).test(file))
                .map(file => path.extname(file).slice(1));
            const headExt = utils_1.head(exts, () => "ttf");
            const { familyName, subfamilyName } = fontkit.openSync(path.resolve(`${pathName}.${headExt}`));
            const family = utils_1.head(familyName.split(" "), () => "");
            const availNames = `${familyName} ${subfamilyName}`.split(" ");
            const meta = utils_1.uniq(availNames);
            const style = utils_1.head(meta.filter(/italic|oblique|normal/i.test), () => "normal");
            const weight = utils_1.guessWeight(meta);
            return { family, style, weight, path: pathName, exts };
        });
    }
}
module.exports = FontsWebpackPlugin;
