/**
 * FAQSection.tsx
 * A clean, minimalist accordion for frequently asked questions.
 * Features:
 * - Expandable and collapsible items with smooth Framer Motion transitions.
 * - Layout designed to stay legible on both mobile and desktop.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { NewsletterModal } from './NewsletterModal';

interface FAQItemProps {
  question: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, children, isOpen, onClick }) => {
  return (
    <div className="overflow-hidden border-t border-secondary-current py-6 md:py-8">
      <button
        onClick={onClick}
        className="flex w-full cursor-pointer items-start justify-between text-left group"
      >
        <span className="max-w-[60ch] flex-1 pr-4">
          <p className="text-lg md:text-xl font-medium tracking-tight text-secondary-blush">{question}</p>
        </span>
        <span 
          className={`inline-flex shrink-0 pt-1 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="h-5 w-5 opacity-40 text-white group-hover:opacity-100 transition-opacity" />
        </span>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="pt-6 pb-2 text-white leading-relaxed font-light text-base md:text-lg max-w-[65ch]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faqs" className="bg-white">
      <div className="relative m-4 overflow-hidden rounded-xl bg-secondary-purple-rain p-6 md:m-6 md:p-8 lg:p-12">
        <div className="grid grid-cols-1 pt-10 pb-20 gap-12 lg:grid-cols-12 lg:gap-6 lg:items-start">
          <h2 className="text-left text-3xl font-light tracking-tight text-secondary-blush md:text-7xl lg:col-span-12 mb-12 md:mb-16">
            Frequently Asked Questions (FAQs)
          </h2>
          <div className="lg:col-span-5 self-start flex justify-start">
          <img
            src="/images/250401_kandiegang_seasonopener_2025-28-scaled.jpg"
            alt="Kandie Gang social ride"
            className="w-3/3 max-w-full rounded-xl object-cover aspect-video md:aspect-[16/9]"
            loading="lazy"
          />
        </div>

        <div className="lg:col-span-7 self-start">
          <div className="w-full flex flex-col">
            <FAQItem 
              question="Who is Kandie Gang?" 
              isOpen={openIndex === 0} 
              onClick={() => toggleIndex(0)}
            >
              <p className="mb-4">Kandie Gang is an inclusive cycling community originally conceived of in 2019 as a small fixed-gear and cyclocross team and has since grown into a broader group that supports riders of all backgrounds, especially FLINTA* (women, non-binary, trans, intersex, agender) and BIPOC, to participate in cycling culture.</p>
              <ul className="space-y-3 pl-2 border-l-2 border-slate-100">
                <li className="pl-3"><strong>FLINTA*:</strong> German abbreviation that stands for "Frauen, Lesben, Intergeschlechtliche, nichtbinäre, trans und agender Personen", meaning women, lesbians, intersex, non-binary, trans and agender people</li>
                <li className="pl-3"><strong>BIPOC:</strong> black, indigenous, and other people of color</li>
              </ul>
            </FAQItem>

            <FAQItem 
              question="What does Kandie Gang do?" 
              isOpen={openIndex === 1} 
              onClick={() => toggleIndex(1)}
            >
              <p>We organize social rides, group training, events, racing support, and community building activities that bring people together around bikes. It's about supporting one another by riding, training, and connecting with one another.</p>
            </FAQItem>


            
            <FAQItem 
              question="How can I join a Kandie Gang ride?" 
              isOpen={openIndex === 3} 
              onClick={() => toggleIndex(3)}
            >
              <p>To join one of our hosted social rides, group workouts, races, and other cycling events throughout the year the best way is to connect with us on one of the following platforms:</p>
              <br />
              <ul className="space-y-3 pl-2 border-l-2 border-slate-100">
              <li className="pl-3"><strong><a href="https://discord.gg/zddt89Q4hm" target="_blank" rel="noopener noreferrer" className="text-secondary-blush hover:underline">Discord Server 🔗</a>:</strong> this is where we coordinate our rides and events, share information, and connect with one another.</li>
                <li className="pl-3"><strong><a href="https://www.strava.com/clubs/968945" target="_blank" rel="noopener noreferrer" className="text-secondary-blush hover:underline">Strava Club 🔗</a>:</strong> we all use Strava to track our rides and post our rides to the club page. That said, our Discord server is more up-to-date.</li>
                <li className="pl-3"><strong><a href="https://www.instagram.com/kandie_gang/" target="_blank" rel="noopener noreferrer" className="text-secondary-blush hover:underline">Instagram 🔗</a>:</strong> this is where we document our rides and events. Long-term we are definitely looking to move more of our content to our website.</li>
                <li className="pl-3"><strong><button type="button" onClick={() => setNewsletterModalOpen(true)} className="text-secondary-blush hover:underline bg-transparent border-none p-0 font-inherit cursor-pointer inline text-left">Kandie Gang Newsletter</button>:</strong> sign-up to receive updates on our rides and activities.</li>
              </ul>
              <p><br />You don't have to have a paid membership to join a ride but it does help us keep things running smoothly. The best way to join a ride is connecting with us through our <a href="https://discord.gg/zddt89Q4hm" target="_blank" rel="noopener noreferrer" className="text-secondary-blush hover:underline">Discord Server 🔗</a>: or reach out to one of our guides.</p>
            </FAQItem>

            {/* Fixed error: Removed undefined FooterLink component call */}
            <FAQItem 
              question="What else do I need to know to ride with Kandie Gang?" 
              isOpen={openIndex === 2} 
              onClick={() => toggleIndex(2)}
            >
              <p>On our Social Rides, we regularly host well over over fifty riders. Therefore, we have a few guidelines that we ask you to follow that can found here:</p>
              <br />
              <ul className="space-y-3 pl-2 border-l-2 border-slate-100">
                <li className="pl-3"><strong><a href="/#/kandiecode" className="text-secondary-blush hover:underline">Kandie Code</a>:</strong> Wir möchten hier nochmal ein paar 'Kandie Codes' ansprechen, die wir als selbstverständlich sehen und in der Kandie Gang als 'Kandie Kodex' im Verhalten miteinander verstehen.</li>
                <li className="pl-3"><strong><a href="/#/ridelevels" className="text-secondary-blush hover:underline">Ride Levels</a>:</strong> Du willst bei einem Kandie Ride mitfahren und willst das für Dich passende Level finden? Dann bist Du hier genau richtig, denn hier findest Du die Eckdaten zu den vier Gruppen.</li>
                <li className="pl-3"><strong><a href="/#/waiver" className="text-secondary-blush hover:underline">Accidents happen</a>:</strong> Bitte unterschreibe den Haftungsausschluss für jede Saison oder, falls du dir unsicher bist, vor jeder Gruppenfahrt.</li>
              </ul>
            </FAQItem>
          </div>
        </div>
        </div>
      </div>

      <NewsletterModal isOpen={newsletterModalOpen} onClose={() => setNewsletterModalOpen(false)} />
    </section>
  );
};