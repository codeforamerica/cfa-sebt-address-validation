import { TestBed } from '@angular/core/testing';

import { SmartyAutocompleteService } from './smarty-autocomplete.service';

describe('SmartyAutocompleteService', () => {
  let service: SmartyAutocompleteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmartyAutocompleteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
