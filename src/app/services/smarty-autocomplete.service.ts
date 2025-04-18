import { Injectable } from '@angular/core';
import {
    core as SmartyCore,
    usAutocompletePro as SmartyUsAutocompletePro,
} from 'smartystreets-javascript-sdk';

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
 <SMARTY_KEY_GOES_HERE>//process.env.SMARTY_EMBEDDED_KEY;
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
        preferPostalCode: string | null = null
    ): Promise<SmartyUsAutocompletePro.Suggestion[]> {
        const lookup = new SmartyUsAutocompletePro.Lookup(text);

        preferCity = preferCity || 'Washington, DC';
        const preferredStates = preferState ? [preferState] : ['DC', 'MD', 'VA'];

        if (preferPostalCode) {
            lookup.preferZIPCodes = [preferPostalCode];
        } else {
            lookup.preferCities = [preferCity];
            lookup.preferStates = preferredStates;
        }

        console.log({ ...lookup });

        await this.client.send(lookup);

        return lookup.result;
    }
}
