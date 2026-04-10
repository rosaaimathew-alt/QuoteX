import { useState, useEffect } from 'react'

const IG = 'https://www.instagram.com/spawday_ct/'

const SECTIONS = ['home', 'about', 'services', 'pricing', 'gallery', 'contact']

const SERVICES = [
  {
    title: 'Bathing & Grooming',
    desc: "Full bath with premium shampoo, conditioning, blow-dry, and brush-out tailored to your pet's coat type.",
    img: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&h=300&fit=crop',
  },
  {
    title: 'Doorstep Pickup & Drop-off',
    desc: 'We come to you! Convenient mobile grooming service right at your doorstep — no travel stress for your pet.',
    img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop',
  },
  {
    title: 'Ear & Eye Cleaning',
    desc: 'Gentle, thorough cleaning to keep your pet comfortable, healthy, and looking their best.',
    img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop',
  },
  {
    title: 'Nail Trimming',
    desc: 'Safe, stress-free nail trims by experienced groomers who genuinely love your pet.',
    img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=300&fit=crop',
  },
]

const PRICING = [
  { size: 'Small', weight: '25lbs and less', prices: [60, 70, 90] },
  { size: 'Medium', weight: '25-45lbs', prices: [80, 90, 110] },
  { size: 'Large', weight: '45-60lbs', prices: [100, 110, 130] },
]

const GALLERY = [
  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1583337130417-e658e0e86b81?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1477884213360-7e9d7dcc8f9b?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop',
]

