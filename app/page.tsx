"use client"
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Lenis from "lenis";
import Link from "next/link";

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);

const faqData: { question: string; answer: string }[] = [
  {
    question: "What types of input do you accept?",
    answer:
      "We accept hand-drawn sketches, rough photos, floor plan images, napkin drawings, and even a written description. If you can capture the idea, we can build from it.",
  },
  {
    question: "What do we get as a deliverable?",
    answer: "Depending on your package, you receive photorealistic interior renders, immersive 3D walkthroughs, cinematic flythrough videos, or high-resolution design images — ready for client presentations.",
  },
  {
    question: "How long does a typical project take?",
    answer:
      "Standard renders are delivered within 24–48 hours. 3D spaces and video walkthroughs typically take 3–5 business days depending on complexity.",
  },
  {
    question: "Is this service suitable for agencies and studios?",
    answer:
      "Absolutely. We work with architecture firms, interior design studios, real estate agencies, and property developers. Bulk pricing and white-label options are available.",
  },
  {
    question: "Can we request revisions?",
    answer: "Yes. Every project includes revision rounds. Our team works closely with yours until the output perfectly matches your client's vision.",
  },
  {
    question: "Do you offer white-label delivery?",
    answer: "Yes — all deliverables can be provided without our branding, ready for you to present under your studio or agency name.",
  },
];

const ChevronDownIcon: React.FC = () => (
  <svg viewBox="0 0 10 6" fill="none">
    <path d="M1 1L5 5L9 1" stroke="#31332a" strokeWidth={1.4} />
  </svg>
);

const ArrowUpRightIcon: React.FC<{ color?: string }> = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 12 12" fill="none">
    <path
      d="M2 10L10 2M10 2H4M10 2V8"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoMarkIcon: React.FC = () => (
  <Image src={'/logo.png'} alt="logo" width={40} height={40} />
);

const MenuIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M3 6H21M3 12H21M3 18H21" stroke="#15160f" strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg viewBox="0 0 12 12" fill="none">
    <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
  </svg>
);

const MailIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 6H20V18H4V6Z" stroke="currentColor" strokeWidth={1.6} />
    <path d="M4 7L12 13L20 7" stroke="currentColor" strokeWidth={1.6} />
  </svg>
);

const InstagramIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="4" stroke="white" strokeWidth={1.5} />
  </svg>
);
// moutarde , danone msous , chilli , peper , salt , hamed , m9il9a tl3sel
const TwitterIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 4L20 20M20 4L4 20" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);


const carouselSlides = [
  {
    src: "/1.webp",
    title: "Photorealistic Renders",
    description:
      "Turn rough ideas into high-resolution interior visuals ready for presentations, listings, and marketing.",
  },
  {
    src: "/2.webp",
    title: "3D Interactive Spaces",
    description:
      "Give your clients a space they can explore, navigate, and experience from every angle.",
  },
  {
    src: "/moodboard.png",
    title: "Moodboards & Concepts",
    description:
      "Transform references, materials, and inspiration into a cohesive visual direction.",
  },
  {
    src: "/firstimage.png",
    title: "Cinematic Visuals",
    description:
      "Bring your spaces to life with polished visuals designed to make an immediate impression.",
  },
  {
    src: "/fromto.png",
    title: "Sketch to Design",
    description:
      "Send us a rough sketch or floor plan and we'll turn it into a complete, polished interior.",
  },
  {
    src: "/ai-interactive.png",
    title: "AI-Powered Design",
    description:
      "Explore new design possibilities from simple images, references, and ideas.",
  },
];

