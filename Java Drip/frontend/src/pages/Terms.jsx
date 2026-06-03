import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';

const LAST_UPDATED = 'April 15, 2026';

export default function Terms() {
  return (
    <div className="pt-20">
      <div className="max-w-3xl mx-auto px-8 py-24">
        <Reveal>
          <Link to="/" className="text-primary font-label font-bold text-sm uppercase tracking-widest flex items-center gap-1 mb-12 hover:gap-2 transition-all">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
          <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">Legal</span>
          <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface mb-4">Terms of Service</h1>
          <p className="text-on-surface-variant text-sm mb-16">Last updated: {LAST_UPDATED}</p>
        </Reveal>

        <div className="space-y-12 text-on-surface-variant leading-relaxed">
          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Java Drip Coffee website (javadrip.coffee) or placing an order through our online ordering
                system, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not
                use our website or services.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">2. Online Ordering</h2>
              <p className="mb-4">When you place an order through our website:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>You confirm that the information you provide is accurate and complete.</li>
                <li>Orders are subject to availability and confirmation by Java Drip Coffee.</li>
                <li>We reserve the right to refuse or cancel any order at our discretion.</li>
                <li>Prices are listed in US dollars and are subject to change without notice.</li>
                <li>Applicable sales tax will be added to your order total.</li>
              </ul>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">3. Pickup Orders</h2>
              <p>
                Online orders are available for in-store pickup only at our Gallup, NM location (1307 E Historic Highway 66). Please
                arrive within 15 minutes of your selected pickup time. Orders not picked up within 30 minutes of the scheduled time
                may be released. We are not responsible for orders that are not collected in a timely manner.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">4. Cancellations & Refunds</h2>
              <p className="mb-4">
                You may cancel an order before it enters preparation. Once your order is being prepared, cancellations are not
                guaranteed. To request a cancellation, contact us immediately at{' '}
                <a href="mailto:javadripcoffee@gmail.com" className="text-primary hover:underline">javadripcoffee@gmail.com</a> or call us.
              </p>
              <p>
                Refunds are issued at our discretion. If you receive an incorrect or unsatisfactory order, please notify us at the
                time of pickup or within 24 hours and we will make it right.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">5. Allergens & Dietary Information</h2>
              <p>
                Our menu descriptions are provided for general informational purposes. Java Drip Coffee cannot guarantee that any
                menu item is free from allergens. Our kitchen handles common allergens including milk, eggs, wheat, soy, tree nuts,
                and peanuts. If you have a severe food allergy, please contact us directly before ordering so we can advise you
                appropriately. We are not liable for allergic reactions resulting from undisclosed dietary restrictions.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">6. Intellectual Property</h2>
              <p>
                All content on this website — including text, graphics, logos, images, and software — is the property of Java Drip
                Coffee or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce,
                distribute, or create derivative works without our express written permission.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">7. Disclaimer of Warranties</h2>
              <p>
                Our website and services are provided "as is" without warranties of any kind, express or implied. We do not warrant
                that the website will be uninterrupted, error-free, or free of viruses. To the fullest extent permitted by law, we
                disclaim all warranties, including implied warranties of merchantability and fitness for a particular purpose.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, Java Drip Coffee shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages arising from your use of our website or services. Our total liability
                to you for any claim arising from these Terms shall not exceed the amount paid for the specific order giving rise to
                the claim.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">9. Third-Party Links</h2>
              <p>
                Our website may contain links to third-party services such as DoorDash. These links are provided for your convenience
                only. We have no control over the content or practices of third-party sites and accept no responsibility for them.
                Use of third-party services is subject to their respective terms and privacy policies.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">10. Governing Law</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of the State of New Mexico, without regard to
                its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the state or federal courts
                located in McKinley County, New Mexico.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">11. Changes to These Terms</h2>
              <p>
                We reserve the right to update these Terms at any time. Changes will be posted on this page with an updated "Last
                updated" date. Your continued use of our website after changes are posted constitutes your acceptance of the revised
                Terms.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface mb-4">12. Contact Us</h2>
              <p>Questions about these Terms? Reach out:</p>
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
