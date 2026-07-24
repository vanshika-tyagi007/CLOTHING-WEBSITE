import './style.css'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  onAuthStateChanged,
  fetchUserLooks,
  saveLookToCloud,
  deleteLookFromCloud,
  syncLocalLooksToCloud,
  bookShowroomVisit,
  fetchUserVisits,
  cancelShowroomVisit
} from './firebase.js'
import { WaterButton } from './water-button.js'
import { PixelTetris } from './pixel-tetris.js'

gsap.registerPlugin(ScrollTrigger)

// Initialize Lenis Smooth Scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
  touchMultiplier: 2,
  infinite: false,
})

// Integrate Lenis with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

gsap.ticker.lagSmoothing(0)

// Initialize Menu Overlay
function initMenuOverlay() {
  const menuOverlay = document.getElementById('menu-overlay');
  const openBtn = document.querySelector('.nav-hamburger-k72');
  const closeBtn = document.querySelector('.menu-close-k72');
  const menuLinks = document.querySelectorAll('.menu-link-item');
  const logoBtn = document.querySelector('.nav-logo-k72');
  const clockElement = document.getElementById('live-clock-time');

  const infoData = {
    "Privacy Policy": `
      <h3>Introduction</h3>
      <p>Welcome to MOD APPARELS. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, please contact our support desk.</p>
      
      <h3>Information We Collect</h3>
      <p>We collect personal information that you voluntarily provide to us when you register on our website, use our AI Stylist tool, or book showroom fitting appointments. This includes:</p>
      <ul>
        <li><strong>Name & Contact Info</strong> (Name, email address, phone number)</li>
        <li><strong>Credentials</strong> (Firebase credentials or Google authentication tokens)</li>
        <li><strong>Styling Details</strong> (Body shape details, preferred color palettes, budget targets, saved looks)</li>
      </ul>
      
      <h3>How We Use Your Info</h3>
      <p>We process your information based on legitimate business interests, showroom fitting fulfillment, and compliance with ethical standards. Specifically, we use it to:</p>
      <ul>
        <li>Schedule and manage personalized styling consultations at our Sahibabad showroom.</li>
        <li>Sync your curated lookbooks and styling choices across multiple devices.</li>
        <li>Coordinate local customer review listings.</li>
      </ul>
      
      <h3>Data Security</h3>
      <p>Your credentials and styling lists are safely stored using Firebase Cloud Services. We strictly do not sell, rent, or lease your personal information to third-party marketing services.</p>
    `,
    "Terms of Service": `
      <h3>Showroom Booking & Fittings</h3>
      <p>Showroom consultations, lehenga customizations, and bandhgala tailoring sessions booked through the AI Stylist panel are complimentary. Please arrive on time for your scheduled slot to ensure our design team can give you their undivided attention.</p>
      
      <h3>Cancellations & Adjustments</h3>
      <p>If you cannot attend a scheduled fitting, please cancel or modify your appointment through the styling booking panel at least 1 hour in advance of your visit.</p>
      
      <h3>Curated Looks & Sizing References</h3>
      <p>Styling recommendations, budget estimations, and matching codes provided by the AI Lookbook are suggestions for custom-tailoring references. Fabric availability, precise measurements, and custom pricing will be finalized in person with our shop designers at Shani Chowk Market, Sahibabad.</p>
      
      <h3>Account Usage</h3>
      <p>You are responsible for maintaining the confidentiality of your credentials and are fully responsible for all activities that occur under your synced account.</p>
    `,
    "Store Terms": `
      <h3>Showroom Booking & Fittings</h3>
      <p>Showroom consultations, lehenga customizations, and bandhgala tailoring sessions booked through the AI Stylist panel are complimentary. Please arrive on time for your scheduled slot to ensure our design team can give you their undivided attention.</p>
      
      <h3>Cancellations & Adjustments</h3>
      <p>If you cannot attend a scheduled fitting, please cancel or modify your appointment through the styling booking panel at least 1 hour in advance of your visit.</p>
      
      <h3>Curated Looks & Sizing References</h3>
      <p>Styling recommendations, budget estimations, and matching codes provided by the AI Lookbook are suggestions for custom-tailoring references. Fabric availability, precise measurements, and custom pricing will be finalized in person with our shop designers at Shani Chowk Market, Sahibabad.</p>
      
      <h3>Account Usage</h3>
      <p>You are responsible for maintaining the confidentiality of your credentials and are fully responsible for all activities that occur under your synced account.</p>
    `,
    "Ethical Statement": `
      <h3>Ethical Sourcing</h3>
      <p>At MOD APPARELS, we believe that style should never compromise values. We source all our textiles and threads from certified ethical suppliers, ensuring clean work environments and fair compensation for all weavers and tailoring staff.</p>
      
      <h3>Quality Standards</h3>
      <p>Each custom-tailored lehenga, sherwani, suit, and garment is crafted with zero-waste design patterns. We aim to reduce fabric scraps and use surplus textiles to create matching accents, borders, and accessories.</p>
      
      <h3>Community Focus</h3>
      <p>For over 20 years, MOD APPARELS has been proud to serve and support the Sahibabad community. We contribute directly to local initiatives and source skills locally, preserving the rich tailoring heritage of Uttar Pradesh.</p>
    `
  };

  const infoModal = document.getElementById('info-modal');
  const infoModalTitle = document.getElementById('info-modal-title');
  const infoModalContent = document.getElementById('info-modal-content');
  const infoModalClose = infoModal ? infoModal.querySelector('.modal-close') : null;
  const infoModalBackdrop = infoModal ? infoModal.querySelector('.modal-backdrop') : null;

  function openInfoModal(title) {
    if (infoModal && infoModalTitle && infoModalContent) {
      infoModalTitle.textContent = title;
      infoModalContent.innerHTML = infoData[title] || `<p>Content coming soon.</p>`;
      infoModal.classList.add('active');
      document.documentElement.classList.add('scroll-locked');
      document.body.classList.add('scroll-locked');
      lenis.stop();
    }
  }

  function closeInfoModal() {
    if (infoModal) {
      infoModal.classList.remove('active');
      const drawer = document.getElementById('stylist-drawer');
      const isDrawerOpen = drawer && drawer.classList.contains('active');
      if (!isDrawerOpen) {
        document.documentElement.classList.remove('scroll-locked');
        document.body.classList.remove('scroll-locked');
        lenis.start();
      }
    }
  }

  if (infoModalClose) infoModalClose.addEventListener('click', closeInfoModal);
  if (infoModalBackdrop) infoModalBackdrop.addEventListener('click', closeInfoModal);

  function openMenu() {
    if (menuOverlay) {
      // Prevent conflicts
      gsap.killTweensOf('.menu-transition-bars .bar');

      // 1. Curtain animation: Slide vertical bars down stagger-style
      gsap.timeline()
        .fromTo('.menu-transition-bars .bar',
          { scaleY: 0, transformOrigin: 'top' },
          {
            scaleY: 1,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power2.inOut'
          }
        )
        .add(() => {
          // Open menu overlay
          menuOverlay.classList.add('active');
          document.documentElement.classList.add('scroll-locked');
          document.body.classList.add('scroll-locked');
          lenis.stop();

          // Premium staggered slide-up animation for menu items
          gsap.fromTo('.menu-item-wrap',
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.08,
              ease: 'power3.out',
              delay: 0.05,
              overwrite: 'auto'
            }
          );

          // Staggered slide-down animation for header elements
          gsap.fromTo('.menu-overlay-header > *',
            { y: -30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.05,
              ease: 'power2.out',
              delay: 0.02,
              overwrite: 'auto'
            }
          );

          // Staggered slide-up animation for footer elements
          gsap.fromTo('.menu-overlay-footer > *',
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.05,
              ease: 'power2.out',
              delay: 0.02,
              overwrite: 'auto'
            }
          );
        })
        // 2. Curtain animation: Slide vertical bars down and away
        .fromTo('.menu-transition-bars .bar',
          { scaleY: 1, transformOrigin: 'bottom' },
          {
            scaleY: 0,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power2.inOut',
            delay: 0.05
          }
        );
    }
  }

  function closeMenu(callback) {
    if (menuOverlay) {
      gsap.killTweensOf(['.menu-item-wrap', '.menu-overlay-header > *', '.menu-overlay-footer > *', '.menu-transition-bars .bar']);

      // 1. Curtain animation: Slide vertical bars down stagger-style to cover screen
      gsap.timeline()
        .fromTo('.menu-transition-bars .bar',
          { scaleY: 0, transformOrigin: 'top' },
          {
            scaleY: 1,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power2.inOut'
          }
        )
        .add(() => {
          // Remove active class from menu overlay while screen is covered
          menuOverlay.classList.remove('active');
          document.documentElement.classList.remove('scroll-locked');
          document.body.classList.remove('scroll-locked');
          lenis.start();

          if (typeof callback === 'function') {
            callback();
          }
        })
        // 2. Curtain animation: Retract bars downwards to reveal homepage
        .fromTo('.menu-transition-bars .bar',
          { scaleY: 1, transformOrigin: 'bottom' },
          {
            scaleY: 0,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power2.inOut',
            delay: 0.05
          }
        )
        .add(() => {
          // Once transition finishes, ensure scroll locking is released
          const drawer = document.getElementById('stylist-drawer');
          const isDrawerOpen = drawer && drawer.classList.contains('active');
          const isModalOpen = document.querySelector('.category-modal.active');
          if (!isDrawerOpen && !isModalOpen) {
            document.documentElement.classList.remove('scroll-locked');
            document.body.classList.remove('scroll-locked');
            lenis.start();
          }
        });
    }
  }

  if (openBtn) openBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Logo scroll to top and close menu
  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      closeMenu(() => {
        lenis.scrollTo(0, {
          immediate: true
        });
      });
    });
  }

  // Handle menu links navigation to sections
  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');

      if (targetId && targetId.startsWith('#') && targetId.length > 1) {
        e.preventDefault();

        // Close menu overlay and jump to target section while screen is covered
        closeMenu(() => {
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
            lenis.scrollTo(targetEl, {
              offset: 0,
              immediate: true
            });
          }
        });
      } else {
        closeMenu();
      }
    });
  });

  // Handle policy and terms links showing a modal
  document.querySelectorAll('.policy-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      const title = link.getAttribute('data-title');
      openInfoModal(title);
    });
  });

  // Live clock in Indian Standard Time (IST)
  if (clockElement) {
    const updateClock = () => {
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.format(new Date());
      clockElement.textContent = `SAHIBABAD_ ${parts}`;
    };
    updateClock();
    setInterval(updateClock, 1000);
  }
}

// ----------------------------------------------------
// ANIMATIONS
// ----------------------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  initMenuOverlay()
  initHero()
  initStatement()
  initStickyStorytelling()
  initParallax()
  initMarquee()
  initCategoryModal()
  initChatbot()
  initStylist()
  initScrollAnimations()
  initReviews()
  initSound()
  initFAQ()

  const tetrisCanvas = document.getElementById('pixel-tetris-canvas');
  if (tetrisCanvas) {
    new PixelTetris(tetrisCanvas, {
      colors: ["#ff8300", "#FFFFFF", "#ebd0a7"]
    });
  }
})

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      // Close other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
        }
      });
      // Toggle current item
      item.classList.toggle('active');
    });
  });
}

function initSound() {
  const toggleBtn = document.getElementById('theme-sound-toggle');
  const volumeSlider = document.getElementById('volume-slider');

  if (!toggleBtn) return;

  const bgMusic = new Audio('/sounds/theme_1.mp3');
  bgMusic.loop = true;

  let initialSliderVal = volumeSlider ? parseFloat(volumeSlider.value) : 0.5;
  if (isNaN(initialSliderVal)) initialSliderVal = 0.5;
  let lastVolume = initialSliderVal > 0 ? initialSliderVal : 0.5;

  bgMusic.volume = initialSliderVal;

  const updateUI = () => {
    const soundIcon = toggleBtn.querySelector('.sound-icon');
    const isPlaying = !bgMusic.paused && bgMusic.volume > 0;

    if (isPlaying) {
      toggleBtn.classList.add('playing');
      if (soundIcon) soundIcon.textContent = '🔊';
      else toggleBtn.innerHTML = '<span class="sound-icon">🔊</span>';
    } else {
      toggleBtn.classList.remove('playing');
      if (soundIcon) soundIcon.textContent = '🔈';
      else toggleBtn.innerHTML = '<span class="sound-icon">🔈</span>';
    }
  };

  toggleBtn.addEventListener('click', () => {
    if (!bgMusic.paused && bgMusic.volume > 0) {
      lastVolume = bgMusic.volume;
      bgMusic.volume = 0;
      bgMusic.pause();
      if (volumeSlider) volumeSlider.value = 0;
    } else {
      const restoreVol = lastVolume > 0 ? lastVolume : 0.5;
      bgMusic.volume = restoreVol;
      if (volumeSlider) volumeSlider.value = restoreVol;
      bgMusic.play().catch(err => console.log('Audio play failed:', err));
    }
    updateUI();
  });

  if (volumeSlider) {
    volumeSlider.min = "0";
    volumeSlider.max = "1";
    volumeSlider.step = "0.01";

    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const clamped = Math.max(0, Math.min(1, isNaN(val) ? 0 : val));

      bgMusic.volume = clamped;

      if (clamped === 0) {
        bgMusic.pause();
      } else {
        lastVolume = clamped;
        if (bgMusic.paused) {
          bgMusic.play().catch(err => console.log('Audio play failed:', err));
        }
      }
      updateUI();
    });
  }

  const tryAutoplay = () => {
    if (bgMusic.volume > 0 && bgMusic.paused) {
      bgMusic.play().then(() => {
        updateUI();
      }).catch(e => {
        // Autoplay blocked by browser policy
      });
    }
  };

  document.addEventListener('click', tryAutoplay, { once: true });
  document.addEventListener('keydown', tryAutoplay, { once: true });
  document.addEventListener('scroll', tryAutoplay, { once: true });

  updateUI();
}

function initReviews() {
  const slider = document.querySelector('.reviews-slider');
  if (slider) {
    // Clone the review cards so the marquee animation is seamless
    const cards = Array.from(slider.children);
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      slider.appendChild(clone);
    });
  }
}

function initScrollAnimations() {
  const fadeElements = document.querySelectorAll('.fade-in-section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

  fadeElements.forEach(el => observer.observe(el));

  // Offers Section Animation
  if (window.gsap && window.ScrollTrigger) {
    gsap.from(".offer-card", {
      scrollTrigger: {
        trigger: ".offers-section",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power3.out"
    });
  }
}

function initHero() {
  const tl = gsap.timeline()

  // Entrance Animation for text (letter by letter falling from top)
  tl.fromTo(".hero-char",
    { opacity: 0, y: -100 },
    { opacity: 1, y: 0, duration: 1.5, stagger: 0.1, ease: "bounce.out" }
  )

  // Continuous "coming towards screen" scale for background elements
  gsap.to(".bg-element.el-1", {
    scale: 1.5,
    duration: 15,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  gsap.to(".bg-element.el-2", {
    scale: 1.2,
    duration: 20,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  // Scroll Parallax for the elements
  gsap.to(".bg-element.el-1", {
    yPercent: 50,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".bg-element.el-2", {
    yPercent: -30,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });
}

function initStatement() {
  gsap.fromTo(".statement-text",
    { y: "20%", opacity: 0 },
    {
      y: "0%",
      opacity: 1,
      duration: 1.5,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".statement",
        start: "top 70%",
      }
    }
  )
}

function initStickyStorytelling() {
  const panels = gsap.utils.toArray('.story-panel');
  const images = gsap.utils.toArray('.story-image-wrap');

  if (!panels.length || !images.length) return;

  // Kill existing scrolltriggers if any for storytelling to avoid duplicate bindings
  ScrollTrigger.getAll().filter(st => st.vars.trigger === ".storytelling").forEach(st => st.kill());

  // Set initial states explicitly for all panels and images
  panels.forEach((p, i) => {
    gsap.set(p, { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 50 });
  });
  images.forEach((img, i) => {
    gsap.set(img, { opacity: i === 0 ? 1 : 0, visibility: i === 0 ? 'visible' : 'hidden', scale: i === 0 ? 1 : 1.03 });
  });

  // Create timeline strictly locked to scroll position (scrub: true = ZERO automatic play delay!)
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".storytelling",
      start: "top top",
      end: "+=300%", // 3 transitions = 300vh scroll distance
      scrub: true,   // 1-to-1 scroll lock (no automatic delay/floating)
      pin: ".story-pin-container",
      anticipatePin: 1
    }
  });

  // Transition 1: Panel 1 -> 2
  tl.to(panels[0], { opacity: 0, y: -50, duration: 1 })
    .to(images[0], { opacity: 0, scale: 1.05, duration: 1 }, "<")
    .fromTo(images[1], { opacity: 0, visibility: 'visible', scale: 1.05 }, { opacity: 1, visibility: 'visible', scale: 1, duration: 1 }, "<")
    .fromTo(panels[1], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }, "<")

  // Transition 2: Panel 2 -> 3
  tl.to(panels[1], { opacity: 0, y: -50, duration: 1 })
    .to(images[1], { opacity: 0, scale: 1.05, duration: 1 }, "<")
    .fromTo(images[2], { opacity: 0, visibility: 'visible', scale: 1.05 }, { opacity: 1, visibility: 'visible', scale: 1, duration: 1 }, "<")
    .fromTo(panels[2], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }, "<")

  // Transition 3: Panel 3 -> 4
  tl.to(panels[2], { opacity: 0, y: -50, duration: 1 })
    .to(images[2], { opacity: 0, scale: 1.05, duration: 1 }, "<")
    .fromTo(images[3], { opacity: 0, visibility: 'visible', scale: 1.05 }, { opacity: 1, visibility: 'visible', scale: 1, duration: 1 }, "<")
    .fromTo(panels[3], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }, "<");

  // Refresh ScrollTrigger after DOM load
  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 250);
}

