import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
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

        <h1 class="legal-title">Terms and Conditions of Use</h1>
        <p class="legal-updated"><strong>Last updated:</strong> May 14, 2026</p>

        <p class="legal-intro">These terms govern the use of the MarketHub platform. By registering and using the service, you agree to comply with them in full.</p>

        <section class="legal-section">
          <h2>1. Service description</h2>
          <p>MarketHub is a web platform that combines a financial information portal with a social network. It allows users to:</p>
          <ul>
            <li>Access market data, an economic calendar, and financial news.</li>
            <li>Share analysis and opinions with other users.</li>
            <li>Participate in public and private communities.</li>
            <li>Follow other users and interact with their content.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>2. Registration and user account</h2>
          <p>To access certain features, registration is required. By creating an account:</p>
          <ul>
            <li>You guarantee that the data provided is truthful and up to date.</li>
            <li>You agree to keep your password confidential.</li>
            <li>You are responsible for all activities carried out from your account.</li>
            <li>You must be at least 14 years old.</li>
          </ul>
          <p>MarketHub reserves the right to suspend or delete accounts that violate these terms.</p>
        </section>

        <section class="legal-section">
          <h2>3. User conduct</h2>
          <p>When using MarketHub, you agree NOT to:</p>
          <ul>
            <li>Post illegal, offensive, defamatory, racist, sexual, violent, or hate-inciting content.</li>
            <li>Impersonate other people or entities.</li>
            <li>Spread false information with the intent to manipulate markets or deceive other users.</li>
            <li>Post spam, unauthorized advertising, or pyramid schemes.</li>
            <li>Attempt to access other users' accounts or breach the security of the service.</li>
            <li>Use bots, scrapers, or automated tools without authorization.</li>
            <li>Collect data from other users without their consent.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. User-generated content</h2>
          <p>The user retains ownership of the content they post, but grants MarketHub a non-exclusive, royalty-free, worldwide license to store, display, and distribute it through the service.</p>
          <p>The user is solely responsible for the content they post. MarketHub reserves the right to remove content that violates these terms or applicable law, without prior notice.</p>
        </section>

        <section class="legal-section">
          <h2>5. Communities</h2>
          <p>Administrators of private communities may set their own additional rules, provided they do not contradict these terms. Participation in a community implies acceptance of its specific rules.</p>
        </section>

        <section class="legal-section">
          <h2>6. Intellectual property</h2>
          <p>The code, design, logos, and graphic elements of MarketHub are protected by intellectual property rights. Their reproduction without authorization is prohibited.</p>
          <p>Financial data is provided by third-party providers (Finnhub, Twelve Data, CoinGecko, TradingView) and is subject to their respective terms of use.</p>
        </section>

        <section class="legal-section">
          <h2>7. Service availability</h2>
          <p>MarketHub is an academic project under development. We do not guarantee:</p>
          <ul>
            <li>Uninterrupted availability of the service.</li>
            <li>The absence of errors or vulnerabilities.</li>
            <li>The permanent preservation of posted content.</li>
          </ul>
          <p>We reserve the right to modify, suspend, or discontinue the service at any time.</p>
        </section>

        <section class="legal-section">
          <h2>8. Limitation of liability</h2>
          <p>MarketHub is not responsible for:</p>
          <ul>
            <li>Financial decisions made by users based on platform content (see the <strong>Legal Notice</strong>).</li>
            <li>Content posted by other users.</li>
            <li>Losses arising from service interruptions or technical errors.</li>
            <li>The use users make of the information obtained on the platform.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>9. Account termination</h2>
          <p>You can delete your account at any time from the settings page. Termination implies the deletion of your personal data, in accordance with the Privacy Policy.</p>
        </section>

        <section class="legal-section">
          <h2>10. Modifications</h2>
          <p>We may modify these terms at any time. Substantial changes will be notified with reasonable advance notice. Continued use of the service after a modification implies acceptance of the new terms.</p>
        </section>

        <section class="legal-section">
          <h2>11. Governing law and jurisdiction</h2>
          <p>These terms are governed by Spanish law. Any dispute will be submitted to the competent courts and tribunals according to applicable regulations.</p>
        </section>
      </article>
    </div>
  `,
})
export class TermsComponent {}
