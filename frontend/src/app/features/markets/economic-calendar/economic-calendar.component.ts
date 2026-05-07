import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-economic-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './economic-calendar.component.html',
  styleUrls: ['./economic-calendar.component.css']
})
export class EconomicCalendarComponent implements OnInit {
  private finnhubApiKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private apiNinjasKey = 'dDJhqHqeiQtIIxOwHBvm6doiauv9b5mwefPH2wyS';

  events: any[] = [];
  filteredEvents: any[] = [];
  centralBankRates: any[] = [];
  showMoreRates = false;
  nextEventId: number | null = null;
  private autoUpdateTimer: any;
  private pendingScrollToId: number | null = null;
  private autoJumpToNextAfterLoad = false;
  expandedEventId: number | null = null;
  eventHistories: Record<number, any[]> = {};
  historyLoading: Record<number, boolean> = {};

  // Date State
  currentDateRange: { from: Date; to: Date } = this.getThisWeek();
  dateRangeLabel = 'This Week';
  
  // Filters State
  showFilters = false;
  searchQuery = '';
  currencyList = ['USD','EUR','GBP','JPY','AUD','CAD','CHF','NZD','CNY','OTHER'];
  filters: { impact: Record<string, boolean>, currencies: Record<string, boolean> } = {
    impact: { high: true, medium: true, low: true, none: true },
    currencies: { USD: true, EUR: true, GBP: true, JPY: true, AUD: true, CAD: true, CHF: true, NZD: true, CNY: true, OTHER: true }
  };

  loading = true;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetchCalendarData();
    this.fetchCentralBankRates();

