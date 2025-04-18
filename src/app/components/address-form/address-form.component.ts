import {
    Component,
    computed,
    ElementRef,
    HostListener,
    inject,
    PLATFORM_ID,
    Signal,
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
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    filter,
    merge,
    tap,
} from 'rxjs';
import {
    usStreet as SmartyUsStreet,
    usAutocompletePro as SmartyUsAutocomplete,
} from 'smartystreets-javascript-sdk';
import {
    AddressMatchState,
    DpvFootnote,
    SmartyFootnote,
} from '../../models/enums';
import { isPlatformBrowser } from '@angular/common';
import { AlertConfirmedComponent } from '../address-alert/alert-confirmed/alert-confirmed.component';
import { AlertNotConfirmedComponent } from '../address-alert/alert-not-confirmed/alert-not-confirmed.component';
import { AlertNeedsCorrectionComponent } from '../address-alert/alert-needs-correction/alert-needs-correction.component';
import {
    parseDpvFootnotes,
    parseSmartyFootnotes,
    standardizeAddress,
    toAutocompleteOption,
} from '../../models/utilities';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Address } from '../../models/address';
import { SmartyValidationService } from '../../services/smarty-validation.service';
import { SmartyAutocompleteService } from '../../services/smarty-autocomplete.service';
import comboBox from '@uswds/uswds/js/usa-combo-box';

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
    ],
    templateUrl: './address-form.component.html',
    styleUrl: './address-form.component.scss',
})
export class AddressFormComponent {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly fb = inject(FormBuilder);
    private readonly smartyAutocompleteService = inject(SmartyAutocompleteService);
    private readonly smartyValidationService = inject(SmartyValidationService);

    private readonly streetAddressComboBox: Signal<
        ElementRef<HTMLSelectElement> | undefined
    > = viewChild('streetAddressComboBox');

    AddressMatchState = AddressMatchState;

    readonly useAutocomplete = signal<boolean>(false);
    readonly comboBoxText = signal<string>('');
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
    readonly addressMatchState = signal<AddressMatchState | null>(null);
    readonly addressCandidate = signal<SmartyUsStreet.Candidate | null>(null);
    readonly dpvFootnotes = signal<DpvFootnote[]>([]);
    readonly smartyFootnotes = signal<SmartyFootnote[]>([]);

    readonly validationAttemptCount = signal<number>(0);
    readonly readyToSubmit = signal<boolean>(false);
    readonly submitted = signal<boolean>(false);

    readonly showValidationTroubleWarning = computed<boolean>(
        () => this.validationAttemptCount() >= 3
    );

