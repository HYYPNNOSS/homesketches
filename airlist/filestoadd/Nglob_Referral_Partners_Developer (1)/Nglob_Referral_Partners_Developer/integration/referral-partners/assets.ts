import hero480 from "./assets/responsive/hero-480.webp";
import hero768 from "./assets/responsive/hero-768.webp";
import hero1024 from "./assets/responsive/hero-1024.webp";
import hero1280 from "./assets/responsive/hero-1280.webp";
import company480 from "./assets/responsive/company-480.webp";
import company768 from "./assets/responsive/company-768.webp";
import company1024 from "./assets/responsive/company-1024.webp";
import company1280 from "./assets/responsive/company-1280.webp";
import move480 from "./assets/responsive/move-480.webp";
import move768 from "./assets/responsive/move-768.webp";
import move1024 from "./assets/responsive/move-1024.webp";
import move1280 from "./assets/responsive/move-1280.webp";
import itemListPhoto240 from "./assets/responsive/item-list-photo-240.webp";
import itemListPhoto400 from "./assets/responsive/item-list-photo-400.webp";
import itemListPhoto640 from "./assets/responsive/item-list-photo-640.webp";
import referral320 from "./assets/responsive/referral-320.webp";
import referral640 from "./assets/responsive/referral-640.webp";
import business320 from "./assets/responsive/business-320.webp";
import business640 from "./assets/responsive/business-640.webp";
import manualList112 from "./assets/responsive/manual-list-112.webp";
import manualList224 from "./assets/responsive/manual-list-224.webp";
import manualList336 from "./assets/responsive/manual-list-336.webp";
import photoVideo112 from "./assets/responsive/photo-video-112.webp";
import photoVideo224 from "./assets/responsive/photo-video-224.webp";
import photoVideo336 from "./assets/responsive/photo-video-336.webp";
import collectionIcon80 from "./assets/responsive/collection-icon-80.webp";
import collectionIcon160 from "./assets/responsive/collection-icon-160.webp";
import collectionIcon240 from "./assets/responsive/collection-icon-240.webp";
import deliveryIcon80 from "./assets/responsive/delivery-icon-80.webp";
import deliveryIcon160 from "./assets/responsive/delivery-icon-160.webp";
import deliveryIcon240 from "./assets/responsive/delivery-icon-240.webp";
import moveIcon80 from "./assets/responsive/move-icon-80.webp";
import moveIcon160 from "./assets/responsive/move-icon-160.webp";
import moveIcon240 from "./assets/responsive/move-icon-240.webp";
import asset0 from "./assets/business.webp";
import asset1 from "./assets/collection-icon.webp";
import asset2 from "./assets/company.webp";
import asset3 from "./assets/delivery-icon.webp";
import asset4 from "./assets/hero.webp";
import asset5 from "./assets/item-list-photo.webp";
import asset6 from "./assets/manual-list.webp";
import asset7 from "./assets/move-icon.webp";
import asset8 from "./assets/move.webp";
import asset10 from "./assets/original-shortmark.png";
import asset11 from "./assets/photo-video.webp";
import asset12 from "./assets/referral.webp";

/** Vite asset imports support bundling, SSR and a non-root base path. */
export const assets = {
  "business.webp": asset0,
  "collection-icon.webp": asset1,
  "company.webp": asset2,
  "delivery-icon.webp": asset3,
  "hero.webp": asset4,
  "item-list-photo.webp": asset5,
  "manual-list.webp": asset6,
  "move-icon.webp": asset7,
  "move.webp": asset8,
  "original-shortmark.png": asset10,
  "photo-video.webp": asset11,
  "referral.webp": asset12,
} as const;

/**
 * Local responsive candidates. Original full-resolution files remain fallbacks.
 * Photo sizes account for object-fit: cover so tall crops stay sharp on Retina
 * screens; contained illustrations use the visible artwork width.
 */
export const responsiveAssets = {
  "hero.webp": {
    src: assets["hero.webp"],
    srcset: `${hero480} 480w, ${hero768} 768w, ${hero1024} 1024w, ${hero1280} 1280w, ${assets["hero.webp"]} 1536w`,
    sizes: "(max-width: 403px) 360px, (max-width: 700px) calc(100vw - 44px), (max-width: 1100px) 657px, 699px",
  },
  "company.webp": {
    src: assets["company.webp"],
    srcset: `${company480} 480w, ${company768} 768w, ${company1024} 1024w, ${company1280} 1280w, ${assets["company.webp"]} 1536w`,
    sizes: "(max-width: 367px) 323px, (max-width: 700px) calc(100vw - 44px), (max-width: 1100px) 513px, 581px",
  },
  "move.webp": {
    src: assets["move.webp"],
    srcset: `${move480} 480w, ${move768} 768w, ${move1024} 1024w, ${move1280} 1280w, ${assets["move.webp"]} 1536w`,
    sizes: "(max-width: 397px) 353px, (max-width: 700px) calc(100vw - 44px), 552px",
  },
  "item-list-photo.webp": {
    src: assets["item-list-photo.webp"],
    srcset: `${itemListPhoto240} 240w, ${itemListPhoto400} 400w, ${itemListPhoto640} 640w, ${assets["item-list-photo.webp"]} 1000w`,
    sizes: "(max-width: 360px) 240px, (max-width: 700px) calc(50vw - 57px), (max-width: 900px) 256px, 242px",
  },
  "referral.webp": {
    src: assets["referral.webp"],
    srcset: `${referral320} 320w, ${referral640} 640w, ${assets["referral.webp"]} 1100w`,
    sizes: "(max-width: 360px) 266px, (max-width: 700px) 301px, 316px",
  },
  "business.webp": {
    src: assets["business.webp"],
    srcset: `${business320} 320w, ${business640} 640w, ${assets["business.webp"]} 1100w`,
    sizes: "(max-width: 360px) 266px, (max-width: 700px) 301px, 316px",
  },
  "manual-list.webp": {
    src: assets["manual-list.webp"],
    srcset: `${manualList112} 112w, ${manualList224} 224w, ${manualList336} 336w, ${assets["manual-list.webp"]} 900w`,
    sizes: "(max-width: 360px) 96px, (max-width: 700px) 104px, 112px",
  },
  "photo-video.webp": {
    src: assets["photo-video.webp"],
    srcset: `${photoVideo112} 112w, ${photoVideo224} 224w, ${photoVideo336} 336w, ${assets["photo-video.webp"]} 900w`,
    sizes: "(max-width: 360px) 96px, (max-width: 700px) 104px, 112px",
  },
  "collection-icon.webp": {
    src: assets["collection-icon.webp"],
    srcset: `${collectionIcon80} 80w, ${collectionIcon160} 160w, ${collectionIcon240} 240w, ${assets["collection-icon.webp"]} 480w`,
    sizes: "(max-width: 360px) 59px, (max-width: 700px) 64px, 80px",
  },
  "delivery-icon.webp": {
    src: assets["delivery-icon.webp"],
    srcset: `${deliveryIcon80} 80w, ${deliveryIcon160} 160w, ${deliveryIcon240} 240w, ${assets["delivery-icon.webp"]} 480w`,
    sizes: "(max-width: 360px) 59px, (max-width: 700px) 64px, 80px",
  },
  "move-icon.webp": {
    src: assets["move-icon.webp"],
    srcset: `${moveIcon80} 80w, ${moveIcon160} 160w, ${moveIcon240} 240w, ${assets["move-icon.webp"]} 480w`,
    sizes: "(max-width: 360px) 59px, (max-width: 700px) 64px, 80px",
  },
} as const;