    // Auto-update the "Up Next" pointer every 30 seconds
    this.autoUpdateTimer = setInterval(() => {
      this.updateNextEvent();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer);
    }
  }

  // --- Data Fetching ---

  fetchCalendarData() {
    this.loading = true;
    const fromStr = this.formatDate(this.currentDateRange.from);
    const toStr = this.formatDate(this.currentDateRange.to);

    this.http.get(`https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=${this.finnhubApiKey}`)
      .subscribe((res: any) => {
        const rawEvents = res.economicCalendar || [];
        this.events = rawEvents.map((event: any, index: number) => {
          // Add Z to ensure it's treated as UTC
          const eventTime = new Date(event.time.replace(' ', 'T') + 'Z');
          const impactLvl = this.getImpactLevel(event.impact);
          return { ...event, id: index, impactLevel: impactLvl, time: eventTime.toISOString() };
        }).sort((a: any, b: any) => {
          const timeA = new Date(a.time).getTime();
          const timeB = new Date(b.time).getTime();
          return timeA - timeB;
        });

        this.applyFilters();
        this.updateNextEvent();
        this.loading = false;
        this.cdr.detectChanges();

        // If we were waiting for data to load to jump to the next event
        if (this.autoJumpToNextAfterLoad) {
          this.autoJumpToNextAfterLoad = false;
          this.scrollToNextEvent();
          return;
        }

        // If we were waiting for data to load to scroll to a specific event
        if (this.pendingScrollToId !== null) {
          setTimeout(() => {
            const el = document.getElementById('event-' + this.pendingScrollToId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.pendingScrollToId = null;
          }, 100);
        }
      });
  }

  fetchCentralBankRates() {
    const bankDefinitions = [
      { countryApi: 'United States', code: 'us', cur: 'USD', bankName: 'Fed', fallbackRate: 5.50 },
      { countryApi: 'United Kingdom', code: 'gb', cur: 'GBP', bankName: 'BoE', fallbackRate: 5.25 },
      { countryApi: 'Euro Area', code: 'eu', cur: 'EUR', bankName: 'BCE', fallbackRate: 4.50 },
      { countryApi: 'Canada', code: 'ca', cur: 'CAD', bankName: 'BoC', fallbackRate: 5.00 },
      { countryApi: 'Japan', code: 'jp', cur: 'JPY', bankName: 'BoJ', fallbackRate: 0.10 },
      { countryApi: 'China', code: 'cn', cur: 'CNY', bankName: 'PBoC', fallbackRate: 3.45 },
      { countryApi: 'Switzerland', code: 'ch', cur: 'CHF', bankName: 'SNB', fallbackRate: 1.50 },
      { countryApi: 'India', code: 'in', cur: 'INR', bankName: 'RBI', fallbackRate: 6.50 },
      { countryApi: 'Brazil', code: 'br', cur: 'BRL', bankName: 'BCB', fallbackRate: 10.75 },
      { countryApi: 'Germany', code: 'de', cur: 'EUR', bankName: 'Bundesbank', fallbackRate: 4.50 }
    ];

    this.http.get('https://api.api-ninjas.com/v1/interestrate', {
      headers: { 'X-Api-Key': this.apiNinjasKey }
    }).pipe(
      catchError(() => of(null)) // Handle error gracefully
    ).subscribe((res: any) => {
      let apiData = res && res.central_bank_rates ? res.central_bank_rates : {};
      
      this.centralBankRates = bankDefinitions.map(def => {
        // Find if the API returned a rate for this country
        const apiRateInfo = apiData[def.countryApi];
        let rate = apiRateInfo ? apiRateInfo.rate_pct : def.fallbackRate;
        
        return {
          bankName: def.bankName,
          country: def.countryApi,
          code: def.code,
          cur: def.cur,
          rate_pct: rate
        };
      });
      
      this.cdr.detectChanges();
    });
  }

  toggleShowMoreRates() {
    this.showMoreRates = !this.showMoreRates;
  }

  // --- Filters ---

  applyFilters() {
    const q = this.searchQuery.toLowerCase();
    
    this.filteredEvents = this.events.filter((event: any) => {
      // 1. Search Query
      if (q && !event.event?.toLowerCase().includes(q) && !event.country?.toLowerCase().includes(q)) {
        return false;
      }
      
      // 2. Impact Filter
      const iLvl = event.impactLevel;
      if (iLvl === 3 && !this.filters.impact['high']) return false;
      if (iLvl === 2 && !this.filters.impact['medium']) return false;
      if (iLvl === 1 && !this.filters.impact['low']) return false;
      if (iLvl === 0 && !this.filters.impact['none']) return false;

      // 3. Currency Filter
      const cur = this.getCurrencyFromCountry(event.country);
      
      if (cur === 'USD' && !this.filters.currencies['USD']) return false;
      if (cur === 'EUR' && !this.filters.currencies['EUR']) return false;
      if (cur === 'GBP' && !this.filters.currencies['GBP']) return false;
      if (cur === 'JPY' && !this.filters.currencies['JPY']) return false;
      if (cur === 'AUD' && !this.filters.currencies['AUD']) return false;
      if (cur === 'CAD' && !this.filters.currencies['CAD']) return false;
      if (cur === 'CHF' && !this.filters.currencies['CHF']) return false;
      if (cur === 'NZD' && !this.filters.currencies['NZD']) return false;
      if (cur === 'CNY' && !this.filters.currencies['CNY']) return false;
      if (cur === 'OTHER' && !this.filters.currencies['OTHER']) return false;

      return true;
    });
    this.updateNextEvent();
  }

  toggleFilterPanel() {
    this.showFilters = !this.showFilters;
  }

  setImpactFilter(level: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.filters.impact[level] = checked;
    this.applyFilters();
  }

  setCurrencyFilter(cur: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.filters.currencies[cur] = checked;
    this.applyFilters();
  }

  // --- Navigation & Dates ---

  setDateRange(type: 'today'|'tomorrow'|'thisWeek'|'nextWeek'|'thisMonth'|'nextMonth'|'yesterday'|'lastWeek'|'lastMonth'|'specific') {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    switch (type) {
      case 'today':
        from = new Date();
        to = new Date();
        this.dateRangeLabel = 'Today';
        break;
      case 'tomorrow':
        from.setDate(now.getDate() + 1);
        to.setDate(now.getDate() + 1);
        this.dateRangeLabel = 'Tomorrow';
        break;
      case 'thisWeek':
        const week = this.getThisWeek();
        from = week.from; to = week.to;
        this.dateRangeLabel = 'This Week';
        break;
      case 'nextWeek':
        const nextW = this.getThisWeek(1);
        from = nextW.from; to = nextW.to;
        this.dateRangeLabel = 'Next Week';
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        this.dateRangeLabel = 'This Month';
        break;
      case 'yesterday':
        from.setDate(now.getDate() - 1);
        to.setDate(now.getDate() - 1);
        this.dateRangeLabel = 'Yesterday';
        break;
      case 'specific':
        // Values already set in this.currentDateRange if called with 'specific'
        from = this.currentDateRange.from;
        to = this.currentDateRange.to;
        break;
    }

    this.currentDateRange = { from, to };
    this.fetchCalendarData();
  }

  setDateToSpecificDay(date: Date) {
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const to = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this.currentDateRange = { from, to };
    this.dateRangeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    this.setDateRange('specific');
  }

  scrollToNextEvent() {
    // We look for the next event in the current set of data
    const now = new Date().getTime();
    const nextEvent = this.filteredEvents.find(e => {
      const eventTime = new Date(e.time).getTime();
      return eventTime >= now;
    });

    if (nextEvent) {
      const eventDate = new Date(nextEvent.time);
      this.setDateToSpecificDay(eventDate);
      this.pendingScrollToId = nextEvent.id;
    } else {
      // If no future event in current view, expand the search range automatically
      this.autoJumpToNextAfterLoad = true;
      if (this.dateRangeLabel === 'Today' || this.dateRangeLabel === 'Tomorrow' || this.dateRangeLabel === 'Yesterday') {
        this.setDateRange('thisWeek');
      } else if (this.dateRangeLabel === 'This Week') {
        this.setDateRange('nextWeek');
      } else {
        this.setDateRange('thisMonth');
      }
    }
  }

  updateNextEvent() {
    if (!this.filteredEvents || this.filteredEvents.length === 0) {
      this.nextEventId = null;
      return;
    }

    const now = new Date().getTime();
    
    // Find the first event that hasn't happened yet
    let nextEvent = this.filteredEvents.find(e => {
      const eventTime = new Date(e.time).getTime();
      return eventTime >= now;
    });

    this.nextEventId = nextEvent ? nextEvent.id : null;
    this.cdr.detectChanges();
  }

  // --- Export Logic ---

  exportData(format: 'ics' | 'csv' | 'json' | 'xml') {
    if (!this.filteredEvents || this.filteredEvents.length === 0) return;

    const filename = `markethub-calendar-${this.formatDate(new Date())}`;

    switch (format) {
      case 'json':
        const jsonStr = JSON.stringify(this.filteredEvents, null, 2);
        this.downloadFile(jsonStr, `${filename}.json`, 'application/json');
        break;
      case 'csv':
        const csvHeaders = 'Date,Time,Currency,Impact,Event,Actual,Forecast,Previous\n';
        const csvRows = this.filteredEvents.map(e => {
          const date = new Date(e.time.replace(' ', 'T')).toLocaleDateString();
          const time = new Date(e.time.replace(' ', 'T')).toLocaleTimeString();
          return `"${date}","${time}","${e.country}","${e.impact}","${e.event}","${e.actual || ''}","${e.forecast || ''}","${e.prev || ''}"`;
        }).join('\n');
        this.downloadFile(csvHeaders + csvRows, `${filename}.csv`, 'text/csv');
        break;
      case 'xml':
        let xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n<events>\n';
        this.filteredEvents.forEach(e => {
          xmlStr += `  <event>\n    <date>${this.escapeXml(e.time)}</date>\n    <currency>${this.escapeXml(e.country)}</currency>\n    <impact>${this.escapeXml(e.impact)}</impact>\n    <name>${this.escapeXml(e.event)}</name>\n    <actual>${this.escapeXml(e.actual || '')}</actual>\n    <forecast>${this.escapeXml(e.forecast || '')}</forecast>\n    <previous>${this.escapeXml(e.prev || '')}</previous>\n  </event>\n`;
        });
        xmlStr += '</events>';
        this.downloadFile(xmlStr, `${filename}.xml`, 'application/xml');
        break;
      case 'ics':
        let icsStr = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MarketHub//Economic Calendar//EN\n';
        this.filteredEvents.forEach(e => {
          const start = new Date(e.time.replace(' ', 'T')).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          icsStr += `BEGIN:VEVENT\nDTSTART:${start}\nSUMMARY:[${e.impact.toUpperCase()}] ${e.country} - ${e.event}\nDESCRIPTION:Currency: ${e.country}\\nImpact: ${e.impact}\\nForecast: ${e.forecast || 'N/A'}\nEND:VEVENT\n`;
        });
        icsStr += 'END:VCALENDAR';
        this.downloadFile(icsStr, `${filename}.ics`, 'text/calendar');
        break;
    }
  }

  private downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private escapeXml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe.toString().replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
      return c;
    });
  }

  // --- Helpers ---

  private getThisWeek(offsetWeeks = 0): { from: Date, to: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const numDay = now.getDate();
    
    const start = new Date(now);
    start.setDate(numDay - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + (offsetWeeks * 7));
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return { from: start, to: end };
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  getCountryCode(countryName: string): string {
    const c = (countryName || '').toLowerCase();
    const map: any = {
      'united states': 'us', 'usa': 'us', 'us': 'us',
      'euro area': 'eu', 'eu': 'eu', 'eurozone': 'eu',
      'united kingdom': 'gb', 'uk': 'gb', 'gb': 'gb',
      'australia': 'au', 'au': 'au',
      'canada': 'ca', 'ca': 'ca',
      'new zealand': 'nz', 'nz': 'nz',
      'switzerland': 'ch', 'ch': 'ch',
      'japan': 'jp', 'jp': 'jp',
      'germany': 'de', 'de': 'de',
      'france': 'fr', 'fr': 'fr',
      'italy': 'it', 'it': 'it',
      'spain': 'es', 'es': 'es'
    };
    return map[c] || c;
  }

  getCurrencyFromCountry(country: string): string {
    const c = (country || '').toUpperCase();
    const map: any = {
      'UNITED STATES': 'USD', 'USA': 'USD', 'US': 'USD',
      'EURO AREA': 'EUR', 'EUROZONE': 'EUR', 'EU': 'EUR', 'EMU': 'EUR', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
      'UNITED KINGDOM': 'GBP', 'UK': 'GBP', 'GB': 'GBP',
      'JAPAN': 'JPY', 'JP': 'JPY',
      'AUSTRALIA': 'AUD', 'AU': 'AUD',
      'CANADA': 'CAD', 'CA': 'CAD',
      'SWITZERLAND': 'CHF', 'CH': 'CHF',
      'NEW ZEALAND': 'NZD', 'NZ': 'NZD',
      'CHINA': 'CNY', 'CN': 'CNY'
    };
    return map[c] || 'OTHER';
  }

  toggleEventDetail(eventId: number) {
    if (this.expandedEventId === eventId) {
      this.expandedEventId = null;
    } else {
      this.expandedEventId = eventId;
      const event = this.filteredEvents.find(e => e.id === eventId);
      if (event && !this.eventHistories[eventId]) {
        this.loadHistoricalData(event);
      }
    }
  }

  loadHistoricalData(event: any) {
    this.historyLoading[event.id] = true;
    
    // Fetch last 12 months of data for more robustness
    const to = new Date();
    const from = new Date();
    from.setFullYear(to.getFullYear() - 1);

    const fromStr = this.formatDate(from);
    const toStr = this.formatDate(to);
    
    const eventCountryCode = this.getCountryCode(event.country);
    const normalizedName = event.event.toLowerCase().trim();

    this.http.get(`https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=${this.finnhubApiKey}`)
      .subscribe({
        next: (res: any) => {
          const data = res.economicCalendar || [];
          if (Array.isArray(data)) {
            // Filter by exact country code and event name
            const history = data
              .filter((e: any) => {
                const eCountryCode = this.getCountryCode(e.country);
                const eName = e.event.toLowerCase().trim();
                const countryMatch = eCountryCode === eventCountryCode;
                const nameMatch = eName === normalizedName || normalizedName.includes(eName) || eName.includes(normalizedName);
                return countryMatch && nameMatch;
              })
              .map((e: any) => ({
                time: new Date(e.time.replace(' ', 'T') + 'Z').toISOString(),
                actual: e.actual,
                forecast: e.estimate,
                prev: e.prev
              }))
              .filter((e, index, self) => 
                index === self.findIndex((t) => t.time === e.time && t.actual === e.actual)
              )
              .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());

            this.eventHistories[event.id] = history;
          }
          this.historyLoading[event.id] = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.historyLoading[event.id] = false;
          this.cdr.detectChanges();
        }
      });
  }

  getBarChartData(history: any[]) {
    if (!history || history.length < 1) return [];
    
    const data = history
      .filter(h => h.actual !== null && h.actual !== undefined)
      .map(h => parseFloat(h.actual))
      .reverse();

    if (data.length === 0) return [];

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const width = 240;
    const height = 80;
    const barSpacing = 6;
    const barWidth = Math.max(8, (width / data.length) - barSpacing);

    return data.map((val, i) => {
      const barHeight = ((val - min) / range) * (height - 10) + 10; // Min 10px height for visibility
      return {
        x: i * (width / data.length),
        y: height - barHeight,
        w: barWidth,
        h: barHeight,
        value: val
      };
    });
  }

  getEventSpecs(eventName: string) {
    const name = eventName.toLowerCase();
    
    // Simple mapping for common events
    if (name.includes('non-farm payrolls') || name.includes('nonfarm')) {
      return {
        measures: 'Change in the number of employed people during the previous month, excluding the farming industry;',
        effect: "'Actual' greater than 'Forecast' is good for currency;",
        frequency: 'Released monthly, usually on the first Friday after the month ends;',
        why: 'Job creation is an important leading indicator of consumer spending, which accounts for the majority of overall economic activity;',
        also: 'NFP, Non-Farm Employment Change',
        acro: 'NFP (Non-Farm Payrolls)'
      };
    }
    
    if (name.includes('cpi') || name.includes('inflation')) {
      return {
        measures: 'Change in the price of goods and services purchased by consumers;',
        effect: "'Actual' greater than 'Forecast' is good for currency;",
        frequency: 'Released monthly, about 15 days after the month ends;',
        why: 'Consumer prices account for a majority of overall inflation. Inflation is important to currency valuation because rising prices lead the central bank to raise interest rates out of respect for their inflation containment mandate;',
        also: 'Consumer Price Index, Cost of Living',
        acro: 'CPI (Consumer Price Index)'
      };
    }

    if (name.includes('rate') || name.includes('interest')) {
      return {
        measures: 'Interest rate at which major financial institutions lend or borrow funds from each other;',
        effect: "'Actual' greater than 'Forecast' is good for currency;",
        frequency: 'Usually 8 times per year;',
        why: 'Short term interest rates are the most important factor in currency valuation - traders look at most other indicators merely to predict how rates will change in the future;',
        also: 'Official Cash Rate, Base Rate',
        acro: 'IR (Interest Rate)'
      };
    }

    if (name.includes('gdp')) {
      return {
        measures: 'Change in the inflation-adjusted value of all goods and services produced by the economy;',
        effect: "'Actual' greater than 'Forecast' is good for currency;",
        frequency: 'Released quarterly, about 30 days after the quarter ends;',
        why: "It's the broadest measure of economic activity and the primary gauge of the economy's health;",
        also: 'Gross Domestic Product',
        acro: 'GDP (Gross Domestic Product)'
      };
    }

    // Default generic detail
    return {
      measures: 'Economic output and performance indicator for the specified sector;',
      effect: "'Actual' greater than 'Forecast' is usually good for currency;",
      frequency: 'Varies by indicator (Monthly/Quarterly);',
      why: 'Traders watch this data closely as it provides insight into the underlying strength of the economy and potential central bank policy shifts;',
      also: 'N/A',
      acro: eventName
    };
  }

  private getImpactLevel(impact: string): number {
    const impactStr = (impact || '').toLowerCase();
    if (impactStr === 'high') return 3;
    if (impactStr === 'medium' || impactStr === 'med') return 2;
    if (impactStr === 'low') return 1;
    return 0;
  }
}