const AppleCarousel: React.FC = () => {
  const total = carouselSlides.length;

  const [active, setActive] = useState(total);
  const [animate, setAnimate] = useState(true);

  const infiniteSlides = [
    ...carouselSlides,
    ...carouselSlides,
    ...carouselSlides,
  ];

  const goTo = (index: number) => {
    setAnimate(true);
    setActive(index);
  };

  const next = () => {
    setAnimate(true);
    setActive((current) => current + 1);
  };
  // ohh shit

  useEffect(() => {
    const id = setInterval(() => {
      next();
    }, 4000);

    return () => clearInterval(id);
  }, []);

  const handleTransitionEnd = () => {
    if (active >= total * 2) {
      setAnimate(false);
      setActive(total);
    }

    if (active < total) {
      setAnimate(false);
      setActive(total + (active % total));
    }
  };

  return (
    <section className="w-full overflow-hidden mt-8">

      <div className="relative w-full overflow-hidden">

        <div
          onTransitionEnd={handleTransitionEnd}
          className={`flex items-stretch gap-2.5 ${
            animate
              ? "transition-transform duration-700 ease-[cubic-bezier(.37,0,.63,1)]"
              : ""
          }`}
          style={{
            width: "max-content",

            transform: `
              translateX(
                calc(
                  50vw
                  - min(62vw, 920px) / 2
                  - ${active} * (min(62vw, 920px) + 10px)
                )
              )
            `,
          }}
        >
          {infiniteSlides.map((slide, index) => {
            const realIndex = index % total;
            const isActive = index === active;

            return (
              <button
                key={`${slide.title}-${index}`}
                type="button"
                onClick={() => {
                  setAnimate(true);
                  setActive(total + realIndex);
                }}
                aria-label={`View ${slide.title}`}
                className="relative block flex-shrink-0 overflow-hidden text-left"
                style={{
                  width: "min(62vw, 920px)",
                  height: "clamp(340px, 43vw, 600px)",

                  transform: isActive
                    ? "scale(1)"
                    : "scale(0.98)",

                  opacity: isActive ? 1 : 0.92,

                  transition:
                    "transform 0.7s cubic-bezier(.37,0,.63,1), opacity 0.7s ease",

                  cursor: "pointer",
                }}
              >
                <img
                  src={slide.src}
                  alt={slide.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />

                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.60) 25%, rgba(0,0,0,.20) 55%, rgba(0,0,0,0) 100%)",
                  }}
                />

                <div className="absolute inset-x-0 bottom-0 z-10 p-7 text-white min-[1400px]:p-10 min-[1800px]:p-12">

                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#cdec52]" />

                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 min-[1400px]:text-[12px]">
                      HomeSketches
                    </span>
                  </div>

                  <h3 className="m-0 mb-2 text-[25px] font-bold leading-[1.1] tracking-[-0.02em] min-[1400px]:text-[34px] min-[1800px]:text-[42px]">
                    {slide.title}
                  </h3>

                  <p className="m-0 max-w-[500px] text-[13px] leading-[1.55] text-white/70 min-[1400px]:text-[15px] min-[1800px]:max-w-[620px] min-[1800px]:text-[17px]">
                    {slide.description}
                  </p>

                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};

const Golfngv: React.FC = () => {

  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  const handleFaqClick = (index: number) => {
    setOpenFaqIndex((current) => (current === index ? -1 : index));
  };

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="m-0 font-[Plus_Jakarta_Sans,system-ui,sans-serif] text-[#15160f] bg-[#f5f5f7] [-webkit-font-smoothing:antialiased]">

      <header className="py-4 min-[1800px]:py-4">
        <div className="max-w-[1800px] mx-auto px-[clamp(24px,4vw,80px)] flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-lg">
            HomeSketeches
          </Link>

          <nav className="hidden md:flex items-center gap-[34px]">
            <Link href="/services" className="text-sm font-medium text-[#31332a] hover:opacity-60 transition-opacity flex items-center gap-1">
              Services 
            </Link>
            <Link href="/use-cases" className="text-sm font-medium text-[#31332a] hover:opacity-60 transition-opacity flex items-center gap-1">
              Use Cases 
            </Link>
            <Link href="/portfolio" className="text-sm font-medium text-[#31332a] hover:opacity-60 transition-opacity flex items-center gap-1">
              Portfolio
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[#31332a] hover:opacity-60 transition-opacity">Pricing</Link>
            <Link href="/contact" className="text-sm font-medium text-[#31332a] hover:opacity-60 transition-opacity">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            <a href="/signin" className="hidden sm:block text-sm font-semibold text-[#31332a] hover:opacity-60 transition-opacity">SIGN IN</a>
            <a href="/signup" className="inline-flex items-center gap-2.5 px-[22px] py-[14px] rounded-full text-sm font-semibold bg-[#15160f] text-white border border-transparent whitespace-nowrap hover:opacity-90 hover:scale-[1.02] transition-all">
            START A PROJECT
            <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 bg-[#cdec52] text-[#15160f]">
              <span className="w-[11px] h-[11px]"><ArrowUpRightIcon /></span>
            </span>
            </a>
          </div>

          <button className="md:hidden bg-transparent border-none p-1.5" aria-label="Menu">
            <span className="w-[22px] h-[22px] block"><MenuIcon /></span>
          </button>
        </div>
      </header>

      <section className="px-[clamp(24px,4vw,80px)]">
        <section className="max-w-[1800px] mx-auto ">
          <div className="relative rounded-[28px] overflow-hidden flex items-end ">

            <div className="relative z-[2] pt-[32px] md:py-[54px] w-full ">
              <span className="inline-flex items-center gap-2.5 bg-[#cdec52] text-[#15160f] px-4 py-2 rounded-full text-[13px] font-semibold mb-7" style={{ paddingLeft: '16px', paddingTop: '8px', paddingBottom: '8px', paddingRight: '8px' }}>
                Now delivering 3D walkthroughs &amp; video
                <span className="bg-white  px-3 py-[5px] rounded-full font-bold inline-flex items-center gap-1">
                  See examples →
                </span>
              </span>

              <h1 className="text-black text-[52px] leading-[1.08] font-bold m-0 mb-5 max-w-[620px] tracking-[-0.01em] max-[980px]:text-[38px] min-[1400px]:text-[72px] min-[1400px]:max-w-[820px] min-[1800px]:text-[90px] min-[1800px]:max-w-[1000px] min-[1800px]:tracking-[-0.02em]">
                Sketches &amp; Ideas,
                <br />
                Into Stunning Spaces
              </h1>
              <p className="text-[rgba(0, 0, 0, 0.85)] text-[15px] leading-[1.6] max-w-[420px] mb-8 min-[1400px]:text-[18px] min-[1400px]:max-w-[540px] min-[1800px]:text-[20px] min-[1800px]:max-w-[620px] min-[1800px]:mb-10">
                HomeSketeches.com helps businesses and designers turn rough sketches, photos, and simple ideas into photorealistic interior renders, 3D spaces, and cinematic videos.
              </p>
              <div className="flex gap-3.5">
                <a href="/contact" className="inline-flex items-center gap-2.5 px-[22px] py-[14px] rounded-full text-sm font-semibold bg-[#15160f] text-white border border-transparent whitespace-nowrap hover:opacity-90 hover:scale-[1.02] transition-all">
                  GET A QUOTE
                  <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 bg-[#cdec52] text-[#15160f]">
                    <span className="w-[11px] h-[11px]"><ArrowUpRightIcon /></span>
                  </span>
                </a>
                <a href="/portfolio" className="inline-flex items-center gap-2.5 px-[22px] py-[14px] rounded-full text-sm font-semibold bg-white text-[#15160f] border border-[rgba(255,255,255,.5)] whitespace-nowrap hover:bg-[rgba(255,255,255,0.85)] transition-colors">
                  View Portfolio
                </a>
              </div>
            </div>

            <div className="absolute z-[2] right-12  pb-12 flex flex-col gap-2.5 items-end">
              <Image src="/home.png" width={550} height={550} alt="tb" unoptimized></Image>
            </div>
          </div>
          
        </section>
      </section>
      <AppleCarousel />

      <section className="py-16 max-[980px]:py-10 min-[1400px]:py-[90px] min-[1800px]:py-[110px]">
        <FadeIn className="max-w-[1800px] mx-auto px-[clamp(24px,4vw,80px)]">
          <div className="flex gap-2 mb-10">
            <span className="px-5 py-[9px] rounded-full text-[13px] font-semibold border border-[#e6e4da] text-[#15160f] bg-[#cdec52] border-[#cdec52]">
              How It Works
            </span>
            <span className="px-5 py-[9px] rounded-full text-[13px] font-semibold border border-[#e6e4da] text-[#6b6d61]">
              Our Process
            </span>
            <span className="px-5 py-[9px] rounded-full text-[13px] font-semibold border border-[#e6e4da] text-[#6b6d61]">
              Deliverables
            </span>
          </div>

          <div className="flex justify-between gap-[60px] mb-9 flex-wrap">
            <h2 className="text-[38px] font-bold leading-[1.15] m-0 mb-3.5 tracking-[-0.01em] max-[980px]:text-[28px] min-[1400px]:text-[52px] min-[1800px]:text-[64px]">
              From Rough Sketch
              <br />
              To Stunning Reality
            </h2>
            <p className="text-[#6b6d61] text-[15px] leading-[1.7] max-w-[380px] min-[1400px]:text-[17px] min-[1400px]:max-w-[600px] min-[1800px]:text-[19px] min-[1800px]:max-w-[680px]">
              Send us your sketch, photo, or description and our team of designers and 3D artists delivers a professional result your clients will love.
            </p>
          </div>

          <div className="grid grid-cols-[1.35fr_1fr] gap-6 items-stretch max-[980px]:grid-cols-1">
            <div className="relative rounded-[18px] overflow-hidden min-h-[420px] flex items-end max-[980px]:min-h-auto min-[1400px]:min-h-[580px] min-[1800px]:min-h-[720px]">
              <img src="firstimage.png" alt="Golfer mid-swing on the fairway" className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,15,5,.7) 0%, rgba(10,15,5,0) 55%)' }} />
              <div className="relative z-[1] p-[30px] text-white min-[1800px]:p-12">
                <h3 className="text-2xl m-0 mb-2 font-bold min-[1400px]:text-[32px] min-[1800px]:text-[40px]">
                  Your Vision,
                  <br />
                  Brought to Life
                </h3>
                <p className="text-[13px] text-[rgba(255,255,255,.8)] m-0 mb-[18px] max-w-[280px] leading-[1.5] min-[1400px]:text-[15px] min-[1400px]:max-w-[360px] min-[1800px]:text-[17px] min-[1800px]:max-w-[440px]">
                  Whether it&apos;s a living room napkin sketch or an architect&apos;s floor plan, we transform your concept into a polished interior space your clients can truly feel.
                </p>
                <a href="/portfolio" className="inline-flex items-center gap-2.5 rounded-full text-sm font-semibold bg-transparent text-white border border-[rgba(255,255,255,.4)] whitespace-nowrap hover:bg-white hover:text-[#15160f] transition-all" style={{ padding: "10px 20px" }}>
                  See Our Work
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <img src="/moodboard.png" alt="Golf ball being placed on a tee" className="rounded-[18px] w-full h-[220px] object-cover min-[1400px]:h-[280px] min-[1800px]:h-[340px]" />
              <div>
                <p className="text-[15px] leading-[1.7] text-[#3a3c33] min-[1400px]:text-[17px] min-[1800px]:text-[19px]">
                  Founded in <strong className="text-[#a9c93a]">2022</strong>, HomeSketeches has delivered over{" "}
                  <strong className="text-[#a9c93a]">12,000</strong> interior renders, 3D spaces, and design videos to studios, agencies, and developers worldwide.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2.5 px-[22px] py-[14px] rounded-full text-sm font-semibold bg-[#15160f] text-white border border-transparent whitespace-nowrap hover:opacity-90 hover:scale-[1.02] transition-all w-fit">
                GET A QUOTE
                <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 bg-[#cdec52] text-[#15160f]">
                  <span className="w-[11px] h-[11px]"><ArrowUpRightIcon /></span>
                </span>
              </a>
            </div>
          </div>
        </FadeIn>
      </section>

      <section className="py-16 max-[980px]:py-10 min-[1400px]:py-[90px] min-[1800px]:py-[110px]">
        <FadeIn className="max-w-[1800px] mx-auto px-[clamp(24px,4vw,80px)]">
          <div className="text-center max-w-[560px] mx-auto mb-[46px]">
            <span className="text-[#a9c93a] font-bold text-[14px] mb-3 block text-center min-[1800px]:text-[16px]">
              Our Services
            </span>
            <h2 className="text-[38px] font-bold leading-[1.15] m-0 mb-3.5 tracking-[-0.01em] max-[980px]:text-[28px] min-[1400px]:text-[52px] min-[1800px]:text-[64px]">
              Everything Your Clients Need to See
            </h2>
            <p className="text-[#6b6d61] text-[15px] leading-[1.7] max-w-[520px] mx-auto min-[1400px]:text-[17px] min-[1400px]:max-w-[600px] min-[1800px]:text-[19px] min-[1800px]:max-w-[680px]">
              From a single hero render to a full 3D walkthrough video — we produce every format your business needs to close deals faster.
            </p>
          </div>

          <div className="grid grid-cols-3 grid-rows-[220px_220px] gap-5 mb-[60px] max-[980px]:grid-cols-2 max-[980px]:grid-rows-[180px_180px_180px] min-[1400px]:grid-rows-[280px_280px] min-[1800px]:grid-rows-[340px_340px] min-[1800px]:gap-7">
            <div className="relative rounded-[18px] overflow-hidden flex items-end row-span-2 max-[980px]:row-span-1 max-[980px]:col-span-2 max-[980px]:h-[220px]">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-[1]"
                src="/cosmos.mp4"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,15,5,.72) 0%, rgba(10,15,5,0) 60%)' }} />
              <div className="relative z-[1] p-[18px] text-white min-[1800px]:p-7">
                <h4 className="m-0 mb-1 text-[15px] font-bold min-[1400px]:text-[18px] min-[1800px]:text-[22px] min-[1800px]:mb-2">Make Shorts videos</h4>
                <p className="m-0 text-[11.5px] text-[rgba(255,255,255,.75)] leading-[1.4] max-w-[220px] min-[1400px]:text-[13px] min-[1800px]:text-[15px] min-[1800px]:max-w-[300px]">Show up on top of feed with short form videos.</p>
              </div>
            </div>

            <div className="relative rounded-[18px] overflow-hidden flex items-end">
              <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6" alt="View of the clubhouse grounds" className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,15,5,.72) 0%, rgba(10,15,5,0) 60%)' }} />
              <div className="relative z-[1] p-[18px] text-white min-[1800px]:p-7">
                <h4 className="m-0 mb-1 text-[15px] font-bold min-[1400px]:text-[18px] min-[1800px]:text-[22px] min-[1800px]:mb-2">Photorealistic Renders</h4>
                <p className="m-0 text-[11.5px] text-[rgba(255,255,255,.75)] leading-[1.4] max-w-[220px] min-[1400px]:text-[13px] min-[1800px]:text-[15px] min-[1800px]:max-w-[300px]">High-resolution still images of your interior space — perfect for proposals, listings, and social media.</p>
              </div>
            </div>

            <div className="relative rounded-[18px] overflow-hidden flex items-end">
              <img src="/ai-interactive.png" alt="Two golfers enjoying an event together" className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,15,5,.72) 0%, rgba(10,15,5,0) 60%)' }} />
              <div className="relative z-[1] p-[18px] text-white min-[1800px]:p-7">
                <h4 className="m-0 mb-1 text-[15px] font-bold min-[1400px]:text-[18px] min-[1800px]:text-[22px] min-[1800px]:mb-2">3D Interactive Spaces</h4>
                <p className="m-0 text-[11.5px] text-[rgba(255,255,255,.75)] leading-[1.4] max-w-[220px] min-[1400px]:text-[13px] min-[1800px]:text-[15px] min-[1800px]:max-w-[300px]">Fully navigable 3D environments your clients can explore and experience from any angle.</p>
              </div>
            </div>

            <div className="relative rounded-[18px] overflow-hidden flex items-end">
              <video
                src="/homewalktrough.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-[1]"
              >
                <source src="/homewalktrough.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,15,5,.72) 0%, rgba(10,15,5,0) 60%)' }} />
              <div className="relative z-[1] p-[18px] text-white min-[1800px]:p-7">
                <h4 className="m-0 mb-1 text-[15px] font-bold min-[1400px]:text-[18px] min-[1800px]:text-[22px] min-[1800px]:mb-2">Video Walkthroughs</h4>
                <p className="m-0 text-[11.5px] text-[rgba(255,255,255,.75)] leading-[1.4] max-w-[220px] min-[1400px]:text-[13px] min-[1800px]:text-[15px] min-[1800px]:max-w-[300px]">Cinematic flythrough videos that bring spaces to life — ideal for marketing campaigns and investor decks.</p>
              </div>
            </div>

            <div className="relative rounded-[18px] overflow-hidden flex items-end">
              <img src="/fromto.png" alt="Lush landscape and water features on the course" className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,15,5,.72) 0%, rgba(10,15,5,0) 60%)' }} />
              <div className="relative z-[1] p-[18px] text-white min-[1800px]:p-7">
                <h4 className="m-0 mb-1 text-[15px] font-bold min-[1400px]:text-[18px] min-[1800px]:text-[22px] min-[1800px]:mb-2">Sketch-to-Design</h4>
                <p className="m-0 text-[11.5px] text-[rgba(255,255,255,.75)] leading-[1.4] max-w-[220px] min-[1400px]:text-[13px] min-[1800px]:text-[15px] min-[1800px]:max-w-[300px]">Upload any rough sketch or hand drawing and receive a complete, polished interior design output.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.2fr_1fr] gap-[60px] items-start max-[980px]:grid-cols-1">
            <div>
              <span className="inline-block bg-[#f5f4ef] text-[#15160f] px-[14px] py-[6px] rounded-full text-[12px] font-semibold">
                About Us
              </span>
              <p className="text-[15px] leading-[1.75] text-[#3a3c33] max-w-[480px] mt-4 min-[1400px]:text-[17px] min-[1400px]:max-w-[560px] min-[1800px]:text-[19px] min-[1800px]:max-w-[640px]">
                We are a specialist B2B design studio. Our team of interior designers, 3D artists, and video producers work as an extension of your business — delivering professional-grade output at scale, fast.
              </p>
              <div className="bg-[#f5f4ef] rounded-[18px] px-6 py-[22px] mt-[18px] max-w-[480px] flex justify-between items-end gap-4 min-[1400px]:max-w-[560px] min-[1800px]:px-8 min-[1800px]:py-[30px] min-[1800px]:max-w-[640px]">
                <p className="text-[13px] text-[#6b6d61] m-0 leading-[1.6] min-[1800px]:text-[15px]">
                  Our mission is to make professional interior visualisation accessible to every agency, studio, and developer — no matter the size of the project or the team.
                </p>
                <a href="/use-cases" className="text-[13px] font-bold whitespace-nowrap text-[#15160f] border-b border-[#15160f] pb-0.5">
                  Learn More →
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 rounded-[18px] px-[22px] py-[26px] flex flex-col justify-between min-h-[170px] bg-[#f5f4ef] text-[#15160f] min-[1400px]:min-h-[200px] min-[1400px]:px-7 min-[1400px]:py-8 min-[1800px]:min-h-[240px] min-[1800px]:px-9 min-[1800px]:py-10">
                <div className="text-[40px] font-extrabold min-[1400px]:text-[52px] min-[1800px]:text-[68px]">40+</div>
                <div className="text-[12.5px] text-[#6b6d61] min-[1400px]:text-[14px] min-[1800px]:text-[16px]">Countries Served</div>
              </div>
              <div className="flex-1 rounded-[18px] px-[22px] py-[26px] flex flex-col justify-between min-h-[170px] bg-[#15160f] text-white min-[1400px]:min-h-[200px] min-[1400px]:px-7 min-[1400px]:py-8 min-[1800px]:min-h-[240px] min-[1800px]:px-9 min-[1800px]:py-10">
                <div className="text-[40px] font-extrabold min-[1400px]:text-[52px] min-[1800px]:text-[68px]">
                  <span className="text-[#cdec52]">12K</span>
                </div>
                <div className="text-[12.5px] text-[rgba(255,255,255,.6)] min-[1400px]:text-[14px] min-[1800px]:text-[16px]">Projects Delivered</div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      <section className="py-16 max-[980px]:py-10 min-[1400px]:py-[90px] min-[1800px]:py-[110px]">
        <FadeIn className="max-w-[1800px] mx-auto px-[clamp(24px,4vw,80px)] grid grid-cols-2 gap-[60px] items-center max-[980px]:grid-cols-1">
          <div>
            <h2 className="text-[38px] font-bold leading-[1.15] m-0 mb-3.5 tracking-[-0.01em] max-[980px]:text-[28px] min-[1400px]:text-[52px] min-[1800px]:text-[64px]">
              Precision Detail,
              <br />
              Every Time
            </h2>
            <p className="text-[15px] leading-[1.75] text-[#3a3c33] max-w-[420px] mb-7 min-[1400px]:text-[17px] min-[1400px]:max-w-[480px] min-[1800px]:text-[19px] min-[1800px]:max-w-[560px] min-[1800px]:mb-9">
              Whether you submit a photo of a room, a hand-drawn floor plan, or just a written brief — our designers ensure the final output is polished, accurate, and ready to impress. We handle every revision until you and your client are fully satisfied.
            </p>
            <a href="#" className="inline-flex items-center gap-2.5 px-[22px] py-[14px] rounded-full text-sm font-semibold bg-[#15160f] text-white border border-transparent whitespace-nowrap hover:opacity-90 hover:scale-[1.02] transition-all">
              START A PROJECT
              <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 bg-[#cdec52] text-[#15160f]">
                <span className="w-[11px] h-[11px]"><ArrowUpRightIcon /></span>
              </span>
            </a>
          </div>
          <div className="rounded-[28px] overflow-hidden h-[440px] min-[1400px]:h-[560px] min-[1800px]:h-[680px]">
            <img src="/moodboard.png" alt="Golfer practicing at the driving range" className="w-full h-full" />
          </div>
        </FadeIn>
      </section>

      <section className="py-16 max-[980px]:py-10 min-[1400px]:py-[90px] min-[1800px]:py-[110px]">
        <FadeIn className="max-w-[1800px] mx-auto px-[clamp(24px,4vw,80px)] grid grid-cols-2 gap-6 items-stretch max-[980px]:grid-cols-1">
          <div className="grid grid-cols-2 gap-5">
            <img src="/1.webp" alt="Golfer and coach on the fairway" className="rounded-[18px] w-full h-full min-h-[280px] object-cover min-[1400px]:min-h-[340px] min-[1800px]:min-h-[420px]" />
            <img src="/2.webp" alt="Golf ball resting on the green" className="rounded-[18px] w-full h-full min-h-[280px] object-cover min-[1400px]:min-h-[340px] min-[1800px]:min-h-[420px]" />
          </div>

          <div className="bg-[#15160f] text-white rounded-[28px] p-9 flex flex-col justify-between min-[1800px]:p-14">
            <div>
              <span className="inline-block bg-[rgba(255,255,255,.08)] px-[14px] py-[6px] rounded-full text-[12px] font-semibold text-[rgba(255,255,255,.7)] mb-[18px]">
                For Studios &amp; Agencies
              </span>
              <h3 className="text-[28px] leading-[1.2] m-0 mb-3 font-bold min-[1400px]:text-[36px] min-[1800px]:text-[44px]">
                Scale Your Output Without Scaling Your Team
              </h3>
              <p className="text-[13.5px] text-[rgba(255,255,255,.65)] leading-[1.6] max-w-[280px] m-0 mb-7 min-[1400px]:text-[15px] min-[1400px]:max-w-[340px] min-[1800px]:text-[17px] min-[1800px]:max-w-[420px]">
                Send us your client briefs and raw inputs. We handle the heavy lifting — 3D modelling, rendering, and video — so you can focus on what you do best.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center">
                <span className="w-[34px] h-[34px] rounded-full border-2 border-[#15160f] flex items-center justify-center text-[11px] font-bold text-[#15160f] bg-[#cdec52]">
                  JM
                </span>
                <span className="w-[34px] h-[34px] rounded-full border-2 border-[#15160f] flex items-center justify-center text-[11px] font-bold text-[#15160f] bg-[#e2e0d4] -ml-2.5">
                  AR
                </span>
                <span className="w-[34px] h-[34px] rounded-full border-2 border-[#15160f] flex items-center justify-center text-[11px] font-bold text-[#15160f] bg-[#cfd6c2] -ml-2.5">
                  TL
                </span>
              </div>
              <a href="#" className="inline-flex items-center gap-2.5 px-[22px] py-[14px] rounded-full text-sm font-semibold whitespace-nowrap bg-[#cdec52] text-[#15160f] border border-transparent hover:bg-[#a9c93a] transition-colors">
                START A PROJECT
                <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 bg-[#15160f] text-[#cdec52]">
                  <span className="w-[11px] h-[11px]"><ArrowUpRightIcon color="#cdec52" /></span>
                </span>
              </a>
            </div>
          </div>
        </FadeIn>
      </section>

      <section className="py-16 max-[980px]:py-10 min-[1400px]:py-[90px] min-[1800px]:py-[110px]">
        <FadeIn className="max-w-[1800px] mx-auto px-[clamp(24px,4vw,80px)]">
          <div className="text-center max-w-[460px] mx-auto mb-11">
            <h2 className="text-[38px] font-bold leading-[1.15] m-0 mb-3.5 tracking-[-0.01em] max-[980px]:text-[28px] min-[1400px]:text-[52px] min-[1800px]:text-[64px]">
              Frequently Asked Questions
            </h2>
            <p className="text-[#6b6d61] text-[15px] leading-[1.7] max-w-[520px] mx-auto min-[1400px]:text-[17px] min-[1800px]:text-[19px]">
              Everything you need to know before working with us.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-[980px]:grid-cols-1" id="faqGrid">
            {faqData.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={item.question}
                  className="border border-[#e6e4da] hover:border-[#a9c93a] transition-colors rounded-[18px] px-[22px] py-5 cursor-pointer min-[1800px]:px-8 min-[1800px]:py-7"
                  onClick={() => handleFaqClick(index)}
                >
                  <div className="flex items-center justify-between gap-4 text-[14.5px] font-semibold min-[1400px]:text-[16px] min-[1800px]:text-[18px]">
                    {item.question}
                    <span className={`faq-plus w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center border border-[#e6e4da]${isOpen ? " open" : ""}`}>
                      <span className="w-[10px] h-[10px]"><PlusIcon /></span>
                    </span>
                  </div>
                  <div className={`faq-answer text-[13.5px] text-[#6b6d61] leading-[1.6] min-[1400px]:text-[14.5px] min-[1800px]:text-[16px]${isOpen ? " open" : ""}`}>
                    {item.answer}
                  </div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </section>

      <section className="pt-0 pb-16 max-[980px]:pb-10 min-[1400px]:pb-[90px] min-[1800px]:pb-[110px]">
        <FadeIn className="bg-[#15160f] text-white rounded-[28px] mx-6 px-12 py-14 max-[980px]:mx-4 max-[980px]:px-[26px] max-[980px]:py-10 min-[1400px]:px-16 min-[1400px]:py-[72px] min-[1800px]:px-20 min-[1800px]:py-24">
          <div className="flex items-center justify-between gap-6 flex-wrap max-[980px]:flex-col max-[980px]:items-start">
            <h2 className="text-[34px] font-bold m-0 leading-[1.2] min-[1400px]:text-[48px] min-[1800px]:text-[60px]">
              Ready to transform
              <br />
              your next brief?
            </h2>
            <span className="w-[58px] h-[58px] rounded-full bg-[#cdec52] flex items-center justify-center flex-shrink-0 min-[1800px]:w-[72px] min-[1800px]:h-[72px]">
              <span className="w-[22px] h-[22px] text-[#15160f] min-[1800px]:w-[28px] min-[1800px]:h-[28px]"><MailIcon /></span>
            </span>
          </div>
        </FadeIn>
      </section>

      <footer className="bg-[#15160f] text-white px-12 pt-[26px] pb-10 min-[1400px]:px-0 min-[1400px]:pt-9 min-[1400px]:pb-14 min-[1800px]:pt-10 min-[1800px]:pb-[72px]">
        <div className="max-w-[calc(1800px-48px)] mx-auto flex items-center justify-between gap-5 flex-wrap border-t border-[rgba(255,255,255,.08)] pt-[26px]">
          <a href="#" className="flex items-center gap-2.5 font-bold min-[1800px]:text-[20px]">
            <span className="w-[30px] h-[30px] rounded-[9px] bg-[#cdec52] flex items-center justify-center">
              <LogoMarkIcon />
            </span>
            HomeSketeches
          </a>
          <div className="flex gap-[26px] text-[13px] text-[rgba(255,255,255,.65)] min-[1800px]:gap-9 min-[1800px]:text-[15px]">
            <a href="#" className="hover:text-white transition-colors">About Us</a>
            <a href="#" className="hover:text-white transition-colors">Services</a>
            <a href="#" className="hover:text-white transition-colors">Portfolio</a>
          </div>
          <div className="flex gap-2.5">
            <a href="#" aria-label="Instagram" className="w-[34px] h-[34px] rounded-full border border-[rgba(255,255,255,.15)] flex items-center justify-center hover:bg-[rgba(255,255,255,.1)] transition-colors">
              <span className="w-[14px] h-[14px]"><InstagramIcon /></span>
            </a>
            <a href="#" aria-label="Twitter" className="w-[34px] h-[34px] rounded-full border border-[rgba(255,255,255,.15)] flex items-center justify-center hover:bg-[rgba(255,255,255,.1)] transition-colors">
              <span className="w-[14px] h-[14px]"><TwitterIcon /></span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Golfngv;