/* ── Bubble decorations for hero ────────────────────────── */
function Bubbles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[
        { w: 120, t: '10%', l: '5%', o: 0.15 },
        { w: 80, t: '60%', l: '2%', o: 0.1 },
        { w: 200, t: '-5%', r: '8%', o: 0.12 },
        { w: 60, t: '30%', r: '15%', o: 0.1 },
        { w: 140, t: '70%', r: '3%', o: 0.08 },
        { w: 50, t: '45%', l: '20%', o: 0.12 },
        { w: 90, t: '80%', l: '40%', o: 0.06 },
      ].map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.w, height: b.w,
            top: b.t, left: b.l, right: b.r,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${b.o + 0.15}), rgba(255,255,255,${b.o}))`,
            border: `1px solid rgba(255,255,255,${b.o + 0.05})`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Pill button ────────────────────────────────────────── */
function Btn({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-block font-semibold text-sm px-7 py-3 transition-all duration-200 cursor-pointer'
  const styles = variant === 'primary'
    ? 'bg-[#E8A030] hover:bg-[#d08e1c] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
    : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30'
  return (
    <a
      href={IG} target="_blank" rel="noopener noreferrer"
      className={`${base} ${styles} ${className}`}
      style={{ borderRadius: 28 }}
      {...props}
    >
      {children}
    </a>
  )
}

/* ── Main component ─────────────────────────────────────── */
export default function SpawdayLanding() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    document.documentElement.style.scrollBehavior = 'smooth'
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => {
      window.removeEventListener('scroll', fn)
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  const onSubmit = (e) => { e.preventDefault(); window.open(IG, '_blank') }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#5a5a5a' }}>

      {/* ─── NAVBAR ─────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur shadow-md' : 'bg-transparent'
        }`}
        style={{ borderBottom: scrolled ? '1px solid #e5e5e5' : 'none' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => go('home')} className="flex items-center gap-2 cursor-pointer">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm"
              style={{ background: '#4AABE3' }}
            >S</div>
            <span className={`font-extrabold text-lg tracking-wide ${scrolled ? 'text-[#2c2c2c]' : 'text-white'}`}>
              SPAWDAY
            </span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {SECTIONS.map(s => (
              <button
                key={s}
                onClick={() => go(s)}
                className={`text-sm font-medium capitalize cursor-pointer transition-colors ${
                  scrolled ? 'text-[#5a5a5a] hover:text-[#4AABE3]' : 'text-white/90 hover:text-white'
                }`}
              >{s}</button>
            ))}
            <Btn>Book Now</Btn>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden flex flex-col gap-1.5 cursor-pointer ${scrolled ? 'text-[#2c2c2c]' : 'text-white'}`}
          >
            <span className={`block w-6 h-0.5 transition-all ${scrolled ? 'bg-[#2c2c2c]' : 'bg-white'}`} />
            <span className={`block w-6 h-0.5 transition-all ${scrolled ? 'bg-[#2c2c2c]' : 'bg-white'}`} />
            <span className={`block w-6 h-0.5 transition-all ${scrolled ? 'bg-[#2c2c2c]' : 'bg-white'}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            {SECTIONS.map(s => (
              <button
                key={s}
                onClick={() => go(s)}
                className="block w-full text-left px-6 py-3 text-sm font-medium text-[#5a5a5a] hover:bg-[#f0ede6] capitalize cursor-pointer"
              >{s}</button>
            ))}
            <div className="px-6 py-3">
              <Btn className="w-full text-center">Book Now</Btn>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ───────────────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-[100vh] flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4AABE3 0%, #3B9FD9 40%, #2D8BC4 100%)' }}
      >
        <Bubbles />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full grid md:grid-cols-2 gap-10 items-center pt-20 pb-16">
          {/* Left text */}
          <div>
            <p className="text-white/80 text-sm font-semibold tracking-widest uppercase mb-4">
              Mobile Pet Grooming &bull; Connecticut
            </p>
            <h1 className="text-white font-black uppercase leading-[1.05] mb-6"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 4.2rem)' }}>
              The Care Your Pet Deserves
            </h1>
            <p className="text-white/85 text-lg leading-relaxed mb-8 max-w-lg">
              Professional mobile grooming that comes to your door. Stress-free pampering for your furry family member, right at home.
            </p>
            <div className="flex flex-wrap gap-4">
              <Btn>Book Your Escape</Btn>
              <Btn variant="outline">Learn More</Btn>
            </div>
          </div>
          {/* Right image area */}
          <div className="hidden md:flex justify-center">
            <div className="relative">
              <div className="w-80 h-80 lg:w-96 lg:h-96 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop"
                  alt="Happy groomed dog"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8A030]/15 flex items-center justify-center text-xl">
                  &#9733;
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2c2c2c]">5-Star Rated</p>
                  <p className="text-xs text-[#5a5a5a]">Trusted by CT pet owners</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full">
            <path d="M0 60 C360 120 720 0 1080 60 C1260 90 1380 80 1440 60 V120 H0Z" fill="#F5F4EF"/>
          </svg>
        </div>
      </section>

      {/* ─── ABOUT ──────────────────────────────────────── */}
      <section id="about" className="py-20 lg:py-28" style={{ background: '#F5F4EF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&h=500&fit=crop"
                alt="Dog being groomed"
                className="w-full h-80 lg:h-96 object-cover"
              />
            </div>
            <div>
              <p className="text-[#4AABE3] font-semibold text-sm tracking-widest uppercase mb-3">About Us</p>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#2c2c2c] mb-6">
                Your Pet's Happiness Is Our Priority
              </h2>
              <p className="text-[#5a5a5a] leading-relaxed mb-4">
                Spawday Mobile Grooming brings professional, stress-free grooming directly to your doorstep across Connecticut. Our experienced groomers treat every pet with the love and care they deserve.
              </p>
              <p className="text-[#5a5a5a] leading-relaxed mb-8">
                From a simple bath to full grooming packages, we use premium, pet-safe products and gentle techniques to keep your furry friend looking and feeling their best — all from the comfort of your driveway.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['100+', 'Happy Pets'],
                  ['5 Star', 'Google Rating'],
                  ['CT-Based', 'Local Service'],
                  ['Mobile', 'We Come to You'],
                ].map(([num, label]) => (
                  <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-xl font-extrabold text-[#4AABE3]">{num}</p>
                    <p className="text-xs text-[#5a5a5a] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICES ───────────────────────────────────── */}
      <section id="services" className="py-20 lg:py-28" style={{ background: '#f0ede6' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-[#4AABE3] font-semibold text-sm tracking-widest uppercase mb-3">Our Services</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#2c2c2c]">
              Everything Your Pet Needs
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map(s => (
              <a
                key={s.title}
                href={IG} target="_blank" rel="noopener noreferrer"
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-48 overflow-hidden">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[#2c2c2c] mb-2">{s.title}</h3>
                  <p className="text-sm text-[#5a5a5a] leading-relaxed mb-3">{s.desc}</p>
                  <span className="text-[#4AABE3] text-sm font-semibold group-hover:underline">Learn more &rarr;</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ────────────────────────────────────── */}
      <section id="pricing" className="py-20 lg:py-28" style={{ background: '#F5F4EF' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-[#4AABE3] font-semibold text-sm tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#2c2c2c]">Our Prices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-4 px-4 text-[#2c2c2c] font-bold text-sm">Size</th>
                  {['Short Hair Bath', 'Long Hair Bath', 'Long Hair Full Grooming'].map(h => (
                    <th key={h} className="py-4 px-4 text-center">
                      <span
                        className="inline-block text-white text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{ background: '#E8A030' }}
                      >{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICING.map((row, i) => (
                  <tr key={row.size} className={i < PRICING.length - 1 ? 'border-b border-[#E8A030]/20' : ''}>
                    <td className="py-5 px-4">
                      <span className="font-bold text-[#2c2c2c] text-lg">{row.size}</span>
                      <span className="text-[#5a5a5a] text-sm ml-1">({row.weight})</span>
                    </td>
                    {row.prices.map((p, j) => (
                      <td key={j} className="py-5 px-4 text-center text-xl font-extrabold text-[#2c2c2c]">
                        ${p}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-[#5a5a5a] mt-6 italic">*Extra fee for specific breeds</p>
          <div className="text-center mt-8">
            <Btn>Book an Appointment</Btn>
          </div>
        </div>
      </section>

      {/* ─── GALLERY / INSTAGRAM ────────────────────────── */}
      <section id="gallery" className="py-20 lg:py-28" style={{ background: '#f0ede6' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-[#4AABE3] font-semibold text-sm tracking-widest uppercase mb-3">@spawday_ct</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#2c2c2c]">Follow Us on Instagram</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {GALLERY.map((src, i) => (
              <a
                key={i}
                href={IG} target="_blank" rel="noopener noreferrer"
                className="group relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <img
                  src={src} alt={`Spawday gallery ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-[#4AABE3]/0 group-hover:bg-[#4AABE3]/30 transition-colors duration-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT ────────────────────────────────────── */}
      <section id="contact" className="py-20 lg:py-28" style={{ background: '#F5F4EF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-[#4AABE3] font-semibold text-sm tracking-widest uppercase mb-3">Get in Touch</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#2c2c2c]">Contact Us</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Info */}
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#2c2c2c] mb-1">Location</h3>
                <p className="text-sm">Serving all of Connecticut</p>
              </div>
              <div>
                <h3 className="font-bold text-[#2c2c2c] mb-1">Follow Us</h3>
                <a href={IG} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4AABE3] font-semibold hover:underline">
                  @spawday_ct
                </a>
              </div>
              <div>
                <h3 className="font-bold text-[#2c2c2c] mb-1">Booking</h3>
                <p className="text-sm">Please book your appointment <strong>45 days ahead of time</strong> to ensure availability.</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#4AABE3', color: 'white' }}>
                <p className="text-sm font-semibold mb-1">Come be part of the Spawday Family!</p>
                <p className="text-xs opacity-80">Follow us on Instagram for updates, tips, and adorable transformations.</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <input
                type="text" placeholder="Your Name" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4AABE3] focus:ring-1 focus:ring-[#4AABE3]/30 transition"
              />
              <input
                type="email" placeholder="Your Email" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4AABE3] focus:ring-1 focus:ring-[#4AABE3]/30 transition"
              />
              <textarea
                placeholder="Your Message" rows={4} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4AABE3] focus:ring-1 focus:ring-[#4AABE3]/30 transition resize-none"
              />
              <button
                type="submit"
                className="w-full text-white font-semibold py-3 text-sm transition-colors cursor-pointer hover:opacity-90"
                style={{ background: '#E8A030', borderRadius: 28 }}
              >
                Send Message
              </button>
            </form>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden shadow-sm min-h-[280px]">
              <iframe
                title="Spawday Location"
                src="https://maps.google.com/maps?q=Connecticut&t=&z=8&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full min-h-[280px] border-0"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <footer className="py-8" style={{ background: '#2c2c2c' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs" style={{ background: '#4AABE3' }}>S</div>
            <span className="text-white font-extrabold tracking-wide">SPAWDAY</span>
            <span className="text-white/50 text-xs ml-1">Mobile Groomer</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={IG} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <span className="text-white/40 text-xs">&copy; 2025 Spawday Mobile Grooming. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
