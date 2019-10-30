// tutorial from: https://material.angular.io/guide/creating-a-custom-form-field-control

import {
  Component,
  OnInit,
  Input,
  Inject,
  LOCALE_ID,
  OnDestroy,
  HostBinding,
  Optional,
  Self,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ControlValueAccessor, NgControl, FormControl } from '@angular/forms';
import { KeyValue, formatDate } from '@angular/common';
import { MatFormFieldControl } from '@angular/material';
import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Subject, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { isDate, isString } from 'util';


@Component({
  selector: 'cov-datepicker-triple',
  templateUrl: 'datepicker.html',
  styleUrls: ['./datepicker.component.scss'],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: CovDatepickerTriple
    }
  ]
})
// tslint:disable-next-line: component-class-suffix
export class CovDatepickerTriple implements OnInit, OnDestroy, ControlValueAccessor, MatFormFieldControl<Date> {

  static nextId = 0;

  @HostBinding() id = `cov-triple-date-picker-${CovDatepickerTriple.nextId++}`;

  @HostBinding('class') hostClass = 'm/d/y';
  @Input()
  order: ('m/d/y' | 'd/m/y') = 'd/m/y';

  @ViewChild('day-input') dayInput: ElementRef;
  @ViewChild('month-select') monthInput: ElementRef;
  @ViewChild('year-input') yearInput: ElementRef;

  @Input()
  get value(): Date | null {
    const yearValue = this.dateForm.get('year').value;
    const monthValue = this.dateForm.get('month').value;
    const dayValue = this.dateForm.get('day').value;

    if (this.isFormValuesValidDate()) {
      const dateToReturn = new Date(yearValue, monthValue, dayValue);
      return dateToReturn;
    }
    return null;
  }
  set value(date: Date | null) {
    this.setForm(date);
  }


  stateChanges = new Subject<void>();
  placeholder: string;
  focused = false;

  get empty(): boolean {
    const yearValue = this.dateForm.get('year').value;
    const monthValue = this.dateForm.get('month').value;
    const dayValue = this.dateForm.get('day').value;
    return !yearValue && (monthValue === null || monthValue === undefined) && !dayValue;
  }

  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  required: boolean;

  /** The minimum valid date. */
  @Input()
  get min(): Date | string | null {
    return this.minPrivate;
  }
  set min(value: Date | string) {
    // take only the date part (because the datepicker only allows selecting the date, and the uesr can't see the time part)
    const dateToSet = new Date(value);
    this.minPrivate = new Date(dateToSet.getFullYear(), dateToSet.getMonth(), dateToSet.getDate());
  }
  private minPrivate;


  /** The maximum valid date. */
  @Input()
  get max(): Date | string | null {
    return this.maxPrivate;
  }
  set max(value: Date | string) {
    // take only the date part (because the datepicker only allows selecting the date, and the uesr can't see the time part)
    const dateToSet = new Date(value);
    this.maxPrivate = new Date(dateToSet.getFullYear(), dateToSet.getMonth(), dateToSet.getDate());
  }
  private maxPrivate;

  @Input()
  get disabled(): boolean { return this.disabledPrivate; }
  set disabled(value: boolean) {
    this.disabledPrivate = coerceBooleanProperty(value);
    this.disabledPrivate ? this.dateForm.disable() : this.dateForm.enable();
    this.stateChanges.next();
  }
  private disabledPrivate = false;

  get errorState(): boolean {
    return this.ngControl.dirty && (this.ngControl.invalid || this.isErrorState);
  }
  private isErrorState = false;

  controlType = 'triple-datepicker';
  autofilled?: boolean;


  @Input() startYear = 1900;
  @Input() endYear = new Date().getFullYear();

  @Input() monthFormat = 'MMMM';

  monthsArr: Array<KeyValue<number, string>>;

  dateForm = this.fb.group({
    year: null,
    month: null,
    day: null
  });

  touchedFn: () => {};

