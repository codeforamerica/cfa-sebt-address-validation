import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
    core as SmartyCore,
    usStreet as SmartyUsStreet,
} from 'smartystreets-javascript-sdk';
import { AddressMatchState, DpvFootnote, DpvFootnoteNames, SmartyFootnote, SmartyFootnoteDebugDescriptions } from '../../models/enums';
import { isPlatformServer } from '@angular/common';
import { AlertConfirmedComponent } from "../address-alert/alert-confirmed/alert-confirmed.component";
import { AlertNotConfirmedComponent } from '../address-alert/alert-not-confirmed/alert-not-confirmed.component';
import { AlertNeedsCorrectionComponent } from '../address-alert/alert-needs-correction/alert-needs-correction.component';
import { parseDpvFootnotes, parseSmartyFootnotes } from '../../models/utilities';

type UsStreetApiClient = SmartyCore.Client<
    SmartyUsStreet.Lookup | SmartyCore.Batch<SmartyUsStreet.Lookup>,
    SmartyCore.Batch<SmartyUsStreet.Lookup>
>;

type AddressForm = {
    streetAddress: FormControl<string>,
    unitAptNumber: FormControl<string | null>,
    city: FormControl<string>,
    state: FormControl<string | null>,
    postalCode: FormControl<string>
};

@Component({
    selector: 'app-address-form',
    imports: [
        ReactiveFormsModule, 
        AlertConfirmedComponent, 
        AlertNotConfirmedComponent,
        AlertNeedsCorrectionComponent
    ],
    templateUrl: './address-form.component.html',
    styleUrl: './address-form.component.scss',
})
export class AddressFormComponent implements OnInit, OnDestroy {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly fb = inject(FormBuilder);

    private readonly destroy$ = new Subject<void>();
    private readonly client: UsStreetApiClient;

    AddressMatchState = AddressMatchState;

    addressForm: FormGroup<AddressForm>;

    readonly addressMatchState = signal<AddressMatchState | null>(null);
    readonly addressCandidate = signal<SmartyUsStreet.Candidate | null>(null);
    readonly dpvFootnotes = signal<DpvFootnote[]>([]);
    readonly smartyFootnotes = signal<SmartyFootnote[]>([]);

    constructor() {
        this.addressForm = this.fb.group({
            streetAddress: this.fb.nonNullable.control(''),
            unitAptNumber: this.fb.control(''),
            city: this.fb.nonNullable.control(''),
            state: this.fb.control(''),
            postalCode: this.fb.nonNullable.control(''),
        });

 <SMARTY_KEY_GOES_HERE>//process.env.SMARTY_EMBEDDED_KEY;
        const credentials = new SmartyCore.SharedCredentials(key);
        const clientBuilder = new SmartyCore.ClientBuilder(
            credentials
        ).withLicenses(['us-core-cloud']);
        this.client = clientBuilder.buildUsStreetApiClient();
    }

    ngOnInit(): void {
        if (isPlatformServer(this.platformId)) {
            return;
        }

        const storageKey = 'saved-address';

        const savedAddr = sessionStorage.getItem(storageKey);
        if (savedAddr) {
            this.addressForm.patchValue(JSON.parse(savedAddr));
        }

        this.addressForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                sessionStorage.setItem(storageKey, JSON.stringify(value));
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async validateAddress() {
        if (!this.addressForm.valid) {
            return;
        }

        const addr = this.addressForm.value;

        const lookup = new SmartyUsStreet.Lookup();
        lookup.street = addr.streetAddress!;
        lookup.secondary = addr.unitAptNumber ?? '';
        lookup.city = addr.city!;
        lookup.state = addr.state!;
        lookup.zipCode = addr.postalCode!;
        lookup.maxCandidates = 4;
        lookup.match = 'invalid';

        await this.client.send(lookup);

        if (lookup.result.length !== 1) {
            console.log(lookup.result);
            alert(`${lookup.result.length} candidate matches!`);
        }

        this.handleResult(lookup.result[0]);
    }

    acceptStandardized() {
        const candidate = this.addressCandidate();

        if (!candidate) {
            return;
        }

        const c = candidate.components;

        const streetAddress = [
            c.primaryNumber,
            c.streetPredirection,
            c.streetName,
            c.streetSuffix,
            c.streetPostdirection
        ].filter(x => !!x).join(' ');

        const unitAptNumber = [
            [
                c.extraSecondaryDesignator,
                c.extraSecondaryNumber
            ].filter(x => !!x).join(' '),
            [
                c.secondaryDesignator,
                c.secondaryNumber
            ].filter(x => !!x).join(' ')
        ].filter(x => x.length).join(', ');

        this.addressForm.patchValue({
            streetAddress: streetAddress,
            unitAptNumber: unitAptNumber,
            city: c.cityName,
            state: c.state,
            postalCode: `${c.zipCode}-${c.plus4Code}`
        });
    }

    private handleResult(candidate: SmartyUsStreet.Candidate) {
        console.log(candidate);
        this.addressCandidate.set(candidate);

        const dpvFootnotes = parseDpvFootnotes(candidate.analysis.dpvFootnotes ?? []);
        const smartyFootnotes = parseSmartyFootnotes(candidate.analysis.footnotes ?? []);

        this.dpvFootnotes.set(dpvFootnotes);
        this.smartyFootnotes.set(smartyFootnotes);

        console.log(dpvFootnotes.map(n => DpvFootnoteNames[n]));
        console.log(smartyFootnotes.map(n => SmartyFootnoteDebugDescriptions[n]));

        const addressMatchState = (candidate.analysis.dpvMatchCode ?? 'N') as AddressMatchState;
        this.addressMatchState.set(addressMatchState);
    }
}