function initParallax() {
  gsap.to(".gallery-image-wrapper", {
    yPercent: 20,
    ease: "none",
    scrollTrigger: {
      trigger: ".gallery-break",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  })
}

function initMarquee() {
  gsap.to(".marquee-inner", {
    xPercent: -50,
    ease: "none",
    duration: 30,
    repeat: -1
  })
}

const defaultCategoryData = {
  "Men's Wear": [
    {
      name: "Modern White Sherwani",
      image: "/mens_wear.png",
      desc: "Expertly crafted for the modern man, this modern white sherwani, designed with high-quality fabrics to provide an exceptional fit and unparalleled style for any occasion.",
      price: 4082,
      sizes: ["S", "M", "L", "XL"],
      colors: ["White"],
      occasions: ["Casual", "Office", "Party", "Festive"]
    },
    {
      name: "Modern Maroon Casual T-shirt",
      image: "/mens-pic3a.jpg",
      desc: "Step out in style with this modern maroon casual t-shirt, designed with high-quality fabrics to provide an exceptional fit and unparalleled style for any occasion.",
      price: 8734,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Maroon"],
      occasions: ["Casual", "Office", "Party", "Festive"]
    },
    {
      name: "Modern Burgundy Winter Coat",
      image: "/men_winter_jacket.png",
      desc: "Experience ultimate comfort and fashion with our modern burgundy winter coat, designed with high-quality fabrics to provide an exceptional fit and unparalleled style for any occasion.",
      price: 12013,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Burgundy"],
    },
    {
      name: "Contemporary Style Suit",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaSb9P83PjHTR-FAYCFFU2jPNz4S8ngVDvUEXQRqfU_w&s=10",
      desc: "A contemporary suit blending timeless tailoring with a modern silhouette.",
      price: 6499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Navy", "Charcoal"],
      occasions: ["Formal", "Wedding"]
    },
    {
      name: "Classic Plaid Blazer",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAQXJv8zGvLNPSTqI5A-GSvkhY2jDg2ycCD_1ikAnu_w&s=10",
      desc: "Step up your style with this classic plaid blazer, a perfect layering piece for any season.",
      price: 4999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Plaid", "Grey"],
      occasions: ["Office", "Smart Casual"]
    },
    {
      name: "Premium Denim Jacket",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyOSejOwmCnde9T_kn16JW8X22R3tZ2CGYOmLJGPAWrw&s=10",
      desc: "A premium denim jacket that adds an edgy and stylish touch to your casual outfits.",
      price: 2999,
      sizes: ["S", "M", "L"],
      colors: ["Blue Denim"],
      occasions: ["Casual", "Party"]
    },
    {
      name: "Elegant Solid Shirt",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_UVCmljvlEl8ae8sKwT2Y2a9ptBJxCncTjXMa-coqsg&s=10",
      desc: "An elegantly tailored solid shirt crafted for supreme comfort and office-ready sophistication.",
      price: 1999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Light Blue"],
      occasions: ["Office", "Formal"]
    },
    {
      name: "Smart Casual Chinos",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-2Jx9SJVCA0jYLgoGJPG-pp5vPO0f_wMvkYM_5ByT5Q&s=10",
      desc: "Versatile smart casual chinos designed to offer both stretch and structure for everyday wear.",
      price: 2499,
      sizes: ["30", "32", "34", "36"],
      colors: ["Khaki", "Navy"],
      occasions: ["Casual", "Office"]
    },
    {
      name: "Modern Urban Hoodie",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4u_OCuQpujTiwxYzIs5uoaeL2SKIpR1RAzzzU220wVA&s=10",
      desc: "Stay warm and trendy with this modern urban hoodie, perfect for relaxed weekends.",
      price: 2299,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Grey"],
      occasions: ["Casual", "Lounge"]
    },
    {
      name: "Classic Oxford Shirt",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQvSsxRG7RXghCKALOZXJ4zelBoHPUgiovZqPpu_-TPQ&s",
      desc: "A timeless classic Oxford shirt that transitions effortlessly from desk to dinner.",
      price: 2199,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Blue", "White"],
      occasions: ["Office", "Smart Casual"]
    },
    {
      name: "Festive Embroidered Kurta",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6YN8-FsxS7VQB7zs_0yatYqK0cHsfZ3tRYwgdzo2bqA&s",
      desc: "A festive embroidered Kurta that brings traditional elegance to your celebratory wardrobe.",
      price: 3499,
      sizes: ["M", "L", "XL"],
      colors: ["Maroon", "Gold"],
      occasions: ["Festive", "Wedding"]
    },
    {
      name: "Vibrant Summer T-Shirt",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEd-LLm_-LLmu0t2ygfuAqt1xPSDx087z_hsWolHWNbA&s",
      desc: "A vibrant and breathable summer T-shirt featuring a tailored fit for everyday comfort.",
      price: 999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Yellow", "White"],
      occasions: ["Casual", "Vacation"]
    },
    {
      name: "Sophisticated Overcoat",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXK-58rGD5T83gHlrTxJ_X4_Nhiq8ov04Zl9f02NeAcA&s=10",
      desc: "Elevate your winter style with this sophisticated overcoat crafted from premium wool blend.",
      price: 7999,
      sizes: ["M", "L", "XL"],
      colors: ["Camel", "Charcoal"],
      occasions: ["Formal", "Winter wear"]
    },
    {
      name: "Tailored Dress Pants",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFa4qGARydy43HVbAzgpTUF8m8hGWKM-gFQt-L4_UQmA&s=10",
      desc: "Expertly tailored dress pants that offer a sharp crease and a sleek profile.",
      price: 2799,
      sizes: ["30", "32", "34", "36"],
      colors: ["Black", "Navy"],
      occasions: ["Office", "Formal"]
    },
    {
      name: "Casual Printed Shirt",
      image: "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?q=80&w=600&auto=format&fit=crop",
      desc: "A fun and breezy casual printed shirt, ideal for weekend getaways and beach vacations.",
      price: 1899,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Printed", "Multicolor"],
      occasions: ["Casual", "Vacation"]
    },
    {
      name: "Premium Velvet Blazer",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRHNNNAuUpvmnlqYCQbFImWJevsesEUj2Yk4cWdg8P_bw&s=10",
      desc: "Make a statement at any evening event with this luxurious premium velvet blazer.",
      price: 6599,
      sizes: ["M", "L", "XL"],
      colors: ["Burgundy", "Black"],
      occasions: ["Party", "Wedding"]
    },
    {
      name: "Classic Polo T-Shirt",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYJI21UmrRor7_ASfmVXgNpRdplDMA4c_dIaBrlpwAeA&s",
      desc: "A wardrobe staple, this classic polo t-shirt provides a sharp yet relaxed aesthetic.",
      price: 1299,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Navy", "White"],
      occasions: ["Casual", "Smart Casual"]
    },
    {
      name: "Traditional Bandhgala Suit",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjHw3OMJpZnpsK0OWOuG2nxogqRlZl-DbgcTMhrr7crg&s",
      desc: "A traditional Bandhgala suit tailored to perfection for an authoritative and regal look.",
      price: 8999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Navy"],
      occasions: ["Wedding", "Formal"]
    },
    {
      name: "Streetwear Cargo Pants",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-r-zoAamM5cfT5vvbWgbmj3MgceJbna_CHVecMdhozQ&s=10",
      desc: "Durable and stylish streetwear cargo pants equipped with utility pockets.",
      price: 2599,
      sizes: ["30", "32", "34", "36"],
      colors: ["Olive", "Khaki"],
      occasions: ["Casual", "Streetwear"]
    },
    {
      name: "Comfort Fit Sweatpants",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkh2uS0Os7_-udOanqcmh6Lp8wS_raEESDfCuv8XaQNg&s=10",
      desc: "Ultimate comfort fit sweatpants designed for lounging, gym sessions, or casual outings.",
      price: 1799,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Grey", "Black"],
      occasions: ["Lounge", "Gym"]
    },
    {
      name: "Designer Graphic T-Shirt",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVs6MRhTVPrEiQlaBveYcCEE7qqQ4FKup8qmeWOexpIQ&s=10",
      desc: "A trendy designer graphic t-shirt to elevate your everyday casual attire.",
      price: 1499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Black"],
      occasions: ["Casual", "Party"]
    },
    {
      name: "Linen Blend Shorts",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBN2qSl0wSD-rAht_njLATe3uFIxbdtD4hGaXI3vtD-Q&s=10",
      desc: "Beat the heat in these breathable linen blend shorts with a tailored finish.",
      price: 1599,
      sizes: ["30", "32", "34"],
      colors: ["Beige", "Light Blue"],
      occasions: ["Vacation", "Casual"]
    },
    {
      name: "Regal Wedding Sherwani",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5yydQl3zFYKfMhn6Xu4aDZ1ACHVuj9D2AD7ZE6XiAUQ&s=10",
      desc: "A regal wedding Sherwani embellished with delicate traditional patterns.",
      price: 14999,
      sizes: ["M", "L", "XL"],
      colors: ["Ivory", "Gold"],
      occasions: ["Wedding", "Festive"]
    },
    {
      name: "Sleek Turtleneck Sweater",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRerM1NZw5E9fJownu--xmaLGzo_h-jcE47nkLuvy1mcA&s",
      desc: "A sleek turtleneck sweater providing a minimalist and highly sophisticated profile.",
      price: 2499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Maroon"],
      occasions: ["Smart Casual", "Winter wear"]
    },
    {
      name: "Versatile Puffer Jacket",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThN9IOIWFUPJr41gp6UkF-nT5kPOAyMaWVFJaHQ0fT0g&s=10",
      desc: "A versatile and lightweight puffer jacket that offers supreme warmth without the bulk.",
      price: 3999,
      sizes: ["M", "L", "XL"],
      colors: ["Navy", "Olive"],
      occasions: ["Casual", "Winter wear"]
    },
    {
      name: "Chic Linen Trousers",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRse2sMatsvTlFlEso-TC_eLycBGdef9Xdu00J0IDhk0Q&s=10",
      desc: "Chic linen trousers offering a relaxed fit, perfect for summer days and resort wear.",
      price: 2299,
      sizes: ["30", "32", "34", "36"],
      colors: ["White", "Beige"],
      occasions: ["Vacation", "Casual"]
    },
    {
      name: "Signature Waistcoat",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1OxBNDoHWvSNYlTqo3TNmXxoNXRLVy1YP5AoatJci7A&s=10",
      desc: "Complete your formal ensemble with this signature waistcoat tailored for a flattering fit.",
      price: 3299,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Grey", "Navy"],
      occasions: ["Formal", "Wedding"]
    }
  ],
  "Women's Wear": [
    {
      name: "Classic Tailored Shirt & Trousers",
      image: "/women-1.jpg",
      desc: "A crisp, white long-sleeve button-up paired with high-waisted beige trousers for a sharp, sophisticated office look.",
      price: 3499,
      sizes: ["XS", "S", "M", "L"],
      colors: ["White", "Beige"],
      occasions: ["Office", "Family Function"],
      bodyShapes: ["Hourglass", "Rectangle", "Apple"]
    },
    {
      name: "Tropical Cutout Maxi Dress",
      image: "/women-2.jpeg",
      desc: "A vibrant olive and yellow patterned sleeveless maxi dress featuring elegant side cutouts for a breezy summer aesthetic.",
      price: 4299,
      sizes: ["S", "M", "L"],
      colors: ["Olive", "Yellow", "Green"],
      occasions: ["Vacation", "Party", "Date Night"],
      bodyShapes: ["Hourglass", "Rectangle", "Pear", "Inverted Triangle"]
    },
    {
      name: "Forest Floral Co-ord Set",
      image: "/women-3.jpeg",
      desc: "A chic dark green co-ord set adorned with delicate floral patterns, featuring a long tunic shirt and matching trousers.",
      price: 3899,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Green", "Dark Green"],
      occasions: ["Casual", "Family Function", "Vacation"],
      bodyShapes: ["Apple", "Pear", "Hourglass"]
    },
    {
      name: "Essential Crop Top & Denim",
      image: "/women-4.jpg",
      desc: "A clean, modern casual pairing featuring a fitted black crewneck crop top and classic high-waisted blue denim jeans.",
      price: 2499,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Black", "Blue"],
      occasions: ["Casual", "College", "Date Night"],
      bodyShapes: ["Hourglass", "Pear", "Inverted Triangle"]
    },
    {
      name: "Good Times Crop Tee & Leggings",
      image: "/women-5.jpg",
      desc: "A comfortable pastel pink graphic crop tee styled with dark brown leggings, designed for stylish daily leisure.",
      price: 1999,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Pink", "Brown"],
      occasions: ["Casual", "College", "Vacation"],
      bodyShapes: ["Hourglass", "Rectangle"]
    },
    {
      name: "Off-the-Shoulder Linen Set",
      image: "/women-6.jpeg",
      desc: "A premium light olive-beige linen co-ord set featuring a relaxed off-the-shoulder top and matching tailored trousers.",
      price: 4599,
      sizes: ["S", "M", "L"],
      colors: ["Beige", "Olive"],
      occasions: ["Vacation", "Date Night", "Casual"],
      bodyShapes: ["Pear", "Hourglass", "Inverted Triangle"]
    },
    {
      name: "Navy Empire Maxi Dress",
      image: "/women_empire_dress.png",
      desc: "A beautiful empire-waist flowy maxi dress in navy blue color for women, perfect for formal occasions and date nights.",
      price: 5999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Navy", "Blue"],
      occasions: ["Date Night", "Party", "Formal"],
      bodyShapes: ["Apple", "Hourglass", "Rectangle"]
    },
    {
      name: "Chic Yellow Midi Dress",
      image: "/women_casual_belted.png",
      desc: "A chic women's casual summer midi dress in light yellow with a defined brown waist belt.",
      price: 3499,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Yellow", "Brown"],
      occasions: ["Casual", "Vacation", "Date Night"],
      bodyShapes: ["Rectangle", "Hourglass"]
    },
    {
      name: "Classic Casual Outfit",
      image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRXbnZm-SgeXc7H0jM6LvbFJv--G8_TuKt234Un-OSCApjsiOa8qAyjvpH7mOquGV1Isrn-89EwRKxvojwrYqkBzqBT5e8t2V89l-euism3RJOHFZlBcpMo",
      desc: "A timeless casual look with a premium quality finish, perfect for your everyday style.",
      price: 2499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Blue", "White"],
      occasions: ["Casual", "Day Out"],
      bodyShapes: ["Hourglass", "Pear", "Rectangle"]
    },
    {
      name: "Elegant Evening Wear",
      image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSlfpPNHH_I2A_xi7tewtp8DFX5C9n8dZqkd3mC2Z_5wRZWSjlJDbPnzgkCOJdDdPIw8MznQDeivNsX_b4F3JwFrWwAh40eb229c79PFV2CiAOdg1uf2EF4",
      desc: "Step into the night with this elegant and sophisticated evening ensemble.",
      price: 4999,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Black", "Silver"],
      occasions: ["Party", "Date Night", "Formal"],
      bodyShapes: ["Hourglass", "Apple"]
    },
    {
      name: "Chic English Blue Midi Dress",
      image: "https://littleboxindia.com/cdn/shop/files/Chic_Back_Bow_Tiered_Midi_Dress_In_English_Blue_720x.webp?v=1754570221",
      desc: "A chic tiered midi dress in English blue with a beautiful back bow detail for an elegant touch.",
      price: 3299,
      sizes: ["S", "M", "L"],
      colors: ["Blue"],
      occasions: ["Casual", "Vacation", "Party"],
      bodyShapes: ["Pear", "Rectangle", "Hourglass"]
    },
    {
      name: "Gemma Tweed Two-Piece Set",
      image: "https://www.missmosa.in/cdn/shop/files/Gemma_Tweed_2_Pc_Set_1.jpg?v=1782306907&width=450",
      desc: "A luxurious tweed two-piece set combining classic texture with modern elegance.",
      price: 5499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Grey", "White"],
      occasions: ["Office", "Formal", "Party"],
      bodyShapes: ["Hourglass", "Inverted Triangle"]
    },
    {
      name: "Contemporary Style Dress",
      image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTT8A7CmxpUNVBktUaQ5ecPvm7v3qkSQVg1xatWbBG85RJFVgGJk3UZmLqjAxh2mgJ0MfuS6McyodoFzZRdMfLCZ5yAcY6C-zyDyeZWMm3xNp-_HGUOJYUVmA",
      desc: "A contemporary design combining comfort and high fashion for the modern woman.",
      price: 2999,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Pink", "Beige"],
      occasions: ["Casual", "Date Night"],
      bodyShapes: ["Rectangle", "Apple"]
    },
    {
      name: "Designer Floral Ensemble",
      image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQiEZc0Mk_RrRHX4NkA9MnyI2TiCwRocZT2-c-gkFz80_bo0sBeE0ej3M-2jzxTk2xNRKk21JhCAKL5JI65TxoNFJMs9eFPw2CABtQyk3w",
      desc: "Embrace the season with this stunning designer floral outfit, crafted for ultimate grace.",
      price: 4299,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Floral", "Green", "Pink"],
      occasions: ["Wedding", "Festive", "Party"],
      bodyShapes: ["Hourglass", "Pear"]
    },
    {
      name: "Urban Chic Dress",
      image: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRC1WQHXyeJJtxt0d06EvsKBGlQFHhPrVRf25H4ZjmgAXEOOPCYdv-Qz-Vy3JHrZrEm9_kRjr969-M9GxzxwgBj6Dp7ALcx731p8qycM-tr",
      desc: "Stand out in the city with this chic and comfortable urban-inspired dress.",
      price: 3799,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Red", "Black"],
      occasions: ["Casual", "Party"],
      bodyShapes: ["Rectangle", "Hourglass"]
    },
    {
      name: "Sophisticated Statement Look",
      image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSAzk5Ouj-pGCYBuh6tIFyxPkkAWSEwkH7puS8CLHStmxHpJVjEE2XGKwnHg9AEV10v6InemmBktqebtidRtccVELUb7zUR0Sh6-QjVDbYAAIYHRl2etyWU",
      desc: "Make a bold statement with this sophisticated and masterfully tailored outfit.",
      price: 6499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Gold"],
      occasions: ["Formal", "Wedding"],
      bodyShapes: ["Hourglass", "Pear", "Apple"]
    },
    {
      name: "Effortless Elegance Dress",
      image: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcR6k3XgJmoBi6RIX4m_TTFJV61yPIkOFL5_JzYUYR60q3z0Ua0-RiTZ7w7ZPX_1GluGP08gNlSL3N0fbih0M_K1PUB0QEEoiw",
      desc: "Achieve effortless elegance with this flawlessly draped and exceptionally soft dress.",
      price: 3999,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Maroon", "Wine"],
      occasions: ["Date Night", "Party"],
      bodyShapes: ["Hourglass", "Rectangle"]
    },
    {
      name: "Modern Minimalist Outfit",
      image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSxX6WZ3y_rX386rJhRBhL574d0q51OP2G5fTOt6K9PeCElr-RcRg-QTJR4lYj0h9JwzMxMzoaeBs9UxmFXaF9OkN9euoxBkeX7_rUPZwoLqIPp7VICuyad",
      desc: "A modern minimalist design highlighting clean lines and a premium silhouette.",
      price: 2899,
      sizes: ["S", "M", "L"],
      colors: ["Grey", "Black"],
      occasions: ["Office", "Casual"],
      bodyShapes: ["Rectangle", "Inverted Triangle"]
    },
    {
      name: "Vibrant Summer Attire",
      image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTlCiRi62Qh5xcOZvhrdFXXnSNRjVgu7f-gby3pjVrRVgKGGogNvQgT29DYoMwfpSz7TW8kK2wmUcSYORGZAosW7lHA1LYDGFp2KtGAWbufPxysS9Zcwnm9VA",
      desc: "Bring vibrance to your wardrobe with this bright and airy summer essential.",
      price: 2499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Yellow", "Orange"],
      occasions: ["Vacation", "Casual"],
      bodyShapes: ["Apple", "Hourglass"]
    },
    {
      name: "Premium Crafted Gown",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjlWUV70xIWyuzzkY59kqfk35hGCzUniZfjT35nTQG5Q&s=10",
      desc: "A premium crafted gown tailored to perfection for your most special occasions.",
      price: 8999,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Navy", "Silver"],
      occasions: ["Wedding", "Formal"],
      bodyShapes: ["Hourglass", "Pear"]
    },
    {
      name: "Signature Collection Dress",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSN3Se15ItJRipitcBRpN3LU6U59ksecxRbiORiJPpUUw&s=10",
      desc: "Part of our signature collection, featuring exquisite details and a flattering fit.",
      price: 5299,
      sizes: ["S", "M", "L"],
      colors: ["Emerald", "Green"],
      occasions: ["Party", "Festive"],
      bodyShapes: ["Rectangle", "Hourglass"]
    },
    {
      name: "Classic Monochrome Set",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0U3XZbBnEi4H_dbtrGHwhDhgaLU5hMsJ5bqhxP8we9w&s=10",
      desc: "A beautiful monochrome set offering a timeless and versatile styling option.",
      price: 3499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "White"],
      occasions: ["Casual", "Office"],
      bodyShapes: ["Apple", "Inverted Triangle"]
    },
    {
      name: "Indian Casual Cotton Kurti",
      image: "/kurti_1_1784483069935.png",
      desc: "A beautiful and comfortable Indian casual cotton kurti with floral prints, perfect for daily wear.",
      price: 1599,
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Floral"],
      occasions: ["Casual", "Office"],
      bodyShapes: ["Pear", "Rectangle"]
    },
    {
      name: "Red & Gold Bridal Lehenga",
      image: "/lehenga_1_1784483084576.png",
      desc: "A stunning red and gold bridal lehenga, meticulously crafted with premium embroidery for your special day.",
      price: 18999,
      sizes: ["S", "M", "L"],
      colors: ["Red", "Gold"],
      occasions: ["Wedding", "Festive"],
      bodyShapes: ["Hourglass", "Pear"]
    },
    {
      name: "Pastel Pink Designer Lehenga",
      image: "/lehenga_2_1784483101778.png",
      desc: "A soft pastel pink designer lehenga featuring intricate silver embroidery for a highly elegant look.",
      price: 14599,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Pink", "Silver"],
      occasions: ["Wedding", "Party"],
      bodyShapes: ["Hourglass", "Rectangle"]
    },
    {
      name: "Western Summer Floral Midi",
      image: "/western_1_1784483117722.png",
      desc: "A chic western summer floral midi dress, perfect for outdoor events, brunches, and day parties.",
      price: 2799,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Floral", "White"],
      occasions: ["Casual", "Vacation"],
      bodyShapes: ["Apple", "Rectangle"]
    },
    {
      name: "Emerald Green Evening Gown",
      image: "/western_2_1784483132699.png",
      desc: "An elegant emerald green evening gown that brings a sophisticated western flair to formal occasions.",
      price: 8499,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Green", "Emerald"],
      occasions: ["Formal", "Party"],
      bodyShapes: ["Hourglass", "Inverted Triangle"]
    },
    {
      name: "Indo-Western Fusion Set",
      image: "/indo_western_1_1784483155642.png",
      desc: "A beautiful Indo-western fusion co-ord set, combining traditional motifs with modern silhouettes.",
      price: 4599,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor"],
      occasions: ["Party", "Casual", "Festive"],
      bodyShapes: ["Rectangle", "Hourglass"]
    },
    {
      name: "Yellow Indian Anarkali Suit",
      image: "/anarkali_1_1784483168929.png",
      desc: "A vibrant yellow and white Anarkali suit designed for comfort and casual ethnic style.",
      price: 3299,
      sizes: ["S", "M", "L", "XXL"],
      colors: ["Yellow", "White"],
      occasions: ["Festive", "Casual"],
      bodyShapes: ["Pear", "Apple"]
    },
    {
      name: "Modern Black Cocktail Dress",
      image: "/western_3_1784483180680.png",
      desc: "A sleek and elegant modern western cocktail dress in black, a true wardrobe essential.",
      price: 4999,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Black"],
      occasions: ["Date Night", "Party"],
      bodyShapes: ["Hourglass", "Rectangle"]
    },
    {
      name: "Ethnic Block Print Maxi",
      image: "/maxi_1_1784483197168.png",
      desc: "A breezy casual maxi dress featuring authentic Indian ethnic block prints.",
      price: 2499,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Blue", "White"],
      occasions: ["Casual", "Vacation"],
      bodyShapes: ["Rectangle", "Apple"]
    },
    {
      name: "Blue Silk Lehenga Choli",
      image: "/lehenga_3_1784483208450.png",
      desc: "A traditional yet modern blue silk lehenga choli, featuring rich texture and graceful flow.",
      price: 12999,
      sizes: ["S", "M", "L"],
      colors: ["Blue", "Gold"],
      occasions: ["Wedding", "Festive"],
      bodyShapes: ["Hourglass", "Pear"]
    }
  ],
  "Kids' Apparel": [
    {
      name: "Summer Friends Trio",
      image: "/kids_1.png",
      desc: "A lively trio of everyday essentials featuring a classic yellow striped tee, a floral print sun dress, and a comfortable green graphic tee.",
      price: 1499,
      sizes: ["2-3Y", "4-5Y", "6-7Y"],
      colors: ["Yellow", "Pink", "Green"],
      occasions: ["Casual", "Vacation"],
      fabric: "Cotton"
    },
    {
      name: "Striped Swing Dress",
      image: "/kids_2.png",
      desc: "A cheerful and breezy pink-and-white striped cotton knit dress, perfect for warm summer days at the playground.",
      price: 1199,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Pink", "White"],
      occasions: ["Casual", "Family Function"],
      fabric: "Cotton Knit"
    },
    {
      name: "Everyday Polo & Tee Set",
      image: "/kids_3.png",
      desc: "Comfortable cotton tops for boys, including a playful orange dinosaur graphic tee and a classic color-blocked green polo.",
      price: 1299,
      sizes: ["2-3Y", "4-5Y", "6-7Y"],
      colors: ["Orange", "Green"],
      occasions: ["Casual", "Vacation"],
      fabric: "Cotton"
    },
    {
      name: "Sibling Summer Coordinates",
      image: "/kids_4.png",
      desc: "Chic, easy-to-style summer outfits including a denim skirt pairing, a blue floral dress, and a soft graphic t-shirt.",
      price: 1899,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Blue", "Pink", "White"],
      occasions: ["Casual", "Family Function"],
      fabric: "Cotton & Denim"
    },
    {
      name: "Cotton Candy Stripe Dress",
      image: "/kids_5.png",
      desc: "An ultra-soft, breathable striped dress designed for active girls, featuring a stretch waistband for comfort.",
      price: 1299,
      sizes: ["4-5Y", "6-7Y", "8-9Y"],
      colors: ["Pink", "White"],
      occasions: ["Casual", "Family Function"],
      fabric: "Breathable Cotton"
    },
    {
      name: "Boys' Adventure Tees",
      image: "/kids_6.png",
      desc: "Durable and stylish boys' casual shirts—ideal for playground adventures and relaxed weekend outings.",
      price: 999,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Blue", "Grey", "Green"],
      occasions: ["Casual", "Vacation"],
      fabric: "Durable Cotton"
    },
    {
      name: "Sparkly Party Tutu Dress",
      image: "/kids_party_wear.png",
      desc: "A cute kids party dress for girls, sparkly silver and pastel blue tutu dress.",
      price: 2499,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Silver", "Blue", "Pastel"],
      occasions: ["Party", "Family Function", "Festive"],
      fabric: "Tulle & Silk"
    },
    {
      name: "Kids' Style Update",
      image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQ9rLkLXUhqW7rnRRRIvjK6CNCJmtcs-CWpa8byuJ4TlI0nfQCWYN9QD9v-qx0qVvWGQx_RX5vuFIHOPuDDi0Us1y3h8Co8aLCvzmKT1v06OszMOZwqJY5-Ig&usqp=CAc",
      desc: "Latest collection for kids featuring modern styles.",
      price: 1599,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Mixed"],
      occasions: ["Casual"],
      fabric: "Cotton"
    },
    {
      name: "Festive Kids Wear",
      image: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcR2HyhVPc1cPFagYNxIt-JZhtANHnOMdFwBiXgpxmPXsitmP5tI43Xn7fqdjp6CvpiPf6w4TP5Y6TAF9-ybKwmB8SqVCo3TobvfH5usPMrv3BrbQuPJNyASdwOBgqP1LPX3zDHOkoI&usqp=CAc",
      desc: "Beautiful kids' outfit for festive occasions.",
      price: 1999,
      sizes: ["2-3Y", "4-5Y", "6-7Y"],
      colors: ["Festive"],
      occasions: ["Party", "Festive"],
      fabric: "Silk Blend"
    },
    {
      name: "Trendy Kids Outfit",
      image: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcT0U7YBPDetPQ-9YgH0MeLkz7pyy4O96KmCGQKdOsI5fzRXvmdk9XRkQBz__TifkBBvoAbRdu-5bMcBmtV3nrDJfbxn3mhOS214R6xqzZB4x85nj_ddDnFX&usqp=CAc",
      desc: "Stylish and comfortable everyday wear for kids.",
      price: 1399,
      sizes: ["4-5Y", "6-7Y", "8-9Y"],
      colors: ["Blue", "Red"],
      occasions: ["Casual", "Vacation"],
      fabric: "Cotton Blend"
    },
    {
      name: "Kids Celebration Set",
      image: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRAvfEwZypUUSLSpUoydUczU8l_YMJCylRvQ1kvJTt_aJ9sHkB4Ma-BqoAKV5HXoOChYEOeVjXkGzN_r7qcq-TxLT1IjaD9AFy_qPSrc7tfYogMz6wvR6ofpP0pnNh1n1xBwE2Hjpw&usqp=CAc",
      desc: "Elegant and cute outfit for special celebrations.",
      price: 1799,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["White", "Gold"],
      occasions: ["Party", "Family Function"],
      fabric: "Premium Cotton"
    },
    {
      name: "Kids' Smart Casual Dress",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0TPMuPC6Luvjp7483G8yz7IOh1caOwmP7mtQxAlOKkg&s=10",
      desc: "A beautiful kids' dress perfect for any occasion.",
      price: 1599,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Pastel"],
      occasions: ["Casual", "Party"],
      fabric: "Cotton Blend"
    },
    {
      name: "Elegant Kids Outfit",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyqLwlMHjNLoQ6vM-P3ZcPAc7r5SCMIxNOYZaE_xkS5Q&s=10",
      desc: "Trendy kids wear offering a blend of comfort and style.",
      price: 1899,
      sizes: ["4-5Y", "6-7Y", "8-9Y"],
      colors: ["Mixed"],
      occasions: ["Party", "Festive"],
      fabric: "Silk Blend"
    },
    {
      name: "Colorful Kids Set",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_d2v8QqjEhNiAd_6_iU97d0BtN7RO0AWFrUqsOGaVjA&s=10",
      desc: "Vibrant outfit for kids with a cheerful look.",
      price: 1299,
      sizes: ["2-3Y", "4-5Y", "6-7Y"],
      colors: ["Multicolor"],
      occasions: ["Casual"],
      fabric: "Cotton"
    },
    {
      name: "Kids Classic Wear",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyzzeg9HzRpNWoRBYBbcpPiuRlPSrGh2WLK_zUWO1pBA&s=10",
      desc: "Classic styling for kids with premium detailing.",
      price: 1499,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Navy", "White"],
      occasions: ["Family Function"],
      fabric: "Premium Cotton"
    },
    {
      name: "Charming Kids Outfit",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlPpimX2NG6YiCSEYk7ANB8wIxY9VL8voQp2GnMQ5yLA&s=10",
      desc: "A charming dress designed to keep kids looking their best.",
      price: 1699,
      sizes: ["4-5Y", "6-7Y", "8-9Y"],
      colors: ["Pink", "Gold"],
      occasions: ["Party"],
      fabric: "Tulle & Cotton"
    },
    {
      name: "Trendy Summer Set",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhL4T_BzXzLPlcyj_8SN8fkTuN_bv9gFPgCSMV3zA3Rw&s=10",
      desc: "Cool and comfortable kids wear for the summer season.",
      price: 1199,
      sizes: ["2-3Y", "4-5Y", "6-7Y"],
      colors: ["Yellow", "White"],
      occasions: ["Casual", "Vacation"],
      fabric: "Cotton"
    },
    {
      name: "Kids Festive Special",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7RyuNEZzsQsGp_Nw6Rvdh1Lu9AHQVSqWGm6B7TiRqiA&s=10",
      desc: "Special festive collection for kids with beautiful accents.",
      price: 1999,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Red", "Gold"],
      occasions: ["Festive", "Wedding"],
      fabric: "Silk Blend"
    },
    {
      name: "Playful Kids Dress",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToi-fcBEkMzpiFsagvGtbN9lTThSChKrxrs9hbMmVRuA&s=10",
      desc: "Playful and elegant dress for kids' special moments.",
      price: 1599,
      sizes: ["4-5Y", "6-7Y", "8-9Y"],
      colors: ["Peach", "White"],
      occasions: ["Party", "Family Function"],
      fabric: "Cotton Blend"
    }
  ],
  "Festive Wear": [
    {
      name: "Pastel Pink Sharara Set",
      image: "/festive_1.png",
      desc: "Elegant pastel pink kurta and sharara set with delicate sequins work and matching dupatta, perfect for daytime festivities.",
      price: 6999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Pink"],
      occasions: ["Festive", "Family Function", "Wedding", "Party"],
      bodyShapes: ["Hourglass", "Pear", "Rectangle"],
      category: "Women's Wear"
    },
    {
      name: "Emerald Green Kurta Set",
      image: "/festive_2.png",
      desc: "A rich emerald green georgette kurta and pants set embellished with gold threadwork on the neckline and dupatta.",
      price: 5999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Green", "Gold"],
      occasions: ["Festive", "Family Function", "Wedding"],
      bodyShapes: ["Hourglass", "Pear", "Apple"],
      category: "Women's Wear"
    },
    {
      name: "Festive Pink Salwar Suit",
      image: "/festive_3.png",
      desc: "Charming traditional pink salwar kameez with detailed silver borders and a soft flowing chiffon dupatta.",
      price: 4999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Pink", "Silver"],
      occasions: ["Festive", "Family Function"],
      bodyShapes: ["Hourglass", "Apple", "Rectangle"],
      category: "Women's Wear"
    },
    {
      name: "Mustard Gold Lehenga Skirt",
      image: "/festive_4.png",
      desc: "Vibrant mustard yellow georgette lehenga skirt featuring a heavily embroidered gold border and matching dupatta.",
      price: 12999,
      sizes: ["S", "M", "L"],
      colors: ["Yellow", "Gold"],
      occasions: ["Festive", "Wedding", "Family Function"],
      bodyShapes: ["Pear", "Hourglass", "Inverted Triangle"],
      category: "Women's Wear"
    },
    {
      name: "Navy Velvet Bandhgala",
      image: "/festive_5.png",
      desc: "A sophisticated navy blue velvet bandhgala jacket with metallic gold buttons and an elegant pocket square.",
      price: 8999,
      sizes: ["M", "L", "XL", "XXL"],
      colors: ["Navy", "Blue", "Gold"],
      occasions: ["Festive", "Wedding", "Family Function", "Party"],
      category: "Men's Wear"
    },
    {
      name: "Crimson Waistcoat & Kurta Set",
      image: "/festive_6.png",
      desc: "A premium textured crimson waistcoat layered over a classic cream cotton kurta, offering a smart-casual festive look.",
      price: 4599,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Crimson", "Cream", "Red"],
      occasions: ["Festive", "Family Function", "Casual"],
      category: "Men's Wear"
    },
    {
      name: "Royal Embroidered Sherwani",
      image: "/festive_7.png",
      desc: "An exquisite cream and gold jacquard sherwani detailed with dense traditional hand-embroidery for groom's wear.",
      price: 18999,
      sizes: ["M", "L", "XL"],
      colors: ["Cream", "Gold"],
      occasions: ["Wedding", "Family Function", "Festive"],
      category: "Men's Wear"
    },
    {
      name: "Classic Beige Kurta Set",
      image: "/festive_8.png",
      desc: "A refined beige cotton-silk kurta set offering subtle texture and high comfort for wedding guest wear.",
      price: 2999,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Beige", "Cream"],
      occasions: ["Festive", "Family Function", "Wedding", "Casual"],
      category: "Men's Wear"
    },
    {
      name: "Girls' Traditional Lehenga",
      image: "/festive_9.png",
      desc: "A festive traditional lehenga set for girls, featuring rich zari borders, floral highlights, and traditional jewelry accessories.",
      price: 3499,
      sizes: ["4-5Y", "6-7Y", "8-9Y"],
      colors: ["Red", "Gold", "Pink"],
      occasions: ["Festive", "Wedding", "Family Function"],
      category: "Kids' Apparel",
      fabric: "Silk"
    },
    {
      name: "Boys' Blue Kurta & Nehru Jacket",
      image: "/festive_10.png",
      desc: "A handsome boys' blue silk kurta paired with a structured grey patterned Nehru jacket and contrast pocket square.",
      price: 3299,
      sizes: ["3-4Y", "5-6Y", "7-8Y"],
      colors: ["Blue", "Grey"],
      occasions: ["Festive", "Wedding", "Family Function"],
      category: "Kids' Apparel",
      fabric: "Silk & Cotton"
    },
    {
      name: "Kids' Festive Coordinates",
      image: "/festive_11.png",
      desc: "Vibrant ethnic coordinates for kids, featuring a bright orange kurta for boys and a matching pink and green lehenga for girls.",
      price: 3999,
      sizes: ["4-5Y", "6-7Y", "8-9Y"],
      colors: ["Orange", "Pink", "Green"],
      occasions: ["Festive", "Wedding", "Family Function"],
      category: "Kids' Apparel",
      fabric: "Silk"
    },
    {
      name: "Maroon Velvet Indo-Western",
      image: "/festive_indo_western.png",
      desc: "A royal men's Indo-Western sherwani in deep maroon velvet with gold embroidery, paired with black trousers.",
      price: 15999,
      sizes: ["M", "L", "XL", "XXL"],
      colors: ["Maroon", "Red", "Gold", "Black"],
      occasions: ["Wedding", "Festive", "Family Function"],
      category: "Men's Wear",
      fabric: "Velvet"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 1,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT828NtbQAQj2Okrff_nBXWH7ysSB_arXt9vykXMbhxhg&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 5903,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 2,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9I-BgCDMKt1ScwzixGE2Z19qY_LPGR65nuQJ0-Hvvvw&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 9822,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 3,
      image: "https://medias.utsavfashion.com/blog/wp-content/uploads/2023/05/woven-art-silk-jacquard-sherwani-with-peshawari-in-maroon-v1-mgv1369-708x1024.webp",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 5589,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 4,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1LkfdtCXijUxZoLXOVlZyt9QYjMHuIi_fEq7vA1b61Q&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 6198,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 5,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1l1u25g-RQvFjq9DSM8wQTl10LHVXD44HmyKyv4c-sA&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 6570,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 6,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbEXaVRPTzX1oAGjcxsnyg2gQcoMRo_GlwcfkdK5A4FQ&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 8356,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 7,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNOzDeXeSPieXyq48cGwyf7YOFGDx-2t7Y_rDUA4--Bg&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 6901,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 8,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnRz4gazyRm63Tt3Bpd5bIZEDZOWE3hPEil4vN4JuC-Q&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 4001,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 9,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMzXtabvUU1C3knGNInK8-GVzKQzhrQB72Zxg2j8NyOg&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 3632,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 10,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6GHdrvPzr-ZYV1y-F-h8ULOY59iz3D-tWlIGWFxA3LQ&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 7719,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 11,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9eIflBW93IFBHjG3xA0nvUHxbsSyChDg9iYhcuomUIg&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 7787,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 12,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxho8DsU8jUH_1KzVe43lL_RqSbB2wAE1ao7XmIPewPA&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 2357,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 13,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdkHRSzBMyuQ3KkbxPOjbLpwsAyPu4TXkp7-T5TrHCGw&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 8812,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 14,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2p0XjFnkYb57IRMkfDRxJpSmVmrFQgIKk1bQVSn37ew&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 9152,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 15,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_lFP3lDY4yJzFIPD4mmk7E9ATFfFYNhCdi4GigOkTYA&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 5635,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 16,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSynmER3eKVtruVKOUUiRsPA-Szt4mbCOFXnhrG2oh6uQ&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 4631,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 17,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHFNqBNpYmQEUXFqAABG8lOITiYXPBWWLyodX4bHZ9vw&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 4834,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 18,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrnlPmnBE8MKW-mw2-b9hFuQhP_Ti_L1LV69mC2OmXJg&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 8748,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 19,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC8C9y81TNaqaDcX80MS0vaOTxiHrF4aKkEMGvW-YgbA&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 4298,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 20,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNFfovb57Ln6cfxodVoaQGw2s636I7kzoZjSBOsPjCAA&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 5201,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,

    {
      name: "Exclusive Festive Wear Collection " + 22,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQN5j9opnjOnY4mV1jpx0kL9ugyt0sN1A3gtHUg5cQGfA&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 3714,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
    ,
    {
      name: "Exclusive Festive Wear Collection " + 23,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8AFoRsT62b4aoS30UgkXIFOYDq2fdRcY2_P72EFQZkg&s=10",
      desc: "Impeccably tailored exclusive festive wear designed to make a grand statement at your celebrations and family functions.",
      price: 9809,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Multicolor", "Festive Tone"],
      occasions: ["Festive", "Wedding", "Party"],
      category: "Men's Wear",
      fabric: "Premium Blend"
    }
  ]
};

const defaultOffersData = [
  {
    id: "offer-1",
    title: "Festive Season Special",
    discount: "10% OFF",
    desc: "Celebrate the season with a flat 10% discount across our entire festive collection. Dress up for every occasion.",
    btnText: "Shop Festive",
    category: "Festive Wear"
  },
  {
    id: "offer-2",
    title: "Premium Brands Clearance",
    discount: "20% OFF <span>or more</span>",
    desc: "Exclusive discounts on handpicked selected brands. Unmatched quality at unbeatable prices.",
    btnText: null,
    category: null
  },
  {
    id: "offer-3",
    title: "Kids' Special Bonus",
    discount: "FREE <span>Accessories & Toys</span>",
    desc: "Get complimentary baby products, toys, and cute accessories on every purchase of Kids' Apparel.",
    btnText: "Shop for Kids",
    category: "Kids' Apparel"
  }
];

let localCategoryData = JSON.parse(localStorage.getItem('categoryData'));
let categoryData = defaultCategoryData;
fetch('/catalog/database.json?v=' + Date.now())
  .then(res => res.json())
  .then(data => {
    let mergedData = { ...data };
    if (localCategoryData) {
      for (const cat in localCategoryData) {
        if (!mergedData[cat]) mergedData[cat] = [];
        localCategoryData[cat].forEach(localProd => {
          const exists = mergedData[cat].find(p => p.name === localProd.name);
          if (!exists) {
            mergedData[cat].push(localProd);
          }
        });
      }
    }
    categoryData = mergedData;
    localStorage.setItem('categoryData', JSON.stringify(mergedData));
  })
  .catch(err => console.error('Failed to load database.json:', err));

let offersData = JSON.parse(localStorage.getItem('offersData'));
if (!offersData) {
  offersData = defaultOffersData;
  localStorage.setItem('offersData', JSON.stringify(offersData));
}

function initCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (!modal) return;
  const closeBtn = modal.querySelector('.modal-close');
  const backdrop = modal.querySelector('.modal-backdrop');
  const grid = document.getElementById('modal-products-grid');
  const title = document.getElementById('modal-category-title');
  const items = document.querySelectorAll('.collection-item');

  if (!modal || !closeBtn || !grid || !title) return;

  function openModal(categoryName) {
    const currentCategoryData = JSON.parse(localStorage.getItem('categoryData')) || defaultCategoryData;
    const products = currentCategoryData[categoryName];
    if (!products) return;

    title.textContent = categoryName;
    grid.innerHTML = '';

    products.forEach(p => {
      const stockStatus = p.inStock === false ? '<span style="color: #ff4444; font-size: 0.8rem; font-weight: bold; margin-bottom: 5px; display: block;">OUT OF STOCK</span>' : '<span style="color: #4CAF50; font-size: 0.8rem; font-weight: bold; margin-bottom: 5px; display: block;">IN STOCK</span>';
      const priceHtml = '';
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-image-container">
          <img src="${p.image}" alt="${p.name}" />
        </div>
        <div class="product-info">
          ${stockStatus}
          <h3 class="product-name">${p.name}</h3>
          ${priceHtml}
          <p class="product-desc">${p.desc}</p>
          <a href="#contact" class="product-cta">Inquire Now</a>
        </div>
      `;
      grid.appendChild(card);

      card.querySelector('.product-cta').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        setTimeout(() => {
          lenis.scrollTo('#contact', {
            duration: 1.5
          });
        }, 300);
      });
    });

    // Add "Enquire / Visit for More" card at the end of the products grid
    const moreCard = document.createElement('div');
    moreCard.className = 'product-card more-options-card';
    moreCard.innerHTML = `
      <div class="product-image-container more-options-bg" style="background: var(--color-accent); display: flex; align-items: center; justify-content: center;">
        <div class="more-options-icon" style="font-size: 4rem; color: var(--color-bg); font-family: var(--font-heading); transform: rotate(15deg);">✦</div>
      </div>
      <div class="product-info" style="justify-content: center; text-align: center;">
        <h3 class="product-name" style="font-size: 1.4rem;">Looking for More?</h3>
        <p class="product-desc" style="margin-bottom: 1.5rem; color: #555;">We offer a wider selection of designs, premium fabrics, and bespoke custom-tailoring options at our Sahibabad showroom.</p>
        <div class="more-options-ctas" style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%;">
          <a href="#contact" class="product-cta contact-cta" style="background: #111; color: #fff;">Inquire for More</a>
          <a href="#heritage" class="product-cta visit-cta" style="border: 1px dashed #111; background: transparent; color: #111;">Visit Our Showroom</a>
        </div>
      </div>
    `;
    grid.appendChild(moreCard);

    moreCard.querySelector('.contact-cta').addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
      setTimeout(() => {
        lenis.scrollTo('#contact', {
          duration: 1.5
        });
      }, 300);
    });

    moreCard.querySelector('.visit-cta').addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
      setTimeout(() => {
        lenis.scrollTo('#heritage', {
          duration: 1.5
        });
      }, 300);
    });

    modal.classList.add('active');
    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');
    lenis.stop();

    gsap.fromTo('.product-card',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power2.out", delay: 0.2 }
    );
  }

  function closeModal() {
    modal.classList.remove('active');
    document.documentElement.classList.remove('scroll-locked');
    document.body.classList.remove('scroll-locked');
    lenis.start();
  }

  items.forEach(item => {
    item.addEventListener('click', () => {
      const categoryName = item.querySelector('.col-name').textContent.trim();
      openModal(categoryName);
    });
  });

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Expose to window for external buttons
  window.openCategoryModal = openModal;
}

const botAnswers = {
  welcome: `Hello! Welcome to <strong>MOD APPARELS</strong>. I am your personal assistant, <strong>MOD AI</strong>. How can I assist you today? Select an option below:
    <div class="chat-quick-options">
      <button type="button" class="chat-option-btn" data-query="contact">📞 1. Contact Number</button>
      <button type="button" class="chat-option-btn" data-query="instagram">📸 2. Instagram Link</button>
      <button type="button" class="chat-option-btn" data-query="location">📍 3. Showroom Location</button>
      <button type="button" class="chat-option-btn" data-query="catalog">👗 4. Explore Product Catalogs</button>
      <button type="button" class="chat-option-btn" data-query="offers">🏷️ 5. Discover Latest Offers</button>
      <button type="button" class="chat-option-btn" data-query="faq">❓ 6. Frequently Asked Questions</button>
      <button type="button" class="chat-option-btn" data-query="stylist">✨ 7. AI Fashion Stylist</button>
    </div>`,
  stylist: "Experience our exclusive AI Fashion Stylist! This advanced feature provides personalized outfit recommendations for women based on body type, styling preferences, and other details provided in the consultation panel. We also offer dedicated styling for men and kids—simply log in or create an account to unlock these tailored suggestions!<br><button id='chat-stylist-btn' class='chat-action-link' style='border:none; cursor:pointer;'>Consult AI Stylist ✦</button>",
  default: "I'd love to help you with that! At MOD APPARELS, we offer premium custom-made lehengas, sherwani suits, kids apparel, and modern western wear. For bookings or style consultations, feel free to visit our showroom or contact us directly.<br><a href='tel:+919310063440' class='chat-action-link'>📞 Call +91 93100 63440</a>",
  lehenga: "Our designer lehengas are handcrafted with premium silk, georgette, and rich embroidery, tailored perfectly to fit you.<br><a href='#collections' class='chat-action-link chat-nav-link' data-target='#collections'>👗 Browse Women's Collections</a>",
  suit: "We offer tailored men's bandhgala suits, royal sherwanis, and contemporary kurtas. Every suit is handcrafted with precision stitching.<br><a href='#collections' class='chat-action-link chat-nav-link' data-target='#collections'>👔 Browse Men's Collections</a>",
  western: "Our western evening gowns, black velvet gowns, and contemporary western gowns are designed for maximum elegance.<br><a href='#collections' class='chat-action-link chat-nav-link' data-target='#collections'>✨ Browse Western Wear</a>",
  kids: "MOD APPARELS offers comfortable, premium kids' traditional outfits like girls' gharara sets and boys' printed kurta pyjamas.<br><a href='#collections' class='chat-action-link chat-nav-link' data-target='#collections'>🧸 Browse Kids' Apparel</a>",
  saree: "While we have historically kept sarees, we currently specialize in premium designer lehengas, sherwanis, men's suits, and western gowns!<br><a href='#collections' class='chat-action-link chat-nav-link' data-target='#collections'>👗 Explore Collections</a>",
  hours: "Our showroom is open every day (Monday to Sunday) from <strong>10:00 AM to 10:00 PM</strong>.",
  address: "Our flagship showroom is located at:<br><strong>A-250, Shani Chowk Market, Lajpat Nagar, Sahibabad, Uttar Pradesh - 201005</strong>.<br><a href='https://maps.google.com/maps?q=MOD%20Apparels,%20Sahibabad' target='_blank' class='chat-action-link'>📍 Get Directions on Google Maps</a>",
  contact: "You can reach our customer support team directly at <strong>+91 93100 63440</strong> or email us at <strong>contact@modapparels.in</strong>.<br><a href='tel:+919310063440' class='chat-action-link'>📞 Call +91 93100 63440</a>",
  social: "Follow us on Instagram for the latest collection reveals, customer fittings, and style updates:<br><a href='https://www.instagram.com/mod_apparels/' target='_blank' class='chat-action-link'>📸 @mod_apparels on Instagram</a>",
  catalog: "You can explore our product catalogs right on this website! Browse Women's Wear, Men's Wear, Kids' Apparel, and Festive Wear.<br><a href='#collections' class='chat-action-link chat-nav-link' data-target='#collections'>👗 Open Collections Catalog</a>",
  offers: "We currently have some amazing offers!<br>• <strong>10% OFF</strong> on Festive Season Special.<br>• <strong>20% OFF</strong> on Clearance Items.<br>• <strong>FREE Accessories & Toys</strong> with Kids' Apparel.<br><a href='#offers' class='chat-action-link chat-nav-link' data-target='#offers'>🏷️ View Active Offers Section</a>",
  faq: "Frequently Asked Questions:<br>• <strong>Custom Tailoring:</strong> Available on all outfits!<br>• <strong>Payments:</strong> Cash, UPI, Cards accepted.<br>• <strong>Timings:</strong> 10:00 AM - 10:00 PM (Mon-Sun).<br><a href='#faq' class='chat-action-link chat-nav-link' data-target='#faq'>❓ View All FAQs Section</a>"
};

function getBotResponse(userMsg) {
  const msg = userMsg.toLowerCase();
  if (msg.includes("stylist") || msg.includes("style") || msg.includes("recommend") || msg.includes("outfit") || msg.includes("wear") || msg.includes("match")) {
    return botAnswers.stylist;
  } else if (msg.includes("lehenga") || msg.includes("choli") || msg.includes("bridal")) {
    return botAnswers.lehenga;
  } else if (msg.includes("suit") || msg.includes("sherwani") || msg.includes("bandhgala") || msg.includes("kurta") || msg.includes("men")) {
    return botAnswers.suit;
  } else if (msg.includes("western") || msg.includes("gown") || msg.includes("dress")) {
    return botAnswers.western;
  } else if (msg.includes("kid") || msg.includes("child") || msg.includes("gharara") || msg.includes("boy") || msg.includes("girl")) {
    return botAnswers.kids;
  } else if (msg.includes("saree") || msg.includes("sari")) {
    return botAnswers.saree;
  } else if (msg.includes("hour") || msg.includes("time") || msg.includes("open")) {
    return botAnswers.hours;
  } else if (msg.includes("address") || msg.includes("location") || msg.includes("where") || msg.includes("map") || msg.includes("sahibabad") || msg.includes("lajpat")) {
    return botAnswers.address;
  } else if (msg.includes("contact") || msg.includes("phone") || msg.includes("number") || msg.includes("call")) {
    return botAnswers.contact;
  } else if (msg.includes("instagram") || msg.includes("ig") || msg.includes("social")) {
    return botAnswers.social;
  } else if (msg.includes("catalog") || msg.includes("product") || msg.includes("collection") || msg.includes("explore")) {
    return botAnswers.catalog;
  } else if (msg.includes("offer") || msg.includes("discount") || msg.includes("sale") || msg.includes("price")) {
    return botAnswers.offers;
  } else if (msg.includes("faq") || msg.includes("question") || msg.includes("exchange") || msg.includes("delivery") || msg.includes("parking") || msg.includes("upi")) {
    return botAnswers.faq;
  } else {
    return botAnswers.default;
  }
}

function initChatbot() {
  const widget = document.getElementById('chatbot-widget');
  const trigger = document.getElementById('chat-trigger');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const form = document.getElementById('chat-input-form');
  const input = document.getElementById('chat-input');
  const messageArea = document.getElementById('chat-messages');

  if (!widget || !trigger || !panel || !closeBtn || !form || !input || !messageArea) return;

  trigger.addEventListener('click', () => {
    panel.classList.toggle('active');
    const badge = trigger.querySelector('.chat-badge');
    if (badge) {
      badge.style.display = 'none';
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('active');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    input.value = '';
    scrollToBottom();
    showTypingIndicator();
    scrollToBottom();

    setTimeout(() => {
      hideTypingIndicator();
      const response = getBotResponse(text);
      addBotMessage(response);
      scrollToBottom();
    }, 1000);
  });

  function addUserMessage(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = document.createElement('div');
    msg.className = 'message user';
    msg.innerHTML = `
      <div class="message-bubble">${text}</div>
      <span class="message-time">${time}</span>
    `;
    messageArea.appendChild(msg);
  }

  function addBotMessage(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = document.createElement('div');
    msg.className = 'message bot';
    msg.innerHTML = `
      <div class="message-bubble">${text}</div>
      <span class="message-time">${time}</span>
    `;
    messageArea.appendChild(msg);
  }

  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator-bubble';
    indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    messageArea.appendChild(indicator);
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator-bubble');
    if (indicator) {
      indicator.remove();
    }
  }

  function scrollToBottom() {
    messageArea.scrollTop = messageArea.scrollHeight;
  }

  // Helper function to smooth scroll to section with Lenis fallback
  function smoothScrollToSection(targetId) {
    if (!targetId || !targetId.startsWith('#')) return;
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      if (typeof lenis !== 'undefined' && lenis) {
        lenis.scrollTo(targetEl, { offset: -30, duration: 1.2 });
      } else {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Interactive buttons and links event listener inside chat
  messageArea.addEventListener('click', (e) => {
    // 1. Navigation link click inside bot message (e.g. href="#offers", href="#faq")
    const navLink = e.target.closest('.chat-nav-link');
    if (navLink) {
      const targetId = navLink.getAttribute('href') || navLink.getAttribute('data-target');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        panel.classList.remove('active');
        smoothScrollToSection(targetId);
      }
      return;
    }

    // 2. Quick option buttons click
    const optionBtn = e.target.closest('.chat-option-btn');
    if (optionBtn) {
      const query = optionBtn.getAttribute('data-query') || optionBtn.textContent.trim();
      const label = optionBtn.textContent.trim();

      addUserMessage(label);
      scrollToBottom();
      showTypingIndicator();
      scrollToBottom();

      setTimeout(() => {
        hideTypingIndicator();
        const response = getBotResponse(query);
        addBotMessage(response);
        scrollToBottom();

        // Optional smooth auto-scroll for section navigation options
        if (query === 'offers') {
          setTimeout(() => { panel.classList.remove('active'); smoothScrollToSection('#offers'); }, 700);
        } else if (query === 'faq') {
          setTimeout(() => { panel.classList.remove('active'); smoothScrollToSection('#faq'); }, 700);
        } else if (query === 'catalog') {
          setTimeout(() => { panel.classList.remove('active'); smoothScrollToSection('#collections'); }, 700);
        } else if (query === 'location') {
          setTimeout(() => { panel.classList.remove('active'); smoothScrollToSection('#contact'); }, 700);
        }
      }, 500);
      return;
    }

    // 3. Consult AI Stylist button click
    const stylistBtn = e.target.closest('#chat-stylist-btn');
    if (stylistBtn) {
      const drawer = document.getElementById('stylist-drawer');
      if (drawer) {
        drawer.classList.add('active');
        const badge = document.querySelector('.chat-badge');
        if (badge) badge.style.display = 'none';
        panel.classList.remove('active');
        document.documentElement.classList.add('scroll-locked');
        document.body.classList.add('scroll-locked');
        if (typeof lenis !== 'undefined') lenis.stop();
      }
    }
  });
}

// ----------------------------------------------------
// AI FASHION STYLIST CONTROL
// ----------------------------------------------------
function initStylist() {
  const drawer = document.getElementById('stylist-drawer');
  const openLinks = document.querySelectorAll('.nav-stylist-link, #menu-ai-stylist, #footer-fashion-tips');
  const closeBtn = document.querySelector('.drawer-close');
  const backdrop = document.querySelector('.drawer-backdrop');

  const tabBtns = document.querySelectorAll('.drawer-tab-btn');
  const tabContents = document.querySelectorAll('.drawer-tab-content');

  const quizContainer = document.getElementById('stylist-quiz-container');

  // State variables
  let wizardData = {
    gender: "",
    occasion: "",
    bodyShape: "",
    colors: [],
    budget: 10000,
    season: "Summer"
  };
  let currentStep = 1;
  let matchingProducts = [];
  let currentRecIndex = 0;
  let selectedSize = "";
  let selectedSlot = "";

  let savedLooks = JSON.parse(localStorage.getItem("mod_saved_looks")) || [];

  // Update saved looks badge initially
  updateSavedLooksBadge();

  // Drawer open/close events
  openLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  function openDrawer() {
    if (!window.modCurrentUser) {
      alert("Please log in or register to use the premium AI Stylist feature.");
      const authModal = document.getElementById('auth-modal');
      if (authModal) authModal.classList.add('active');
      return;
    }

    if (drawer) drawer.classList.add('active');
    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');
    lenis.stop();
    renderSavedLooks();
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('active');
    document.documentElement.classList.remove('scroll-locked');
    document.body.classList.remove('scroll-locked');
    lenis.start();
  }

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).classList.add('active');

      if (tabId === 'saved') {
        renderSavedLooks();
      } else if (tabId === 'booking') {
        renderUserBookings();
      }
    });
  });

  // ----------------------------------------------------
  // QUESTIONNAIRE WIZARD LOGIC
  // ----------------------------------------------------
  const wizardForm = document.getElementById('stylist-wizard-form');
  const steps = document.querySelectorAll('.quiz-step');
  const prevBtn = document.getElementById('quiz-prev-btn');
  const nextBtn = document.getElementById('quiz-next-btn');
  const generateBtn = document.getElementById('quiz-generate-btn');
  const budgetSlider = document.getElementById('quiz-budget');
  const budgetVal = document.getElementById('current-budget-val');

  // Budget slider update
  if (budgetSlider && budgetVal) {
    budgetSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      wizardData.budget = val;
      budgetVal.textContent = `₹${val.toLocaleString('en-IN')}`;
    });
  }

  // Handle option cards and lists clicks
  const optionCards = document.querySelectorAll('.quiz-opt-card, .quiz-list-opt, .color-opt-pill, .season-btn');
  optionCards.forEach(card => {
    card.addEventListener('click', () => {
      const paramName = card.getAttribute('data-name');
      const value = card.getAttribute('data-value');

      if (paramName === 'colors') {
        // Multi select for colors
        if (card.classList.contains('selected')) {
          card.classList.remove('selected');
          wizardData.colors = wizardData.colors.filter(c => c !== value);
        } else {
          card.classList.add('selected');
          wizardData.colors.push(value);
        }
      } else {
        // Single select
        const siblings = card.parentNode.querySelectorAll(`[data-name="${paramName}"]`);
        siblings.forEach(s => s.classList.remove('selected'));

        card.classList.add('selected');
        wizardData[paramName] = value;

        // Custom transitions or side effects
        if (paramName === 'gender') {
          const bodyShapeStep = document.getElementById('step-body-shape');
          if (value === "Women's Wear") {
            bodyShapeStep.classList.remove('hidden');
          } else {
            bodyShapeStep.classList.add('hidden');
          }

          const officeOpt = document.querySelector('.quiz-list-opt[data-name="occasion"][data-value="Office"]');
          const dateNightOpt = document.querySelector('.quiz-list-opt[data-name="occasion"][data-value="Date Night"]');

          if (value === "Boys" || value === "Girls") {
            if (officeOpt) officeOpt.classList.add('hidden');
            if (dateNightOpt) dateNightOpt.classList.add('hidden');

            // If currently selected occasion is hidden, deselect it
            if (wizardData.occasion === "Office" || wizardData.occasion === "Date Night") {
              wizardData.occasion = null;
              if (officeOpt) officeOpt.classList.remove('selected');
              if (dateNightOpt) dateNightOpt.classList.remove('selected');
            }
          } else {
            if (officeOpt) officeOpt.classList.remove('hidden');
            if (dateNightOpt) dateNightOpt.classList.remove('hidden');
          }
        }
      }
    });
  });

  // Step navigation
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      // Validation check for current step selection
      if (!validateStep(currentStep)) {
        showToast("Please make a selection before proceeding.");
        return;
      }

      // Hide specific occasion options for Kids
      if (currentStep === 1) {
        const occasionCards = document.querySelectorAll('#step-2 .quiz-opt-card');
        occasionCards.forEach(card => {
          const val = card.dataset.value;
          if ((wizardData.gender === 'Boys' || wizardData.gender === 'Girls') && (val === 'Office' || val === 'Date Night')) {
            card.style.display = 'none';
          } else {
            card.style.display = 'flex';
          }
        });
      }

      steps[currentStep - 1].classList.remove('active');

      // Skip logic: if step is 2 (occasion) and selected gender is NOT women, skip step 3 (body shape) and go to step 4
      if (currentStep === 2 && wizardData.gender !== "Women's Wear") {
        currentStep = 4;
      } else {
        currentStep++;
      }

      steps[currentStep - 1].classList.add('active');
      updateNavButtons();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      steps[currentStep - 1].classList.remove('active');

      // Skip logic in reverse
      if (currentStep === 4 && wizardData.gender !== "Women's Wear") {
        currentStep = 2;
      } else {
        currentStep--;
      }

      steps[currentStep - 1].classList.add('active');
      updateNavButtons();
    });
  }

  function validateStep(step) {
    if (step === 1 && !wizardData.gender) return false;
    if (step === 2 && !wizardData.occasion) return false;
    if (step === 3 && wizardData.gender === "Women's Wear" && !wizardData.bodyShape) return false;
    return true;
  }

  function updateNavButtons() {
    // Show/hide prev
    if (currentStep === 1) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
    }

    // Show/hide next vs generate
    if (currentStep === 4) {
      nextBtn.classList.add('hidden');
      generateBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      generateBtn.classList.add('hidden');
    }
  }

  // ----------------------------------------------------
  // BODY SHAPE ESTIMATOR LOGIC
  // ----------------------------------------------------
  const shapeSelectBtn = document.getElementById('btn-shape-select');
  const shapeCalcBtn = document.getElementById('btn-shape-calc');
  const manualSelectGrid = document.getElementById('shapes-manual-select');
  const estimatorContainer = document.getElementById('shapes-estimator');

  const estQuestions = document.querySelectorAll('.est-question');
  const estOpts = document.querySelectorAll('.est-opt');
  const estResultBox = document.getElementById('est-result-box');
  const estShapeResultLabel = document.getElementById('est-shape-result');
  const useEstimatedBtn = document.getElementById('btn-use-estimated');

  let estAnswers = { weight: "", shoulders: "", waist: "" };
  let activeEstQ = 1;

  if (shapeSelectBtn && shapeCalcBtn) {
    shapeSelectBtn.addEventListener('click', () => {
      shapeSelectBtn.classList.add('active');
      shapeCalcBtn.classList.remove('active');
      manualSelectGrid.classList.remove('hidden');
      estimatorContainer.classList.add('hidden');
    });

    shapeCalcBtn.addEventListener('click', () => {
      shapeCalcBtn.classList.add('active');
      shapeSelectBtn.classList.remove('active');
      estimatorContainer.classList.remove('hidden');
      manualSelectGrid.classList.add('hidden');
      resetEstimator();
    });
  }

  estOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      const qNum = parseInt(opt.closest('.est-question').getAttribute('data-est-q'));
      const siblingOpts = opt.parentNode.querySelectorAll('.est-opt');
      siblingOpts.forEach(s => s.classList.remove('selected'));
      opt.classList.add('selected');

      // Store answer
      if (qNum === 1) estAnswers.weight = opt.getAttribute('data-ans');
      if (qNum === 2) estAnswers.shoulders = opt.getAttribute('data-ans');
      if (qNum === 3) estAnswers.waist = opt.getAttribute('data-ans');

      // Progress questions
      setTimeout(() => {
        if (qNum < 3) {
          estQuestions[qNum - 1].classList.add('hidden');
          estQuestions[qNum].classList.remove('hidden');
          activeEstQ = qNum + 1;
        } else {
          // Calculate result
          const shape = calculateBodyShape(estAnswers);
          estShapeResultLabel.textContent = shape;
          estQuestions[2].classList.add('hidden');
          estResultBox.classList.remove('hidden');
        }
      }, 300);
    });
  });

  if (useEstimatedBtn) {
    useEstimatedBtn.addEventListener('click', () => {
      const shape = estShapeResultLabel.textContent;

      // Switch back to select mode, highlight shape
      shapeSelectBtn.click();
      const cards = manualSelectGrid.querySelectorAll('.quiz-opt-card');
      cards.forEach(c => {
        if (c.getAttribute('data-value') === shape) {
          c.click();
        }
      });
      showToast(`Selected estimated body shape: ${shape}`);
    });
  }

  function resetEstimator() {
    estAnswers = { weight: "", shoulders: "", waist: "" };
    estOpts.forEach(o => o.classList.remove('selected'));
    estQuestions.forEach((q, idx) => {
      if (idx === 0) q.classList.remove('hidden');
      else q.classList.add('hidden');
    });
    estResultBox.classList.add('hidden');
    activeEstQ = 1;
  }

  function calculateBodyShape(ans) {
    // Styling heuristics
    if (ans.weight === 'hips' || ans.shoulders === 'narrower') {
      return "Pear";
    }
    if (ans.weight === 'mid') {
      return "Apple";
    }
    if (ans.weight === 'bust' || ans.shoulders === 'wider') {
      return "Inverted Triangle";
    }
    if (ans.waist === 'yes') {
      return "Hourglass";
    }
    return "Rectangle";
  }

  // ----------------------------------------------------
  // RECOMMENDATION ENGINE
  // ----------------------------------------------------
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      generateRecommendations();
    });
  }

  let loadingWaterButton = null;

  async function generateRecommendations() {
    // Show Loading State
    const emptyState = document.getElementById('results-empty-state');
    const populatedState = document.getElementById('results-populated-state');
    if (emptyState) {
      emptyState.classList.remove('hidden');

      const emptyIcon = document.getElementById('empty-state-icon');
      if (emptyIcon) emptyIcon.classList.add('hidden');

      const waterBtnContainer = document.getElementById('water-button-container');
      if (waterBtnContainer) {
        waterBtnContainer.classList.remove('hidden');
        if (!loadingWaterButton) {
          loadingWaterButton = new WaterButton(waterBtnContainer, {
            label: "Please wait...",
            waterColor: "#ff9900", // Accent color
            glass: { blur: 20, frost: 15 }
          });
        }
      }

      const emptyTitle = document.getElementById('empty-state-title');
      const emptyDesc = document.getElementById('empty-state-desc');
      if (emptyTitle) emptyTitle.innerText = "Generating AI Stylist Recommendations...";
      if (emptyDesc) emptyDesc.innerText = "Please wait while our AI analyzes your preferences to curate the perfect look.";
    }
    if (populatedState) {
      populatedState.classList.add('hidden');
    }

    const requirement = {
      gender: wizardData.gender,
      occasion: wizardData.occasion,
      bodyShape: wizardData.bodyShape,
      budget: wizardData.budget || "Any",
      colors: wizardData.colors || [],
      season: wizardData.season || "Any"
    };

    const productList = [];
    for (const cat in categoryData) {
      categoryData[cat].forEach(p => {
        const actualCategory = p.category || cat;

        // Determine if it's a kids item
        const isKids = actualCategory === "Kids' Apparel" || (p.name && (p.name.includes("Kids") || p.name.includes("Boys") || p.name.includes("Girls")));

        // Filter based on user gender
        if (wizardData.gender === "Women's Wear" && (isKids || actualCategory === "Men's Wear")) return;
        if (wizardData.gender === "Men's Wear" && (isKids || actualCategory === "Women's Wear")) return;

        if (wizardData.gender === "Boys" || wizardData.gender === "Girls") {
          if (!isKids) return;

          if (wizardData.gender === "Boys") {
            if (p.targetGender === "Girls") return;
            if (p.name && p.name.includes("Girls")) return;
          }
          if (wizardData.gender === "Girls") {
            if (p.targetGender === "Boys") return;
            if (p.name && p.name.includes("Boys")) return;
          }
        }

        productList.push({
          productName: p.name || "",
          category: actualCategory,
          image: p.image || "",
          desc: (p.desc || `A premium curated choice for ${actualCategory}.`) +
            (p.occasions ? ` Occasions: ${p.occasions.join(', ')}.` : '') +
            (p.colors ? ` Colors: ${p.colors.join(', ')}.` : '')
        });
      });
    }

    const payload = {
      requirement: requirement,
      product: productList
    };

    const webhookUrl = "https://chaoticbunny11.app.n8n.cloud/webhook/AI_Stylist";
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Webhook responded with an error");

        // Sometimes n8n returns a string, text, or JSON. Ensure we parse safely.
        let rawText = await response.text();
        console.log("RAW n8n RESPONSE:", rawText);
        let data = null;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.log("Failed to parse JSON, returning error");
          throw new Error("Invalid JSON format from n8n");
        }

        // Handle n8n encapsulation
        if (data && !Array.isArray(data)) {
          // If n8n wrapped it in an object like { data: [...] } or { items: [...] }
          if (Array.isArray(data.data)) data = data.data;
          else if (Array.isArray(data.items)) data = data.items;
          else if (data[0] && data[0].recommendation) data = [data]; // In case it's a single object
          else data = [data]; // Try wrapping it in an array
        }

        if (Array.isArray(data) && data.length > 0 && data[0].recommendation) {
          matchingProducts = data.map(item => {
            let originalProd = null;
            if (item.recommendation && item.recommendation.category && categoryData[item.recommendation.category]) {
              originalProd = categoryData[item.recommendation.category].find(p => p.name === item.recommendation.productName);
            }

            return {
              ...(originalProd || {}), // Retain sizes, price, etc.
              name: item.recommendation ? item.recommendation.productName : "Curated Item",
              category: item.recommendation ? item.recommendation.category : "",
              image: (originalProd && originalProd.image) ? originalProd.image : ((item.recommendation && item.recommendation.image) ? item.recommendation.image : ""),
              desc: item.recommendation ? item.recommendation.desc : "",
              n8n_tip: item.styling_reason || "",
              n8n_confidence: item.confidence || 0
            };
          });
          currentRecIndex = 0;
          renderRecommendation();
        } else {
          throw new Error("Empty recommendation list returned from n8n.");
        }
      } catch (err) {
        console.error("Failed to fetch from n8n Webhook:", err);
        
        // Local Fallback Engine (Safety Net)
        if (productList && productList.length > 0) {
           console.log("n8n Server is down or unresponsive. Using local fallback recommendations.");
           const shuffled = [...productList].sort(() => 0.5 - Math.random());
           const selected = shuffled.slice(0, Math.min(3, shuffled.length));
           
           matchingProducts = selected.map(item => {
             let originalProd = null;
             if (item.category && categoryData[item.category]) {
                originalProd = categoryData[item.category].find(p => p.name === item.productName);
             }
             return {
               ...(originalProd || {}),
               name: item.productName,
               category: item.category,
               image: item.image,
               desc: item.desc,
               n8n_tip: "Our local stylist picked this based on your preferences since the cloud AI is currently resting.",
               n8n_confidence: 0.99
             };
           });
           
           currentRecIndex = 0;
           renderRecommendation();
        } else {
            if (emptyState) {
              emptyState.classList.remove('hidden');

              if (loadingWaterButton) {
                loadingWaterButton.destroy();
                loadingWaterButton = null;
              }
              const emptyIcon = document.getElementById('empty-state-icon');
              if (emptyIcon) emptyIcon.classList.remove('hidden');
              const waterBtnContainer = document.getElementById('water-button-container');
              if (waterBtnContainer) waterBtnContainer.classList.add('hidden');

              const emptyTitle = document.getElementById('empty-state-title');
              const emptyDesc = document.getElementById('empty-state-desc');
              if (emptyTitle) emptyTitle.innerText = "Stylist Unavailable";
              if (emptyDesc) emptyDesc.innerText = "Our AI Stylist is currently resting or returned an invalid format. Please try again later.";
            }
        }
      }
    }
  }

  function renderRecommendation() {
    if (typeof loadingWaterButton !== 'undefined' && loadingWaterButton) {
      if (typeof loadingWaterButton.destroy === 'function') {
        loadingWaterButton.destroy();
      }
      loadingWaterButton = null;
    }
    const emptyIcon = document.getElementById('empty-state-icon');
    if (emptyIcon) emptyIcon.classList.remove('hidden');
    const waterBtnContainer = document.getElementById('water-button-container');
    if (waterBtnContainer) waterBtnContainer.classList.add('hidden');

    const emptyState = document.getElementById('results-empty-state');
    const populatedState = document.getElementById('results-populated-state');

    if (matchingProducts.length === 0) {
      emptyState.classList.remove('hidden');
      populatedState.classList.add('hidden');

      const emptyTitle = emptyState.querySelector('h4');
      const emptyDesc = emptyState.querySelector('p');
      if (window.lastUploadedFileName) {
        if (emptyTitle) emptyTitle.innerText = "No Matches Found";
        if (emptyDesc) emptyDesc.innerText = "We couldn't find a similar coordinate set in our MOD APPARELS catalog.";
      } else {
        if (emptyTitle) emptyTitle.innerText = "Your Personal Look Book";
        if (emptyDesc) emptyDesc.innerText = "Complete the consultation questions or upload an image to build your look.";
      }
      return;
    }

    emptyState.classList.add('hidden');
    populatedState.classList.remove('hidden');

    const product = matchingProducts[currentRecIndex];
    selectedSize = product.sizes ? product.sizes[0] : "Free Size";

    // 1. Primary card content
    const cardContainer = document.getElementById('primary-recommendation-card');

    // Safe price formatter since prices might be "N/A" now
    const formatPrice = (p) => {
      if (typeof p === 'number') return `₹${p.toLocaleString('en-IN')}`;
      if (!p || p === "N/A") return "Price on Request";
      return `₹${p}`;
    };

    let sizeSelectorHTML = '';
    if (product.sizes && product.sizes.length > 0) {
      sizeSelectorHTML = `
        <div class="rec-sizes-section">
          <span class="rec-sizes-label">Select Size:</span>
          <div class="rec-size-options">
            ${product.sizes.map((sz, idx) => `
              <button type="button" class="size-pill-btn ${idx === 0 ? 'active' : ''}" data-size="${sz}">${sz}</button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Body Shape fit text hook
    let fitText = "";
    if (wizardData.gender === "Women's Wear" && wizardData.bodyShape) {
      const guidelines = {
        Pear: "This silhouette features details on top and flared flows on the bottom which harmonizes your hips and balances the overall Pear shape elegantly.",
        Rectangle: "This wraps nicely or provides tailored belt lines that break a straight silhouette, creating beautiful defined curves for Rectangle body shapes.",
        Apple: "An elegant Empire-waist or soft flowing V-neck line that elongates the neck, drawing focus upwards and drape gracefully over Apple shape proportions.",
        Hourglass: "Designed with close fitting curves that highlight your natural symmetry, highlighting waist structure beautifully.",
        "Inverted Triangle": "Designed with a wide hemline and flared skirt coordinates to balance out broader shoulders, creating an elegant hourglass illusion."
      };
      fitText = guidelines[wizardData.bodyShape] || "Curated with modern cuts to enhance your style profile.";
    } else {
      fitText = `A structured, high-grade fabric coordinate tailored perfectly for your chosen ${wizardData.occasion || "special"} occasion.`;
    }

    cardContainer.innerHTML = `
      <div class="rec-img-wrap">
        <img src="${product.image}" alt="${product.name}" />
      </div>
      <div class="rec-info-wrap">
        <div class="rec-title-row">
          <h4>${product.name}</h4>
        </div>
        <p class="rec-desc">${product.desc}</p>
        <p class="rec-desc" style="color: var(--color-accent); font-weight: 500; font-size: 0.75rem;">★ Suitability: ${fitText}</p>
        ${sizeSelectorHTML}
      </div>
    `;

    // Size button selectors
    const sizeButtons = cardContainer.querySelectorAll('.size-pill-btn');
    sizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.getAttribute('data-size');
      });
    });

    // 2. Build Complete Outfit (accessories, layering, footwear)
    const layersGrid = document.getElementById('outfit-layers-grid');
    const looks = generateLookBuilderItems(product, wizardData.gender, wizardData.occasion);

    layersGrid.innerHTML = `
      <div class="outfit-layer-card">
        <span class="layer-type">Accessories</span>
        <span class="layer-name">${looks.accessories.name}</span>
      </div>
      <div class="outfit-layer-card">
        <span class="layer-type">Layering / Shrug</span>
        <span class="layer-name">${looks.layering.name}</span>
      </div>
      <div class="outfit-layer-card">
        <span class="layer-type">Matching Footwear</span>
        <span class="layer-name">${looks.footwear.name}</span>
      </div>
    `;



    // 4. Stylist Tip
    const adviceText = document.getElementById('stylist-advice-text');
    adviceText.textContent = product.n8n_tip || looks.tip;
  }

  function generateLookBuilderItems(mainProduct, gender, occasion) {
    if (gender === "Women's Wear") {
      const isFestive = ["Festive", "Wedding", "Family Function"].includes(occasion);
      return {
        accessories: {
          name: isFestive ? "Kundan Pearl Necklace Set" : "Minimalist Gold-Plated Hoop Earrings",
          price: isFestive ? 2499 : 899
        },
        layering: {
          name: isFestive ? "Zardozi Handwoven Silk Dupatta" : "Fine Linen Draped Trench Shrug",
          price: isFestive ? 3999 : 2899
        },
        footwear: {
          name: isFestive ? "Embellished Velvet Mojaris" : "Classic Leather Nude Block Heels",
          price: isFestive ? 1899 : 2499
        },
        tip: isFestive
          ? "For a flawless festive appearance, drape the silk dupatta clean over one shoulder, locking it with a traditional pin. Complete the styling with high block juttis and statement jhumkas."
          : "Keep it clean and modern for office and smart casual styling by rolling the sleeves slightly. Wear it with our linen trousers and block heels for an elegant elongated stature."
      };
    } else if (gender === "Men's Wear") {
      const isFestive = ["Festive", "Wedding", "Family Function"].includes(occasion);
      return {
        accessories: {
          name: isFestive ? "Hand-spun Silk Pocket Square" : "Premium Cognac Leather Watch & Belt Set",
          price: isFestive ? 799 : 3499
        },
        layering: {
          name: isFestive ? "Zari Borders Hand-loom Shawl" : "Sartorial Charcoal Knit Vest",
          price: isFestive ? 3499 : 2199
        },
        footwear: {
          name: isFestive ? "Premium Brocade Sherwani Juttis" : "Full-grain Cognac Leather Oxford Shoes",
          price: isFestive ? 2299 : 4599
        },
        tip: isFestive
          ? "Complement the royal sherwani set with a cream-white premium silk pocket square. Contrast with brown polished leather shoes or matching wedding mojari flats."
          : "When wearing the Oxford white or structured Grey dress shirts, wear a clean leather belt matching the tone of your shoes. Layer with the textured blazer for business-dinner conversions."
      };
    } else {
      // Kids
      return {
        accessories: {
          name: "Adjustable Stretch Belt / Floral Headband",
          price: 499
        },
        layering: {
          name: "Super-Soft Cotton Knit Cardigan",
          price: 1299
        },
        footwear: {
          name: "Flexible Ortho-Cushioned Slip-on Sneakers",
          price: 1599
        },
        tip: "Comfort is key for children. Style this outfit with matching slip-on canvas shoes. The lightweight stretch cotton cardigan allows comfortable play while maintaining style coordinates."
      };
    }
  }

  function getPremiumUpsellItem(mainProduct, gender) {
    if (gender === "Women's Wear") {
      return { name: "Silk Embroidered Shawl", price: 3499 };
    } else if (gender === "Men's Wear") {
      return { name: "Navy Velvet Blazer", price: 8999 };
    } else {
      return { name: "Coordinating Sibling Set", price: 1899 };
    }
  }

  // ----------------------------------------------------
  // ACTION HANDLERS (Offline Ticket & Styling Sheet)
  // ----------------------------------------------------
  const showroomSheetBtn = document.getElementById('btn-look-showroom-sheet');
  const saveLookBtn = document.getElementById('btn-look-save');
  const similarBtn = document.getElementById('btn-look-similar');

  // Showroom ticket modal elements
  const ticketModal = document.getElementById('showroom-sheet-modal');
  const ticketCloseBtn = ticketModal ? ticketModal.querySelector('.modal-close') : null;
  const ticketBackdrop = ticketModal ? ticketModal.querySelector('.modal-backdrop') : null;
  const printTicketBtn = ticketModal ? ticketModal.querySelector('.btn-print-ticket') : null;
  const downloadPdfBtn = ticketModal ? ticketModal.querySelector('.btn-download-pdf') : null;

  if (showroomSheetBtn) {
    showroomSheetBtn.addEventListener('click', () => {
      const product = matchingProducts[currentRecIndex];
      if (!product) return;

      const stylistDrawer = document.getElementById('stylist-drawer');
      if (stylistDrawer) stylistDrawer.classList.remove('active');

      const looks = generateLookBuilderItems(product, wizardData.gender, wizardData.occasion);
      const stylingCode = `MOD-${(wizardData.occasion || 'LOOK').toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-REC`;

      // Populate ticket elements
      const nameEl = document.getElementById('ticket-item-name');
      const sizeEl = document.getElementById('ticket-item-size');
      const occasionEl = document.getElementById('ticket-item-occasion');
      const codeEl = document.getElementById('ticket-item-code');
      const tipEl = document.getElementById('ticket-item-tip');

      if (nameEl) nameEl.textContent = product.name;
      if (sizeEl) sizeEl.textContent = selectedSize || "M";
      if (occasionEl) occasionEl.textContent = wizardData.occasion || "Casual";
      if (codeEl) codeEl.textContent = stylingCode;
      if (tipEl) tipEl.textContent = looks.tip || "Presented as a curated recommendation.";

      // Open ticket sheet modal
      if (ticketModal) {
        ticketModal.classList.add('active');
        document.documentElement.classList.add('scroll-locked');
        document.body.classList.add('scroll-locked');
        lenis.stop();
      }
    });
  }

  // Close ticket sheet modal handlers
  const closeTicketModal = () => {
    if (ticketModal) {
      ticketModal.classList.remove('active');
      document.documentElement.classList.remove('scroll-locked');
      document.body.classList.remove('scroll-locked');
      lenis.start();
    }
  };

  if (ticketCloseBtn) ticketCloseBtn.addEventListener('click', closeTicketModal);
  if (ticketBackdrop) ticketBackdrop.addEventListener('click', closeTicketModal);
  if (printTicketBtn) {
    printTicketBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const product = matchingProducts[currentRecIndex];
      const filename = `Product-ticket-"${product && product.name ? product.name : 'Look'}".pdf`;

      const element = document.querySelector('.showroom-ticket-content');

      // Temporarily hide actions for cleaner PDF
      const ticketActions = element.querySelector('.ticket-actions');
      if (ticketActions) ticketActions.style.display = 'none';

      // Ensure html2pdf is loaded
      if (typeof html2pdf !== 'undefined') {
        const opt = {
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
          if (ticketActions) ticketActions.style.display = '';
        });
      } else {
        // Fallback to print if library didn't load
        const oldTitle = document.title;
        if (product && product.name) {
          document.title = `Product-ticket-"${product.name}"`;
        }
        window.print();
        document.title = oldTitle;
        if (ticketActions) ticketActions.style.display = '';
      }
    });
  }

  // Escape key close ticket sheet modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTicketModal();
    }
  });

  if (similarBtn) {
    similarBtn.addEventListener('click', () => {
      if (matchingProducts.length <= 1) {
        showToast("No similar styling fits found in the catalog matching requirements.");
        return;
      }
      currentRecIndex = (currentRecIndex + 1) % matchingProducts.length;
      renderRecommendation();
    });
  }

  if (saveLookBtn) {
    saveLookBtn.addEventListener('click', async () => {
      const product = matchingProducts[currentRecIndex];
      const looks = generateLookBuilderItems(product, wizardData.gender, wizardData.occasion);

      const newLook = {
        id: Date.now(),
        productName: product.name,
        price: product.price,
        image: product.image,
        gender: wizardData.gender,
        occasion: wizardData.occasion,
        details: `Size: ${selectedSize}. Accessories: ${looks.accessories.name}, Footwear: ${looks.footwear.name}`,
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      if (currentUser) {
        try {
          await saveLookToCloud(currentUser.uid, newLook);
          savedLooks.unshift(newLook);
          updateSavedLooksBadge();
          showToast("Look saved and backed up to cloud!");
        } catch (error) {
          console.error("Error saving look:", error);
          showToast("Failed to save look online.");
        }
      } else {
        savedLooks.unshift(newLook);
        localStorage.setItem("mod_saved_looks", JSON.stringify(savedLooks));
        updateSavedLooksBadge();
        showToast("Look saved locally. Log in to back up.");
      }
    });
  }

  function updateSavedLooksBadge() {
    const badge = document.getElementById('saved-looks-count');
    if (badge) {
      badge.textContent = savedLooks.length;
    }
  }

  function renderSavedLooks() {
    const grid = document.getElementById('saved-looks-grid');
    if (!grid) return;

    if (savedLooks.length === 0) {
      grid.innerHTML = `
        <div class="saved-empty-msg">
          <div class="saved-empty-icon">📂</div>
          <h4>No Saved Looks Yet</h4>
          <p>Go to styling consultation, configure your parameters, and save looks to build a curated custom wardrobe.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = savedLooks.map(look => `
      <div class="saved-look-card" data-look-id="${look.id}">
        <div class="saved-card-img">
          <img src="${look.image}" alt="${look.productName}" />
          <button class="btn-delete-saved" data-look-id="${look.id}" aria-label="Delete saved look">&times;</button>
        </div>
        <div class="saved-card-info">
          <h4 class="saved-card-title">${look.productName}</h4>

          <span class="saved-card-meta">${look.gender} • ${look.occasion}</span>
          <p class="saved-card-details">${look.details}</p>
        </div>
      </div>
    `).join('');

    // Add delete events
    grid.querySelectorAll('.btn-delete-saved').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-look-id'));

        if (currentUser) {
          try {
            await deleteLookFromCloud(currentUser.uid, id);
            savedLooks = savedLooks.filter(l => l.id !== id);
            updateSavedLooksBadge();
            renderSavedLooks();
            showToast("Saved look deleted from cloud.");
          } catch (error) {
            console.error("Error deleting look:", error);
            showToast("Failed to delete look from cloud.");
          }
        } else {
          savedLooks = savedLooks.filter(l => l.id !== id);
          localStorage.setItem("mod_saved_looks", JSON.stringify(savedLooks));
          updateSavedLooksBadge();
          renderSavedLooks();
          showToast("Saved look deleted.");
        }
      });
    });
  }

  // ----------------------------------------------------
  // AUTH LOGIC & FIREBASE SYNCHRONIZATION
  // ----------------------------------------------------
  let currentUser = null;

  // Listen for Authentication state changes
  onAuthStateChanged(async (user) => {
    const navAuth = document.getElementById('nav-auth');
    const navSigninBtn = document.getElementById('nav-signin-btn');
    const syncBanner = document.getElementById('saved-looks-sync-banner');

    if (user) {
      currentUser = user;
      window.modCurrentUser = user;

      // Update UI elements
      const overlayAuthItem = document.getElementById('overlay-auth-item');
      if (overlayAuthItem) overlayAuthItem.style.display = 'none';

      if (navAuth) {
        navAuth.textContent = `Logout`;
        navAuth.title = `Logged in as ${user.displayName || user.email}`;
      }
      if (navSigninBtn) {
        navSigninBtn.textContent = `Logout`;
        navSigninBtn.title = `Logged in as ${user.displayName || user.email}`;
      }

      if (syncBanner) {
        syncBanner.classList.add('synced');
        syncBanner.innerHTML = `
          <span class="sync-icon">✓</span>
          <span class="sync-text">Looks are backed up and synced in real-time.</span>
        `;
      }

      // Sync local offline looks to Cloud Firestore if any exist
      const localLooks = JSON.parse(localStorage.getItem("mod_saved_looks")) || [];
      if (localLooks.length > 0) {
        showToast("Syncing offline looks...");
        try {
          const mergedLooks = await syncLocalLooksToCloud(user.uid, localLooks);
          savedLooks = mergedLooks;
          // Clear offline storage so it doesn't trigger on next log-in
          localStorage.removeItem("mod_saved_looks");
          showToast("Offline looks synced successfully!");
        } catch (err) {
          console.error("Sync error:", err);
          savedLooks = await fetchUserLooks(user.uid);
        }
      } else {
        // Just fetch from Cloud Firestore
        try {
          savedLooks = await fetchUserLooks(user.uid);
        } catch (err) {
          console.error("Fetch looks error:", err);
          savedLooks = [];
        }
      }

      // Add a visual user badge inside the Look Book tab if not already present
      renderUserBadge(user);

      // Booking Form view update for logged-in user
      const bookingForm = document.getElementById('booking-form');
      const bookingSyncBanner = document.getElementById('booking-sync-banner');
      if (bookingForm) bookingForm.classList.remove('hidden');
      if (bookingSyncBanner) bookingSyncBanner.classList.add('hidden');
      renderUserBookings();

    } else {
      currentUser = null;
      window.modCurrentUser = null;

      const overlayAuthItem = document.getElementById('overlay-auth-item');
      if (overlayAuthItem) overlayAuthItem.style.display = '';

      if (navAuth) {
        navAuth.textContent = "Sign In";
        navAuth.removeAttribute('title');
      }
      if (navSigninBtn) {
        navSigninBtn.textContent = "Sign In";
        navSigninBtn.removeAttribute('title');
      }

      setTimeout(() => {
        if (!currentUser) {
          openAuthModal();
          showToast("Sign in for a better personalized experience.");
        }
      }, 3000);

      if (syncBanner) {
        syncBanner.classList.remove('synced');
        syncBanner.innerHTML = `
          <span class="sync-icon">🔄</span>
          <span class="sync-text">Log in to backup and sync your looks across devices.</span>
          <button id="btn-sync-login" class="sync-login-btn">Log In</button>
        `;

        // Re-attach sync login button event listener since we just re-rendered innerHTML
        const syncLoginBtn = document.getElementById('btn-sync-login');
        if (syncLoginBtn) {
          syncLoginBtn.addEventListener('click', () => {
            openAuthModal();
          });
        }
      }

      // Remove user badge if any
      const userBadge = document.querySelector('.stylist-user-badge');
      if (userBadge) userBadge.remove();

      // Load offline guest looks
      savedLooks = JSON.parse(localStorage.getItem("mod_saved_looks")) || [];

      // Booking Form view update for logged-out user
      const bookingForm = document.getElementById('booking-form');
      const bookingSyncBanner = document.getElementById('booking-sync-banner');
      if (bookingForm) bookingForm.classList.add('hidden');
      if (bookingSyncBanner) bookingSyncBanner.classList.remove('hidden');
      renderUserBookings();
    }

    updateSavedLooksBadge();

    // Only re-render if the active tab is 'saved' to prevent background layout issues
    const activeTabBtn = document.querySelector('.drawer-tab-btn.active');
    if (activeTabBtn && activeTabBtn.getAttribute('data-tab') === 'saved') {
      renderSavedLooks();
    }
  });

  function renderUserBadge(user) {
    const tabSaved = document.getElementById('tab-saved');
    if (!tabSaved) return;

    let userBadge = tabSaved.querySelector('.stylist-user-badge');
    if (!userBadge) {
      userBadge = document.createElement('div');
      userBadge.className = 'stylist-user-badge';
      tabSaved.appendChild(userBadge);
    }

    userBadge.innerHTML = `
      <span>Logged in as: <strong>${user.displayName || user.email}</strong></span>
      <button class="stylist-logout-btn" type="button">Logout</button>
    `;

    userBadge.querySelector('.stylist-logout-btn').addEventListener('click', async () => {
      try {
        await logoutUser();
        showToast("Logged out successfully.");
      } catch (err) {
        console.error("Logout error:", err);
      }
    });
  }

  // ----------------------------------------------------
  // AUTH MODAL UI LOGIC
  // ----------------------------------------------------
  const authModal = document.getElementById('auth-modal');
  const navAuthBtn = document.getElementById('nav-auth');
  const navSigninBtnMain = document.getElementById('nav-signin-btn');
  const authCloseBtn = authModal ? authModal.querySelector('.auth-close') : null;
  const authBackdrop = authModal ? authModal.querySelector('.auth-backdrop') : null;
  const authTabBtns = authModal ? authModal.querySelectorAll('.auth-tab-btn') : [];
  const authForms = authModal ? authModal.querySelectorAll('.auth-form') : [];

  const loginForm = document.getElementById('auth-login-form');
  const signupForm = document.getElementById('auth-signup-form');
  const googleBtn = document.getElementById('btn-auth-google');
  const statusMsg = document.getElementById('auth-status-msg');

  function openAuthModal() {
    if (authModal) {
      authModal.classList.add('active');
      resetAuthForm();
      document.documentElement.classList.add('scroll-locked');
      document.body.classList.add('scroll-locked');
      lenis.stop();
    }
  }

  function closeAuthModal() {
    if (authModal) {
      authModal.classList.remove('active');
      document.documentElement.classList.remove('scroll-locked');
      document.body.classList.remove('scroll-locked');
      lenis.start();
    }
  }

  function resetAuthForm() {
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    if (statusMsg) {
      statusMsg.className = 'auth-status-msg hidden';
      statusMsg.textContent = '';
    }
    // Set to login tab by default
    authTabBtns.forEach(btn => {
      if (btn.getAttribute('data-auth-tab') === 'login') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    authForms.forEach(form => {
      if (form.id === 'auth-login-form') {
        form.classList.add('active');
      } else {
        form.classList.remove('active');
      }
    });
  }

  // Wire up nav links and close buttons
  const handleAuthClick = async (e) => {
    e.preventDefault();
    if (currentUser) {
      try {
        await logoutUser();
        showToast("Logged out successfully.");
      } catch (err) {
        console.error("Logout error:", err);
      }
    } else {
      openAuthModal();
    }
  };

  if (navAuthBtn) {
    navAuthBtn.addEventListener('click', handleAuthClick);
  }
  if (navSigninBtnMain) {
    navSigninBtnMain.addEventListener('click', handleAuthClick);
  }

  if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
  if (authBackdrop) authBackdrop.addEventListener('click', closeAuthModal);

  // Modal Tab switching
  authTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      authTabBtns.forEach(b => b.classList.remove('active'));
      authForms.forEach(f => f.classList.remove('active'));

      btn.classList.add('active');
      const tabName = btn.getAttribute('data-auth-tab');
      if (tabName === 'login') {
        document.getElementById('auth-login-form').classList.add('active');
      } else if (tabName === 'signup') {
        document.getElementById('auth-signup-form').classList.add('active');
      } else if (tabName === 'admin') {
        document.getElementById('auth-admin-form').classList.add('active');
      }

      if (statusMsg) {
        statusMsg.className = 'auth-status-msg hidden';
        statusMsg.textContent = '';
      }
    });
  });

  // Password Toggle Eye Icon Buttons
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wrapper = btn.closest('.password-input-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('input');
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // Form submissions
  const adminForm = document.getElementById('auth-admin-form');
  if (adminForm) {
    adminForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = document.getElementById('admin-username').value.trim().toLowerCase();
      const pass = document.getElementById('admin-password').value.trim();
      const errorMsg = document.getElementById('admin-signin-error');

      const validAdminUsernames = ['admin', 'admin@modapparels.in', 'modadmin', 'admin123'];
      const validAdminPasses = ['admin@1104', 'admin123', 'admin@123', 'Admin@123', 'admin'];

      if (validAdminUsernames.includes(user) && validAdminPasses.includes(pass)) {
        if (errorMsg) errorMsg.style.display = 'none';
        sessionStorage.setItem('isAdmin', 'true');
        localStorage.setItem('isAdmin', 'true');
        showAuthStatus("Admin authentication successful! Redirecting to dashboard...", "success");
        setTimeout(() => {
          window.location.href = '/admin.html';
        }, 400);
      } else {
        if (errorMsg) {
          errorMsg.textContent = "Invalid Admin Username or Password.";
          errorMsg.style.display = 'block';
        }
        showAuthStatus("Invalid Admin credentials.", "error");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value.trim();

      // Check if user is logging in as Admin via main Log In tab
      const validAdminUsernames = ['admin', 'admin@modapparels.in', 'modadmin', 'admin123'];
      const validAdminPasses = ['admin@1104', 'admin123', 'admin@123', 'Admin@123', 'admin'];

      if (validAdminUsernames.includes(email) && validAdminPasses.includes(password)) {
        sessionStorage.setItem('isAdmin', 'true');
        localStorage.setItem('isAdmin', 'true');
        showAuthStatus("Admin recognized! Redirecting to Admin Portal...", "success");
        setTimeout(() => {
          window.location.href = '/admin.html';
        }, 400);
        return;
      }

      showAuthStatus("Verifying credentials...", "loading");

      try {
        await loginUser(email, password);
        showAuthStatus("Logged in successfully! Redirecting...", "success");
        setTimeout(() => {
          closeAuthModal();
        }, 1500);
      } catch (err) {
        showAuthStatus(err.message || "Failed to log in. Please check your credentials.", "error");
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;

      if (password.length < 8) {
        showAuthStatus("Password must be at least 8 characters.", "error");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        showAuthStatus("Password must contain at least one uppercase letter.", "error");
        return;
      }
      if (!/[a-z]/.test(password)) {
        showAuthStatus("Password must contain at least one lowercase letter.", "error");
        return;
      }
      if (!/[0-9]/.test(password)) {
        showAuthStatus("Password must contain at least one number.", "error");
        return;
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        showAuthStatus("Password must contain at least one special character.", "error");
        return;
      }

      showAuthStatus("Creating your premium account...", "loading");

      try {
        await registerUser(email, password, name);
        showAuthStatus("Account created successfully! Welcome to MOD APPARELS.", "success");
        setTimeout(() => {
          closeAuthModal();
        }, 1500);
      } catch (err) {
        showAuthStatus(err.message || "Failed to create account. Email may already be in use.", "error");
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      showAuthStatus("Connecting to Google...", "loading");
      try {
        await loginWithGoogle();
        showAuthStatus("Authenticated with Google successfully!", "success");
        setTimeout(() => {
          closeAuthModal();
        }, 1500);
      } catch (err) {
        showAuthStatus(err.message || "Google authentication cancelled or failed.", "error");
      }
    });
  }

  function showAuthStatus(msg, type) {
    if (!statusMsg) return;
    statusMsg.className = 'auth-status-msg';
    statusMsg.textContent = msg;

    if (type === 'error') {
      statusMsg.classList.add('error');
    } else if (type === 'success') {
      statusMsg.classList.add('success');
    } else {
      statusMsg.style.background = 'rgba(255, 255, 255, 0.05)';
      statusMsg.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      statusMsg.style.color = 'var(--color-text)';
    }
  }

  // ----------------------------------------------------
  // IMAGE ANALYSIS SIMULATOR
  // ----------------------------------------------------
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('stylist-file-input');
  const analyzeBtn = document.getElementById('btn-analyze-image');
  const previewContainer = document.getElementById('upload-preview-container');
  const previewImg = document.getElementById('upload-preview-img');
  const removeUploadBtn = document.getElementById('btn-remove-upload');
  const analysisLoader = document.getElementById('analysis-loader');

  if (dropzone && fileInput && analyzeBtn) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('hover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('hover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('hover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processUploadedFile(e.dataTransfer.files[0]);
      }
    });

    dropzone.addEventListener('click', (e) => {
      if (e.target !== removeUploadBtn && !previewContainer.contains(e.target)) {
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        processUploadedFile(e.target.files[0]);
      }
    });

    if (removeUploadBtn) {
      removeUploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        previewContainer.classList.add('hidden');
        dropzone.querySelector('.dropzone-prompt').classList.remove('hidden');
        fileInput.value = '';
        analyzeBtn.disabled = true;
        window.lastUploadedFileName = "";
        window.lastUploadedImageData = "";
        matchingProducts = [];
        renderRecommendation();
      });
    }

    async function calculateHash(file) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function processUploadedFile(file) {
      if (!file.type.match('image.*')) {
        showToast("Please upload an image file (PNG/JPG).");
        return;
      }
      window.lastUploadedFileName = file.name;
      window.lastUploadedFileHash = null;

      calculateHash(file).then(hash => {
        window.lastUploadedFileHash = hash;
      }).catch(err => console.error("Hash calculation failed", err));

      const reader = new FileReader();
      reader.onload = (e) => {
        window.lastUploadedImageData = e.target.result;
        previewImg.src = e.target.result;
        previewContainer.classList.remove('hidden');
        dropzone.querySelector('.dropzone-prompt').classList.add('hidden');
        analyzeBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }

    analyzeBtn.addEventListener('click', () => {
      analysisLoader.classList.remove('hidden');
      analyzeBtn.disabled = true;

      setTimeout(() => {
        analysisLoader.classList.add('hidden');
        analyzeBtn.disabled = false;

        // Simulate AI Vision Match based on uploaded image
        let item = null;
        let isUploadSearch = false;
        const fileName = (window.lastUploadedFileName || "").toLowerCase();

        if (fileName) {
          isUploadSearch = true;
          let allItems = [];
          Object.values(categoryData).forEach(cat => {
            allItems = allItems.concat(cat);
          });

          let bestMatch = null;

          // 1. Attempt exact image match using SHA-256 hash
          if (window.lastUploadedFileHash) {
            bestMatch = allItems.find(p => p.imageHash === window.lastUploadedFileHash);
          }

          // 2. Fallback to keyword matching if no exact hash match found
          if (!bestMatch) {
            const ignoreWords = ['png', 'jpg', 'jpeg', 'webp', 'screenshot', 'image', 'pic', 'img'];
            const tokens = fileName.replace(/[^a-z0-9]/g, ' ').split(' ').filter(t => t.length > 2 && !ignoreWords.includes(t));

            if (tokens.length > 0) {
              let bestScore = 0;
              for (const prod of allItems) {
                let score = 0;
                const text = (prod.name + " " + prod.desc + " " + (prod.colors ? prod.colors.join(" ") : "") + " " + (prod.category || "")).toLowerCase();
                for (const token of tokens) {
                  if (text.includes(token)) score++;
                }
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = prod;
                }
              }
            }
          }

          if (bestMatch) {
            item = { ...bestMatch };
            if (window.lastUploadedImageData) {
              item.image = window.lastUploadedImageData;
            }
          }
        } else {
          // Randomly pick a category to scan styles from, matching name attributes
          const genders = ["Men's Wear", "Women's Wear", "Kids' Apparel", "Festive Wear"];
          const chosenCategory = genders[Math.floor(Math.random() * genders.length)];
          const categoryItems = categoryData[chosenCategory];
          if (categoryItems && categoryItems.length > 0) {
            item = categoryItems[Math.floor(Math.random() * categoryItems.length)];
          }
        }

        if (item) {
          wizardData.gender = item.category || item.srcCat || "Men's Wear";
          wizardData.occasion = item.occasions ? item.occasions[0] : "Casual";
          if (wizardData.gender === "Women's Wear") {
            wizardData.bodyShape = item.bodyShapes ? item.bodyShapes[0] : "Hourglass";
          }
          wizardData.budget = item.price + 2000;
          wizardData.colors = item.colors || ["Neutral"];

          matchingProducts = [item];
          currentRecIndex = 0;

          renderRecommendation();
          showToast(`AI Matching Complete: Found items similar to your upload!`);
        } else if (isUploadSearch) {
          matchingProducts = [];
          renderRecommendation();
          showToast(`No similar products found in our catalog.`);
        }
      }, 2000);
    });
  }

  // ----------------------------------------------------
  // BOOKING / SCHEDULER SYSTEM LOGIC
  // ----------------------------------------------------
  const bookingForm = document.getElementById('booking-form');
  const bookingDateInput = document.getElementById('booking-date');
  const slotBtns = document.querySelectorAll('.booking-slots-grid .slot-btn');
  const bookingPurposeSelect = document.getElementById('booking-purpose');
  const bookingsListContainer = document.getElementById('user-bookings-list');
  const bookingLoginBtn = document.getElementById('btn-booking-login');

  // Slot buttons selection
  slotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      slotBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSlot = btn.getAttribute('data-slot');
    });
  });

  // Limit calendar selection to today and future dates
  if (bookingDateInput) {
    const todayStr = new Date().toISOString().split('T')[0];
    bookingDateInput.min = todayStr;
  }

  // Bind Login Trigger in Booking tab
  if (bookingLoginBtn) {
    bookingLoginBtn.addEventListener('click', () => {
      openAuthModal();
    });
  }

  // Booking Form Submission
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) {
        openAuthModal();
        showToast("Please log in to book a showroom visit.");
        return;
      }

      if (!selectedSlot) {
        showToast("Please select a convenient time slot.");
        return;
      }

      const dateVal = bookingDateInput.value;
      const purposeVal = bookingPurposeSelect.value;

      if (!dateVal || !purposeVal) {
        showToast("Please fill in all requested fitting details.");
        return;
      }

      const newBooking = {
        id: Date.now(),
        date: dateVal,
        slot: selectedSlot,
        purpose: purposeVal,
        createdAt: new Date().toISOString()
      };

      try {
        showToast("Scheduling showroom visit...");
        await bookShowroomVisit(currentUser.uid, newBooking);
        showToast("Visit scheduled successfully! ✦");

        // Reset form state
        bookingForm.reset();
        slotBtns.forEach(b => b.classList.remove('active'));
        selectedSlot = "";

        // Refresh appointment list
        renderUserBookings();
      } catch (err) {
        console.error("Booking error:", err);
        showToast("Failed to book showroom visit. Please try again.");
      }
    });
  }

  // Render scheduled showroom bookings
  async function renderUserBookings() {
    if (!bookingsListContainer) return;

    if (!currentUser) {
      bookingsListContainer.innerHTML = `
        <div class="booking-empty">
          <p>Please log in to view your scheduled visits.</p>
        </div>
      `;
      return;
    }

    try {
      const visits = await fetchUserVisits(currentUser.uid);
      if (visits.length === 0) {
        bookingsListContainer.innerHTML = `
          <div class="booking-empty">
            <p>No upcoming visits scheduled.</p>
            <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 5px;">Book a slot above to customize your premium dresses.</p>
          </div>
        `;
        return;
      }

      bookingsListContainer.innerHTML = visits.map(visit => `
        <div class="user-booking-card" data-booking-id="${visit.id}">
          <div class="booking-card-info">
            <span class="booking-card-purpose">${visit.purpose}</span>
            <span class="booking-card-time">📅 ${visit.date} • ${visit.slot}</span>
          </div>
          <button class="btn-cancel-booking" data-booking-id="${visit.id}" type="button">Cancel</button>
        </div>
      `).join('');

      // Bind cancel buttons click
      bookingsListContainer.querySelectorAll('.btn-cancel-booking').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.getAttribute('data-booking-id'));
          try {
            showToast("Cancelling showroom visit...");
            await cancelShowroomVisit(currentUser.uid, id);
            showToast("Showroom visit cancelled successfully.");
            renderUserBookings();
          } catch (err) {
            console.error("Cancel visit error:", err);
            showToast("Failed to cancel showroom visit.");
          }
        });
      });

    } catch (err) {
      console.error("Fetch visits error:", err);
      bookingsListContainer.innerHTML = `
        <div class="booking-empty">
          <p>Failed to load appointments. Please check connection.</p>
        </div>
      `;
    }
  }
}

function closeAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (authModal) {
    authModal.classList.remove('active');
  }
}



// ----------------------------------------------------
// Toast Notification
// ----------------------------------------------------
function showToast(message) {
  const toast = document.getElementById('stylist-toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3000);
  }
}

// ----------------------------------------------------
// Theme Specific Sounds
// ----------------------------------------------------
function initThemeSound() {
  // Centralized in initSound()
}

function renderOffers() {
  const container = document.getElementById('dynamic-offers-container');
  if (!container) return;

  const currentOffersData = JSON.parse(localStorage.getItem('offersData')) || defaultOffersData;
  container.innerHTML = '';

  currentOffersData.forEach(offer => {
    let buttonHtml = '';
    if (offer.btnText && offer.category) {
      buttonHtml = `<button class="cta-button" onclick="window.openCategoryModal('${offer.category.replace(/'/g, "\\'")}')">${offer.btnText}</button>`;
    }

    const card = document.createElement('div');
    card.className = 'offer-card';
    card.innerHTML = `
      <div class="offer-bg-element"></div>
      <div class="offer-content">
        <h3 class="offer-title">${offer.title}</h3>
        <div class="offer-discount">${offer.discount}</div>
        <p class="offer-desc">${offer.desc}</p>
        ${buttonHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

function initCustomCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const style = document.createElement('style');
  style.innerHTML = `
    .custom-cursor-active, .custom-cursor-active * { cursor: none !important; }
    .custom-cursor-active input, .custom-cursor-active textarea { cursor: text !important; }
  `;
  document.head.appendChild(style);
  document.body.classList.add('custom-cursor-active');

  const cursorLayer = document.createElement('div');
  cursorLayer.id = 'custom-cursor-layer';
  cursorLayer.style.cssText = 'pointer-events: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999;';

  const label = document.createElement('div');
  label.id = 'cursor-label';
  label.style.cssText = 'position: absolute; top: 0; left: 0; background: #fff; color: #000; padding: 5px 10px; border-radius: 999px; font-weight: 600; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08); opacity: 0; transition: opacity 0.15s ease; white-space: nowrap; transform-origin: 0% 50%; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; letter-spacing: 0.1px;';
  label.textContent = 'Guest';

  const arrow = document.createElement('div');
  arrow.id = 'cursor-arrow';
  arrow.style.cssText = 'position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.15s ease; transform-origin: 0% 0%; width: 31px; height: 31px;';
  arrow.innerHTML = `<svg width="31" height="31" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible;"><path d="M5 3 L23 14 L14 16 L11 24 Z" fill="#fff" stroke="rgba(0,0,0,0.18)" stroke-width="0.6" stroke-linejoin="round"/></svg>`;

  cursorLayer.appendChild(label);
  cursorLayer.appendChild(arrow);
  document.body.appendChild(cursorLayer);

  let mouseX = -999;
  let mouseY = -999;
  let arrowX = -999;
  let arrowY = -999;
  let labelX = -999;
  let labelY = -999;

  let velocityX = 0;
  let lastX = -999;
  let lastTime = Date.now();
  let labelRotation = 0;

  const arrowSetX = gsap.quickSetter(arrow, "x", "px");
  const arrowSetY = gsap.quickSetter(arrow, "y", "px");
  const labelSetX = gsap.quickSetter(label, "x", "px");
  const labelSetY = gsap.quickSetter(label, "y", "px");
  const labelSetRotate = gsap.quickSetter(label, "rotate", "deg");

  window.addEventListener('mousemove', (e) => {
    if (mouseX === -999) {
      arrowX = e.clientX;
      arrowY = e.clientY;
      labelX = e.clientX;
      labelY = e.clientY;
      lastX = e.clientX;
    }

    mouseX = e.clientX;
    mouseY = e.clientY;

    label.style.opacity = '1';
    arrow.style.opacity = '1';

    const now = performance.now();
    const dt = Math.max(1, now - lastTime);
    velocityX = ((mouseX - lastX) / dt) * 1000;
    lastX = mouseX;
    lastTime = now;
  });

  document.addEventListener('mouseleave', () => {
    label.style.opacity = '0';
    arrow.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    label.style.opacity = '1';
    arrow.style.opacity = '1';
  });

  setInterval(() => {
    let userName = 'Guest';
    if (window.modCurrentUser) {
      userName = window.modCurrentUser.displayName || (window.modCurrentUser.email ? window.modCurrentUser.email.split('@')[0] : 'Guest');
    }
    if (label.textContent !== userName) {
      label.textContent = userName;
    }
  }, 1000);

  gsap.ticker.add(() => {
    if (mouseX === -999) return;

    arrowX += (mouseX - arrowX) * 0.35;
    arrowY += (mouseY - arrowY) * 0.35;

    labelX += (mouseX - labelX) * 0.15;
    labelY += (mouseY - labelY) * 0.15;

    const sign = velocityX === 0 ? 0 : velocityX > 0 ? 1 : -1;
    const speed = Math.abs(velocityX);
    const norm = Math.min(1, speed / 1500);
    const targetRotation = sign * norm * 25;

    labelRotation += (targetRotation - labelRotation) * 0.1;

    arrowSetX(arrowX);
    arrowSetY(arrowY);

    labelSetX(labelX + 27);
    labelSetY(labelY + 13);
    labelSetRotate(labelRotation);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initThemeSound();
  renderOffers();
  initCustomCursor();
  initClickEffect();
});

let tapAudioCtx = null;

function playSubtleTapSound() {
  try {
    if (!tapAudioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        tapAudioCtx = new AudioCtxClass();
      }
    }
    if (tapAudioCtx && tapAudioCtx.state === 'suspended') {
      tapAudioCtx.resume();
    }
    if (!tapAudioCtx) return;

    const osc = tapAudioCtx.createOscillator();
    const gain = tapAudioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, tapAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, tapAudioCtx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.04, tapAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, tapAudioCtx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(tapAudioCtx.destination);

    osc.start();
    osc.stop(tapAudioCtx.currentTime + 0.035);
  } catch (err) {
    // Ignore audio context errors silently
  }
}

function initClickEffect() {
  const effectSize = 90;
  const strokeWidth = 2;
  const duration = 0.3;
  const color = "#ffffff";

  document.addEventListener("click", (e) => {
    playSubtleTapSound();
    const x = e.clientX;
    const y = e.clientY;

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: ${x - effectSize / 2}px;
      top: ${y - effectSize / 2}px;
      width: ${effectSize}px;
      height: ${effectSize}px;
      pointer-events: none;
      z-index: 999998;
      overflow: visible;
    `;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", effectSize);
    svg.setAttribute("height", effectSize);
    svg.style.cssText = "position: absolute; top: 0; left: 0; overflow: visible;";

    const centerX = effectSize / 2;
    const centerY = effectSize / 2;
    const lineLength = effectSize * 0.2;

    [0, 90, 180, 270].forEach(deg => {
      const angle = deg * (Math.PI / 180);
      const startX = centerX + 5 * Math.cos(angle);
      const startY = centerY - 5 * Math.sin(angle);
      const endX = centerX + (5 + lineLength) * Math.cos(angle);
      const endY = centerY - (5 + lineLength) * Math.sin(angle);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", startX);
      line.setAttribute("y1", startY);
      line.setAttribute("x2", endX);
      line.setAttribute("y2", endY);
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", strokeWidth);
      line.setAttribute("stroke-linecap", "square");

      svg.appendChild(line);

      gsap.to(line, {
        attr: { x1: endX, y1: endY, x2: endX, y2: endY },
        x: (5 + lineLength) * Math.cos(angle),
        y: -(5 + lineLength) * Math.sin(angle),
        duration: duration,
        ease: "power2.out"
      });

      gsap.to(line, {
        strokeWidth: 0,
        duration: duration * 0.4,
        ease: "linear",
        delay: duration * 0.6
      });
    });

    container.appendChild(svg);

    const angles = [
      Math.PI / 3,
      (2 * Math.PI) / 3,
      (4 * Math.PI) / 3,
      (5 * Math.PI) / 3,
      Math.PI / 6,
      (5 * Math.PI) / 6,
      (7 * Math.PI) / 6,
      (11 * Math.PI) / 6,
    ];

    angles.forEach(angle => {
      const particle = document.createElement("div");
      particle.style.cssText = `
        position: absolute;
        left: ${centerX - strokeWidth / 2}px;
        top: ${centerY - strokeWidth / 2}px;
        width: ${strokeWidth}px;
        height: ${strokeWidth}px;
        background-color: ${color};
        pointer-events: none;
      `;
      container.appendChild(particle);

      gsap.to(particle, {
        x: Math.cos(angle) * (effectSize * 0.4),
        y: Math.sin(angle) * (effectSize * 0.4),
        duration: duration,
        ease: "power2.out"
      });

      gsap.to(particle, {
        width: 0,
        height: 0,
        duration: duration * 0.4,
        ease: "linear",
        delay: duration * 0.6
      });
    });

    document.body.appendChild(container);

    setTimeout(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, duration * 1000 + 100);
  });
}
