import { MultiTutorPackageBuilder } from "@/components/MultiTutorPackageBuilder";
import { SEO } from "@/components/SEO";

const MultiTutorPackage = () => {
  return (
    <>
      <SEO
        title="Build Multi-Subject Package | LANA Tutors"
        description="Create custom learning packages across multiple subjects and tutors"
      />
      <MultiTutorPackageBuilder />
    </>
  );
};

export default MultiTutorPackage;
