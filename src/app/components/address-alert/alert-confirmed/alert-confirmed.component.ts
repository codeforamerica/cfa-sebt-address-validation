import { Component, computed, input, output } from '@angular/core';
import { usStreet as SmartyUsStreet } from 'smartystreets-javascript-sdk';
import { Address } from '../../../models/address';
import { parseFootnotes } from '../../../models/utilities';
import { Footnote, SmartyFootnoteDebugDescriptions } from '../../../models/enums';

@Component({
    selector: 'app-alert-confirmed',
    imports: [],
    templateUrl: './alert-confirmed.component.html',
    styleUrl: './alert-confirmed.component.scss',
})
export class AlertConfirmedComponent {
    readonly enteredAddress = input.required<Address>();
    readonly addressCandidate = input.required<SmartyUsStreet.Candidate>();
    readonly acceptStandardized = output<void>();

    readonly warnings = computed<string[]>(() => {
        const candidate = this.addressCandidate();

        return parseFootnotes(candidate.analysis.footnotes)
            .map((f) => {
                return SmartyFootnoteDebugDescriptions[f]; // TODO.JB - some of these are verbose and not plain language.
                // switch (f) {
                //     case SmartyFootnote.CorrectedZipCode:

                //     default:
                //         return '';
                // }
            })
            .filter((x) => !!x);
    });

    readonly hasWarnings = computed<boolean>(() => !!this.warnings().length);
}
