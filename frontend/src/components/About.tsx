import React from "react";
import { COLORS } from "./supportives/colors";

const About: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      <div className="mb-20">
        <h2 className="text-3xl md:text-4xl font-normal mb-6" style={{ fontFamily: "Calibri", color: COLORS.primaryColor }}>
          ABOUT THE PROJECT
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Heritage in Code is a digital initiative focused on archiving, preserving, and revitalizing traditional musical heritage through modern technology. Our platform serves as a bridge, allowing traditional sounds to be documented while providing a space for contemporary artists to create respectful fusions.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We work closely with source communities to ensure that every recording is attributed correctly and preserved with the highest ethical standards, keeping cultural identities alive in the digital landscape.
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-2xl border" style={{ borderColor: COLORS.borderLight }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.textDark }}>
              Contact Information
            </h3>
            <div className="space-y-3 text-sm text-gray-500">
              <p>
                <span className="font-medium" style={{ color: COLORS.primaryColor }}>Email:</span> info@heritageincode.org
              </p>
              <p>
                <span className="font-medium" style={{ color: COLORS.primaryColor }}>Location:</span> Wits MIND Institute, Johannesburg
              </p>
              <p>
                <span className="font-medium" style={{ color: COLORS.primaryColor }}>Website:</span> www.heritageincode.org
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t pt-12" style={{ borderColor: COLORS.borderLight }}>
        <div>
          <h4 className="font-bold mb-3" style={{ color: COLORS.textDark }}>Global Reach</h4>
          <p className="text-xs leading-relaxed text-gray-500">
            Connecting traditional performers from diverse backgrounds with a global audience to ensure cultural visibility and economic recognition.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-3" style={{ color: COLORS.textDark }}>Preservation</h4>
          <p className="text-xs leading-relaxed text-gray-500">
            Using high-fidelity archival methods to protect endangered musical languages and oral traditions from digital erasure and cultural loss.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-3" style={{ color: COLORS.textDark }}>Innovation</h4>
          <p className="text-xs leading-relaxed text-gray-500">
            Providing technical frameworks for artists to create modern fusions while maintaining the integrity and respect of original cultural roots.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;