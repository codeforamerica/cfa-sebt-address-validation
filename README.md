# Address Validation Demo Application

## Introduction
When collecting an address from a client in a web form, an ideal approach is to use an autocomplete/typeahead user interface element. This involves using a form component similar to a combo box. As people type their address into the combo box, a connected web service provides suggested addresses as they type, which are displayed for selection. This type of user interface allows the client to choose from a list of suggested addresses that are known to be valid, reducing the likelihood of errors introduced by typos or other data entry mistakes.

This demo application implements this user experience with [Angular](https://angular.dev/) and [TypeScript](https://www.typescriptlang.org/), using the [Smarty](https://www.smarty.com/) APIs for autocomplete and address validation. When using the autocomplete feature, if city, state, and/or zip have not been specified, the suggestions include only the DC/MD/VA area by default. This can be modified in [smarty-autocomplete.service.ts](/src/app/services/smarty-autocomplete.service.ts?plain=1#L37). You can also change the specified options on the request to "prefer" instead of "includeOnly" if you want the suggestions to have a preference for the specified city/state or zip but still include options in other areas.

TypeScript enumerations are defined for [DpvConfirmation](/src/app/models/enums.ts?plain=1#L1), [DpvFootnote](/src/app/models/enums.ts?plain=1#L15), and [SmartyFootnote](/src/app/models/enums.ts?plain=1#L57). Utility functions are defined for parsing the [DPV footnotes](/src/app/models/utilities.ts?plain=1#L8) and [footnotes](/src/app/models/utilities.ts?plain=1#L26).

## Running the Demo Application
> This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.1.

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Additional Resources
1. **TODO: Link to best-practice written guidance**
2. [Smarty US Autocomplete Pro API](https://www.smarty.com/docs/cloud/us-autocomplete-pro-api)
3. [Smarty US Street API](https://www.smarty.com/docs/cloud/us-street-api)
4. [U.S. Web Designg System (USWDS)](https://designsystem.digital.gov/)
