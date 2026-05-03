import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EconomicCalendar } from './economic-calendar';

describe('EconomicCalendar', () => {
  let component: EconomicCalendar;
  let fixture: ComponentFixture<EconomicCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EconomicCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EconomicCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
