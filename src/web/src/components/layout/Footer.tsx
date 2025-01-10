import React, { memo, useCallback } from 'react';
import '../../styles/variables.css';

// Types
interface FooterLink {
  id: string;
  label: string;
  href: string;
  ariaLabel?: string;
}

interface SocialLink extends FooterLink {
  icon: string;
}

interface FooterProps {
  className?: string;
  ariaLabel?: string;
  links?: FooterLink[];
  socialLinks?: SocialLink[];
}

// Helper function to get current year
const getCurrentYear = (): number => new Date().getFullYear();

// Footer component
const Footer: React.FC<FooterProps> = memo(({
  className = '',
  ariaLabel = 'Site footer',
  links = [],
  socialLinks = []
}) => {
  // Keyboard navigation handler
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (event.target as HTMLElement).click();
    }
  }, []);

  return (
    <footer
      className={`footer ${className}`}
      role="contentinfo"
      aria-label={ariaLabel}
      style={{
        width: '100%',
        backgroundColor: 'var(--color-primary)',
        color: '#FFFFFF',
        padding: 'var(--spacing-lg) 0',
        marginTop: 'auto'
      }}
    >
      <div
        className="footer-container"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-md)'
        }}
      >
        {/* Navigation Links */}
        {links.length > 0 && (
          <nav
            className="footer-navigation"
            role="navigation"
            aria-label="Footer Navigation"
            style={{
              display: 'flex',
              gap: 'var(--spacing-lg)',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}
          >
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                aria-label={link.ariaLabel || link.label}
                className="footer-link"
                onKeyPress={handleKeyPress}
                style={{
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-sm)',
                  transition: 'var(--transition-fast)',
                  padding: 'var(--spacing-xs)'
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div
            className="footer-social-links"
            style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 'var(--spacing-md)'
            }}
          >
            {socialLinks.map((social) => (
              <a
                key={social.id}
                href={social.href}
                aria-label={social.ariaLabel || social.label}
                className="footer-social-link"
                onKeyPress={handleKeyPress}
                style={{
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: 'var(--spacing-xs)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span className="icon" aria-hidden="true">
                  {social.icon}
                </span>
                <span className="sr-only">{social.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Copyright Notice */}
        <div
          className="footer-copyright"
          style={{
            fontSize: 'var(--font-size-xs)',
            textAlign: 'center',
            opacity: '0.8',
            marginTop: 'var(--spacing-md)'
          }}
        >
          <p>
            © {getCurrentYear()} Startup Metrics Benchmarking Platform. All rights reserved.
          </p>
        </div>
      </div>

      {/* Screen Reader Only Styles */}
      <style>
        {`
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            border: 0;
          }

          @media (max-width: var(--breakpoint-tablet)) {
            .footer-navigation {
              gap: var(--spacing-md);
              flex-direction: column;
              align-items: center;
            }

            .footer-social-links {
              flex-wrap: wrap;
            }
          }

          .footer-link:hover,
          .footer-social-link:hover {
            text-decoration: underline;
            opacity: 0.9;
          }

          .footer-link:focus-visible,
          .footer-social-link:focus-visible {
            outline: 2px solid var(--color-accent);
            outline-offset: 2px;
          }
        `}
      </style>
    </footer>
  );
});

Footer.displayName = 'Footer';

export type { FooterProps, FooterLink, SocialLink };
export default Footer;