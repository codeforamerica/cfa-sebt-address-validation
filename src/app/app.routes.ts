import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        "path": "",
        "pathMatch": "full",
        "redirectTo": "address-form"
    },
    {
        "path": "address-form",
        "loadComponent": () => 
            import('./components/address-form/address-form.component').then(x => x.AddressFormComponent)
    }
];
