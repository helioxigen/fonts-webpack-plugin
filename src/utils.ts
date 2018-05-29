import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { FontFace } from "csstype";


export const fsStatAsync = promisify(fs.stat);
export const fsReadFileAsync = promisify(fs.readFile);

export type FontWeight = FontFace["fontWeight"];
export type FontStyle = FontFace["fontStyle"];

export type CommonFontExts = "woff" | "woff2" | "ttf" | "otf";

export type FontMetaFileMeta = {
    path: string,
    source: any,
    stats: any,
}

export type FontMeta = {
    family: string;
    style: FontStyle | string;
    weight: FontWeight;
    files: FontMetaFileMeta[];
};

export const head = <T>(arr: T[], orElse: () => T) => 0 in arr ? arr[0] : orElse()

export const uniq = (arrArg): string[] =>
    arrArg.filter(
        (elem, pos, arr) =>
            arr.findIndex(q => new RegExp(elem, "i").test(q)) === pos
    );

export const uniqBy = <T extends string>(arrArg: T[], fn: (el: T) => T): T[] =>
    arrArg.filter((elem, pos, arr) =>
        arr.findIndex(q => new RegExp(fn(elem), "i").test(q)) === pos
    );

type Files = {
    nakedPath: string
    extentions: string[]
}

export const extractExtentions = (paths: string[]) => paths.reduce((acc, filePath) => {
    const { dir, name } = path.parse(filePath);

    const nakedPath = path.join(dir, name);

    if (acc.some(f => f.nakedPath === nakedPath)) return acc;

    const extentions = paths.filter(filePath =>
        filePath.includes(nakedPath)
    ).map(path.extname)

    return acc.concat({
        nakedPath,
        extentions
    })
}, [] as Files[])

export const uniqbBy = <T extends string>(arrArg: T[], fn: (el: T) => T): T[] =>
    arrArg.filter((elem, pos, arr) =>
        arr.findIndex(q => new RegExp(fn(elem), "i").test(q)) === pos
    );

export const guessWeight = (meta: string[]): FontWeight => {
    const weightTest = /bold|thin|black|light|medium/i;
    const weightString = meta.find(str => weightTest.test(str));

    if (!weightString) return "normal";
    if (/^bold$/i.test(weightString)) return "bold";

    const fontMod = weightString.replace(weightTest, "");
    const fontWeight = weightString.replace(fontMod, "").toLowerCase();

    type WeightNums = Exclude<FontWeight, string>;

    const vals = <W = WeightNums>(generic: W, semi: W, extra: W) => {
        if (/extra/i.test(fontMod)) return extra;
        if (/semi/i.test(fontMod)) return semi;

        return generic;
    };

    switch (fontWeight) {
        case "thin":
            return 100;
        case "extralight":
            return 
        case "light":
            return 300;
        case "medium":
            return 500;
        case "bold":
            return vals(700, 600, 800);
        case "black":
            return 900;
    }
};

export const handlePathQuery = (assetPath: string, { weight, style, family, files }: FontMeta) => (
    files.map(fileMeta => {
        const textVars = {
            weight: weight === "normal" ? "" : weight,
            style: style === "normal" ? "regular" : style,
            family,
            name: path.basename(fileMeta.path),
            ext: path.extname(fileMeta.path).slice(1),
        };

        const varKeys = Object.keys(textVars).join("|");

        const matchKeys = new RegExp(`\\[(${varKeys})\\]`, "g");

        const nextPath = assetPath.replace(
            matchKeys,
            (_, key) => textVars[key]
        )
            .replace(/-(\.)/, "$1")
            .replace(/(\/)-/, "$1")

        return {
            ...fileMeta,
            path: nextPath
        };
    })
)



export const joinStrExt = (fontPath: string, ext: string) => `${fontPath}.${ext}`

export const joinExt = (font: FontMeta, ext?: string) => `${font.path}.${ext || head(font.exts, () => "ttf")}`