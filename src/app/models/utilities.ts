import { DpvFootnote, SmartyFootnote } from "./enums";

export function parseDpvFootnotes(dpvFootnotes: string): DpvFootnote[] {
    if (dpvFootnotes.length % 2 !== 0) {
        throw new Error('String length must be even.');
    }

    const pairs: string[] = [];

    for (let i = 0; i < dpvFootnotes.length; i += 2) {
        pairs.push(dpvFootnotes.substring(i, i + 2));
    }

    return pairs.map((s) => s as DpvFootnote);
}

export function parseSmartyFootnotes(text: string): SmartyFootnote[] {
    const delimiter = '#';
    const segments: string[] = [];
    let currentSegment = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === delimiter) {
            if (currentSegment) {
                segments.push(`${currentSegment}#`);
            }
            currentSegment = ''; //reset the segment
        } else {
            currentSegment += char;
        }
    }

    if (currentSegment) {
        segments.push(currentSegment); // Add the last segment, if any
    }

    return segments.map(s => s as SmartyFootnote);
}
