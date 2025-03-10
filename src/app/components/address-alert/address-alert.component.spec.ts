import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddressAlertComponent } from './address-alert.component';

describe('AddressAlertComponent', () => {
  let component: AddressAlertComponent;
  let fixture: ComponentFixture<AddressAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressAlertComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddressAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
