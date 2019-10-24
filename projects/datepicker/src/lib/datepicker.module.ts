import { NgModule } from '@angular/core';
import { CovDatepickerTriple } from './datepicker.component';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule, MatInputModule } from '@angular/material';

@NgModule({
  declarations: [CovDatepickerTriple],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormsModule,
    MatSelectModule,
    MatInputModule
  ],
  exports: [CovDatepickerTriple]
})
export class DatepickerModule { }
