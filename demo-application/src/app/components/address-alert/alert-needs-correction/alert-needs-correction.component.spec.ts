import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertNeedsCorrectionComponent } from './alert-needs-correction.component';

describe('AlertNeedsCorrectionComponent', () => {
  let component: AlertNeedsCorrectionComponent;
  let fixture: ComponentFixture<AlertNeedsCorrectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertNeedsCorrectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertNeedsCorrectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
