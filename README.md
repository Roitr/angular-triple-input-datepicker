# Datepicker

GitHub: https://github.com/Roitr/angular-triple-input-datepicker

Currently contains only a triple-inputs datepicker (text input for day and year, and a drop-down for month).

- It should work well inside any angular form, 

- Supports angular material (can be used inside of a mat-form-field)

- Supports both 'day/month/year' and 'month/day/year' (default) formats;

  To change the input order, simply use the order property, and give it "d/m/y", or "m/d/y" like this: order="d/m/y"

- Will give an error (invalidDate) if the selected date is not a valid date (in terms of structure and invalid inputs).

- Supports min and max dates (gives a minDate and maxDate errors).
  Because the user can only select a date, without time, when providing a min/max date objects, only the date section will be used.

  Feel free to contribute and help me improve this package :).
