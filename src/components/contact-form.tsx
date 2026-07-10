'use client';
// src/components/contact-form.tsx — Theme-aware
import { useState } from 'react';
import { Send, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Name is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      return 'A valid email address is required.';
    }
    if (!formData.subject.trim()) {
      return 'Subject is required.';
    }
    if (!formData.message.trim() || formData.message.trim().length < 20) {
      return 'Message must be at least 20 characters.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/contact', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      if (response.data.success) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        toast.success('Message sent successfully!');
      } else {
        throw new Error(response.data.error || 'Unable to send your message. Please try again later.');
      }
    } catch (err: any) {
      console.error('[contact-form] Submission error:', err);
      const apiError = err.response?.data?.error || 'Unable to send your message. Please try again later.';
      setError(apiError);
      toast.error(apiError);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-primary/10 border border-primary/25 p-8 rounded-2xl text-center space-y-4 animate-fade-in transition-colors duration-300">
        <div className="w-12 h-12 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center mx-auto text-primary">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Message Sent!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Your message has been sent successfully. We usually reply within 24–48 hours.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-xs font-semibold text-primary hover:underline mt-2 cursor-pointer"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-start gap-3 text-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Your Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          className="w-full bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@example.com"
          className="w-full bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Business inquiry, feedback, etc."
          className="w-full bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Your Message (Min 20 characters)
        </label>
        <textarea
          id="message"
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Write your message here..."
          className="w-full bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-brand py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
      >
        <span>{loading ? 'Sending...' : 'Send Message'}</span>
        {!loading && <Send className="w-4 h-4" />}
      </button>

      <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-6 leading-relaxed">
        We usually respond within 24–48 hours. If you haven&apos;t received a response within 48 hours, please contact us directly at{' '}
        <a href="mailto:pdfaihub@gmail.com" className="text-primary dark:text-white hover:underline font-semibold">
          pdfaihub@gmail.com
        </a>{' '}
        and we&apos;ll be happy to assist you.
      </p>
    </form>
  );
}

