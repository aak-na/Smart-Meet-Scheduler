import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SchedulerRoutingModule } from './scheduler-routing.module';
import { SchedulerComponent } from './scheduler.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    SchedulerComponent
  ],
  imports: [
    CommonModule,
    SchedulerRoutingModule,
    ReactiveFormsModule,
    HttpClientModule
  ]
})
export class SchedulerModule { }
