import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';

const LAST_UPDATED = 'April 15, 2026';

export default function Privacy() {
  return (
    <div className="pt-20">
      <div className="max-w-3xl mx-auto px-8 py-24">
        <Reveal>
          <Link to="/" className="text-primary font-label font-bold text-sm uppercase tracking-widest flex items-center gap-1 mb-12 hover:gap-2 transition-all">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
          <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">Legal</span>
          <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface mb-4">Privacy Policy</h1>
          <p className="text-on-surface-variant text-sm mb-16">Last updated: {LAST_UPDATED}</p>
        </Reveal>

        <div className="space-y-12 text-on-surface-variant leading-relaxed">
          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">1. Who We Are</h2>
              <p>
                Java Drip Coffee ("Java Drip Coffee," "we," "us," or "our") operates the website at javadrip.coffee and the online ordering
                system located at 1307 E Historic Highway 66, Gallup, NM 87301. This Privacy Policy describes how we collect, use,
                and protect information you provide when you use our website or place an order.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">2. Information We Collect</h2>
              <p className="mb-4">We collect information you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Contact information</strong> — name, email address, and phone number when you submit a contact form or place an order.</li>
                <li><strong>Order information</strong> — the items you order, pickup time, and any special instructions.</li>
                <li><strong>Communications</strong> — messages you send us via our contact form.</li>
              </ul>
              <p className="mt-4">
                We do not collect payment card data directly. Any payment processing is handled by third-party processors who maintain
                their own privacy policies.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your order status</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Send you updates about Java Drip Coffee (only if you opt in)</li>
                <li>Improve our website and services</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">4. Sharing Your Information</h2>
              <p className="mb-4">We do not sell your personal information. We may share it with:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>DoorDash</strong> — if you choose to order through DoorDash, their privacy policy applies to that transaction.</li>
                <li><strong>Service providers</strong> — trusted vendors who help us operate our website and services, bound by confidentiality agreements.</li>
                <li><strong>Legal requirements</strong> — when required by law or to protect the rights and safety of Java Drip Coffee, our customers, or the public.</li>
              </ul>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">5. Cookies & Tracking</h2>
              <p>
                Our website may use essential cookies to ensure proper functioning (e.g., maintaining sign-in sessions and site preferences). We do not
                currently use third-party advertising cookies or behavioral tracking. If this changes, we will update this policy and,
                where required, request your consent.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">6. Data Retention</h2>
              <p>
                We retain your personal information only for as long as necessary to fulfill the purposes described in this policy,
                or as required by law. Order records are retained for up to 3 years for accounting and legal compliance purposes.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">7. Your Rights</h2>
              <p className="mb-4">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of marketing communications at any time</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, please contact us at <a href="mailto:javadripcoffee@gmail.com" className="text-primary hover:underline">javadripcoffee@gmail.com</a>.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">8. Security</h2>
              <p>
                We implement reasonable technical and organizational measures to protect your information from unauthorized access,
                disclosure, or misuse. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">9. Children's Privacy</h2>
              <p>
                Our website is not directed to children under the age of 13. We do not knowingly collect personal information from
                children. If you believe we have inadvertently collected such information, please contact us immediately.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will post the revised policy on this page with an updated
                "Last updated" date. Continued use of our website after changes constitutes your acceptance of the updated policy.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">11. Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us:</p>
              <div className="mt-4 p-6 bg-surface-container-low rounded-lg">
                <p className="font-bold text-on-surface">Java Drip Coffee</p>
                <p>1307 E Historic Highway 66</p>
                <p>Gallup, NM 87301</p>
                <p className="mt-2">
                  <a href="mailto:javadripcoffee@gmail.com" className="text-primary hover:underline">javadripcoffee@gmail.com</a>
                </p>
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
