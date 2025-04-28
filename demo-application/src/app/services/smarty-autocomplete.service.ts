import { Injectable } from '@angular/core';
import {
    core as SmartyCore,
    usAutocompletePro as SmartyUsAutocompletePro,
} from 'smartystreets-javascript-sdk';
import { environment } from '../../environments/environment';
import { toAutocompleteSecondarySelected } from '../models/utilities';

type UsAutocompleteProClient = SmartyCore.Client<
    SmartyUsAutocompletePro.Lookup,
    SmartyUsAutocompletePro.Lookup
>;

@Injectable({
    providedIn: 'root',
})
export class SmartyAutocompleteService {
    private readonly client: UsAutocompleteProClient;

    constructor() {
        const key = environment.smartyKey;
        const credentials = new SmartyCore.SharedCredentials(key);
        const clientBuilder = new SmartyCore.ClientBuilder(
            credentials
        ).withLicenses(['us-autocomplete-pro-cloud']);
        this.client = clientBuilder.buildUsAutocompleteProClient();
    }

    async getSuggestions(
        text: string,
        preferCity: string | null = null,
        preferState: string | null = null,
        preferPostalCode: string | null = null,
        secondarySelected: SmartyUsAutocompletePro.Suggestion | null = null
    ): Promise<SmartyUsAutocompletePro.Suggestion[]> {
        const lookup = new SmartyUsAutocompletePro.Lookup(text);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lookup as any).source = 'postal';

        preferCity = preferCity || 'Washington, DC';
        const preferredStates = preferState
            ? [preferState]
            : ['DC', 'MD', 'VA'];

        if (preferPostalCode) {
            // lookup.preferZIPCodes = [preferPostalCode];
            lookup.includeOnlyZIPCodes = [preferPostalCode];
        } else {
            lookup.includeOnlyCities = [preferCity];
            lookup.includeOnlyStates = preferredStates;
            // lookup.preferCities = [preferCity];
            // lookup.preferStates = preferredStates;
        }

        if (secondarySelected) {
            lookup.selected =
                toAutocompleteSecondarySelected(secondarySelected);
        }

        await this.client.send(lookup);

        return lookup.result;
    }

    async getSecondarySuggestions(
        secondarySelected: SmartyUsAutocompletePro.Suggestion
    ): Promise<SmartyUsAutocompletePro.Suggestion[]> {
        const lookup = new SmartyUsAutocompletePro.Lookup(
            secondarySelected.streetLine
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lookup as any).source = 'postal';

        lookup.includeOnlyZIPCodes = [secondarySelected.zipcode];

        lookup.selected = toAutocompleteSecondarySelected(secondarySelected);

        await this.client.send(lookup);

        return lookup.result;
    }
}
