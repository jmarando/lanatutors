import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Lana Tutors</h3>
            <p className="text-primary-foreground/80 text-sm">
              Quality tutoring for every learner. Connecting students with expert tutors across Kenya and beyond.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about-us" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/find-a-tutor" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Find a Tutor
                </Link>
              </li>
              <li>
                <Link to="/become-a-tutor" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Become a Tutor
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Mail className="h-4 w-4" />
                <a href="mailto:info@lanatutors.africa" className="hover:text-primary-foreground transition-colors">
                  info@lanatutors.africa
                </a>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Phone className="h-4 w-4" />
                <a href="tel:+254700000000" className="hover:text-primary-foreground transition-colors">
                  +254 700 000 000
                </a>
              </li>
            </ul>
            
            {/* Social Links */}
            <div className="flex gap-4 pt-2">
              <a 
                href="https://facebook.com/lanatutors" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com/lanatutors" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com/lanatutors" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com/company/lanatutors" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/60">
          <p>© {new Date().getFullYear()} Lana Tutors. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
