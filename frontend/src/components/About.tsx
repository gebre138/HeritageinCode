import React from "react";
import { COLORS } from "./supportives/colors";

const About: React.FC = () => {
  const whatWeDo = [
    {
      title: "Preserve",
      desc: "Digitizing African heritage sounds with full cultural context to ensure their preservation for future generations.",
    },
    {
      title: "Protect",
      desc: "Ensuring ethical attribution, informed consent, and community governance at every stage of the collection process.",
    },
    {
      title: "Create",
      desc: "Enabling the digitization of heritage sounds and the responsible use of AI in engaging with African sonic heritage.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-10 text-center">What We Do</h2>
        <div className="space-y-4">
          {whatWeDo.map((item) => (
            <div key={item.title} className="bg-white p-6 rounded-xl border-l-4 shadow-sm w-full" style={{ borderLeftColor: COLORS.primaryColor, backgroundColor: COLORS.bgWarm }}>
              <h3 className="text-xl font-bold mb-2 uppercase" style={{ color: COLORS.primaryColor }}>{item.title}</h3>
              <p className="text-gray-700 text-justify font-normal leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t pt-12" style={{ borderColor: COLORS.borderLight }}>
        <div>
          <h4 className="font-bold mb-3" style={{ color: COLORS.textDark }}>Global Reach</h4>
          <p className="text-xs leading-relaxed text-gray-500 font-normal">
            Connecting traditional performers from diverse backgrounds with a global audience to ensure cultural visibility and economic recognition.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-3" style={{ color: COLORS.textDark }}>Preservation</h4>
          <p className="text-xs leading-relaxed text-gray-500 font-normal">
            Using high-fidelity archival methods to protect endangered musical languages and oral traditions from digital erasure and cultural loss.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-3" style={{ color: COLORS.textDark }}>Innovation</h4>
          <p className="text-xs leading-relaxed text-gray-500 font-normal">
            Providing technical frameworks for artists to create modern fusions while maintaining the integrity and respect of original cultural roots.
          </p>
        </div>
      </div>

      <div className="mt-20 pt-10 border-t flex flex-col items-center text-center space-y-4" style={{ borderColor: COLORS.borderLight }}>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: COLORS.textMuted }}>Get in Touch</h4>
        <a 
          href="mailto:gerenigusie138@gmail.com" 
          className="text-lg font-medium transition-colors hover:opacity-70"
          style={{ color: COLORS.primaryColor }}
        >
          gerenigusie138@gmail.com
        </a>
      </div>
    </div>
  );
};

export default About;