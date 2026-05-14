import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './legal-page.css',
  template: `
    <div class="legal-wrapper">
      <article class="legal-container">
        <a routerLink="/community" class="legal-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to community
        </a>

        <h1 class="legal-title">Cookies Policy</h1>
        <p class="legal-updated"><strong>Last updated:</strong> May 14, 2026</p>

        <p class="legal-intro">This policy explains what cookies are, which ones MarketHub uses, and how you can manage them.</p>

        <section class="legal-section">
          <h2>1. What are cookies?</h2>
          <p>Cookies are small text files that websites store on your device when you visit them. They allow the site to remember information about your visit, such as your preferences or session state.</p>
          <p>In addition to cookies, MarketHub may use other similar technologies such as <strong>localStorage</strong> and <strong>httpOnly cookies</strong> for analogous purposes.</p>
        </section>

        <section class="legal-section">
          <h2>2. Types of cookies we use</h2>

          <h3>Technical cookies (necessary)</h3>
          <p>These are essential for the operation of the service and cannot be disabled.</p>
          <table class="legal-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>refreshToken</code></td>
                <td>Maintain the session securely (httpOnly)</td>
                <td>7 days</td>
              </tr>
              <tr>
                <td>In-memory session</td>
                <td>Access token (not stored on disk)</td>
                <td>Session duration</td>
              </tr>
            </tbody>
          </table>

          <h3>Functional cookies</h3>
          <p>Allow user preferences to be remembered, such as visual theme or language. These are optional.</p>

          <h3>Third-party cookies</h3>
          <p>When you sign in with Google, Google may set its own cookies. Please refer to Google's cookies policy for more information.</p>
          <p>On the Markets page we use <strong>TradingView</strong> widgets and data from <strong>Finnhub</strong>, <strong>Twelve Data</strong>, and <strong>CoinGecko</strong>. These services may set their own cookies.</p>
        </section>

        <section class="legal-section">
          <h2>3. Cookies we do NOT use</h2>
          <p>MarketHub <strong>does not use advertising or tracking cookies</strong> for marketing purposes. We do not perform advertising profiling of users.</p>
        </section>

        <section class="legal-section">
          <h2>4. Managing cookies</h2>
          <p>You can manage or delete cookies from your browser settings. Please note that if you block technical cookies, some features of the service may not work properly (especially sign-in).</p>
          <p>Links to the cookie settings of the most common browsers:</p>
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Mozilla Firefox</a></li>
            <li><a href="https://support.microsoft.com/microsoft-edge" target="_blank" rel="noopener">Microsoft Edge</a></li>
            <li><a href="https://support.apple.com/safari" target="_blank" rel="noopener">Safari</a></li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>5. Changes to this policy</h2>
          <p>We may update this cookies policy if we introduce new technologies or change existing ones. We recommend reviewing it periodically.</p>
        </section>
      </article>
    </div>
  `,
})
export class CookiesComponent {}
