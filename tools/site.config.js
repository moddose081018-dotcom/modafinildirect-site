// Single source of truth for site identity. Every tool imports from here so a
// domain or brand change is one edit, not a grep across the repository.
export const SITE = {
  name: 'Modafinil Direct',
  host: 'modafinildirect.com',
  origin: 'https://modafinildirect.com',
  stagingOrigin: 'https://modafinildirect-staging.pages.dev',
  locale: 'en_GB',
  twitter: '',
};