    constructor() {
        this.wireUpSessionStorage();

        merge(this.addressForm.statusChanges, this.addressForm.valueChanges)
            .pipe(takeUntilDestroyed())
            .pipe(tap(() => this.readyToSubmit.set(false)))
            .subscribe(() => this.updateFormErrors());

        toObservable(this.comboBoxText)
            .pipe(takeUntilDestroyed())
            .pipe(filter((v) => !!v && this.useAutocomplete()))
            .pipe(debounceTime(500))
            .pipe(distinctUntilChanged())
            .subscribe(async () => await this.updateAutocompleteSuggestions());

        combineLatest([
            toObservable(this.useAutocomplete),
            toObservable(this.streetAddressComboBox),
        ])
            .pipe(takeUntilDestroyed())
            .subscribe(([useAutocomplete, elementRef]) => {
                if (useAutocomplete && elementRef) {
                    comboBox.enhanceComboBox(elementRef.nativeElement);
                }
            });

        toObservable(this.comboBoxText)
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                this.validationAttemptCount.set(0);
                this.readyToSubmit.set(false);
            });
    }

    async updateAutocompleteSuggestions() {
        const text = this.comboBoxText();

        if (!text) {
            this.setAutocompleteSuggestionList([]);
            return;
        }

        const { city, state, postalCode } = this.addressForm.value;

        const suggestions = await this.smartyAutocompleteService.getSuggestions(
            text,
            city,
            state,
            postalCode
        );

        this.setAutocompleteSuggestionList(suggestions);
    }

    @HostListener('keyup', ['$event'])
    onKeyup(event: KeyboardEvent) {
        const target = event.target as HTMLInputElement;

        if (target.id !== 'street-address-combo-box') {
            return;
        }

        this.comboBoxText.set(target.value);
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

        const confirmedNoWarnings = this.addressMatchState() === AddressMatchState.Confirmed &&
            this.smartyFootnotes().length === 0;

        if (confirmedNoWarnings || this.validationAttemptCount() >= 3) {
            this.readyToSubmit.set(true);
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

        this.readyToSubmit.set(true);
    }

    private handleResult(candidate: SmartyUsStreet.Candidate) {
        this.addressCandidate.set(candidate);

        const dpvFootnotes = parseDpvFootnotes(
            candidate.analysis.dpvFootnotes ?? []
        );
        const smartyFootnotes = parseSmartyFootnotes(
            candidate.analysis.footnotes ?? []
        );

        this.dpvFootnotes.set(dpvFootnotes);
        this.smartyFootnotes.set(smartyFootnotes);

        // console.log(dpvFootnotes.map((n) => DpvFootnoteNames[n]));
        // console.log(smartyFootnotes.map((n) => SmartyFootnoteDebugDescriptions[n]));

        const addressMatchState = (candidate.analysis.dpvMatchCode ??
            'N') as AddressMatchState;
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

    private setAutocompleteSuggestionList(
        suggestions: SmartyUsAutocomplete.Suggestion[]
    ) {
        const wrapperElem =
            this.streetAddressComboBox()?.nativeElement.parentElement;

        if (!wrapperElem) {
            console.warn('Could not find combo box wrapper element!');
            return;
        }

        this.autocompleteSelection.set(null);

        const comboBoxList = wrapperElem.querySelector(
            '.usa-combo-box__list'
        ) as HTMLUListElement;

        // Clear existing items
        comboBoxList.innerHTML = '';

        suggestions.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.classList.add('usa-combo-box__list-option');
            listItem.textContent = toAutocompleteOption(item);
            listItem.addEventListener('click', (e) => {
                console.log(item);
                this.addressForm.patchValue({
                    streetAddress: item.streetLine,
                    // unitAptNumber: item.secondary,
                    city: item.city,
                    state: item.state,
                    postalCode: item.zipcode,
                });

                this.autocompleteSelection.set(item.streetLine);

                if (!item.secondary) {
                    this.readyToSubmit.set(true);
                }
            });
            comboBoxList.appendChild(listItem);
        });

        comboBox.enhanceComboBox(wrapperElem);
    }

    private wireUpSessionStorage() {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const useAutocompleteStorageKey = 'use-autocomplete';
        // const addressStorageKey = 'saved-address';

        const savedUseAutocompleteJson = sessionStorage.getItem(
            useAutocompleteStorageKey
        );
        if (
            typeof savedUseAutocompleteJson !== 'undefined' &&
            savedUseAutocompleteJson !== null
        ) {
            this.useAutocomplete.set(JSON.parse(savedUseAutocompleteJson));
        }

        // const savedAddr = sessionStorage.getItem(addressStorageKey);
        // if (savedAddr) {
        //     this.addressForm.patchValue(JSON.parse(savedAddr));
        // }

        toObservable(this.useAutocomplete)
            .pipe(takeUntilDestroyed())
            .subscribe((value) => {
                sessionStorage.setItem(
                    useAutocompleteStorageKey,
                    JSON.stringify(value)
                );
            });

        // this.addressForm.valueChanges
        //     .pipe(takeUntilDestroyed())
        //     .subscribe((value) => {
        //         sessionStorage.setItem(
        //             addressStorageKey,
        //             JSON.stringify(value)
        //         );
        //     });
    }
}
