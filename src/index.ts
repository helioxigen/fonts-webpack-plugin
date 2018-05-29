import * as webpack from "webpack";

import * as path from "path";
import * as glob from "glob";

import * as fontkit from "fontkit";

import { RawSource } from "webpack-sources";
import {
    fsStatAsync,
    fsReadFileAsync,
    uniq,
    guessWeight,
    head,
    handlePathQuery,
    joinExt,
    joinStrExt,
    FontMetaFileMeta,
    uniqBy,
    extractExtentions
} from "./utils";
import { FontMeta } from "./FontMeta";

class FontsWebpackPlugin {
    compiler: webpack.Compiler;
    pluginName = "FontsWebpackPlugin";
    styles = "";

    constructor(
        public fontsFolder: string,
        public assetPath: string = "[name].[ext]",
    ) {
        this.apply.bind(this);
    }

    apply(compiler: webpack.Compiler) {
        this.compiler = compiler;

        this.fontsFolder = path.resolve(compiler.options.context, this.fontsFolder);

        this.compiler.hooks.emit.tapPromise(this.pluginName, compilation => this.addFilesToAssets(compilation))
    }

    generateStyles = (fontMeta: FontMeta, assetPaths) => {
        const src = assetPaths.map(file =>
            `url(${file.path}) format('${path.extname(file.path).slice(1)}')`
        ).join(",");

        this.styles += `
            @font-face {
                font-family: ${fontMeta.family};
                src: ${src};
                font-weight: ${fontMeta.weight};
                font-style: ${fontMeta.style};
            }
        `.replace(/ /g, "")

    }

    addFilesToAssets = async (compilation: webpack.compilation.Compilation) => {
        const fontsMeta = await this.resolveFonts(this.fontsFolder);

        fontsMeta.map(meta => {
            const assetPaths = handlePathQuery(this.assetPath, meta);

            assetPaths.forEach(file =>
                compilation.assets[file.path] = {
                    source: () => file.source,
                    size: () => file.stats.size
                }
            )

            this.generateStyles(meta, assetPaths)
        });

        compilation.assets["style/fonts.css"] = new RawSource(this.styles)
    }

    resolveFonts = (folder: string) => new Promise<FontMeta[]>(res =>
        glob(`${folder}/**/*.@(woff|woff2|ttf|otf)`, (er, files) => {
            const naked = files.map(path.parse).map(({ dir, name }) => path.join(dir, name))

            const metas = uniq(naked).map(nakedPath => {
                const fontFiles = files.filter(filePath => filePath.includes(nakedPath));

                return new FontMeta(...fontFiles);
            })

            res(metas);
        })
    )

    convertFonts = async () => {
        const fontFiles = await this.resolveFonts(this.fontsFolder);

        const names = fontFiles.map(file => path.parse("qqq")).map(({ dir, name }) => path.resolve(dir, name));

        const files = extractExtentions(fontFiles);



        path.parse("qqq").name

        const fileNames = new Set(names);

        const fontMap = new Map<string, FontMeta>();

        for (const pathName in fileNames) {
            const fontPaths = fontFiles.filter(file =>
                new RegExp(`^${pathName}\.[a-z0-9]*$`).test(file)
            )

            const files = await Promise.all(fontPaths.map(this.enquireFSData))

            const headFont = head(fontPaths, () => { throw new Error(`Font path error in ${pathName}`) })

            const {
                familyName,
                subfamilyName
            } = fontkit.openSync(headFont);

            const fallbackFamily = () => path.basename(headFont).replace(/\.[a-z0-9]*$/, "");

            const family = head(familyName.split(" "), fallbackFamily);

            const availNames = `${familyName} ${subfamilyName}`.split(" ");
            const meta = uniq(availNames);

            const style = head(meta.filter(m => /italic|oblique|normal/i.test(m)), () => "normal").toLowerCase();

            const weight = guessWeight(meta);

            fontMap.set(pathName, { family, style, weight, files })
        }

        return fontMap
    }
}

module.exports = FontsWebpackPlugin;
