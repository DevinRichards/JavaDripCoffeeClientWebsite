import { useState } from 'react';
import { submitContact } from '../api';
import Reveal from '../components/Reveal';

const SUBJECTS = ['General Inquiry', 'Roastery Tour', 'Partnerships', 'Media & Press', 'Catering', 'Careers'];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [honeypot, setHoneypot] = useState(''); // bot trap — must stay empty
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Silently reject if honeypot was filled (bot submission)
    if (honeypot) {
      setStatus('success');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await submitContact(form);
      setStatus('success');
      setForm({ name: '', email: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to send. Please try again.');
    }
  };

  return (
    <div className="pt-20">
      <section className="max-w-7xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-12 gap-20">
        {/* Left info */}
        <Reveal from="left" className="lg:col-span-5">
          <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">Get in Touch</span>
          <h1 className="font-headline text-5xl lg:text-6xl font-black tracking-tighter text-on-surface mb-8 leading-[0.9]">
            DIRECT LINE.
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed mb-12">
            Whether you have a question about our roasts, want to discuss a partnership, or just want to talk coffee, our team is always on.
          </p>

          <div className="space-y-8">
            {[
              { icon: 'mail', label: 'Email', content: <a href="mailto:javadripcoffee@gmail.com" className="text-lg font-bold font-headline hover:text-primary transition-colors">javadripcoffee@gmail.com</a> },
              { icon: 'call', label: 'Call', content: <a href="tel:+15054882682" className="text-lg font-bold font-headline hover:text-primary transition-colors">(505) 488-2682</a> },
              { icon: 'location_on', label: 'Location', content: <><p className="text-lg font-bold font-headline">1307 E Historic Hwy 66</p><p className="text-base font-body text-on-surface-variant">Gallup, NM 87301</p></> },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 80}>
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">{item.icon}</span>
                  </div>
                  <div>
                    <p className="font-label text-xs uppercase font-bold text-on-surface-variant mb-1">{item.label}</p>
                    {item.content}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Contact form */}
        <Reveal from="right" delay={100} className="lg:col-span-7">
          <div className="bg-surface-container-lowest p-8 lg:p-12 rounded-lg shadow-editorial">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                </div>
                <h2 className="font-headline font-black text-2xl">Transmission Received.</h2>
                <p className="text-on-surface-variant max-w-sm">
                  We read every message personally. Expect a response within 24 hours.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-primary font-label font-bold text-sm uppercase tracking-widest underline"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8" noValidate>

                {/* Honeypot — hidden from real users, bots will fill it */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
                  <label htmlFor="contact-website">Website (leave blank)</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex="-1"
                    autoComplete="off"
                    value={honeypot}
                    onChange={e => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label htmlFor="contact-name" className="font-label uppercase text-[10px] font-black tracking-widest text-on-surface-variant">
                      Full Name <span className="text-error" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      aria-required="true"
                      autoComplete="name"
                      maxLength={120}
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      className="w-full bg-surface-container-high border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded py-4 px-3 transition-all font-body text-on-surface placeholder:text-outline"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="contact-email" className="font-label uppercase text-[10px] font-black tracking-widest text-on-surface-variant">
                      Email Address <span className="text-error" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      aria-required="true"
                      autoComplete="email"
                      maxLength={160}
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@example.com"
                      className="w-full bg-surface-container-high border-none focus:ring-0 rounded py-4 px-3 transition-all font-body text-on-surface placeholder:text-outline"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-subject" className="font-label uppercase text-[10px] font-black tracking-widest text-on-surface-variant">Subject</label>
                  <select
                    id="contact-subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full bg-surface-container-high border-none focus:ring-0 rounded py-4 px-3 transition-all font-body text-on-surface"
                  >
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-message" className="font-label uppercase text-[10px] font-black tracking-widest text-on-surface-variant">
                    Message <span className="text-error" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    aria-required="true"
                    maxLength={2000}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Your message here..."
                    rows={5}
                    className="w-full bg-surface-container-high border-none focus:ring-0 rounded py-4 px-3 transition-all font-body text-on-surface placeholder:text-outline resize-none"
                  />
                </div>

                {status === 'error' && (
                  <p role="alert" className="text-error text-sm font-body">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full kinetic-gradient text-on-primary font-label font-bold py-5 rounded-lg uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">refresh</span>
                      Sending…
                    </>
                  ) : 'Send Transmission'}
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
