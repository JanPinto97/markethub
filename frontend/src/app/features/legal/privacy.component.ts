import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
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

        <h1 class="legal-title">Privacy Policy</h1>
        <p class="legal-updated"><strong>Last updated:</strong> May 14, 2026</p>

        <p class="legal-intro">At MarketHub we respect your privacy and are committed to protecting the personal data you provide. This policy explains what information we collect, how we use it, and what rights you have over it.</p>

        <section class="legal-section">
          <h2>1. Data controller</h2>
          <p>MarketHub is an academic project. For any matter related to the processing of your data, you can contact the site administrator through the channels indicated in the footer.</p>
        </section>

        <section class="legal-section">
          <h2>2. Data we collect</h2>
          <p>We collect the following categories of personal data:</p>
          <ul>
            <li><strong>Registration data:</strong> username, email address, and password (stored in encrypted form).</li>
            <li><strong>Profile data:</strong> biography, avatar, cover image, and any other information you voluntarily add to your profile.</li>
            <li><strong>Third-party authentication data:</strong> if you sign in with Google, we receive your Google identifier and the associated email.</li>
            <li><strong>Activity data:</strong> posts, comments, votes, communities you belong to, users you follow, and interactions with other users.</li>
            <li><strong>Technical data:</strong> IP address, browser type, operating system, and access logs (necessary for service security).</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>3. Purposes of processing</h2>
          <p>We use your data to:</p>
          <ul>
            <li>Enable registration, sign-in, and the maintenance of your account.</li>
            <li>Display your public content to other users of the platform.</li>
            <li>Ensure the security of the service and prevent unauthorized access (for example, through temporary lockout after multiple failed login attempts).</li>
            <li>Personalize your experience, such as suggesting recommended communities or users.</li>
            <li>Comply with applicable legal obligations.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. Legal basis</h2>
          <p>The processing of your data is based on:</p>
          <ul>
            <li><strong>The consent</strong> you give when registering and accepting this policy.</li>
            <li><strong>The performance of the contract</strong> for use of the service.</li>
            <li><strong>The legitimate interest</strong> in ensuring the security and proper functioning of the platform.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>5. Data retention</h2>
          <p>We keep your personal data for as long as your account is active. If you delete your account, your personal data will be erased, except for data we must retain due to legal obligations or for the integrity of content shared with other users (for example, pseudonymized comments).</p>
        </section>

        <section class="legal-section">
          <h2>6. Sharing with third parties</h2>
          <p>We do not sell or transfer your data to third parties for commercial purposes. We only share data with:</p>
          <ul>
            <li><strong>Technology providers</strong> strictly necessary for the operation of the service (hosting, Google authentication, financial data providers).</li>
            <li><strong>Competent authorities</strong>, when required by law.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>7. International transfers</h2>
          <p>Some data may be processed by providers located outside the European Economic Area (for example, Google). In such cases, the appropriate safeguards provided by the GDPR apply.</p>
        </section>

        <section class="legal-section">
          <h2>8. Your rights</h2>
          <p>In accordance with the General Data Protection Regulation (GDPR), you have the right to:</p>
          <ul>
            <li><strong>Access</strong> your personal data.</li>
            <li><strong>Rectify</strong> inaccurate data.</li>
            <li><strong>Erase</strong> your data ("right to be forgotten").</li>
            <li><strong>Restrict</strong> or <strong>object</strong> to processing.</li>
            <li><strong>Data portability</strong>.</li>
            <li><strong>Withdraw consent</strong> at any time.</li>
          </ul>
          <p>You can exercise these rights by contacting us or, in the case of rectification and erasure, from your account settings page.</p>
        </section>

        <section class="legal-section">
          <h2>9. Security</h2>
          <p>We apply technical and organizational measures to protect your data, including password encryption, JWT-based authentication, and encrypted communications. However, no system is 100% infallible.</p>
        </section>

        <section class="legal-section">
          <h2>10. Minors</h2>
          <p>MarketHub is not directed at children under 14. If we detect that a minor has registered without parental consent, we will proceed to delete the account.</p>
        </section>

        <section class="legal-section">
          <h2>11. Changes to this policy</h2>
          <p>We may update this policy from time to time. We will notify you of substantial changes through the service or by email.</p>
        </section>
      </article>
    </div>
  `,
})
export class PrivacyComponent {}
