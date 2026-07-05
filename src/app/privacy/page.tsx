// src/app/privacy/page.tsx
import { redirect } from 'next/navigation';

export default function PrivacyRedirectPage() {
  redirect('/privacy-policy');
}
