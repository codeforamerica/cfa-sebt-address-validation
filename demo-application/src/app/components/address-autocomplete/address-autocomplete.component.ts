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
    usAutocompletePro,
} from 'smartystreets-javascript-sdk';
import { SmartyAutocompleteService } from '../../services/smarty-autocomplete.service';
import { isPlatformBrowser } from '@angular/common';

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

    readonly suggestionSelected = output<Address>();
    readonly comboBoxText = signal<string>('');
    readonly autocompleteSuggestions = signal<usAutocompletePro.Suggestion[]>(
        []
    );
    readonly autocompleteSelection =
        signal<usAutocompletePro.Suggestion | null>(null);

    private readonly streetAddressComboBox$ = toObservable(
        this.streetAddressComboBox
    );
    private readonly enableTypeahead$ = toObservable(this.enableTypeahead);

    constructor() {
        toObservable(this.comboBoxText)
            .pipe(
                takeUntilDestroyed(),
                filter(() => this.enableTypeahead()),
                debounceTime(500),
                distinctUntilChanged()
            )
            .subscribe(async (value) => {
                const match = this.autocompleteSuggestions().filter(
                    (s) => toAutocompleteOption(s) === value
                );

                if (match.length) {
                    await this.setAutocompleteSuggestionList([match[0]], true);
                    // const nativeInput = document.getElementById(
                    //     'street-address-combo-box'
                    // ) as HTMLInputElement;
                    // nativeInput.value = match[0].streetLine;
                    return;
                }

                await this.updateAutocompleteSuggestions();
            });

        if (isPlatformBrowser(this.platformId)) {
            combineLatest([
                this.enableTypeahead$,
                this.streetAddressComboBox$.pipe(map((r) => r?.nativeElement)),
            ])
                .pipe(
                    takeUntilDestroyed(),
                    distinctUntilChanged(),
                    filter(
                        ([enableTypeahead, nativeElement]) =>
                            enableTypeahead && !!nativeElement
                    )
                )
                .subscribe(async () => await this.enhanceComboBox());
        }
    }

    @HostListener('keyup', ['$event'])
    @HostListener('change', ['$event'])
    async onChange(event: InputEvent | KeyboardEvent) {
        const targetElement = event.target as Element | null;

        if (targetElement?.id === 'street-address-combo-box') {
            const inputTarget = targetElement as HTMLInputElement;
            this.comboBoxText.set(inputTarget.value);
            return;
        }

        if (
            targetElement?.classList.contains('usa-combo-box__select') &&
            Array.from(targetElement.parentElement!.children).some(
                (e) => e.id === 'street-address-combo-box'
            )
        ) {
            const selectTarget = targetElement as HTMLSelectElement;
            if (selectTarget.value) {
                await this.handleItemSelected(JSON.parse(selectTarget.value));
            }
        }
    }

    private async enhanceComboBox(displayList: boolean = false) {
        const nativeElement = this.streetAddressComboBox()?.nativeElement;

        if (!nativeElement) {
            console.warn(
                'Could not get native element for streetAddressComboBox'
            );
            return;
        }

        const comboBox = (await import('@uswds/uswds/js/usa-combo-box'))
            .default;
        comboBox.enhanceComboBox(nativeElement!);

        if (displayList) {
            comboBox.displayList(nativeElement!);
        }
    }

    private async updateAutocompleteSuggestions() {
        const text = this.comboBoxText();

        if (!text || text.length < 4) {
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
        suggestions: SmartyUsAutocomplete.Suggestion[],
        maintainSelection: boolean = false
    ) {
        this.autocompleteSuggestions.set(suggestions);

        const selectElem = this.streetAddressComboBox()!.nativeElement;
        const wrapperElem = selectElem.parentElement;

        if (!wrapperElem) {
            console.warn('Could not find combo box wrapper element!');
            return;
        }

        if (!maintainSelection) {
            this.autocompleteSelection.set(null);
        }

        // Clear existing items
        selectElem.innerHTML = '';

        suggestions.forEach((item) => {
            const autocompleteOption = toAutocompleteOption(item);

            const selectOption = document.createElement('option');
            selectOption.value = JSON.stringify(item);
            selectOption.innerHTML = autocompleteOption;

            selectElem.appendChild(selectOption);
        });

        const shouldOpenComboBox =
            !maintainSelection &&
            !this.autocompleteSelection() &&
            !!suggestions.length;
        await this.enhanceComboBox(shouldOpenComboBox);
    }

    private async handleItemSelected(item: usAutocompletePro.Suggestion) {
        if (item.secondary && item.entries > 1) {
            const secondarySuggestions = await this.smartyAutocompleteService
                .getSecondarySuggestions(item);

            this.setAutocompleteSuggestionList(secondarySuggestions);
        }

        this.autocompleteSelection.set(item);

        this.suggestionSelected.emit({
            streetAddress: item.streetLine,
            unitAptNumber: item.secondary,
            city: item.city,
            state: item.state,
            postalCode: item.zipcode,
        });
    }
}
