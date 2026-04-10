import { useState, useEffect } from 'react'
import { Phone, Mail, MapPin, Clock, ChevronRight, Menu, X } from 'lucide-react'

/* Inline Instagram SVG (not available in this lucide-react version) */
function Instagram({ size = 24, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

const IG_URL = 'https://www.instagram.com/spawday_ct/'

/* ─── Image URLs (Unsplash) ─── */
const HERO_IMG =
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=900&fit=crop&q=80'

const SERVICE_IMGS = [
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=400&fit=crop&q=80',
]

const GALLERY_IMGS = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544568100-847a948585b9?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583337130417-13219ce76604?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=400&h=400&fit=crop&q=80',
]

/* ─── Data ─── */
const SERVICES = [
  {
    title: 'Bathing & Hygienic Grooming',
    desc: 'A thorough bath with premium shampoos, conditioning, and blow-dry — leaving your pet fresh, clean, and irresistibly soft.',
    img: SERVICE_IMGS[0],
  },
  {
    title: 'Full-Body Grooming',
    desc: 'Breed-specific haircuts and styling by experienced groomers who treat every pet like family.',
    img: SERVICE_IMGS[1],
  },
  {
    title: 'Ear & Eye Cleaning',
    desc: 'Gentle, careful cleaning of ears and eyes to prevent infection and keep your pet comfortable and healthy.',
    img: SERVICE_IMGS[2],
  },
  {
    title: 'Nail Trimming',
    desc: 'Stress-free nail trimming done with care — we come to your door so your pet stays relaxed at home.',
    img: SERVICE_IMGS[3],
  },
]

const PRICING = [
  { size: 'Small', weight: '25 lbs & under', short: 60, long: 70, full: 90 },
  { size: 'Medium', weight: '25–45 lbs', short: 80, long: 90, full: 110 },
  { size: 'Large', weight: '45–60 lbs', short: 100, long: 110, full: 130 },
]

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
]

