import { Address } from './address';
import { DpvFootnote, Footnote } from './enums';
import {
    usStreet as SmartyUsStreet,
    usAutocompletePro as SmartyUsAutocomplete
} from 'smartystreets-javascript-sdk';

export function parseDpvFootnotes(dpvFootnotes?: string): DpvFootnote[] {
    if (!dpvFootnotes) {
        return [];
    }

    if (dpvFootnotes.length % 2 !== 0) {
        throw new Error('String length must be even.');
    }

    const pairs: string[] = [];

    for (let i = 0; i < dpvFootnotes.length; i += 2) {
        pairs.push(dpvFootnotes.substring(i, i + 2));
    }

    return pairs.map((s) => s as DpvFootnote);
}

export function parseFootnotes(text: string): Footnote[] {
    if (!text) {
        return [];
    }

    const delimiter = '#';
    const segments: string[] = [];
    let currentSegment = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === delimiter) {
            if (currentSegment) {
                segments.push(currentSegment);
            }
            currentSegment = ''; //reset the segment
        } else {
            currentSegment += char;
        }
    }

    if (currentSegment) {
        segments.push(currentSegment); // Add the last segment, if any
    }

    return segments.map((s) => s as Footnote);
}

export function standardizeAddress(candidate: SmartyUsStreet.Candidate): Address {
    const c = candidate.components;

    const streetAddress = [
        c.primaryNumber,
        c.streetPredirection,
        c.streetName,
        c.streetSuffix,
        c.streetPostdirection,
    ]
        .filter((x) => !!x)
        .join(' ');

    const unitAptNumber = [
        [c.extraSecondaryDesignator, c.extraSecondaryNumber]
            .filter((x) => !!x)
            .join(' '),
        [c.secondaryDesignator, c.secondaryNumber].filter((x) => !!x).join(' '),
    ]
        .filter((x) => x.length)
        .join(', ');

    return {
        streetAddress: streetAddress,
        unitAptNumber: unitAptNumber,
        city: c.cityName,
        state: c.state,
        postalCode: `${c.zipCode}-${c.plus4Code}`,
    };
}

export function toAutocompleteSecondarySelected(suggestion: SmartyUsAutocomplete.Suggestion): string {
    const streetAndEntries = `${suggestion.streetLine} ${suggestion.secondary} (${suggestion.entries})`;

    if (!suggestion.secondary) {
        throw new Error('Tried formatting selected secondary for non-secondary option!')
    }

    return `${streetAndEntries}, ${suggestion.city}, ${suggestion.state} ${suggestion.zipcode}`;
}

export function toAutocompleteOption(suggestion: SmartyUsAutocomplete.Suggestion): string {
    let streetAndSecondary = suggestion.streetLine;

    if (suggestion.secondary) {
        if (suggestion.entries > 1) {
            streetAndSecondary += ` ${suggestion.secondary} (${suggestion.entries} options)`;
        } else {
            streetAndSecondary += ` ${suggestion.secondary}`;
        }
    }

    return `${streetAndSecondary}, ${suggestion.city}, ${suggestion.state} ${suggestion.zipcode}`;
}
