import React from "react";
import { COLORS } from "./supportives/colors";

const Ethics: React.FC = () => {
  const sections = [
    {
      title: "Cultural Governance",
      content: "We manage heritage data in collaboration with source communities. Our framework ensures that digital preservation aligns with the cultural protocols and values of the originators."
    },
    {
      title: "Digital Attribution",
      content: "All recordings and documentation within the database include mandatory attribution. We maintain clear records of provenance to acknowledge the creators and communities behind every asset."
    },
    {
      title: "Informed Consent",
      content: "Data is collected and shared based on the consent of tradition bearers. We provide structures that allow communities to define the terms of access and representation for their heritage."
    },
    {
      title: "Access and Equity",
      content: "We facilitate access to digitized cultural knowledge for descendant communities. Our goal is to ensure that technological advancements support the continuity of heritage across generations."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-normal mb-4" style={{ fontFamily: "Calibri", color: COLORS.primaryColor }}>
          ETHICS & GOVERNANCE
        </h2>
        <div className="h-0.5 w-16 mx-auto" style={{ backgroundColor: COLORS.borderOrange }} />
        <p className="mt-6 text-gray-600 max-w-2xl mx-auto leading-relaxed text-sm">
          Heritage in Code operates under a professional ethical framework designed to ensure the respectful documentation and preservation of cultural materials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <div 
            key={idx} 
            className="p-6 rounded-lg border bg-white" 
            style={{ borderColor: COLORS.borderLight }}
          >
            <h3 className="text-lg font-medium mb-3" style={{ color: COLORS.textDark }}>
              {section.title}
            </h3>
            <p className="text-sm leading-relaxed text-gray-500">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ethics;