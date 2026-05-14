import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-notice',
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

        <h1 class="legal-title">Legal Notice</h1>
        <p class="legal-updated"><strong>Last updated:</strong> May 14, 2026</p>

        <section class="legal-section">
          <h2>1. Nature of the project</h2>
          <p>MarketHub is an <strong>academic project</strong> of an educational nature and does not constitute a financial services company nor an entity regulated by the Spanish Securities Market Commission (CNMV) or any other supervisory body.</p>
        </section>

        <section class="legal-section">
          <h2>2. The information is NOT financial advice</h2>
          <div class="legal-callout">
            <strong>This is the most important point of this notice.</strong>
          </div>
          <p>All content available on MarketHub —including market data, news, user-published analysis, comments, charts, economic calendar, and any other information— is provided for <strong>purely informational and educational purposes</strong>.</p>
          <p>It does NOT constitute:</p>
          <ul>
            <li>Financial, investment, tax, or legal advice.</li>
            <li>A recommendation to buy, sell, or hold any financial asset.</li>
            <li>An offer or solicitation of an offer to acquire any financial product.</li>
            <li>A guaranteed prediction of market behavior.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>3. Responsibility for decisions</h2>
          <p>Investment decisions are the <strong>sole responsibility of the user</strong>. Before making any financial decision, we recommend that you:</p>
          <ul>
            <li>Consult a duly accredited <strong>professional financial advisor</strong>.</li>
            <li>Assess your personal financial situation, your goals, and your risk tolerance.</li>
            <li>Fully understand the financial products you are interested in investing in.</li>
            <li>Never invest money you cannot afford to lose.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. Risk of financial markets</h2>
          <p>Financial markets involve <strong>significant risks</strong>, including the possibility of losing all or part of the invested capital. Please bear in mind that:</p>
          <ul>
            <li>Past performance does <strong>not guarantee</strong> future results.</li>
            <li>Markets can be extremely volatile, especially crypto-assets.</li>
            <li>Currencies, stocks, derivatives, and other instruments may suffer sudden losses.</li>
            <li>Illiquid assets may be difficult to sell at the desired price.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>5. User-generated content</h2>
          <p>Analyses, opinions, and recommendations posted by users on the platform reflect the personal view of their author and <strong>have not been verified or endorsed</strong> by MarketHub.</p>
          <p>MarketHub is not responsible for:</p>
          <ul>
            <li>The accuracy, completeness, or truthfulness of content posted by users.</li>
            <li>The consequences of following advice or recommendations from other users.</li>
            <li>Possible conflicts of interest of users (for example, users recommending assets they already own).</li>
          </ul>
          <p>Market manipulation, <em>pump and dump</em> schemes, and any fraudulent practices are expressly prohibited. Such conduct may be reported and may have legal consequences.</p>
        </section>

        <section class="legal-section">
          <h2>6. Third-party data</h2>
          <p>Financial data displayed on MarketHub is provided by external providers:</p>
          <ul>
            <li><strong>Finnhub</strong> and <strong>Twelve Data</strong> for stocks, indices, and currencies.</li>
            <li><strong>CoinGecko</strong> for crypto-assets.</li>
            <li><strong>TradingView</strong> for interactive charts.</li>
            <li>Various providers for financial news.</li>
          </ul>
          <p>MarketHub does not guarantee the accuracy, timeliness, or availability of this data. There may be delays, errors, or supply interruptions.</p>
        </section>

        <section class="legal-section">
          <h2>7. Limitation of liability</h2>
          <p>Under no circumstances will MarketHub, its developers, contributors, or providers be liable for:</p>
          <ul>
            <li>Direct or indirect financial losses arising from the use of the platform.</li>
            <li>Lost profits or missed investment opportunities.</li>
            <li>Damages arising from errors, delays, or omissions in the data displayed.</li>
            <li>Decisions made based on user-generated content.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>8. Intellectual property</h2>
          <p>All the code, design, and graphic elements of MarketHub are protected by intellectual property rights. Third-party content (news, market data, widgets) is subject to the terms of their respective owners.</p>
        </section>

        <section class="legal-section">
          <h2>9. Contact</h2>
          <p>For any matter related to this legal notice, you can contact the site administrator through the channels indicated in the footer.</p>
        </section>

        <p class="legal-footer-note">By using MarketHub, you acknowledge that you have read, understood, and accepted this legal notice in its entirety.</p>
      </article>
    </div>
  `,
})
export class LegalNoticeComponent {}
