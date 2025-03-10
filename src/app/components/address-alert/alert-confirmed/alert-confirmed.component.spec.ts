import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertConfirmedComponent } from './alert-confirmed.component';

describe('ConfirmedComponent', () => {
  let component: AlertConfirmedComponent;
  let fixture: ComponentFixture<AlertConfirmedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertConfirmedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertConfirmedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
