"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util_1 = require("util");
exports.fsStatAsync = util_1.promisify(fs.stat);
exports.fsReadFileAsync = util_1.promisify(fs.readFile);
exports.head = (arr, orElse) => 0 in arr ? arr[0] : orElse();
exports.uniq = (arrArg) => arrArg.filter((elem, pos, arr) => arr.findIndex(q => new RegExp(elem, "i").test(q)) === pos);
exports.guessWeight = (meta) => {
    const weightTest = /bold|thin|black|light|medium/i;
    const weightString = meta.find(str => weightTest.test(str));
    if (!weightString)
        return "normal";
    if (/^bold$/i.test(weightString))
        return "bold";
    const fontMod = weightString.replace(weightTest, "");
    const fontWeight = weightString.replace(fontMod, "").toLowerCase();
    const vals = (generic, semi, extra) => {
        if (/extra/i.test(fontMod))
            return extra;
        if (/semi/i.test(fontMod))
            return semi;
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
exports.handlePathQuery = ({ weight, style, family, exts, files }) => (files.map(fileMeta => {
    const textVars = {
        weight,
        style,
        family,
        name: path.basename(fileMeta.path),
        ext: path.extname(fileMeta.path),
    };
    const varKeys = Object.keys(textVars).join("|");
    const matchKeys = new RegExp(`/\[(${varKeys})\]/`, "g");
    const nextPath = fileMeta.path.replace(matchKeys, ($0, $1) => textVars[$1]);
    console.log(nextPath);
    return {
        ...fileMeta,
        path: nextPath
    };
}));
exports.joinExt = (font, ext) => `${font.path}.${ext || exports.head(font.exts, () => "ttf")}`;
