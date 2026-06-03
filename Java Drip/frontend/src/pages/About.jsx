import Reveal from '../components/Reveal';

const COFFEE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_uiqeZTmQjqp92BAvJBdsCAIblJZtysog2bBgVuxx7a_BItYqe38jEm10hqUnzYhzm1u2KuPqnzPCj9HR-kxzGlDIm9uNPwdByuvsVgzsU-Alc9OVWIeOv__Vg8aF777Iybz0T9s7VJAZmD4U2lGD0XQg5NM4Fa2Zb9ZEcrrfb5DMtlWM6UQthYpe7_i_IP6FFIrHD_pUixbCz3c9XJNyLJ3-X7CsuOAKcNsVfAL1jzrPW383x9uxIS-ZhB2cY37wIXVJPSqROHM';
const BARISTA_IMG = 'https://images.unsplash.com/photo-1513267048331-5611cad62e41?w=600&q=80&fit=crop';

const VALUES = [
  { icon: 'bolt', title: 'Morning Momentum', desc: 'We keep the line moving for school runs, workdays, road trips, and neighbors who know exactly what they want when they pull up.' },
  { icon: 'eco', title: 'Quality First', desc: 'Gallup deserves coffee that feels cared for. Every ingredient is chosen with intention, from espresso to syrups to the food that rounds out the stop.' },
  { icon: 'diversity_3', title: 'Gallup Proud', desc: 'Java Drip Coffee is built around the people who make Gallup feel like home: regulars, families, workers, students, travelers, and the Route 66 crowd.' },
  { icon: 'science', title: 'Made For You', desc: 'Every drink is made fresh for the person at the counter or in the pickup queue, with the small details that turn a quick stop into a familiar routine.' },
];

const TEAM = [
  { name: 'The Baristas', role: 'Craft & Service', bio: 'Our baristas know the rhythm of the shop: familiar names, favorite drinks, early commutes, and the small kindnesses that make a daily stop feel personal.' },
  { name: 'The Kitchen', role: 'Food & Prep', bio: 'The kitchen keeps the case stocked and the day moving, making sure guests can grab something fresh whether they are headed to work, class, or the road.' },
  { name: 'The Community', role: 'Our Why', bio: 'The heart of Java Drip Coffee is the Gallup community: regulars, first-timers, families, travelers, and everyone who makes the shop part of their day.' },
];

const STATS = [
  { value: '1', label: 'Location', bg: 'bg-primary-container/20' },
  { value: '7 Days', label: 'Open Weekly', bg: 'bg-secondary-container/40' },
  { value: 'Rt. 66', label: 'Gallup, NM', bg: 'bg-surface-container-high' },
  { value: '100%', label: 'Made to Order', bg: 'bg-tertiary-container/30', valueClass: 'text-on-tertiary-container' },
];

export default function About() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <Reveal from="left" className="lg:col-span-7 pr-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label uppercase tracking-widest text-xs font-bold text-primary">Est. 2024</span>
          </div>
          <h1 className="font-headline text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface mb-8">
            BREWED{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #b30065 0%, #ff6ea9 100%)' }}>
              ON
            </span>{' '}
            ROUTE 66.
          </h1>
          <p className="text-lg lg:text-xl text-on-surface-variant max-w-xl leading-relaxed mb-10">
            Java Drip Coffee is a Gallup gathering point as much as a coffee stop. Right on Historic Highway 66, we serve locals, families, workers, students, and travelers with drinks made for the rhythm of the community.
          </p>
          <button className="shadow-editorial kinetic-gradient text-on-primary font-label font-bold py-4 px-8 rounded-lg uppercase tracking-wider text-sm transition-transform hover:scale-[1.02] active:scale-95">
            Our Philosophy
          </button>
        </Reveal>

        <Reveal from="right" delay={120} className="lg:col-span-5 relative">
          <div className="aspect-[4/5] bg-surface-container-low rounded-xl overflow-hidden shadow-editorial transform rotate-2">
            <img alt="Coffee pour" className="w-full h-full object-cover" src={COFFEE_IMG} />
          </div>
          <div className="absolute -bottom-6 -left-6 aspect-square w-48 bg-surface-container-lowest p-2 rounded-lg shadow-editorial -rotate-6 hidden md:block">
            <img alt="Barista working" className="w-full h-full object-cover rounded" src={BARISTA_IMG} />
          </div>
        </Reveal>
      </section>

      {/* Values */}
      <section className="bg-surface-container-low py-24">
        <div className="max-w-7xl mx-auto px-8">
          <Reveal>
            <h2 className="font-headline text-4xl font-black tracking-tighter mb-4 text-center">WHAT WE STAND FOR</h2>
            <p className="text-center text-on-surface-variant mb-16 max-w-xl mx-auto">
              The shop is shaped by the people who come through it: regulars, neighbors, road-trippers, and the team serving them day after day.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 100}>
                <div className="bg-surface-container-lowest p-8 rounded-lg shadow-editorial group hover:-translate-y-1 transition-transform h-full">
                  <div className="w-12 h-12 bg-primary-container/20 rounded flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
                    <span className="material-symbols-outlined text-primary">{v.icon}</span>
                  </div>
                  <h3 className="font-headline font-bold text-lg mb-2">{v.title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Brand story */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <Reveal from="left">
            <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">The Story</span>
            <h2 className="font-headline text-5xl font-black tracking-tighter mb-8 leading-[0.9]">ROOTED ON ROUTE 66.</h2>
            <div className="space-y-6 text-on-surface-variant leading-relaxed">
              <p>
                Java Drip Coffee was built around a simple idea: Gallup deserves a coffee shop that feels local, welcoming, and reliable. From our spot at 1307 E Historic Highway 66, we set out to create a place people can fold into their everyday routine.
              </p>
              <p>
                Some guests are starting a workday. Some are taking kids to school. Some are passing through town and need one good stop before the next stretch of road. We want each of them to feel seen, served quickly, and welcomed back.
              </p>
              <p>
                That community rhythm is what drives the menu, the service, and the care behind each order. Every drink is made to order, but the goal is bigger than the cup: create a place Gallup can count on.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className={`${s.bg} p-8 rounded-lg text-center h-full`}>
                  <div className={`text-5xl font-black font-headline ${s.valueClass || 'text-primary'}`}>{s.value}</div>
                  <div className="text-sm font-label uppercase tracking-widest text-on-surface-variant mt-2">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-brand-charcoal py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2 className="font-headline text-4xl font-black tracking-tighter text-white mb-4">THE PEOPLE BEHIND THE COUNTER</h2>
            <p className="text-white/70 mb-16 max-w-lg">A local team serving a local rhythm: familiar faces, busy mornings, and small moments of care across the counter.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TEAM.map((member, i) => (
              <Reveal key={member.name} delay={i * 100}>
                <div className="border-t border-white/20 pt-8">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary text-2xl">person</span>
                  </div>
                  <h3 className="font-headline font-black text-xl text-white">{member.name}</h3>
                  <p className="text-primary font-label text-xs uppercase tracking-widest font-bold mt-1 mb-4">{member.role}</p>
                  <p className="text-white/70 text-sm leading-relaxed">{member.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
