import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertNotConfirmedComponent } from './alert-not-confirmed.component';

describe('AlertNotConfirmedComponent', () => {
  let component: AlertNotConfirmedComponent;
  let fixture: ComponentFixture<AlertNotConfirmedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertNotConfirmedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertNotConfirmedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
