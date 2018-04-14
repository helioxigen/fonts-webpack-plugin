import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { FontFace } from "csstype";


export const fsStatAsync = promisify(fs.stat);
export const fsReadFileAsync = promisify(fs.readFile);

type FontWeight = FontFace["fontWeight"];
type FontStyle = FontFace["fontStyle"];

type CommonFontExts = string | "woff" | "woff2" | "ttf" | "otf";

export type FontMeta = {
    family: string;
    style: FontStyle | string;
    weight: FontWeight;
    path: string;
    exts: CommonFontExts[];
};

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type FontMetaEnriched = Omit<FontMeta, "path"> & {
    files: {
        path: string,
        source: any,
        stats: any,
    }[]
}

export const head = <T>(arr: T[], orElse: () => T) => 0 in arr ? arr[0] : orElse()

export const uniq = (arrArg): string[] =>
    arrArg.filter(
        (elem, pos, arr) =>
            arr.findIndex(q => new RegExp(elem, "i").test(q)) === pos
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
        case "light":
            return vals(200, 300, 100);
        case "thin":
            return 400;
        case "medium":
            return 500;
        case "bold":
            return vals(700, 600, 800);
        case "black":
            return 900;
    }
};

type Queryable = Omit<FontMeta, "path">;

export const handlePathQuery = ({ weight, style, family, exts, files }: FontMetaEnriched) => (
    files.map(fileMeta => {
        const textVars = {
            weight,
            style,
            family,
            name: path.basename(fileMeta.path),
            ext: path.extname(fileMeta.path),
        };

        const varKeys = Object.keys(textVars).join("|");

        const matchKeys = new RegExp(`/\[(${varKeys})\]/`, "g");

        const nextPath = fileMeta.path.replace(
            matchKeys,
            ($0, $1) => textVars[$1]
        );

        console.log(nextPath);

        return {
            ...fileMeta,
            path: nextPath
        };
    })
)

export const joinExt = (font: FontMeta, ext?: string) => `${font.path}.${ext || head(font.exts, () => "ttf")}`