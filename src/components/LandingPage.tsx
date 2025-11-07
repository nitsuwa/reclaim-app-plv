import { useState, useEffect } from 'react';
import { Search, Package, Shield, Users, TrendingUp, Award } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { PLVLogo } from './PLVLogo';
import { useApp } from '../context/AppContext';
import { Footer } from './Footer';
import { motion } from 'motion/react';

export const LandingPage = () => {
  const { setCurrentPage } = useApp();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const features = [
    {
      icon: Package,
      title: 'Report Items',
      description: 'Found something on campus? Report it with photos and details to help owners reclaim their belongings.',
    },
    {
      icon: Search,
      title: 'Search Items',
      description: 'Lost something? Browse verified items and use filters to find what you\'re looking for quickly.',
    },
    {
      icon: Shield,
      title: 'Secure Claims',
      description: 'Verify ownership through security questions. Pick up verified items at the Guard Post.',
    },
  ];

  const benefits = [
    {
      icon: Users,
      title: 'Trusted by Students',
      description: 'Official PLV system used by thousands of students',
      color: 'from-primary to-accent',
    },
    {
      icon: TrendingUp,
      title: '95% Recovery Rate',
      description: 'Most items are successfully reunited with owners',
      color: 'from-accent to-primary',
    },
    {
      icon: Award,
      title: 'Guard Verified',
      description: 'All items verified by campus security',
      color: 'from-primary to-accent',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar - Improved with scroll effect */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-primary/95 backdrop-blur-md shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo and App Name - Horizontal Layout */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center shadow-md flex-shrink-0 transition-colors ${
                isScrolled ? 'bg-white' : 'bg-white'
              }`}>
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3/4 h-3/4"
                >
                  <path
                    d="M50 10 L20 25 L20 50 Q20 75 50 90 Q80 75 80 50 L80 25 Z"
                    fill="#4da6ff"
                    stroke="#003366"
                    strokeWidth="2"
                  />
                  <rect x="35" y="35" width="30" height="35" fill="#ffffff" rx="2" />
                  <line x1="50" y1="35" x2="50" y2="70" stroke="#003366" strokeWidth="2" />
                  <line x1="35" y1="45" x2="50" y2="45" stroke="#003366" strokeWidth="1.5" />
                  <line x1="50" y1="45" x2="65" y2="45" stroke="#003366" strokeWidth="1.5" />
                  <line x1="35" y1="52" x2="50" y2="52" stroke="#003366" strokeWidth="1.5" />
                  <line x1="50" y1="52" x2="65" y2="52" stroke="#003366" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="flex flex-col -space-y-0.5">
                <span className={`text-xl transition-colors ${
                  isScrolled ? 'text-white' : 'text-white'
                }`}>ReClaim</span>
                <span className={`text-xs hidden sm:block transition-colors ${
                  isScrolled ? 'text-white/80' : 'text-white/80'
                }`}>PLV Lost & Found System</span>
              </div>
            </motion.div>

            {/* Nav Links and Login - Right side */}
            <div className="flex items-center gap-8">
              {/* Nav Links (Hidden on mobile) */}
              <div className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-sm text-white/90 hover:text-white transition-colors"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="text-sm text-white/90 hover:text-white transition-colors"
                >
                  Benefits
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="text-sm text-white/90 hover:text-white transition-colors"
                >
                  Contact
                </button>
              </div>

              {/* Sign In Button */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Button 
                  onClick={() => setCurrentPage('login')}
                  size="sm"
                  className={`transition-all ${
                    isScrolled 
                      ? 'bg-white text-primary hover:bg-white/90 border-0' 
                      : 'bg-white text-primary hover:bg-white/90 border-0'
                  }`}
                >
                  Sign In
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section - With Background Image and Overlay */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-36 lg:pt-56 lg:pb-40 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1600903308878-bf5e554ab841?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwY2FtcHVzJTIwYnVpbGRpbmd8ZW58MXx8fHwxNzYwODQ1MDA4fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="PLV Campus"
            className="w-full h-full object-cover"
          />
          {/* Dark Blue Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-75"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            {/* Heading */}
            <div className="space-y-5">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight"
                style={{ fontWeight: 800 }}
              >
                Lost Something?
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10" style={{ 
                    textShadow: '0 0 30px rgba(77, 166, 255, 0.5), 0 0 60px rgba(77, 166, 255, 0.3)'
                  }}>
                    ReClaim
                  </span>
                  <span className="absolute inset-0 blur-sm opacity-50" style={{ 
                    background: 'linear-gradient(to right, rgba(77, 166, 255, 0.3), rgba(255, 255, 255, 0.3))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    ReClaim
                  </span>
                </span> It.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-4"
              >
                The official Lost & Found system for Pamantasan ng Lungsod ng Valenzuela
              </motion.p>
            </div>

            {/* CTA Buttons - New Style */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4 px-4"
            >
              <Button 
                size="lg"
                onClick={() => setCurrentPage('register')}
                className="bg-white text-primary hover:bg-white/90 shadow-2xl text-base sm:text-lg h-12 sm:h-14 px-8 sm:px-12 rounded-full transition-all hover:scale-105"
              >
                Get Started
              </Button>
              <Button 
                size="lg"
                onClick={() => setCurrentPage('login')}
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary text-base sm:text-lg h-12 sm:h-14 px-8 sm:px-12 rounded-full transition-all hover:scale-105"
              >
                Sign In
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Seamless transition */}
      <section id="features" className="py-16 md:py-20 bg-gradient-to-b from-background via-background to-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-primary mb-4 text-3xl md:text-4xl">
              Simple Steps to <span className="text-accent">Reclaim</span> Your Belongings
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              <span className="text-primary">Easy</span>, <span className="text-primary">secure</span>, and <span className="text-primary">efficient</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full border-2 hover:border-accent hover:shadow-xl transition-all group bg-white">
                    <CardContent className="p-6 md:p-8 text-center space-y-4 md:space-y-6">
                      {/* Larger, More Prominent Icon */}
                      <div className="mx-auto h-20 w-20 md:h-24 md:w-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform border-4 border-primary/30">
                        <Icon className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                      </div>
                      <h3 className="text-primary text-xl md:text-2xl" style={{ fontWeight: 600 }}>{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section - Seamless transition */}
      <section id="benefits" className="py-24 md:py-32 bg-gradient-to-b from-card/30 via-card/50 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 md:mb-20"
          >
            <h2 className="text-primary mb-5 text-4xl md:text-5xl">
              Why Choose <span className="text-accent">ReClaim</span>?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              The most <span className="text-primary">trusted</span> lost and found system in PLV
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card className="h-full border-2 hover:border-primary hover:shadow-xl transition-all group bg-white">
                    <CardContent className="p-6 md:p-8 text-center space-y-4 md:space-y-6">
                      {/* Icon with Gradient Background */}
                      <div className="relative inline-flex items-center justify-center">
                        <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} rounded-full blur-md opacity-50`}></div>
                        <div className={`relative h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br ${benefit.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <Icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-primary text-xl md:text-2xl" style={{ fontWeight: 600 }}>{benefit.title}</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                          {benefit.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="border-t border-border"></div>

      {/* CTA Section - Seamless transition */}
      <section className="py-24 md:py-32 lg:py-40 bg-gradient-to-br from-primary via-primary to-accent text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8 md:space-y-10"
          >
            <h2 className="text-white text-4xl md:text-5xl lg:text-6xl px-4" style={{ fontWeight: 700 }}>
              <span className="relative inline-block">
                <span className="relative z-10" style={{ 
                  textShadow: '0 0 30px rgba(77, 166, 255, 0.5), 0 0 60px rgba(77, 166, 255, 0.3)'
                }}>
                  Ready to Get Started?
                </span>
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto px-4">
              Join your fellow <span className="text-white" style={{ fontWeight: 600 }}>PLV students</span> in the safest way to recover lost belongings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 px-4">
              <Button 
                size="lg"
                onClick={() => setCurrentPage('register')}
                className="bg-white text-primary hover:bg-white/90 shadow-xl text-base md:text-lg h-12 md:h-14 px-8 md:px-10 rounded-full transition-all hover:scale-105"
              >
                Create Account
              </Button>
              <Button 
                size="lg"
                onClick={() => setCurrentPage('login')}
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary text-base md:text-lg h-12 md:h-14 px-8 md:px-10 rounded-full transition-all hover:scale-105"
              >
                Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <div id="contact">
        <Footer />
      </div>
    </div>
  );
};
