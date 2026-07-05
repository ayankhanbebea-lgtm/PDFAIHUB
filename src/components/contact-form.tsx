'use client';
// src/components/contact-form.tsx
import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      return;
    }
    setLoading(true);
    // Simulate submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 800);
  };

  if (submitted) {
    return (
      <div className="bg-[#10B981]/10 border border-[#10B981]/25 p-8 rounded-2xl text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 bg-[#10B981]/20 border border-[#10B981]/30 rounded-full flex items-center justify-center mx-auto text-[#10B981]">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Message Sent!</h3>
        <p className="text-sm text-gray-400">
          Thank you! We&apos;ll get back to you soon.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-xs font-semibold text-[#10B981] hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Your Name
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          className="w-full bg-[#161B22] border border-[#1F2937] text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@example.com"
          className="w-full bg-[#161B22] border border-[#1F2937] text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Business inquiry, feedback, etc."
          className="w-full bg-[#161B22] border border-[#1F2937] text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Your Message
        </label>
        <textarea
          id="message"
          required
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Write your message here..."
          className="w-full bg-[#161B22] border border-[#1F2937] text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-brand py-3 flex items-center justify-center gap-2"
      >
        <span>{loading ? 'Sending...' : 'Send Message'}</span>
        {!loading && <Send className="w-4 h-4" />}
      </button>
    </form>
  );
}