/* ─────────────────────────────────────────────────────────────────────────────
   Navbar
   ───────────────────────────────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200'
          : 'bg-[#F5F4EF]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">🐾</span>
          <span className="text-xl font-black tracking-wide" style={{ color: '#6B8F71' }}>
            SPAWDAY
          </span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[#2c2c2c] hover:text-[#6B8F71] transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 text-sm font-semibold text-white bg-[#6B8F71] hover:bg-[#5a7d60] transition-colors"
            style={{ borderRadius: 24 }}
          >
            Book Now
          </a>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 text-[#2c2c2c]" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-[#2c2c2c] hover:text-[#6B8F71] py-1"
            >
              {l.label}
            </a>
          ))}
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block text-center px-5 py-2.5 text-sm font-semibold text-white bg-[#6B8F71] hover:bg-[#5a7d60] transition-colors mt-2"
            style={{ borderRadius: 24 }}
          >
            Book Now
          </a>
        </div>
      )}
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative pt-16 overflow-hidden" style={{ backgroundColor: '#F5F4EF' }}>
      {/* Decorative bubbles */}
      <div className="bubble" style={{ width: 320, height: 320, top: -60, left: -80 }} />
      <div className="bubble" style={{ width: 180, height: 180, top: 200, left: '8%' }} />
      <div className="bubble" style={{ width: 100, height: 100, bottom: 40, left: '15%' }} />
      <div
        className="bubble"
        style={{ width: 220, height: 220, top: 60, right: '35%', background: 'rgba(107,143,113,0.05)' }}
      />

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center gap-8 min-h-[calc(100vh-64px)]">
        {/* Left content */}
        <div className="relative z-10 py-16 md:py-24 fade-in-up">
          <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#6B8F71' }}>
            Mobile Pet Grooming &middot; Connecticut
          </p>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-6"
            style={{ color: '#2c2c2c', fontWeight: 900, textTransform: 'uppercase' }}
          >
            The Care
            <br />
            Your Pet
            <br />
            <span style={{ color: '#6B8F71' }}>Deserves</span>
          </h1>
          <p className="text-lg max-w-md mb-8 leading-relaxed" style={{ color: '#5a5a5a' }}>
            Connecticut's premier mobile grooming service. We bring the spa experience to your
            doorstep — so your pet stays relaxed, happy, and looking their best.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-[#6B8F71] hover:bg-[#5a7d60] transition-colors"
              style={{ borderRadius: 28 }}
            >
              Book Your Spawday <ChevronRight size={16} />
            </a>
            <a
              href="#services"
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold border-2 hover:bg-[#6B8F71] hover:text-white hover:border-[#6B8F71] transition-colors"
              style={{ borderRadius: 28, color: '#6B8F71', borderColor: '#6B8F71' }}
            >
              Our Services
            </a>
          </div>
        </div>

        {/* Right image */}
        <div className="relative z-10 flex justify-center md:justify-end">
          <div className="relative">
            <div
              className="absolute -inset-4 rounded-3xl"
              style={{ background: 'rgba(107,143,113,0.1)' }}
            />
            <img
              src={HERO_IMG}
              alt="Happy groomed dog"
              className="relative rounded-3xl object-cover w-full max-w-lg shadow-2xl"
              style={{ maxHeight: 560 }}
            />
          </div>
        </div>
      </div>

      {/* Bottom wave separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60h1440V30c-240 20-480 30-720 30S240 50 0 30v30z" fill="#f0ede6" />
        </svg>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   About
   ───────────────────────────────────────────────────────────────────────────── */
function About() {
  return (
    <section id="about" className="py-20 md:py-28" style={{ backgroundColor: '#f0ede6' }}>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: '#6B8F71' }}>
            About Us
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-6" style={{ color: '#2c2c2c' }}>
            Why Families Trust Spawday
          </h2>
          <p className="text-base leading-relaxed mb-5" style={{ color: '#5a5a5a' }}>
            At Spawday, we believe every pet deserves to feel pampered without the stress of an
            unfamiliar salon. Our fully equipped mobile grooming van arrives at your doorstep,
            providing a calm, one-on-one experience that keeps your furry family member comfortable
            from start to finish.
          </p>
          <p className="text-base leading-relaxed mb-8" style={{ color: '#5a5a5a' }}>
            We offer doorstep pickup and drop-off, premium bathing with hypoallergenic products,
            breed-specific haircuts, ear and eye cleaning, and gentle nail trimming. Our experienced
            groomers treat every pet like their own — because happy pets make happy families.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              'Doorstep Pickup & Drop-off',
              'One-on-One Attention',
              'Hypoallergenic Products',
              'Experienced Groomers',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span
                  className="mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                  style={{ backgroundColor: '#6B8F71' }}
                >
                  ✓
                </span>
                <span className="text-sm font-medium" style={{ color: '#2c2c2c' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div
            className="absolute -inset-3 rounded-2xl"
            style={{ background: 'rgba(107,143,113,0.08)' }}
          />
          <img
            src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=500&fit=crop&q=80"
            alt="Dog being groomed"
            className="relative rounded-2xl w-full object-cover shadow-lg"
            style={{ maxHeight: 440 }}
          />
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Services
   ───────────────────────────────────────────────────────────────────────────── */
function Services() {
  return (
    <section id="services" className="py-20 md:py-28" style={{ backgroundColor: '#F5F4EF' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold tracking-widest uppercase mb-3"
            style={{ color: '#6B8F71' }}
          >
            What We Offer
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: '#2c2c2c' }}>
            Our Services
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map((s) => (
            <a
              key={s.title}
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="service-card bg-white rounded-2xl overflow-hidden shadow-md cursor-pointer block"
            >
              <div className="h-48 overflow-hidden">
                <img
                  src={s.img}
                  alt={s.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold mb-2" style={{ color: '#2c2c2c' }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: '#5a5a5a' }}>
                  {s.desc}
                </p>
                <span
                  className="text-sm font-semibold inline-flex items-center gap-1"
                  style={{ color: '#6B8F71' }}
                >
                  Learn more <ChevronRight size={14} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Pricing
   ───────────────────────────────────────────────────────────────────────────── */
function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28" style={{ backgroundColor: '#f0ede6' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold tracking-widest uppercase mb-3"
            style={{ color: '#6B8F71' }}
          >
            Transparent Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: '#2c2c2c' }}>
            Our Prices
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="pricing-table w-full">
              <thead>
                <tr style={{ backgroundColor: '#6B8F71', color: '#fff' }}>
                  <th className="text-left">Size</th>
                  <th>Short Hair Bath</th>
                  <th>Long Hair Bath</th>
                  <th>Long Hair Full Grooming</th>
                </tr>
              </thead>
              <tbody>
                {PRICING.map((row) => (
                  <tr key={row.size} className="hover:bg-[#f9f8f5] transition-colors">
                    <td>
                      <span className="font-bold text-base">{row.size}</span>
                      <br />
                      <span className="text-xs" style={{ color: '#5a5a5a' }}>
                        ({row.weight})
                      </span>
                    </td>
                    <td className="font-semibold" style={{ color: '#2c2c2c' }}>
                      ${row.short}
                    </td>
                    <td className="font-semibold" style={{ color: '#2c2c2c' }}>
                      ${row.long}
                    </td>
                    <td className="font-semibold" style={{ color: '#2c2c2c' }}>
                      ${row.full}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs py-3 border-t" style={{ color: '#5a5a5a', borderColor: '#e5e2db' }}>
            *Extra fee for specific breeds
          </p>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: '#5a5a5a' }}>
          To ensure availability,{' '}
          <strong style={{ color: '#2c2c2c' }}>please book your appointment 45 days ahead of time.</strong>{' '}
          We appreciate your cooperation.
        </p>

        <div className="text-center mt-8">
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-[#6B8F71] hover:bg-[#5a7d60] transition-colors"
            style={{ borderRadius: 28 }}
          >
            Book Now <ChevronRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Instagram Feed
   ───────────────────────────────────────────────────────────────────────────── */
function GalleryFeed() {
  return (
    <section id="gallery" className="py-20 md:py-28" style={{ backgroundColor: '#F5F4EF' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold tracking-widest uppercase mb-3"
            style={{ color: '#6B8F71' }}
          >
            Follow Us
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: '#2c2c2c' }}>
            @spawday_ct
          </h2>
          <p className="text-sm" style={{ color: '#5a5a5a' }}>
            Come be part of the Spawday Family!
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {GALLERY_IMGS.map((src, i) => (
            <a
              key={i}
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="gallery-item relative aspect-square rounded-xl overflow-hidden shadow-sm group"
            >
              <img
                src={src}
                alt={`Spawday gallery photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#6B8F71]/0 group-hover:bg-[#6B8F71]/30 transition-colors duration-300 flex items-center justify-center">
                <Instagram
                  size={28}
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Contact
   ───────────────────────────────────────────────────────────────────────────── */
function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    window.open(IG_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <section id="contact" className="py-20 md:py-28" style={{ backgroundColor: '#f0ede6' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold tracking-widest uppercase mb-3"
            style={{ color: '#6B8F71' }}
          >
            Get In Touch
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: '#2c2c2c' }}>
            Contact Us
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(107,143,113,0.12)' }}
              >
                <Phone size={18} style={{ color: '#6B8F71' }} />
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: '#2c2c2c' }}>
                  Phone
                </p>
                <p className="text-sm" style={{ color: '#5a5a5a' }}>
                  (203) 555-PAWS
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(107,143,113,0.12)' }}
              >
                <Mail size={18} style={{ color: '#6B8F71' }} />
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: '#2c2c2c' }}>
                  Email
                </p>
                <p className="text-sm" style={{ color: '#5a5a5a' }}>
                  hello@spawday.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(107,143,113,0.12)' }}
              >
                <MapPin size={18} style={{ color: '#6B8F71' }} />
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: '#2c2c2c' }}>
                  Service Area
                </p>
                <p className="text-sm" style={{ color: '#5a5a5a' }}>
                  Greater Connecticut Area
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(107,143,113,0.12)' }}
              >
                <Clock size={18} style={{ color: '#6B8F71' }} />
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: '#2c2c2c' }}>
                  Hours
                </p>
                <p className="text-sm" style={{ color: '#5a5a5a' }}>
                  Mon–Sat: 8 AM – 6 PM
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(107,143,113,0.12)' }}
              >
                <Instagram size={18} style={{ color: '#6B8F71' }} />
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: '#2c2c2c' }}>
                  Instagram
                </p>
                <a
                  href={IG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#6B8F71' }}
                >
                  @spawday_ct
                </a>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#2c2c2c' }}>
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#6B8F71] focus:ring-1 focus:ring-[#6B8F71] transition-colors"
                  style={{ backgroundColor: '#fafaf8' }}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#2c2c2c' }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#6B8F71] focus:ring-1 focus:ring-[#6B8F71] transition-colors"
                  style={{ backgroundColor: '#fafaf8' }}
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#2c2c2c' }}>
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#6B8F71] focus:ring-1 focus:ring-[#6B8F71] transition-colors resize-none"
                  style={{ backgroundColor: '#fafaf8' }}
                  placeholder="Tell us about your pet..."
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#6B8F71] hover:bg-[#5a7d60] transition-colors cursor-pointer"
                style={{ borderRadius: 24 }}
              >
                Submit
              </button>
            </form>
          </div>

          {/* Google Map */}
          <div className="rounded-2xl overflow-hidden shadow-md min-h-[320px]">
            <iframe
              title="Spawday service area"
              src="https://maps.google.com/maps?q=Connecticut,+USA&t=&z=9&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 320 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Footer
   ───────────────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-8 border-t" style={{ backgroundColor: '#2c2c2c', borderColor: '#3a3a3a' }}>
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">🐾</span>
          <span className="text-lg font-black tracking-wide text-white">SPAWDAY</span>
          <span className="text-xs text-gray-400 ml-1">Mobile Grooming</span>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-xs text-gray-400">&copy; 2025 Spawday. All rights reserved.</span>
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'rgba(107,143,113,0.2)' }}
          >
            <Instagram size={18} style={{ color: '#6B8F71' }} />
          </a>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   App (root)
   ───────────────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Pricing />
      <GalleryFeed />
      <Contact />
      <Footer />
    </div>
  )
}
