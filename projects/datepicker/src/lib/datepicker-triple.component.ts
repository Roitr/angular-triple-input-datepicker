// tutorial from: https://material.angular.io/guide/creating-a-custom-form-field-control

// tslint:disable: variable-name
// tslint:disable: jsdoc-format
// tslint:disable: member-ordering
// tslint:disable: component-class-suffix

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
  DoCheck,
  NgZone,
  OnChanges
} from '@angular/core';
import { FormBuilder, NgControl, FormControl, NgForm, FormGroupDirective } from '@angular/forms';
import { KeyValue, formatDate } from '@angular/common';
import {
  MatFormFieldControl,
  CanUpdateErrorState,
  ErrorStateMatcher,
  CanUpdateErrorStateCtor,
  mixinErrorState,
  MAT_INPUT_VALUE_ACCESSOR
} from '@angular/material';
import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Subject, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Platform } from '@angular/cdk/platform';

let nextUniqueId = 0;

/** Error when invalid control is dirty, touched, or submitted. */
class CustomErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    const isError = !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
    control.updateValueAndValidity();
    return isError;
  }
}

export class CovDatepickerTripleBase {
  constructor(
    public _defaultErrorStateMatcher: ErrorStateMatcher,
    public _parentForm: NgForm,
    public _parentFormGroup: FormGroupDirective,
    public ngControl: NgControl) { }
}

const _CovDatepickerTripleMixinBase: CanUpdateErrorStateCtor & typeof CovDatepickerTripleBase =
  mixinErrorState(CovDatepickerTripleBase);

@Component({
  selector: 'cov-datepicker-triple',
  templateUrl: 'datepicker-triple.html',
  styleUrls: ['./datepicker-triple.component.scss'],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: CovDatepickerTriple
    }
  ]
})
export class CovDatepickerTriple extends _CovDatepickerTripleMixinBase implements MatFormFieldControl<Date>,
  OnChanges, OnInit, OnDestroy, DoCheck, CanUpdateErrorState {

  protected _uid = `cov-datepicker-triple-${nextUniqueId++}`;
  protected _previousNativeValue: any;
  private _inputValueAccessor: { value: any };

  /**
   * Implemented as part of MatFormFieldControl.
   */
  focused = false;

  /**
   * Implemented as part of MatFormFieldControl.
   */
  readonly stateChanges: Subject<void> = new Subject<void>();

  /**
   * Implemented as part of MatFormFieldControl.
   */
  controlType = 'cov-datepicker-triple';

  /**
   * Implemented as part of MatFormFieldControl.
   */
  autofilled = false;

  /**
  * Implemented as part of MatFormFieldControl.
  */
  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
    this._disabled ? this.dateForm.disable() : this.dateForm.enable();
    this.stateChanges.next();

    // Browsers may not fire the blur event if the input is disabled too quickly.
    // Reset from here to ensure that the element doesn't become stuck.
    if (this.focused) {
      this.focused = false;
      this.stateChanges.next();
    }
  }
  protected _disabled = false;

  /**
   * Implemented as part of MatFormFieldControl.
   */
  @Input()
  get id(): string { return this._id; }
  set id(value: string) { this._id = value || this._uid; }
  protected _id: string;

  /**
   * Implemented as part of MatFormFieldControl.
   */
  @Input() placeholder: string;

  /**
   * Implemented as part of MatFormFieldControl.
   */
  @Input()
  get required(): boolean { return this._required; }
  set required(value: boolean) { this._required = coerceBooleanProperty(value); }
  protected _required = false;

  /** An object used to control when error messages are shown. */
  @Input() errorStateMatcher: ErrorStateMatcher = new CustomErrorStateMatcher();


  @HostBinding('class') hostClass = 'm/d/y';
  @Input()
  order: ('m/d/y' | 'd/m/y') = 'd/m/y';

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
  set value(value: Date | null) {
    if (value !== this.value) {
      this._inputValueAccessor.value = value;
      this.setForm(value);
      this.stateChanges.next();
    }
  }

  /** Whether the element is readonly. */
  @Input()
  get readonly(): boolean { return this._readonly; }
  set readonly(value: boolean) { this._readonly = coerceBooleanProperty(value); }
  private _readonly = false;


  constructor(
    protected _elementRef: ElementRef<HTMLElement>,
    protected _platform: Platform,
    /** @docs-private */
    @Optional() @Self() public ngControl: NgControl,
    @Optional() _parentForm: NgForm,
    @Optional() _parentFormGroup: FormGroupDirective,
    _defaultErrorStateMatcher: ErrorStateMatcher,
    @Optional() @Self() @Inject(MAT_INPUT_VALUE_ACCESSOR) inputValueAccessor: any,
    ngZone: NgZone,
    @Inject(LOCALE_ID) private locale: string,
    private focusMonitor: FocusMonitor,
    private fb: FormBuilder
  ) {

    super(_defaultErrorStateMatcher, _parentForm, _parentFormGroup, ngControl);
    // super(_defaultErrorStateMatcher, _parentForm, _parentFormGroup, ngControl);

    const element = this._elementRef.nativeElement;

    // If no input value accessor was explicitly specified, use the element as the input value
    // accessor.
    this._inputValueAccessor = inputValueAccessor || element;

    this._previousNativeValue = this.value;

    // Force setter to be called in case id was not specified.
    this.id = this.id;

    // Replace the provider from above with this.
    if (this.ngControl != null) {
      // Setting the value accessor directly (instead of using
      // the providers) to avoid running into a circular import.
      this.ngControl.valueAccessor = this;
    }

    focusMonitor.monitor(element, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });

    this.monthsArr = this.generateMonthsArray();
  }

  ngOnChanges() {
    this.stateChanges.next();
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this._elementRef.nativeElement);
  }

  ngDoCheck() {
    if (this.ngControl) {
      // We need to re-evaluate this on every change detection cycle, because there are some
      // error triggers that we can't subscribe to (e.g. parent form submissions). This means
      // that whatever logic is in here has to be super lean or we risk destroying the performance.
      this.updateErrorState();
    }
  }

  _onInput() {
    // This is a noop function and is used to let Angular know whenever the value changes.
    // Angular will run a new change detection each time the `input` event has been dispatched.
    // It's necessary that Angular recognizes the value change, because when floatingLabel
    // is set to false and Angular forms aren't used, the placeholder won't recognize the
    // value changes and will not disappear.
    // Listening to the input event wouldn't be necessary when the input is using the
    // FormsModule or ReactiveFormsModule, because Angular forms also listens to input events.
  }

  /**
  * Implemented as part of MatFormFieldControl.
  * @docs-private
  */
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

  protected minPrivate;


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
    const debounce = debounceTime(50);
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
      this._elementRef.nativeElement.querySelector('input').focus();
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
    let _isErrorState = false;

    // If invalid date structor (impossible date)
    if (this.isInvalidDateStructure()) {
      validationErrors = {
        ...validationErrors,
        invalidDate: 'The date you selected is invalid'
      };
      _isErrorState = true;
    }

    // If a minimum date is provided
    if (this.isLowerThanMinDate()) {
      validationErrors = {
        ...validationErrors,
        minDate: 'The selected date is below the minimum allowed date'
      };
      _isErrorState = true;
    }

    // If a minimum date is provided
    if (this.isGreaterThanMaxDate()) {
      validationErrors = {
        ...validationErrors,
        maxDate: 'The selected date is greater then the maximum allowed date'
      };
      _isErrorState = true;
    }

    if (!_isErrorState) {
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

}
