import * as webpack from "webpack";

import * as path from "path";
import * as glob from "glob";

import * as fontkit from "fontkit";

import { RawSource } from "webpack-sources";
import { FontMeta, fsStatAsync, fsReadFileAsync, uniq, guessWeight, head, handlePathQuery, joinExt, FontMetaEnriched } from "./utils";

class FontsWebpackPlugin {
    compiler: webpack.Compiler;
    pluginName = "FontsWebpackPlugin";

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

    handleLoadError = filename => () => Promise.reject(new Error(`${this.pluginName}: could not load file ${filename}`));

    async enquireFSData(fontPath: string) {
        return Promise.all([
            new Promise<string>(res => res(fontPath)),
            fsStatAsync(fontPath),
            fsReadFileAsync(fontPath),
        ]).catch(this.handleLoadError(fontPath))
    }

    async gatherFileMeta(font: FontMeta): Promise<FontMetaEnriched> {
        const {
            path,
            ...fontEnriched
        } = font;

        const fontPaths = font.exts.map(ext => joinExt(font, ext))

        const fileData = fontPaths.map(this.enquireFSData).map(enquire =>
            enquire.then(([path, stats, source]) => ({
                path,
                source,
                stats,
            }))
        )

        const files = await Promise.all(fileData);


        return {
            ...fontEnriched,
            files
        }

    }

    generateStyles(fontMeta: FontMetaEnriched, assetPaths) {
        const src = assetPaths.map(file =>
            `url(${file.path}) format('${path.extname(file.path).slice(1)}')`
        ).join(",");

        const style = `
            @font-face {
                font-family: ${fontMeta.family};
                src: ${src};
                font-weight: ${fontMeta.weight};
                font-style: ${fontMeta.style};
            }
        `
    }

    async addFilesToAssets(compilation: webpack.compilation.Compilation) {
        const fontsMeta = await this.convertFonts();

        const files = await Promise.all(fontsMeta.map(this.gatherFileMeta));

        const styles = files.map(meta => {
            const assetPaths = handlePathQuery(meta);

            assetPaths.forEach(file =>
                compilation.assets[file.path] = {
                    source: () => file.source,
                    stats: () => file.stats.size
                }
            )

            return this.generateStyles(meta, assetPaths)
        });

        compilation.assets["style/fonts.css"] = new RawSource(styles.join("\n"))
    }

    resolveFonts(folder: string): Promise<string[]> {
        return new Promise(res =>
            glob(`${folder}/**/*.@(woff|woff2|ttf|otf)`, (er, files) =>
                res(files)
            )
        );
    }

    async convertFonts(): Promise<FontMeta[]> {
        const files = await this.resolveFonts(this.fontsFolder);

        const names = files.map(file => file.replace(path.extname(file), ""));

        return uniq(names).map(pathName => {
            const exts = files
                .filter(file => new RegExp(`^${pathName}\.[a-z0-9]*$`).test(file))
                .map(file => path.extname(file).slice(1))

            const headExt = head(exts, () => "ttf");

            const {
                familyName,
                subfamilyName
            } = fontkit.openSync(path.resolve(`${pathName}.${headExt}`));



            const family = head(familyName.split(" "), () => "");

            const availNames = `${familyName} ${subfamilyName}`.split(" ");
            const meta = uniq(availNames);

            const style = head(meta.filter(/italic|oblique|normal/i.test), () => "normal")

            const weight = guessWeight(meta);

            return { family, style, weight, path: pathName, exts };
        });
    }
}

module.exports = FontsWebpackPlugin;
