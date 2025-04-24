import { Injectable } from '@angular/core';
import {
    core as SmartyCore,
    usStreet as SmartyUsStreet,
} from 'smartystreets-javascript-sdk';
import { Address } from '../models/address';
import { environment } from '../../environments/environment';

type UsStreetApiClient = SmartyCore.Client<
    SmartyUsStreet.Lookup | SmartyCore.Batch<SmartyUsStreet.Lookup>,
    SmartyCore.Batch<SmartyUsStreet.Lookup>
>;

@Injectable({
    providedIn: 'root',
})
export class SmartyValidationService {
    private readonly client: UsStreetApiClient;

    constructor() {
        const key = environment.smartyKey;
        const credentials = new SmartyCore.SharedCredentials(key);
        const clientBuilder = new SmartyCore.ClientBuilder(
            credentials
        ).withLicenses(['us-core-cloud']);
        this.client = clientBuilder.buildUsStreetApiClient();
    }

    async validateAddress(address: Address, maxCandidates: number = 4): Promise<SmartyUsStreet.Candidate[]> {
        const lookup = new SmartyUsStreet.Lookup();
        lookup.street = address.streetAddress!;
        lookup.secondary = address.unitAptNumber ?? '';
        lookup.city = address.city!;
        lookup.state = address.state!;
        lookup.zipCode = address.postalCode!;
        lookup.maxCandidates = maxCandidates;
        lookup.match = 'enhanced';

        await this.client.send(lookup);

        return lookup.result;
    }
}
