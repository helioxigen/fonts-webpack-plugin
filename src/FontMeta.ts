import * as fontkit from "fontkit";
import * as fs from "fs";
import * as path from "path";
import { FontFace } from "csstype";
import { head, fsStatAsync, fsReadFileAsync } from "./utils";

export type FontWeight = FontFace["fontWeight"];
export type FontStyle = FontFace["fontStyle"];

export type FileMeta = {
    path: string,
    source: any,
    stats: any,
}

export class FontMeta {
    family: string;
    style: FontStyle;
    weight: FontWeight;
    files: FileMeta[];

    constructor(...paths: string[]) {
        this.parse(paths);

        Promise.all(paths.map(this.enquireFileData)).then(files => this.files = files)
    }

    private openFont(filePath: string){
        return fontkit.openSync(filePath) as {
            familyName: string
            subfamilyName: string
        }
    }

    private parse(paths: string[]) {
        const fontsData = paths.map(this.openFont);

        const fallbackFamily = () => path.parse(paths[0]).name;
        this.family = head(fontsData.map(d => d.familyName), fallbackFamily);

        const availableMeta = fontsData.flatMap(data => `${data.familyName} ${data.subfamilyName}`.split(" "));

        this.style = head(availableMeta.filter(m => /italic|oblique|normal/i.test(m)), () => "normal").toLowerCase() as any;
        this.weight = this.getWeight(availableMeta);
    }

    private handleLoadError = filename => () => Promise.reject(new Error(`Fonts Webpack Plugin: could not load file ${filename}`));

    private async enquireFileData(fontPath: string){
        return {
            path: fontPath,
            stats: await fsStatAsync(fontPath),
            source: await fsReadFileAsync(fontPath),
        }
    }

    private getWeight(meta: string[]){
        const weightTest = /bold|thin|black|light|medium/i;
        const weightString = meta.find(str => weightTest.test(str));
    
        if (!weightString) return "normal";
        if (/^bold$/i.test(weightString)) return "bold";

        const fontWeight = weightString.replace(/\W/g,"").toLowerCase();

        const weights = {
            thin: 100,
            hairline: 100,
    
            extralight: 200,
            ultralight: 200,
    
            light: 300,
            normal: 400,
            medium: 500,
    
            semibold: 600,
            demibold: 600,
    
            bold: 700,
    
            extrabold: 800,
            ultrabold: 800,
    
            black: 900,
        }

        return weights[fontWeight];    
    }
}