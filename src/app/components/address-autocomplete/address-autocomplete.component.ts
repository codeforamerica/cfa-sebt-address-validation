import {
    Component,
    ElementRef,
    HostListener,
    inject,
    input,
    output,
    PLATFORM_ID,
    signal,
    Signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
} from 'rxjs';
import { toAutocompleteOption } from '../../models/utilities';
import { Address } from '../../models/address';

import {
    usAutocompletePro as SmartyUsAutocomplete,
} from 'smartystreets-javascript-sdk';
import { SmartyAutocompleteService } from '../../services/smarty-autocomplete.service';
import { isPlatformBrowser } from '@angular/common';

export type AddressSelectedEvent = Pick<
    Address,
    'streetAddress' | 'city' | 'state' | 'postalCode'
>;

export type SuggestionFilters = Pick<Address, 'city' | 'state' | 'postalCode'>;

@Component({
    selector: 'app-address-autocomplete',
    imports: [],
    templateUrl: './address-autocomplete.component.html',
    styleUrl: './address-autocomplete.component.scss',
})
export class AddressAutocompleteComponent {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly smartyAutocompleteService = inject(
        SmartyAutocompleteService
    );

    private readonly streetAddressComboBox: Signal<
        ElementRef<HTMLSelectElement> | undefined
    > = viewChild('streetAddressComboBox');

    public readonly enableTypeahead = input<boolean>(true);
    public readonly suggestionFilters = input<SuggestionFilters>();

    readonly suggestionSelected = output<AddressSelectedEvent>();

    readonly comboBoxText = signal<string>('');
    readonly autocompleteSelection = signal<string | null>(null);

    private readonly streetAddressComboBox$ = toObservable(
        this.streetAddressComboBox
    );
    private readonly enableTypeahead$ = toObservable(this.enableTypeahead);

    constructor() {
        toObservable(this.comboBoxText)
            .pipe(takeUntilDestroyed())
            .pipe(filter((v) => !!v && this.enableTypeahead()))
            .pipe(debounceTime(500))
            .subscribe(async () => await this.updateAutocompleteSuggestions());

        if (isPlatformBrowser(this.platformId)) {
            combineLatest([this.enableTypeahead$, this.streetAddressComboBox$.pipe(map(r => r?.nativeElement))])
                .pipe(takeUntilDestroyed())
                .pipe(distinctUntilChanged())
                .pipe(filter(([enableTypeahead, nativeElement]) => enableTypeahead && !!nativeElement))
                .subscribe(async ([, nativeElement]) => {
                    // console.log("Enhancing select as combo box", nativeElement);
                    const comboBox = (
                        await import('@uswds/uswds/js/usa-combo-box')
                    ).default;
                    comboBox.enhanceComboBox(nativeElement!);
                });
        }
    }

    @HostListener('keyup', ['$event'])
    onKeyup(event: KeyboardEvent) {
        const target = event.target as HTMLInputElement;

        if (target.id !== 'street-address-combo-box') {
            return;
        }

        this.comboBoxText.set(target.value);
    }

    private async updateAutocompleteSuggestions() {
        const text = this.comboBoxText();

        if (!text) {
            await this.setAutocompleteSuggestionList([]);
            return;
        }

        const { city, state, postalCode } = this.suggestionFilters() ?? {};

        const suggestions = await this.smartyAutocompleteService.getSuggestions(
            text,
            city,
            state,
            postalCode
        );

        await this.setAutocompleteSuggestionList(suggestions);
    }

    private async setAutocompleteSuggestionList(
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
            listItem.addEventListener('click', () => {
                this.suggestionSelected.emit({
                    streetAddress: item.streetLine,
                    city: item.city,
                    state: item.state,
                    postalCode: item.zipcode,
                });

                this.autocompleteSelection.set(item.streetLine);
            });
            comboBoxList.appendChild(listItem);
        });

        const comboBox = (
            await import('@uswds/uswds/js/usa-combo-box')
        ).default;
        comboBox.enhanceComboBox(wrapperElem);
    }
}
