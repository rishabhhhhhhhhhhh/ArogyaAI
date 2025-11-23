import { Link } from 'react-router-dom';
import { Brain, Video, FileText, Shield, Clock, Users, Star, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/GlassCard';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export function LandingPage() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Diagnosis',
      description: 'Get instant AI-powered health assessments using advanced machine learning algorithms.',
      glow: 'teal' as const,
    },
    {
      icon: Video,
      title: 'Virtual Consultations',
      description: 'Connect with verified doctors through secure video calls from anywhere.',
      glow: 'emerald' as const,
    },
    {
      icon: FileText,
      title: 'Digital Prescriptions',
      description: 'Receive and manage your prescriptions digitally with easy access.',
      glow: 'cyan' as const,
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health data is encrypted and protected with industry-leading security.',
      glow: 'none' as const,
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Access healthcare services anytime, anywhere, without waiting rooms.',
      glow: 'none' as const,
    },
    {
      icon: Users,
      title: 'Expert Doctors',
      description: 'Our network includes verified and experienced healthcare professionals.',
      glow: 'none' as const,
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Patient',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGhjYXJlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MDAwNDA3OHww&ixlib=rb-4.1.0&q=80&w=1080',
      text: 'ArogyaAI made healthcare so accessible. The AI diagnosis gave me peace of mind before my doctor consultation.',
      rating: 5,
    },
    {
      name: 'Dr. Michael Chen',
      role: 'Cardiologist',
      image: 'https://images.unsplash.com/photo-1758691463606-1493d79cc577?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjB0ZWxlbWVkaWNpbmUlMjBjb25zdWx0YXRpb258ZW58MXx8fHwxNzU5OTg1OTU2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      text: 'This platform has transformed how I practice telemedicine. The AI insights help me serve patients better.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Patient',
      image: 'https://images.unsplash.com/photo-1758202292826-c40e172eed1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwdGVjaG5vbG9neSUyMEFJfGVufDF8fHx8MTc2MDAwNDA3OHww&ixlib=rb-4.1.0&q=80&w=1080',
      text: 'Fast, reliable, and convenient. I can consult with my doctor without leaving home. Absolutely brilliant!',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 lg:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block">
                <span className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
                  AI-Powered Healthcare Platform
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-['Poppins'] font-semibold leading-tight">
                AI-Powered Remote Healthcare,{' '}
                <span className="text-primary">Anytime, Anywhere</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Experience the future of healthcare with our intelligent telemedicine platform. Get AI-powered health insights and connect with expert doctors instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/ai-demo">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 glow-teal group">
                    Try AI Diagnosis
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="outline" className="border-primary/20 hover:bg-primary/10">
                    Book a Doctor
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 blur-3xl" />
              <GlassCard glow="teal" className="relative">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758691463606-1493d79cc577?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjB0ZWxlbWVkaWNpbmUlMjBjb25zdWx0YXRpb258ZW58MXx8fHwxNzU5OTg1OTU2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="AI Healthcare"
                  className="w-full h-auto rounded-xl"
                />
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-['Poppins'] font-semibold mb-4">
              Revolutionizing Healthcare Delivery
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience cutting-edge features designed to make healthcare accessible, intelligent, and personal.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <GlassCard key={index} hoverable glow={feature.glow}>
                  <div className={`p-3 rounded-xl inline-block mb-4 ${feature.glow === 'teal' ? 'bg-primary/10' :
                      feature.glow === 'emerald' ? 'bg-accent/10' :
                        feature.glow === 'cyan' ? 'bg-[#23C4F8]/10' :
                          'bg-muted'
                    }`}>
                    <Icon className={`w-8 h-8 ${feature.glow === 'teal' ? 'text-primary' :
                        feature.glow === 'emerald' ? 'text-accent' :
                          feature.glow === 'cyan' ? 'text-[#23C4F8]' :
                            'text-muted-foreground'
                      }`} />
                  </div>
                  <h3 className="text-xl font-['Poppins'] font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-['Poppins'] font-semibold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple steps to better healthcare</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'AI Triage', description: 'Describe your symptoms and upload images for instant AI analysis' },
              { step: '02', title: 'Book Consultation', description: 'Choose from verified doctors and schedule a video call' },
              { step: '03', title: 'Get Treatment', description: 'Receive prescriptions and follow-up care digitally' },
            ].map((step, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto glow-teal">
                  <span className="text-3xl font-['Poppins'] font-semibold text-primary">{step.step}</span>
                </div>
                <h3 className="text-xl font-['Poppins'] font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-['Poppins'] font-semibold mb-4">Trusted by Thousands</h2>
            <p className="text-xl text-muted-foreground">See what our users have to say</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <GlassCard key={index} hoverable>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-['Poppins'] font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard glow="teal" className="text-center space-y-6">
            <h2 className="text-4xl font-['Poppins'] font-semibold">
              Ready to Experience the Future of Healthcare?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of patients and doctors already using ArogyaAI
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/ai-demo">
                <Button size="lg" className="bg-primary hover:bg-primary/90 glow-teal">
                  Try AI Diagnosis Free
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-primary/20 hover:bg-primary/10">
                  Sign Up Now
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-['Poppins'] font-semibold mb-4">ArogyaAI</h4>
              <p className="text-muted-foreground text-sm">
                AI-powered telemedicine platform connecting patients with healthcare professionals.
              </p>
            </div>
            <div>
              <h4 className="font-['Poppins'] font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/ai-demo" className="hover:text-primary">AI Diagnosis</Link></li>
                <li><Link to="/auth" className="hover:text-primary">Find Doctors</Link></li>
                <li><Link to="/auth" className="hover:text-primary">For Doctors</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-['Poppins'] font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About Us</a></li>
                <li><a href="#" className="hover:text-primary">Careers</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-['Poppins'] font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary">HIPAA Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2025 ArogyaAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
