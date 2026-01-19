import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrl: './scheduler.component.scss'
})
export class SchedulerComponent {
   loading = false;
  result: any = null;
  error: string | null = null;

  form = this.fb.group({
    mail: ['', [Validators.required, Validators.email]],
    clientName: [''],
    title: ['Project Kickoff', Validators.required],
    description: ['Discuss project scope'],
    dateTimeLocal: ['', Validators.required],
    durationMin: [30, [Validators.required]],
    timezone: ['Asia/Kolkata'],
    uniqid: ['']
  });

  constructor(private fb: FormBuilder, private http: HttpClient) {}

 submit() {
  this.error = null;
  this.result = null;
  if (this.form.invalid) {
    this.error = 'Please fill required fields correctly.';
    return;
  }

  this.loading = true;

  // dtLocal may be null/undefined, so guard it
  const dtLocal = this.form.value.dateTimeLocal;
  if (!dtLocal) {
    this.error = 'Please select meeting date and time.';
    this.loading = false;
    return;
  }

  const duration = Number(this.form.value.durationMin || 30);

  const localDate = new Date(dtLocal); // now safe: dtLocal is string
  if (isNaN(localDate.getTime())) {
    this.error = 'Invalid date/time.';
    this.loading = false;
    return;
  }

  const startISO = new Date(localDate.getTime()).toISOString();
  const endISO = new Date(localDate.getTime() + duration * 60000).toISOString();

  const payload = {
    mail: this.form.value.mail,
    clientName: this.form.value.clientName,
    title: this.form.value.title,
    description: this.form.value.description,
    startDateISO: startISO,
    endDateISO: endISO,
    timezone: this.form.value.timezone,
    uniqid: this.form.value.uniqid
  };

  this.http.post<any>('/api/schedule-meeting', payload).subscribe({
    next: res => { this.result = res; this.loading = false; },
    error: err => { this.error = err?.error?.message || err?.message || 'Server error'; this.loading = false; }
  });
}


}