  get yearsArray() {
    const arr = new Array<number>();
    for (let i = this.startYear; i <= this.endYear; i++) {
      arr.push(i + 1);
    }
    return arr;
  }

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    @Inject(LOCALE_ID) private locale: string,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef<HTMLElement>,
    private fb: FormBuilder
  ) {

    // Replace the provider from above with this.
    if (this.ngControl != null) {
      // Setting the value accessor directly (instead of using
      // the providers) to avoid running into a circular import.
      this.ngControl.valueAccessor = this;
    }

    focusMonitor.monitor(elementRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });

    this.monthsArr = this.generateMonthsArray();
  }

  ngOnInit() {
    this.setOrder();

    if (this.ngControl.control.validator) {
      this.ngControl.control.setValidators([this.ngControl.control.validator, this.validate.bind(this)]);
    } else {
      this.ngControl.control.setValidators(this.validate.bind(this));
    }
    this.ngControl.control.updateValueAndValidity();
  }

  setOrder() {
    const order = this.order.toLowerCase().trim() || 'm/d/y';
    this.hostClass = order;
  }

  generateMonthsArray(): Array<KeyValue<number, string>> {
    const monthList = [];
    for (let i = 0; i < 12; i++) {
      const monthName = formatDate(new Date(1, i, 1), this.monthFormat, this.locale);
      monthList.push({ key: i, value: monthName });
    }
    return monthList;
  }

  // BEGIN - ControlValueAccessor methods:
  writeValue(paramValue: Date | string): void {
    if (paramValue) {
      this.value = new Date(paramValue);
    }
    this.setForm(this.value);
    this.stateChanges.next();
  }

  registerOnChange(fn: any): void {
    const debounce = debounceTime(150);
    const yearChange = this.dateForm.get('year').valueChanges.pipe(debounce);
    const monthChange = this.dateForm.get('month').valueChanges.pipe(debounce);
    const dayChange = this.dateForm.get('day').valueChanges.pipe(debounce);

    merge(yearChange, monthChange, dayChange)
      .subscribe(() => {
        fn(this.value);
        this.stateChanges.next();
      });
  }

  registerOnTouched(fn: any): void {
    this.touchedFn = fn;
  }

  setDisabledState?(isDisabledState: boolean): void {
    this.disabled = isDisabledState;
  }
  // END - ControlValueAccessor methods

  // BEGIN - Material functions:
  onContainerClick(event: MouseEvent): void {
    // if the user clicks, inside the scope of the datepicker, but not on a specific input, set focus on the first input
    if ((event.target as Element).tagName.toLowerCase() !== 'input') {
      this.elementRef.nativeElement.querySelector('input').focus();
    }
  }

  setDescribedByIds(ids: string[]): void {

  }
  // END - Material functions

  getMonthAbreviation(monthIndex: number) {
    const month = this.monthsArr[monthIndex];
    if (month) {
      return month.value.substring(0, 3);
    }
    return '';
  }

  private isFormValuesValidDate() {
    const yearValue = this.dateForm.get('year').value;
    const monthValue = this.dateForm.get('month').value;
    const dayValue = this.dateForm.get('day').value;

    return this.isValidDate(yearValue, monthValue + 1, dayValue);
  }

  private isValidDate(year: number, month: number, day: number) {
    if (!year || !month || !day === null || year < 1000) {
      return false;
    }
    const dateString = `${Number(month).toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    const newDate = new Date(year, month - 1, day);
    const stringFromNewDate = newDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    return dateString === stringFromNewDate;
  }

  private setForm(date: Date) {

    let year: number = null;
    let month = 0;
    let day: number = null;

    if (date) {
      year = date.getFullYear();
      month = date.getMonth();
      day = date.getDate();
    }

    this.dateForm.setValue({
      year, month, day
    });
  }

  private getDaysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  private validate({ value }: FormControl): any {
    let validationErrors = {};
    this.isErrorState = false;

    // If invalid date structor (impossible date)
    if (this.isInvalidDateStructure()) {
      validationErrors = {
        ...validationErrors,
        invalidDate: 'The date you selected is invalid'
      };
      this.isErrorState = true;
    }

    // If a minimum date is provided
    if (this.isLowerThanMinDate()) {
      validationErrors = {
        ...validationErrors,
        minDate: 'The selected date is below the minimum allowed date'
      };
      this.isErrorState = true;
    }

    // If a minimum date is provided
    if (this.isGreaterThanMaxDate()) {
      validationErrors = {
        ...validationErrors,
        maxDate: 'The selected date is greater then the maximum allowed date'
      };
      this.isErrorState = true;
    }

    if (!this.isErrorState) {
      return null;
    }
    return validationErrors;
  }

  private isLowerThanMinDate() {
    const date = this.value;
    if (!date || !this.min) {
      return false;
    }
    if (date < this.min) {
      return true;
    }
    return false;
  }

  private isInvalidDateStructure() {
    const date = this.value;
    const yearValue = this.dateForm.get('year').value;
    const dayValue = this.dateForm.get('day').value;

    if (!date && (dayValue || yearValue)) {
      return true;
    }
    return false;
  }

  private isGreaterThanMaxDate() {
    const date = this.value;
    if (!date || !this.max) {
      return false;
    }
    if (date > this.max) {
      return true;
    }
    return false;
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
  }
}
