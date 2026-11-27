import { Link } from "react-router-dom";
import type { SiteLinkGroup } from "@/data/siteLinks";

interface RelatedLinksProps {
  heading: string;
  groups: SiteLinkGroup[];
  /** The page being shown, left out of the lists. */
  currentPath?: string;
}

// In-content links between related pages (subjects, curricula, cities, families abroad). They tell search engines how
// the pages fit together, which the site-wide footer alone does not.
export const RelatedLinks = ({ heading, groups, currentPath }: RelatedLinksProps) => {
  const visible = groups
    .map((group) => ({ ...group, links: group.links.filter((link) => link.to !== currentPath) }))
    .filter((group) => group.links.length > 0);
  if (visible.length === 0) return null;
  return (
    <section className="py-14 border-t">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">{heading}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold mb-3">{group.title}</h3>
              <ul className="flex flex-wrap gap-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="inline-block rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
