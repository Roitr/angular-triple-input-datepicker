import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CovDatepickerTriple } from './datepicker.component';

describe('DatepickerComponent', () => {
  let component: CovDatepickerTriple;
  let fixture: ComponentFixture<CovDatepickerTriple>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CovDatepickerTriple ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CovDatepickerTriple);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
