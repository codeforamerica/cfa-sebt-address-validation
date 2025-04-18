import { TestBed } from '@angular/core/testing';

import { SmartyValidationService } from './smarty-validation.service';

describe('SmartyValidationService', () => {
  let service: SmartyValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmartyValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
