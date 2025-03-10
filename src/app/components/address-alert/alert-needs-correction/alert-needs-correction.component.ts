import { Component, computed, input } from '@angular/core';
import { DpvFootnote } from '../../../models/enums';

@Component({
    selector: 'app-alert-needs-correction',
    imports: [],
    templateUrl: './alert-needs-correction.component.html',
    styleUrl: './alert-needs-correction.component.scss',
})
export class AlertNeedsCorrectionComponent {
    readonly dpvFootnotes = input.required<DpvFootnote[]>();

    readonly dpvMessages = computed<string[]>(() => {
        const footnotes = this.dpvFootnotes();

        return footnotes
            .map((f) => this.footnoteDescriptiveMessage(f))
            .filter((x) => !!x);
    });

    private footnoteDescriptiveMessage(footnote: DpvFootnote): string {
        switch (footnote) {
            case DpvFootnote.SecondaryNotRecognizedSecondaryIsRequired:
                return 'Unit/Apartment # is required for this address, but the provided value is not deliverable.';
            case DpvFootnote.SecondaryNotRecognizedSecondaryNotRequired:
                return 'You provided a unit/apartment number, which is not required for this address.';
            case DpvFootnote.MissingRequiredSecondary:
                return 'Unit/Aparment # is required for this address but is missing.'
            default:
                return '';
        }
    }
}
