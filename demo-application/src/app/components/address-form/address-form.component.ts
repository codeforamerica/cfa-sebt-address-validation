import {
    afterNextRender,
    afterRender,
    Component,
    computed,
    ElementRef,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import {
    merge,
    tap,
} from 'rxjs';
import {
    usStreet as SmartyUsStreet,
} from 'smartystreets-javascript-sdk';
import {
    DpvConfirmation,
    DpvFootnote,
    DpvFootnoteNames,
    Footnote,
    SmartyFootnoteDebugDescriptions,
} from '../../models/enums';
import { AlertConfirmedComponent } from '../address-alert/alert-confirmed/alert-confirmed.component';
import { AlertNotConfirmedComponent } from '../address-alert/alert-not-confirmed/alert-not-confirmed.component';
import { AlertNeedsCorrectionComponent } from '../address-alert/alert-needs-correction/alert-needs-correction.component';
import {
    parseDpvFootnotes,
    parseFootnotes,
    standardizeAddress,
} from '../../models/utilities';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Address } from '../../models/address';
import { SmartyValidationService } from '../../services/smarty-validation.service';
import { AddressAutocompleteComponent, SuggestionFilters } from '../address-autocomplete/address-autocomplete.component';

type AddressForm = {
    streetAddress: FormControl<string>;
    unitAptNumber: FormControl<string | null>;
    city: FormControl<string>;
    state: FormControl<string | null>;
    postalCode: FormControl<string>;
};

@Component({
    selector: 'app-address-form',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        AlertConfirmedComponent,
        AlertNotConfirmedComponent,
        AlertNeedsCorrectionComponent,
        AddressAutocompleteComponent,
    ],
    templateUrl: './address-form.component.html',
    styleUrl: './address-form.component.scss',
})
export class AddressFormComponent {
    private readonly fb = inject(FormBuilder);
    private readonly smartyValidationService = inject(SmartyValidationService);
    private readonly alertContainer = viewChild<ElementRef<HTMLDivElement>>('alertContainer');

    AddressMatchState = DpvConfirmation;

    readonly useAutocomplete = signal<boolean>(false);
    readonly autocompleteSelection = signal<string | null>(null);

    readonly addressForm: FormGroup<AddressForm> = this.fb.group({
        streetAddress: this.fb.nonNullable.control('', Validators.required),
        unitAptNumber: this.fb.control(''),
        city: this.fb.nonNullable.control('', Validators.required),
        state: this.fb.control('', Validators.required),
        postalCode: this.fb.nonNullable.control('', [
            Validators.required,
            Validators.pattern(/^\d{5}(?:[-\s]\d{4})?$/),
        ]),
    });
    readonly formErrors = signal<
        Partial<Pick<ValidationErrors, keyof Address>>
    >({});
    readonly addressMatchState = signal<DpvConfirmation | null>(null);
    readonly addressCandidate = signal<SmartyUsStreet.Candidate | null>(null);
    readonly dpvFootnotes = signal<DpvFootnote[]>([]);
    readonly smartyFootnotes = signal<Footnote[]>([]);

    readonly isDeliverable = computed<boolean>(() => {
        const addressMatchState = this.addressMatchState();
        const addressCandidate = this.addressCandidate();

        const parsedDpvFootnotes = parseDpvFootnotes(addressCandidate?.analysis.dpvFootnotes);
        const receivesUspsDelivery = !parsedDpvFootnotes
            .includes(DpvFootnote.ValidAddressThatDoesNotRecieveUspsDelivery)

        return addressMatchState === DpvConfirmation.Confirmed &&
            addressCandidate?.analysis.vacant === "N" &&
            addressCandidate?.analysis.noStat === "N" &&
            receivesUspsDelivery;
    });
    readonly validationAttemptCount = signal<number>(0);
    readonly readyToSubmit = signal<boolean>(false);
    readonly submitted = signal<boolean>(false);

    readonly showValidationTroubleWarning = computed<boolean>(
        () => this.validationAttemptCount() >= 3
    );

    constructor() {
        merge(this.addressForm.statusChanges, this.addressForm.valueChanges)
            .pipe(takeUntilDestroyed())
            .pipe(tap(() => this.readyToSubmit.set(false)))
            .subscribe(() => this.updateFormErrors());

        afterNextRender(() => {
            // Hack for USWDS combobox initialization to be ready
            this.useAutocomplete.set(true)
        });

        afterRender(() => {
            if (!this.submitted() && this.addressMatchState()) {
                const element = this.alertContainer()?.nativeElement;
                console.log({ element });
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }
        });
    }

    get suggestionFilters(): SuggestionFilters {
        return {
            city: this.addressForm.value.city ?? "",
            state: this.addressForm.value.state ?? "",
            postalCode: this.addressForm.value.postalCode ?? ""
        }
    }

    updateFormFromSuggestion(item: Address) {
        this.addressForm.patchValue({
            streetAddress: item.streetAddress,
            unitAptNumber: item.unitAptNumber,
            city: item.city,
            state: item.state,
            postalCode: item.postalCode,
        });

        // if (item.unitAptNumber) {
        //     this.readyToSubmit.set(true);
        // }
    }

    async validateAddress() {
        if (!this.addressForm.valid) {
            this.addressForm.markAllAsTouched();
            this.updateFormErrors();
            return;
        }

        if (this.validationAttemptCount() >= 4) {
            this.submitted.set(true);
            return;
        }

        if (this.submitted()) {
            return;
        }

        this.validationAttemptCount.set(this.validationAttemptCount() + 1);

        const addr = this.addressForm.value as Address;

        const candidates = await this.smartyValidationService.validateAddress(
            addr
        );

        if (candidates.length !== 1) {
            console.log(candidates);
            alert(`${candidates.length} candidate matches!`);
        }

        this.handleResult(candidates[0]);

        if (this.isDeliverable() || this.validationAttemptCount() >= 3) {
            this.readyToSubmit.set(true);
        } else {
            this.readyToSubmit.set(false);
        }
    }

    submit() {
        this.submitted.set(true);
    }

    acceptStandardized() {
        const candidate = this.addressCandidate();

        if (!candidate) {
            return;
        }

        const standardizedAddress = standardizeAddress(candidate);

        this.addressForm.patchValue(standardizedAddress);

        this.readyToSubmit.set(this.isDeliverable());
    }

    private handleResult(candidate: SmartyUsStreet.Candidate) {
        this.addressCandidate.set(candidate);

        const dpvFootnotes = parseDpvFootnotes(
            candidate.analysis.dpvFootnotes ?? []
        );
        const smartyFootnotes = parseFootnotes(
            candidate.analysis.footnotes ?? []
        );

        this.dpvFootnotes.set(dpvFootnotes);
        this.smartyFootnotes.set(smartyFootnotes);

        console.log(dpvFootnotes.map((n) => DpvFootnoteNames[n]));
        console.log(smartyFootnotes.map((n) => SmartyFootnoteDebugDescriptions[n]));

        const addressMatchState = (candidate.analysis.dpvMatchCode ??
            'N') as DpvConfirmation;
        this.addressMatchState.set(addressMatchState);
    }

    private updateFormErrors() {
        const getControlErrors = (controlName: keyof AddressForm) => {
            const control = this.addressForm.controls[controlName];
            return control.touched ? control.errors : undefined;
        };

        const result = {
            streetAddress: getControlErrors('streetAddress'),
            unitAptNumber: getControlErrors('unitAptNumber'),
            city: getControlErrors('city'),
            state: getControlErrors('state'),
            postalCode: getControlErrors('postalCode'),
        };

        this.formErrors.set(result);
    }
}
